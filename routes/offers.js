const express = require('express');
const router = express.Router();

const { validateSession } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');

router.use(validateSession);

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function toIsoDateTime(date, time) {
  // Expect date: YYYY-MM-DD, time: HH:MM
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/**
 * GET /api/offers
 * List open session offers + their available slots
 */
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;

  const tutorIdFilter = req.query.tutorId != null && String(req.query.tutorId).trim() !== ''
    ? toInt(req.query.tutorId)
    : null;
  const skillIdFilter = req.query.skillId != null && String(req.query.skillId).trim() !== ''
    ? toInt(req.query.skillId)
    : null;

  if (req.query.tutorId != null && tutorIdFilter == null) {
    return res.status(400).json({ success: false, message: 'Invalid tutorId' });
  }
  if (req.query.skillId != null && skillIdFilter == null) {
    return res.status(400).json({ success: false, message: 'Invalid skillId' });
  }

  try {
    let where = `o.status = 'open'
        AND u.status = 'active'`;
    const params = [];

    // Only exclude own offers when browsing
    if (tutorIdFilter == null) {
      where += ` AND o.tutor_id != ?`;
      params.push(userId);
    } else {
      where += ` AND o.tutor_id = ?`;
      params.push(tutorIdFilter);
    }
    
    if (skillIdFilter != null) {
      where += ` AND o.skill_id = ?`;
      params.push(skillIdFilter);
    }

    const offers = await getAll(db, `
      SELECT
        o.id,
        o.tutor_id AS tutorId,
        o.skill_id AS skillId,
        o.title,
        COALESCE(o.notes, '') AS notes,
        o.location_type AS locationType,
        COALESCE(o.location, '') AS location,
        COALESCE(o.is_group, 0) AS isGroup,
        COALESCE(o.max_participants, 1) AS maxParticipants,
        o.status,
        o.created_at AS createdAt,
        u.username AS tutorUsername,
        COALESCE(p.full_name, '') AS tutorFullName,
        COALESCE(p.profile_image, '') AS tutorProfileImage,
        sk.skill_name AS skillName
      FROM session_offers o
      JOIN users u ON u.id = o.tutor_id
      LEFT JOIN user_profiles p ON p.user_id = o.tutor_id
      JOIN skills sk ON sk.id = o.skill_id
      WHERE ${where}
      ORDER BY datetime(o.created_at) DESC
      LIMIT 200
    `, params);

    if (offers.length === 0) {
      return res.json({ success: true, offers: [] });
    }

    const offerIds = offers.map(o => o.id);
    const placeholders = offerIds.map(() => '?').join(',');

    const slots = await getAll(db, `
      SELECT
        s.id,
        s.offer_id AS offerId,
        s.scheduled_date AS scheduledDate,
        s.duration
      FROM session_offer_slots s
      WHERE s.offer_id IN (${placeholders})
      ORDER BY datetime(s.scheduled_date) ASC
    `, offerIds);

    const slotsByOffer = new Map();
    for (const slot of slots) {
      if (!slotsByOffer.has(slot.offerId)) slotsByOffer.set(slot.offerId, []);
      slotsByOffer.get(slot.offerId).push(slot);
    }

    res.json({
      success: true,
      offers: offers.map(o => ({
        ...o,
        slots: slotsByOffer.get(o.id) || []
      }))
    });
  } catch (error) {
    console.error('List offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load offers' });
  }
});

/**
 * GET /api/offers/mine
 * List offers created by the current user
 * Query: status=open|closed|all (default: open)
 */
router.get('/mine', async (req, res) => {
  const db = req.app.locals.db;
  const tutorId = req.userId;
  const status = String(req.query.status || 'open');

  if (!['open', 'closed', 'all'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    let where = `o.tutor_id = ?`;
    const params = [tutorId];

    if (status !== 'all') {
      where += ` AND o.status = ?`;
      params.push(status);
    }

    const offers = await getAll(db, `
      SELECT
        o.id,
        o.tutor_id AS tutorId,
        o.skill_id AS skillId,
        o.title,
        COALESCE(o.notes, '') AS notes,
        o.location_type AS locationType,
        COALESCE(o.location, '') AS location,
        COALESCE(o.is_group, 0) AS isGroup,
        COALESCE(o.max_participants, 1) AS maxParticipants,
        o.status,
        o.created_at AS createdAt,
        sk.skill_name AS skillName
      FROM session_offers o
      JOIN skills sk ON sk.id = o.skill_id
      WHERE ${where}
      ORDER BY datetime(o.created_at) DESC
      LIMIT 200
    `, params);

    if (offers.length === 0) {
      return res.json({ success: true, offers: [] });
    }

    const offerIds = offers.map(o => o.id);
    const placeholders = offerIds.map(() => '?').join(',');

    const slots = await getAll(db, `
      SELECT
        s.id,
        s.offer_id AS offerId,
        s.scheduled_date AS scheduledDate,
        s.duration
      FROM session_offer_slots s
      WHERE s.offer_id IN (${placeholders})
      ORDER BY datetime(s.scheduled_date) ASC
    `, offerIds);

    const pendingCounts = await getAll(db, `
      SELECT
        r.offer_id AS offerId,
        COUNT(*) AS pendingCount
      FROM session_requests r
      WHERE r.offer_id IN (${placeholders})
        AND r.status = 'pending'
      GROUP BY r.offer_id
    `, offerIds);

    const slotsByOffer = new Map();
    for (const slot of slots) {
      if (!slotsByOffer.has(slot.offerId)) slotsByOffer.set(slot.offerId, []);
      slotsByOffer.get(slot.offerId).push(slot);
    }

    const pendingByOffer = new Map();
    for (const row of pendingCounts) {
      pendingByOffer.set(row.offerId, Number(row.pendingCount) || 0);
    }

    res.json({
      success: true,
      offers: offers.map(o => ({
        ...o,
        pendingCount: pendingByOffer.get(o.id) || 0,
        slots: slotsByOffer.get(o.id) || []
      }))
    });
  } catch (error) {
    console.error('List my offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your offers' });
  }
});

/**
 * POST /api/offers
 * Create a new session offer with up to 5 slots
 * Body: { skillId, title, notes, locationType, location, slots: [{date,time,duration}] }
 */
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const tutorId = req.userId;

  const skillId = toInt(req.body.skillId);
  const title = String(req.body.title || '').trim();
  const notes = String(req.body.notes || '').trim();
  const locationType = String(req.body.locationType || '').trim();
  const location = String(req.body.location || '').trim();
  const isGroup = req.body.isGroup ? 1 : 0;
  const maxParticipants = isGroup ? Math.max(2, Math.min(50, toInt(req.body.maxParticipants) || 10)) : 1;
  const slots = Array.isArray(req.body.slots) ? req.body.slots : [];

  if (!skillId) {
    return res.status(400).json({ success: false, message: 'Skill is required' });
  }
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }
  if (!['online', 'in-person'].includes(locationType)) {
    return res.status(400).json({ success: false, message: 'Location type is required' });
  }
  if (locationType === 'in-person' && !location) {
    return res.status(400).json({ success: false, message: 'Location is required for in-person sessions' });
  }

  const normalizedSlots = slots
    .slice(0, 5)
    .map(s => {
      const date = String(s?.date || '').trim();
      const time = String(s?.time || '').trim();
      const duration = toInt(s?.duration) || 60;
      return {
        scheduledDate: toIsoDateTime(date, time),
        duration
      };
    })
    .filter(s => s.scheduledDate);

  if (normalizedSlots.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one date/time slot is required' });
  }

  try {
    // Verify skill exists and belongs to tutor
    const skill = await getOne(db, 'SELECT id, user_id, skill_type FROM skills WHERE id = ?', [skillId]);
    if (!skill || Number(skill.user_id) !== Number(tutorId) || skill.skill_type !== 'offered') {
      return res.status(400).json({ success: false, message: 'Invalid skill or you do not offer this skill' });
    }

    const offerResult = await runQuery(db, `
      INSERT INTO session_offers (tutor_id, skill_id, title, notes, location_type, location, is_group, max_participants, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `, [tutorId, skillId, title, notes || null, locationType, locationType === 'in-person' ? location : null, isGroup, maxParticipants]);

    for (const slot of normalizedSlots) {
      await runQuery(db, `
        INSERT INTO session_offer_slots (offer_id, scheduled_date, duration)
        VALUES (?, ?, ?)
      `, [offerResult.id, slot.scheduledDate, slot.duration]);
    }

    res.status(201).json({ success: true, message: 'Offer created', offerId: offerResult.id });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create offer' });
  }
});

/**
 * POST /api/offers/:offerId/request
 * Student requests a slot from an offer
 * Body: { slotId }
 */
router.post('/:offerId/request', async (req, res) => {
  const db = req.app.locals.db;
  const studentId = req.userId;

  const offerId = toInt(req.params.offerId);
  let slotId = toInt(req.body.slotId);
  const proposedDate = String(req.body.proposedDate || '').trim();
  const proposedTime = String(req.body.proposedTime || '').trim();
  const proposedDuration = toInt(req.body.duration) || 60;

  if (!offerId) {
    return res.status(400).json({ success: false, message: 'Offer is required' });
  }

  const hasProposed = !slotId && proposedDate && proposedTime;
  if (!slotId && !hasProposed) {
    return res.status(400).json({ success: false, message: 'Slot is required (or propose a new date/time)' });
  }

  try {
    const offer = await getOne(db, `
      SELECT id, tutor_id AS tutorId, skill_id AS skillId, status,
             COALESCE(is_group, 0) AS isGroup,
             COALESCE(max_participants, 1) AS maxParticipants
      FROM session_offers
      WHERE id = ?
    `, [offerId]);

    if (!offer || offer.status !== 'open') {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (Number(offer.tutorId) === Number(studentId)) {
      return res.status(400).json({ success: false, message: 'You cannot request your own offer' });
    }

    if (hasProposed) {
      const scheduledDate = toIsoDateTime(proposedDate, proposedTime);
      if (!scheduledDate) {
        return res.status(400).json({ success: false, message: 'Invalid proposed date/time' });
      }
      const dt = new Date(scheduledDate);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid proposed date/time' });
      }
      // prevent bad dates
      const now = Date.now();
      if (dt.getTime() < now - 5 * 60 * 1000) {
        return res.status(400).json({ success: false, message: 'Proposed time must be in the future' });
      }
      const duration = Math.max(15, Math.min(240, proposedDuration));

      // Reuse an existing identical slot if it exists
      const existingSlot = await getOne(db, `
        SELECT id
        FROM session_offer_slots
        WHERE offer_id = ? AND scheduled_date = ? AND COALESCE(duration, 60) = ?
        LIMIT 1
      `, [offerId, scheduledDate, duration]);

      if (existingSlot?.id) {
        slotId = Number(existingSlot.id);
      } else {
        const slotRes = await runQuery(db, `
          INSERT INTO session_offer_slots (offer_id, scheduled_date, duration)
          VALUES (?, ?, ?)
        `, [offerId, scheduledDate, duration]);
        slotId = slotRes.id;
      }
    }

    const slot = await getOne(db, `
      SELECT id, offer_id AS offerId
      FROM session_offer_slots
      WHERE id = ?
    `, [slotId]);

    if (!slot || Number(slot.offerId) !== Number(offerId)) {
      return res.status(400).json({ success: false, message: 'Invalid slot' });
    }

    // For group sessions, enforce capacity per slot
    if (Number(offer.isGroup) === 1) {
      const maxParticipants = Math.max(2, Number(offer.maxParticipants) || 2);
      const acceptedRow = await getOne(db, `
        SELECT COUNT(*) AS acceptedCount
        FROM session_requests
        WHERE offer_id = ? AND slot_id = ? AND status = 'accepted'
      `, [offerId, slotId]);
      const acceptedCount = Number(acceptedRow?.acceptedCount) || 0;
      if (acceptedCount >= maxParticipants) {
        return res.status(400).json({ success: false, message: 'This group session time is full. Please choose another slot.' });
      }
    }

    // Prevent duplicate pending request by same student for same offer
    const existing = await getOne(db, `
      SELECT id, status
      FROM session_requests
      WHERE offer_id = ? AND student_id = ? AND status IN ('pending', 'accepted')
      LIMIT 1
    `, [offerId, studentId]);

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already requested this offer' });
    }

    const result = await runQuery(db, `
      INSERT INTO session_requests (offer_id, slot_id, tutor_id, student_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [offerId, slotId, offer.tutorId, studentId]);

    res.status(201).json({ success: true, message: 'Session requested', requestId: result.id });
  } catch (error) {
    console.error('Request offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to request session' });
  }
});

/**
 * GET /api/offers/requests
 * Query: role=tutor|student, status=pending|accepted|declined|cancelled|all
 */
router.get('/requests/list', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;
  const role = String(req.query.role || 'tutor');
  const status = String(req.query.status || 'pending');

  if (!['tutor', 'student'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    let where = role === 'tutor' ? 'r.tutor_id = ?' : 'r.student_id = ?';
    const params = [userId];

    if (status !== 'all') {
      where += ' AND r.status = ?';
      params.push(status);
    }

    const rows = await getAll(db, `
      SELECT
        r.id,
        r.offer_id AS offerId,
        r.slot_id AS slotId,
        r.tutor_id AS tutorId,
        r.student_id AS studentId,
        r.status,
        r.created_at AS createdAt,
        o.title,
        o.notes,
        o.location_type AS locationType,
        COALESCE(o.location, '') AS location,
        sk.skill_name AS skillName,
        s.scheduled_date AS scheduledDate,
        s.duration,
        tu.username AS tutorUsername,
        COALESCE(tp.full_name, '') AS tutorFullName,
        COALESCE(tp.profile_image, '') AS tutorProfileImage,
        su.username AS studentUsername,
        COALESCE(sp.full_name, '') AS studentFullName,
        COALESCE(sp.profile_image, '') AS studentProfileImage
      FROM session_requests r
      JOIN session_offers o ON o.id = r.offer_id
      JOIN session_offer_slots s ON s.id = r.slot_id
      JOIN skills sk ON sk.id = o.skill_id
      JOIN users tu ON tu.id = r.tutor_id
      LEFT JOIN user_profiles tp ON tp.user_id = r.tutor_id
      JOIN users su ON su.id = r.student_id
      LEFT JOIN user_profiles sp ON sp.user_id = r.student_id
      WHERE ${where}
      ORDER BY datetime(r.created_at) DESC
      LIMIT 200
    `, params);

    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('List session requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load session requests' });
  }
});

/**
 * PATCH /api/offers/requests/:id
 * Tutor accepts/declines a request
 * Body: { action: 'accept' | 'decline' }
 */
router.patch('/requests/:id', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.userId;

  const requestId = toInt(req.params.id);
  const action = String(req.body.action || '').trim();

  if (!requestId || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  try {
    const request = await getOne(db, `
      SELECT
        r.id,
        r.status,
        r.offer_id AS offerId,
        r.slot_id AS slotId,
        r.tutor_id AS tutorId,
        r.student_id AS studentId,
        o.skill_id AS skillId,
        COALESCE(o.is_group, 0) AS isGroup,
        COALESCE(o.max_participants, 1) AS maxParticipants,
        o.notes,
        o.location_type AS locationType,
        o.location,
        s.scheduled_date AS scheduledDate,
        s.duration
      FROM session_requests r
      JOIN session_offers o ON o.id = r.offer_id
      JOIN session_offer_slots s ON s.id = r.slot_id
      WHERE r.id = ?
    `, [requestId]);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (Number(request.tutorId) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }

    if (action === 'decline') {
      await runQuery(db, `UPDATE session_requests SET status = 'declined' WHERE id = ?`, [requestId]);
      return res.json({ success: true, message: 'Request declined' });
    }

    const isGroup = Number(request.isGroup) === 1;
    const maxParticipants = isGroup ? Math.max(2, Number(request.maxParticipants) || 2) : 1;

    if (isGroup) {
      const acceptedRow = await getOne(db, `
        SELECT COUNT(*) AS acceptedCount
        FROM session_requests
        WHERE offer_id = ? AND slot_id = ? AND status = 'accepted'
      `, [request.offerId, request.slotId]);
      const acceptedCount = Number(acceptedRow?.acceptedCount) || 0;
      if (acceptedCount >= maxParticipants) {
        await runQuery(db, `UPDATE session_requests SET status = 'declined' WHERE id = ?`, [requestId]);
        return res.status(400).json({ success: false, message: 'That group session time is already full.' });
      }
    }

    // Accept: create the actual scheduled session
    const sessionResult = await runQuery(db, `
      INSERT INTO sessions (tutor_id, student_id, skill_id, scheduled_date, duration, location, status, notes, offer_id, slot_id, is_group)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)
    `, [
      request.tutorId,
      request.studentId,
      request.skillId,
      request.scheduledDate,
      request.duration || 60,
      request.locationType === 'in-person' ? (request.location || null) : 'Online',
      request.notes || null,
      request.offerId,
      request.slotId,
      isGroup ? 1 : 0
    ]);

    await runQuery(db, `UPDATE session_requests SET status = 'accepted' WHERE id = ?`, [requestId]);

    if (!isGroup) {
      await runQuery(db, `UPDATE session_offers SET status = 'closed' WHERE id = ?`, [request.offerId]);

      // Decline all other pending requests for this offer (single-seat offer)
      await runQuery(db, `
        UPDATE session_requests
        SET status = 'declined'
        WHERE offer_id = ? AND status = 'pending' AND id != ?
      `, [request.offerId, requestId]);
    } else {
      // For group offers, only decline others once this slot hits capacity.
      const acceptedRow2 = await getOne(db, `
        SELECT COUNT(*) AS acceptedCount
        FROM session_requests
        WHERE offer_id = ? AND slot_id = ? AND status = 'accepted'
      `, [request.offerId, request.slotId]);
      const acceptedCount2 = Number(acceptedRow2?.acceptedCount) || 0;

      if (acceptedCount2 >= maxParticipants) {
        await runQuery(db, `
          UPDATE session_requests
          SET status = 'declined'
          WHERE offer_id = ? AND slot_id = ? AND status = 'pending'
        `, [request.offerId, request.slotId]);
      }

      // Close the offer only when ALL slots are full.
      const slotCounts = await getAll(db, `
        SELECT s.id AS slotId,
               COALESCE(a.acceptedCount, 0) AS acceptedCount
        FROM session_offer_slots s
        LEFT JOIN (
          SELECT slot_id, COUNT(*) AS acceptedCount
          FROM session_requests
          WHERE offer_id = ? AND status = 'accepted'
          GROUP BY slot_id
        ) a ON a.slot_id = s.id
        WHERE s.offer_id = ?
      `, [request.offerId, request.offerId]);

      const allSlotsFull = (slotCounts || []).length > 0 && slotCounts.every(r => (Number(r.acceptedCount) || 0) >= maxParticipants);
      if (allSlotsFull) {
        await runQuery(db, `UPDATE session_offers SET status = 'closed' WHERE id = ?`, [request.offerId]);
      }
    }

    res.json({ success: true, message: 'Request accepted', sessionId: sessionResult.id });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

/**
 * POST /api/offers/:offerId/cancel
 * Tutor cancels (closes) an open offer. Any pending requests for that offer are cancelled.
 */
router.post('/:offerId/cancel', async (req, res) => {
  const db = req.app.locals.db;
  const tutorId = req.userId;
  const offerId = toInt(req.params.offerId);

  if (!offerId) {
    return res.status(400).json({ success: false, message: 'Invalid offerId' });
  }

  try {
    const offer = await getOne(db, `
      SELECT id, tutor_id AS tutorId, status, title
      FROM session_offers
      WHERE id = ?
    `, [offerId]);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (Number(offer.tutorId) !== Number(tutorId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (String(offer.status) !== 'open') {
      return res.status(400).json({ success: false, message: 'Offer is not open' });
    }

    await runQuery(db, `UPDATE session_offers SET status = 'closed' WHERE id = ?`, [offerId]);

    // Cancel any pending requests for this offer
    await runQuery(db, `
      UPDATE session_requests
      SET status = 'cancelled'
      WHERE offer_id = ? AND status = 'pending'
    `, [offerId]);

    // Notify any students who had pending requests
    const pendingStudents = await getAll(db, `
      SELECT DISTINCT student_id AS studentId
      FROM session_requests
      WHERE offer_id = ? AND status = 'cancelled'
    `, [offerId]);

    for (const row of (pendingStudents || [])) {
      const studentId = Number(row.studentId);
      if (!studentId) continue;
      await runQuery(db, `
        INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
        VALUES (?, ?, ?, ?, 0)
      `, [
        tutorId,
        studentId,
        'Session offer cancelled',
        `The tutor has cancelled the offer "${String(offer.title || 'Session Offer')}". Please browse other open offers to request a different time.`
      ]);
    }

    res.json({ success: true, message: 'Offer cancelled' });
  } catch (error) {
    console.error('Cancel offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel offer' });
  }
});

module.exports = router;

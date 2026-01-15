const express = require('express');
const router = express.Router();

const { validateSession } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');

router.use(validateSession);

function toInt(value) {
	const n = Number.parseInt(String(value), 10);
	return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/messages/conversations
 * Returns 1:1 conversation list (grouped by other user)
 */
router.get(['/conversations', '/'], async (req, res) => {
	const db = req.app.locals.db;
	const userId = req.userId;

	try {
		const rows = await getAll(db, `
			SELECT
				c.other_id AS otherUserId,
				u.username AS otherUsername,
				COALESCE(p.full_name, '') AS otherFullName,
				COALESCE(p.profile_image, '') AS otherAvatar,
				(
					SELECT m2.content
					FROM messages m2
					WHERE (
						(m2.sender_id = ? AND m2.receiver_id = c.other_id)
						OR (m2.sender_id = c.other_id AND m2.receiver_id = ?)
					)
					ORDER BY datetime(m2.created_at) DESC, m2.id DESC
					LIMIT 1
				) AS lastMessage,
				(
					SELECT m2.created_at
					FROM messages m2
					WHERE (
						(m2.sender_id = ? AND m2.receiver_id = c.other_id)
						OR (m2.sender_id = c.other_id AND m2.receiver_id = ?)
					)
					ORDER BY datetime(m2.created_at) DESC, m2.id DESC
					LIMIT 1
				) AS lastMessageAt,
				(
					SELECT m2.sender_id
					FROM messages m2
					WHERE (
						(m2.sender_id = ? AND m2.receiver_id = c.other_id)
						OR (m2.sender_id = c.other_id AND m2.receiver_id = ?)
					)
					ORDER BY datetime(m2.created_at) DESC, m2.id DESC
					LIMIT 1
				) AS lastSenderId,
				(
					SELECT COUNT(*)
					FROM messages um
					WHERE um.sender_id = c.other_id
						AND um.receiver_id = ?
						AND um.read_status = 0
				) AS unreadCount
			FROM (
				SELECT DISTINCT
					CASE
						WHEN sender_id = ? THEN receiver_id
						ELSE sender_id
					END AS other_id
				FROM messages
				WHERE sender_id = ? OR receiver_id = ?
			) c
			JOIN users u ON u.id = c.other_id
			LEFT JOIN user_profiles p ON p.user_id = u.id
			WHERE u.status = 'active'
			ORDER BY datetime(lastMessageAt) DESC
		`, [
			userId, userId,
			userId, userId,
			userId, userId,
			userId,
			userId, userId, userId
		]);

		res.json({ success: true, conversations: rows });
	} catch (error) {
		console.error('Conversations fetch error:', error);
		res.status(500).json({ success: false, message: 'Failed to load conversations' });
	}
});

/**
 * GET /api/messages/user-search?query=...
 * Live user search for starting a new DM
 */
router.get('/user-search', async (req, res) => {
	const db = req.app.locals.db;
	const userId = req.userId;
	const query = String(req.query.query || '').trim();

	if (query.length < 1) {
		return res.json({ success: true, users: [] });
	}

	try {
		const like = `%${query}%`;
		const users = await getAll(db, `
			SELECT
				u.id,
				u.username,
				u.email,
				COALESCE(p.full_name, '') AS fullName,
				COALESCE(p.profile_image, '') AS avatar
			FROM users u
			LEFT JOIN user_profiles p ON p.user_id = u.id
			WHERE u.status = 'active'
				AND u.id != ?
				AND (
					u.username LIKE ?
					OR u.email LIKE ?
					OR p.full_name LIKE ?
				)
			ORDER BY u.username ASC
			LIMIT 10
		`, [userId, like, like, like]);

		res.json({ success: true, users });
	} catch (error) {
		console.error('User search error:', error);
		res.status(500).json({ success: false, message: 'Search failed' });
	}
});

/**
 * GET /api/messages/with/:otherUserId
 * Fetch messages for a 1:1 DM thread. Marks incoming unread messages as read.
 */
router.get('/with/:otherUserId', async (req, res) => {
	const db = req.app.locals.db;
	const userId = req.userId;
	const otherUserId = toInt(req.params.otherUserId);
	const limit = Math.min(200, Math.max(1, toInt(req.query.limit) || 100));

	if (!otherUserId || otherUserId === userId) {
		return res.status(400).json({ success: false, message: 'Invalid user' });
	}

	try {
		const otherUser = await getOne(db, 'SELECT id FROM users WHERE id = ? AND status = \'active\'', [otherUserId]);
		if (!otherUser) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		const messages = await getAll(db, `
			SELECT id, sender_id AS senderId, receiver_id AS receiverId, content, created_at AS createdAt, read_status AS readStatus, read_at AS readAt
			FROM messages
			WHERE (
				(sender_id = ? AND receiver_id = ?)
				OR (sender_id = ? AND receiver_id = ?)
			)
			ORDER BY datetime(created_at) ASC, id ASC
			LIMIT ?
		`, [userId, otherUserId, otherUserId, userId, limit]);

		// Mark messages from other user to current user as read
		await runQuery(db, `
			UPDATE messages
			SET read_status = 1,
					read_at = CURRENT_TIMESTAMP
			WHERE sender_id = ?
				AND receiver_id = ?
				AND read_status = 0
		`, [otherUserId, userId]);

		res.json({ success: true, messages });
	} catch (error) {
		console.error('Thread fetch error:', error);
		res.status(500).json({ success: false, message: 'Failed to load messages' });
	}
});

/**
 * POST /api/messages/with/:otherUserId
 * Send a message in a 1:1 DM thread
 */
router.post('/with/:otherUserId', async (req, res) => {
	const db = req.app.locals.db;
	const userId = req.userId;
	const otherUserId = toInt(req.params.otherUserId);
	const content = String(req.body.content || '').trim();

	if (!otherUserId || otherUserId === userId) {
		return res.status(400).json({ success: false, message: 'Invalid user' });
	}
	if (!content) {
		return res.status(400).json({ success: false, message: 'Message content is required' });
	}
	if (content.length > 2000) {
		return res.status(400).json({ success: false, message: 'Message is too long' });
	}

	try {
		const otherUser = await getOne(db, 'SELECT id FROM users WHERE id = ? AND status = \'active\'', [otherUserId]);
		if (!otherUser) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		const insert = await runQuery(db, `
			INSERT INTO messages (sender_id, receiver_id, subject, content, read_status)
			VALUES (?, ?, 'DM', ?, 0)
		`, [userId, otherUserId, content]);

		const msg = await getOne(db, `
			SELECT id, sender_id AS senderId, receiver_id AS receiverId, content, created_at AS createdAt, read_status AS readStatus, read_at AS readAt
			FROM messages
			WHERE id = ?
		`, [insert.id]);

		res.status(201).json({ success: true, message: msg });
	} catch (error) {
		console.error('Send message error:', error);
		res.status(500).json({ success: false, message: 'Failed to send message' });
	}
});

module.exports = router;

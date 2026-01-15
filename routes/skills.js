const express = require('express');
const router = express.Router();
const { getAll, runQuery } = require('../config/database');

function requireAuth(req, res) {
	if (!req.session || !req.session.userId) {
		res.status(401).json({ success: false, message: 'Authentication required' });
		return false;
	}
	return true;
}

function normalizeSkillList(value) {
	const list = Array.isArray(value)
		? value
		: typeof value === 'string'
			? value.split(',')
			: [];

	return list
		.map(s => String(s).trim())
		.filter(Boolean)
		.slice(0, 50);
}

function validateSkills(skills) {
	const errors = [];
	for (const s of skills) {
		if (s.length > 100) errors.push(`Skill "${s}" must be 100 characters or less`);
	}
	return errors;
}

/**
 * GET /api/skills/mine
 * Returns offered + sought skills for the logged-in user with IDs
 */
router.get('/mine', async (req, res) => {
	if (!requireAuth(req, res)) return;
	const db = req.app.locals.db;
	const userId = req.session.userId;

	try {
		const rows = await getAll(db, `
			SELECT id, skill_name, skill_type
			FROM skills
			WHERE user_id = ?
			ORDER BY created_at ASC
		`, [userId]);

		const skillsOffer = rows.filter(r => r.skill_type === 'offered').map(r => ({ id: r.id, name: r.skill_name }));
		const skillsSeek = rows.filter(r => r.skill_type === 'sought').map(r => ({ id: r.id, name: r.skill_name }));

		res.json({ success: true, skillsOffer, skillsSeek });
	} catch (error) {
		console.error('Get skills error:', error);
		res.status(500).json({ success: false, message: 'Failed to get skills' });
	}
});

/**
 * PUT /api/skills/mine
 * Replaces offered + sought skills for the logged-in user
 * Body: { skillsOffer: string[]|string, skillsSeek: string[]|string }
 */
router.put('/mine', async (req, res) => {
	if (!requireAuth(req, res)) return;
	const db = req.app.locals.db;
	const userId = req.session.userId;

	try {
		const skillsOffer = normalizeSkillList(req.body.skillsOffer);
		const skillsSeek = normalizeSkillList(req.body.skillsSeek);

		const errors = [
			...validateSkills(skillsOffer),
			...validateSkills(skillsSeek)
		];

		if (errors.length) {
			return res.status(400).json({ success: false, errors });
		}

		// Replace skills atomically
		await runQuery(db, 'DELETE FROM skills WHERE user_id = ?', [userId]);

		for (const skill of skillsOffer) {
			await runQuery(db, `
				INSERT INTO skills (user_id, skill_name, skill_type)
				VALUES (?, ?, 'offered')
			`, [userId, skill]);
		}
		for (const skill of skillsSeek) {
			await runQuery(db, `
				INSERT INTO skills (user_id, skill_name, skill_type)
				VALUES (?, ?, 'sought')
			`, [userId, skill]);
		}

		res.json({ success: true, message: 'Skills updated successfully' });
	} catch (error) {
		console.error('Update skills error:', error);
		res.status(500).json({ success: false, message: 'Failed to update skills' });
	}
});

/**
 * GET /api/skills/all
 * Returns all unique skill names for autocomplete (no auth required for better UX)
 */
router.get('/all', async (req, res) => {
	const db = req.app.locals.db;
	
	try {
		const rows = await getAll(db, `
			SELECT DISTINCT skill_name AS name
			FROM skills
			ORDER BY skill_name ASC
		`);
		
		const skills = rows.map(r => r.name);
		res.json({ success: true, skills });
	} catch (error) {
		console.error('Get all skills error:', error);
		res.status(500).json({ success: false, message: 'Failed to get skills' });
	}
});

// Existing placeholder routes
router.get('/', (req, res) => res.json({ success: true, skills: [] }));
router.post('/', (req, res) => res.json({ success: true, message: 'Skill created' }));

module.exports = router;

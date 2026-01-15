/**
 * AI Routes - GPT-powered skill search and tutoring assistant
 */

const express = require('express');
const router = express.Router();
const { validateSession } = require('../middleware/auth');

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.apk;
const OPENAI_MODEL = 'gpt-4o-mini';

/**
 * Helper to call OpenAI Chat Completions API
 */
async function callOpenAI(messages, maxTokens = 500) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Helper to get all skills from database
 */
async function getAllSkills(db) {
  const { getAll } = require('../config/database');
  const skills = await getAll(db, `
    SELECT DISTINCT skill_name 
    FROM skills 
    WHERE skill_type = 'offered'
    ORDER BY skill_name
  `);
  return skills.map(s => s.skill_name);
}

/**
 * Helper to get tutors for specific skills
 */
async function getTutorsForSkills(db, skillNames, currentUserId) {
  const { getAll } = require('../config/database');
  if (!skillNames.length) return [];
  
  const placeholders = skillNames.map(() => '?').join(',');
  const tutors = await getAll(db, `
    SELECT DISTINCT
      u.id,
      u.username,
      COALESCE(p.full_name, '') AS fullName,
      COALESCE(p.bio, '') AS bio,
      COALESCE(p.school, '') AS school,
      COALESCE(p.profile_image, '') AS profileImage,
      GROUP_CONCAT(DISTINCT CASE WHEN s.skill_type = 'offered' THEN s.skill_name END) AS offeredSkills,
      (SELECT ROUND(AVG(rating), 1) FROM ratings WHERE rated_id = u.id) AS avgRating,
      (SELECT COUNT(*) FROM ratings WHERE rated_id = u.id) AS totalRatings
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN skills s ON s.user_id = u.id
    WHERE u.status = 'active'
      AND u.id != ?
      AND s.skill_name IN (${placeholders})
      AND s.skill_type = 'offered'
    GROUP BY u.id
    LIMIT 20
  `, [currentUserId, ...skillNames]);
  
  return tutors.map(t => ({
    ...t,
    offeredSkills: t.offeredSkills ? t.offeredSkills.split(',') : []
  }));
}

/**
 * POST /api/ai/search-skills
 * AI-enhanced skill search - finds related skills
 */
router.post('/search-skills', validateSession, async (req, res) => {
  const db = req.app.locals.db;
  const { query } = req.body;
  
  if (!query || String(query).trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Search query required' });
  }
  
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ success: false, message: 'AI service not configured' });
  }
  
  try {
    // Get all available skills from database
    const availableSkills = await getAllSkills(db);
    
    if (availableSkills.length === 0) {
      return res.json({ success: true, skills: [], tutors: [], aiSuggestion: '' });
    }
    
    // Ask GPT to find matching and similar skills
    const systemPrompt = `You are a skill matching assistant for an educational tutoring platform called SkillSwap.
Given a user's search query and a list of available skills, identify:
1. Exact or close matches to what the user is looking for
2. Related skills that might also help the user

Available skills on the platform: ${availableSkills.join(', ')}

Respond in JSON format only:
{
  "matchedSkills": ["skill1", "skill2"],
  "explanation": "Brief explanation of why these skills match the user's needs"
}

Only include skills that exist in the available skills list. Be helpful and suggest related skills if the exact match isn't available.`;

    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Find skills related to: "${query}"` }
    ], 300);
    
    // Parse AI response
    let matchedSkills = [];
    let explanation = '';
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        matchedSkills = Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [];
        explanation = parsed.explanation || '';
      }
    } catch (parseErr) {
      console.error('AI response parse error:', parseErr);
    }
    
    // Filter to only skills that actually exist
    const validSkills = matchedSkills.filter(s => 
      availableSkills.some(as => as.toLowerCase() === s.toLowerCase())
    );
    
    // Get tutors for these skills
    const tutors = await getTutorsForSkills(db, validSkills, req.userId);
    
    res.json({
      success: true,
      skills: validSkills,
      tutors,
      aiSuggestion: explanation
    });
    
  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({ success: false, message: 'AI search failed: ' + error.message });
  }
});

/**
 * POST /api/ai/chat
 * AI tutoring chatbot - helps find tutors or teaches concepts
 */
router.post('/chat', validateSession, async (req, res) => {
  const db = req.app.locals.db;
  const { message, history = [] } = req.body;
  
  if (!message || String(message).trim().length < 1) {
    return res.status(400).json({ success: false, message: 'Message required' });
  }
  
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ success: false, message: 'AI service not configured' });
  }
  
  try {
    // Get available skills and tutors for context
    const availableSkills = await getAllSkills(db);
    const { getAll } = require('../config/database');
    
    // Get top tutors with their skills
    const topTutors = await getAll(db, `
      SELECT 
        u.username,
        COALESCE(p.full_name, u.username) AS name,
        GROUP_CONCAT(DISTINCT s.skill_name) AS skills,
        (SELECT ROUND(AVG(rating), 1) FROM ratings WHERE rated_id = u.id) AS rating
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN skills s ON s.user_id = u.id AND s.skill_type = 'offered'
      WHERE u.status = 'active' AND u.id != ?
      GROUP BY u.id
      HAVING skills IS NOT NULL
      ORDER BY rating DESC NULLS LAST
      LIMIT 15
    `, [req.userId]);
    
    const tutorContext = topTutors.map(t => 
      `${t.name} (@${t.username}): teaches ${t.skills}${t.rating ? `, rated ${t.rating}/5` : ''}`
    ).join('\n');
    
    const systemPrompt = `You are SkillBot, a friendly AI assistant for SkillSwap - an educational platform where students help each other learn new skills.

Your capabilities:
1. **Find Tutors**: Help users find the right tutor for their learning needs
2. **Explain Concepts**: Provide brief educational explanations on topics
3. **Learning Advice**: Give study tips and learning strategies
4. **Platform Help**: Guide users on how to use SkillSwap

Available skills on the platform: ${availableSkills.join(', ')}

Current tutors:
${tutorContext}

Guidelines:
- Be friendly, encouraging, and educational
- When recommending tutors, mention their username with @ so users can find them
- Keep explanations concise but helpful (2-3 paragraphs max)
- If a skill isn't available, suggest similar ones or encourage them to check back later
- For complex topics, give a brief overview and suggest booking a session for deeper learning
- Always be supportive of students learning new things

Format recommendations like this when suggesting tutors:
"I'd recommend checking out **@username** who teaches [skill]!"`;

    // Build conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ];
    
    const aiResponse = await callOpenAI(messages, 800);
    
    // Extract any mentioned usernames for quick action
    const mentionedUsers = [];
    const usernameMatches = aiResponse.match(/@(\w+)/g);
    if (usernameMatches) {
      for (const match of usernameMatches) {
        const username = match.slice(1);
        const tutor = topTutors.find(t => t.username.toLowerCase() === username.toLowerCase());
        if (tutor) {
          // Get user ID
          const user = await getAll(db, 'SELECT id FROM users WHERE username = ?', [tutor.username]);
          if (user.length) {
            mentionedUsers.push({
              username: tutor.username,
              name: tutor.name,
              userId: user[0].id,
              skills: tutor.skills
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      response: aiResponse,
      mentionedUsers
    });
    
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI chat failed: ' + error.message });
  }
});

/**
 * GET /api/ai/status
 * Check if AI features are available
 */
router.get('/status', validateSession, (req, res) => {
  res.json({
    success: true,
    available: !!OPENAI_API_KEY,
    model: OPENAI_MODEL
  });
});

module.exports = router;

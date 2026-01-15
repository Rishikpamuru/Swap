/**
 * Input Validation Middleware
 * BPA Web Application - SkillSwap
 * 
 * Centralized validation functions for all user inputs
 */

/**
 * Validate registration data
 */
function validateRegistration(data) {
  const errors = {};

  const fullName = (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim()).trim();
  const bio = (data.bio || '').trim();

  // Username validation
  if (!data.username) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3 || data.username.length > 20) {
    errors.username = 'Username must be 3-20 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = 'Password must contain at least one uppercase letter';
  } else if (!/[a-z]/.test(data.password)) {
    errors.password = 'Password must contain at least one lowercase letter';
  } else if (!/[0-9]/.test(data.password)) {
    errors.password = 'Password must contain at least one number';
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(data.password)) {
    errors.password = 'Password must contain at least one special character';
  }

  // Password confirmation
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Profile requirements
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length > 100) {
    errors.fullName = 'Full name must be 100 characters or less';
  }

  if (!bio) {
    errors.bio = 'About Me is required';
  } else if (bio.length > 500) {
    errors.bio = 'About Me must be 500 characters or less';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate login data
 */
function validateLogin(data) {
  const errors = {};

  if (!data.username) {
    errors.username = 'Username is required';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate profile data
 */
function validateProfile(data) {
  const errors = {};

  if (data.full_name && data.full_name.length > 100) {
    errors.full_name = 'Full name must be less than 100 characters';
  }

  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }

  if (data.privacy_level && !['public', 'friends', 'private'].includes(data.privacy_level)) {
    errors.privacy_level = 'Invalid privacy level';
  }

  if (data.school && data.school.length > 100) {
    errors.school = 'School name must be less than 100 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate skill data
 */
function validateSkill(data) {
  const errors = {};

  if (!data.skill_name) {
    errors.skill_name = 'Skill name is required';
  } else if (data.skill_name.length > 100) {
    errors.skill_name = 'Skill name must be less than 100 characters';
  }

  if (!data.skill_type) {
    errors.skill_type = 'Skill type is required';
  } else if (!['offered', 'sought'].includes(data.skill_type)) {
    errors.skill_type = 'Invalid skill type';
  }

  if (data.proficiency && !['beginner', 'intermediate', 'expert'].includes(data.proficiency)) {
    errors.proficiency = 'Invalid proficiency level';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate session data
 */
function validateSession(data) {
  const errors = {};

  if (!data.scheduled_date) {
    errors.scheduled_date = 'Scheduled date is required';
  } else {
    const date = new Date(data.scheduled_date);
    if (isNaN(date.getTime())) {
      errors.scheduled_date = 'Invalid date format';
    } else if (date < new Date()) {
      errors.scheduled_date = 'Cannot schedule session in the past';
    }
  }

  if (data.duration && (data.duration < 15 || data.duration > 480)) {
    errors.duration = 'Duration must be between 15 and 480 minutes';
  }

  if (data.location && data.location.length > 200) {
    errors.location = 'Location must be less than 200 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate message data
 */
function validateMessage(data) {
  const errors = {};

  if (!data.receiver_id) {
    errors.receiver_id = 'Receiver is required';
  }

  if (!data.subject) {
    errors.subject = 'Subject is required';
  } else if (data.subject.length > 200) {
    errors.subject = 'Subject must be less than 200 characters';
  }

  if (!data.content) {
    errors.content = 'Message content is required';
  } else if (data.content.length > 2000) {
    errors.content = 'Message must be less than 2000 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate rating data
 */
function validateRating(data) {
  const errors = {};

  if (!data.session_id) {
    errors.session_id = 'Session ID is required';
  }

  if (!data.rating) {
    errors.rating = 'Rating is required';
  } else if (data.rating < 1 || data.rating > 5) {
    errors.rating = 'Rating must be between 1 and 5';
  }

  if (data.feedback && data.feedback.length > 1000) {
    errors.feedback = 'Feedback must be less than 1000 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate ID parameter
 */
function validateId(id) {
  const numId = parseInt(id);
  return !isNaN(numId) && numId > 0;
}

/**
 * Sanitize string input
 */
function sanitize(input) {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate pagination parameters
 */
function validatePagination(query) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 20;

  // Constrain values
  page = Math.max(1, Math.min(page, 1000));
  limit = Math.max(1, Math.min(limit, 100));

  return { page, limit };
}

/**
 * Express middleware for validation
 */
function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors
      });
    }

    next();
  };
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfile,
  validateSkill,
  validateSession,
  validateMessage,
  validateRating,
  validateId,
  sanitize,
  validatePagination,
  validate
};

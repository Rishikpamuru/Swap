/**
 * SkillSwap - Modern Application Logic
 * Handles routing, state management, and UI interactions
 */

// Application State
const AppState = {
  currentUser: null,
  currentPage: 'login',
  sidebarOpen: true,
  profileEditOpen: false,
  users: [],
  sessions: [],
  achievements: [],
  notifications: 3,
  unreadMessages: 0,
  unreadPollerId: null
};

// ========== Client-Side Validation Utilities ==========
const Validators = {
  // Validation rules
  rules: {
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
      specialChars: '!@#$%^&*()_+-=[]{};\':"|,.<>/?~`'
    },
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
  },

  // Validate password with detailed feedback
  validatePassword(password) {
    const errors = [];
    const requirements = [];
    const rules = this.rules.password;

    // Length check
    const lengthValid = password && password.length >= rules.minLength;
    requirements.push({
      text: `At least ${rules.minLength} characters`,
      valid: lengthValid
    });
    if (!lengthValid) errors.push(`Password must be at least ${rules.minLength} characters`);

    // Uppercase check
    const upperValid = /[A-Z]/.test(password);
    requirements.push({
      text: 'One uppercase letter (A-Z)',
      valid: upperValid
    });
    if (!upperValid) errors.push('Password must contain at least one uppercase letter');

    // Lowercase check
    const lowerValid = /[a-z]/.test(password);
    requirements.push({
      text: 'One lowercase letter (a-z)',
      valid: lowerValid
    });
    if (!lowerValid) errors.push('Password must contain at least one lowercase letter');

    // Number check
    const numberValid = /[0-9]/.test(password);
    requirements.push({
      text: 'One number (0-9)',
      valid: numberValid
    });
    if (!numberValid) errors.push('Password must contain at least one number');

    // Special character check
    const specialRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
    const specialValid = specialRegex.test(password);
    requirements.push({
      text: 'One special character (!@#$%...)',
      valid: specialValid
    });
    if (!specialValid) errors.push('Password must contain at least one special character');

    // Calculate strength (0-100)
    const validCount = requirements.filter(r => r.valid).length;
    const strength = Math.round((validCount / requirements.length) * 100);

    return {
      valid: errors.length === 0,
      errors,
      requirements,
      strength,
      strengthLabel: strength >= 100 ? 'Strong' : strength >= 60 ? 'Medium' : 'Weak'
    };
  },

  // Validate email
  validateEmail(email) {
    const valid = this.rules.email.pattern.test(email);
    return {
      valid,
      error: valid ? null : 'Please enter a valid email address'
    };
  },

  // Validate username
  validateUsername(username) {
    const errors = [];
    const rules = this.rules.username;

    if (!username || username.length < rules.minLength || username.length > rules.maxLength) {
      errors.push(`Username must be ${rules.minLength}-${rules.maxLength} characters`);
    }

    if (!rules.pattern.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate passwords match
  validatePasswordMatch(password, confirmPassword) {
    const valid = password === confirmPassword && password.length > 0;
    return {
      valid,
      error: valid ? null : 'Passwords do not match'
    };
  },

  // Validate required field
  validateRequired(value, fieldName) {
    const valid = value && value.trim().length > 0;
    return {
      valid,
      error: valid ? null : `${fieldName} is required`
    };
  }
};

// Form validation UI helpers
const FormValidation = {
  // Show error for a field
  showError(input, message) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    // Remove existing error
    this.clearError(input);

    // Add error styling
    input.classList.add('form-input-error');
    input.setAttribute('aria-invalid', 'true');

    // Create and append error message
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error animate-fade-in';
    errorEl.textContent = message;
    errorEl.id = `${input.name || input.id}-error`;
    input.setAttribute('aria-describedby', errorEl.id);
    formGroup.appendChild(errorEl);
  },

  // Clear error for a field
  clearError(input) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    input.classList.remove('form-input-error');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');

    const existingError = formGroup.querySelector('.form-error');
    if (existingError) existingError.remove();
  },

  // Show success for a field
  showSuccess(input) {
    this.clearError(input);
    input.classList.add('form-input-success');
  },

  // Create password strength indicator
  createPasswordStrength(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="password-strength" style="margin-top: 0.5rem;">
        <div class="password-strength-bar" style="height: 4px; background: var(--bg-gray); border-radius: 4px; overflow: hidden;">
          <div class="password-strength-fill" style="height: 100%; width: 0%; transition: all 0.3s ease; border-radius: 4px;"></div>
        </div>
        <div class="password-requirements" style="margin-top: 0.75rem; font-size: 0.8rem;"></div>
      </div>
    `;
  },

  // Update password strength indicator
  updatePasswordStrength(containerId, validation) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const fill = container.querySelector('.password-strength-fill');
    const reqContainer = container.querySelector('.password-requirements');

    if (fill) {
      fill.style.width = `${validation.strength}%`;
      fill.style.background = validation.strength >= 100 ? 'var(--green-primary)' :
        validation.strength >= 60 ? '#f59e0b' : 'var(--red-primary)';
    }

    if (reqContainer) {
      reqContainer.innerHTML = validation.requirements.map(req => `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; color: ${req.valid ? 'var(--green-primary)' : 'var(--text-secondary)'};">
          <i class="fas fa-${req.valid ? 'check-circle' : 'circle'}" style="font-size: 0.75rem;"></i>
          <span>${req.text}</span>
        </div>
      `).join('');
    }
  },

  // Setup real-time validation on a form
  setupRealTimeValidation(formId, validationRules) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.entries(validationRules).forEach(([fieldName, validateFn]) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;

      // Validate on blur
      input.addEventListener('blur', () => {
        const result = validateFn(input.value, form);
        if (!result.valid) {
          this.showError(input, result.errors ? result.errors[0] : result.error);
        } else {
          this.showSuccess(input);
        }
      });

      // Clear error on focus
      input.addEventListener('focus', () => {
        this.clearError(input);
      });

      // Real-time validation for password
      if (fieldName === 'password') {
        input.addEventListener('input', () => {
          const result = Validators.validatePassword(input.value);
          this.updatePasswordStrength('password-strength-container', result);
        });
      }
    });

    // Validate entire form on submit
    form.addEventListener('submit', (e) => {
      let isValid = true;

      Object.entries(validationRules).forEach(([fieldName, validateFn]) => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (!input) return;

        const result = validateFn(input.value, form);
        if (!result.valid) {
          this.showError(input, result.errors ? result.errors[0] : result.error);
          isValid = false;
        }
      });

      if (!isValid) {
        e.preventDefault();
        // Focus first error field
        const firstError = form.querySelector('.form-input-error');
        if (firstError) firstError.focus();
      }
    });
  }
};

// Expose for global use
window.Validators = Validators;
window.FormValidation = FormValidation;

function getCurrentUser() {
  if (AppState.currentUser) return AppState.currentUser;
  const raw = sessionStorage.getItem('user');
  if (raw) {
    try {
      AppState.currentUser = JSON.parse(raw);
      return AppState.currentUser;
    } catch {
      // ignore
    }
  }
  return null;
}

async function refreshCurrentUser() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    if (data.success && data.authenticated && data.user) {
      AppState.currentUser = data.user;
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('isLoggedIn', 'true');
    } else if (data.success && data.authenticated === false) {
      // Session is not valid anymore; clear client-side session markers
      AppState.currentUser = null;
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('isLoggedIn');
    }
  } catch {
    // ignore
  }
}

function setUnreadMessagesCount(count) {
  const n = Math.max(0, Number(count) || 0);
  AppState.unreadMessages = n;
  const badge = document.getElementById('messages-unread-badge');
  if (!badge) return;
  if (n > 0) {
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = 'flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

function syncUnreadMessagesBadge() {
  setUnreadMessagesCount(AppState.unreadMessages || 0);
}

async function refreshUnreadMessagesCount() {
  const me = getCurrentUser();
  if (!me?.id) {
    setUnreadMessagesCount(0);
    return;
  }

  try {
    const res = await fetch('/api/messages/conversations', { credentials: 'same-origin' });
    const ct = String(res.headers.get('content-type') || '');
    if (!ct.includes('application/json')) return;
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const convos = Array.isArray(data.conversations) ? data.conversations : [];
    const total = convos.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
    setUnreadMessagesCount(total);
  } catch {
    // ignore
  }
}

function startUnreadMessagesPolling() {
  if (AppState.unreadPollerId) return;
  refreshUnreadMessagesCount();
  AppState.unreadPollerId = setInterval(() => {
    if (!sessionStorage.getItem('isLoggedIn')) return;
    refreshUnreadMessagesCount();
  }, 12000);
}

function stopUnreadMessagesPolling() {
  if (AppState.unreadPollerId) {
    clearInterval(AppState.unreadPollerId);
    AppState.unreadPollerId = null;
  }
}

// Mock Data
const MockData = {
  users: [
    { id: 101, name: 'Alex Johnson', profession: 'Math Tutor', className: '11th Grade', avatar: '' },
    { id: 102, name: 'Sarah Chen', profession: 'Chemistry Tutor', className: '12th Grade', avatar: '' },
    { id: 103, name: 'Miguel Rivera', profession: 'Computer Science Tutor', className: '10th Grade', avatar: '' },
    { id: 104, name: 'Priya Patel', profession: 'English Tutor', className: '11th Grade', avatar: '' },
    { id: 105, name: 'Hannah Lee', profession: 'History Tutor', className: '12th Grade', avatar: '' },
    { id: 106, name: 'Ethan Nguyen', profession: 'Physics Tutor', className: '11th Grade', avatar: '' }
  ],
  achievements: [
    // Getting Started (1-4)
    { id: 1, name: 'First Steps', description: 'Complete your first tutoring session', icon: '🏁', unlocked: false, date: null },
    { id: 2, name: 'Rising Star', description: 'Receive your first 5-star rating', icon: '⭐', unlocked: false, date: null },
    { id: 3, name: 'Mentor Master', description: 'Complete 50 sessions as a tutor', icon: '🎓', unlocked: false, date: null },
    { id: 4, name: 'Perfect Score', description: 'Maintain a 5.0 average rating', icon: '💯', unlocked: false, date: null },

    // Profile Milestones (5-9)
    { id: 5, name: 'All Set', description: 'Complete your profile (name, bio, and skills)', icon: '✅', unlocked: false, date: null },
    { id: 6, name: 'Picture Perfect', description: 'Upload a profile picture', icon: '📸', unlocked: false, date: null },
    { id: 7, name: 'Skill Starter', description: 'Add your first skill to offer', icon: '🎯', unlocked: false, date: null },
    { id: 8, name: 'Skill Collector', description: 'Offer 5 different skills', icon: '🔧', unlocked: false, date: null },
    { id: 9, name: 'Skill Master', description: 'Offer 10 different skills', icon: '🛠️', unlocked: false, date: null },

    // Teaching & Offers (10-13)
    { id: 10, name: 'Open for Business', description: 'Publish your first session offer', icon: '📢', unlocked: false, date: null },
    { id: 11, name: 'Active Tutor', description: 'Publish 5 session offers', icon: '📋', unlocked: false, date: null },
    { id: 12, name: 'Super Tutor', description: 'Publish 10 session offers', icon: '🌟', unlocked: false, date: null },
    { id: 13, name: 'Tutor Elite', description: 'Publish 25 session offers', icon: '👑', unlocked: false, date: null },

    // Learning & Requests (14-17)
    { id: 14, name: 'Eager Learner', description: 'Send your first session request', icon: '📝', unlocked: false, date: null },
    { id: 15, name: 'Knowledge Seeker', description: 'Send 5 session requests', icon: '📚', unlocked: false, date: null },
    { id: 16, name: 'Dedicated Student', description: 'Send 10 session requests', icon: '🎒', unlocked: false, date: null },
    { id: 17, name: 'Curious Mind', description: 'Request sessions for 5 different skills', icon: '🧠', unlocked: false, date: null },

    // Tutor Session Milestones (18-22)
    { id: 18, name: 'First Teach', description: 'Complete your first session as a tutor', icon: '🍎', unlocked: false, date: null },
    { id: 19, name: 'Helping Hand', description: 'Complete 5 sessions as a tutor', icon: '🤝', unlocked: false, date: null },
    { id: 20, name: 'Teaching Pro', description: 'Complete 10 sessions as a tutor', icon: '📖', unlocked: false, date: null },
    { id: 21, name: 'Expert Educator', description: 'Complete 25 sessions as a tutor', icon: '🏆', unlocked: false, date: null },
    { id: 22, name: 'Legendary Tutor', description: 'Complete 50 sessions as a tutor', icon: '🌠', unlocked: false, date: null },

    // Student Session Milestones (23-26)
    { id: 23, name: 'First Lesson', description: 'Complete your first session as a student', icon: '📓', unlocked: false, date: null },
    { id: 24, name: 'Active Learner', description: 'Complete 5 sessions as a student', icon: '✏️', unlocked: false, date: null },
    { id: 25, name: 'Studious', description: 'Complete 10 sessions as a student', icon: '📕', unlocked: false, date: null },
    { id: 26, name: 'Scholar', description: 'Complete 25 sessions as a student', icon: '🎖️', unlocked: false, date: null },

    // Special Achievements (27-29)
    { id: 27, name: 'Quick Accept', description: 'Accept a request within 1 hour', icon: '⚡', unlocked: false, date: null },
    { id: 28, name: 'Consistency', description: 'Complete 10 sessions total', icon: '🔁', unlocked: false, date: null },
    { id: 29, name: 'Punctual', description: 'Be on time for 5 consecutive sessions', icon: '⏰', unlocked: false, date: null },

    // Messaging (30-33)
    { id: 30, name: 'Connector', description: 'Start your first conversation', icon: '💬', unlocked: false, date: null },
    { id: 31, name: 'Communicator', description: 'Send 25 messages', icon: '📨', unlocked: false, date: null },
    { id: 32, name: 'Socialite', description: 'Have conversations with 10 different users', icon: '🗣️', unlocked: false, date: null },
    { id: 33, name: 'Inbox Zero', description: 'Read all your messages', icon: '📭', unlocked: false, date: null },

    // Ratings & Feedback (34-37)
    { id: 34, name: 'First Review', description: 'Leave your first rating', icon: '📝', unlocked: false, date: null },
    { id: 35, name: 'Reviewer', description: 'Leave 5 ratings', icon: '✍️', unlocked: false, date: null },
    { id: 36, name: 'Critic', description: 'Leave 10 ratings', icon: '🔍', unlocked: false, date: null },
    { id: 37, name: 'Well Reviewed', description: 'Receive 10 ratings', icon: '⭐', unlocked: false, date: null },

    // Elite & Special (38-40)
    { id: 38, name: 'Community Builder', description: 'Help 10 unique students', icon: '🌍', unlocked: false, date: null },
    { id: 39, name: 'Veteran', description: 'Be a member for 30 days', icon: '🎖️', unlocked: false, date: null },
    { id: 40, name: 'SkillSwap Legend', description: 'Unlock 30 other achievements', icon: '🏅', unlocked: false, date: null }
  ],
  sessions: []
};

const Utils = {
  escapeHtml(input) {
    const s = String(input ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  getInitials(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) return 'U';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
    return (first + last).toUpperCase() || 'U';
  },

  formatDate(dateLike) {
    if (!dateLike) return '';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return String(dateLike);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime(dateLike) {
    if (!dateLike) return '';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return String(dateLike);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },

  showConfirmModal(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const modalId = 'confirm-modal-' + Date.now();
      const modalHtml = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
          <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 440px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 700;">${Utils.escapeHtml(title)}</h3>
            <p style="margin: 0 0 1.25rem 0; color: var(--text-secondary); line-height: 1.5;">${Utils.escapeHtml(message)}</p>
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
              <button class="modal-cancel-btn" style="padding: 0.75rem 1.5rem; border: 1px solid var(--border-light); background: white; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--text-secondary);">Cancel</button>
              <button class="modal-confirm-btn" style="padding: 0.75rem 1.5rem; border: none; background: var(--blue-primary); color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Confirm</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById(modalId);
      const cleanup = () => modal.remove();

      modal.querySelector('.modal-confirm-btn').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      modal.querySelector('.modal-cancel-btn').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });
    });
  },

  showPromptModal(message, title = 'Input Required', placeholder = '') {
    return new Promise((resolve) => {
      const modalId = 'prompt-modal-' + Date.now();
      const modalHtml = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
          <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 440px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 700;">${Utils.escapeHtml(title)}</h3>
            <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.5;">${Utils.escapeHtml(message)}</p>
            <textarea class="modal-input" placeholder="${Utils.escapeHtml(placeholder)}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-light); border-radius: 8px; font-family: inherit; font-size: 1rem; min-height: 90px; resize: vertical;" autofocus></textarea>
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button class="modal-cancel-btn" style="padding: 0.75rem 1.5rem; border: 1px solid var(--border-light); background: white; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--text-secondary);">Cancel</button>
              <button class="modal-confirm-btn" style="padding: 0.75rem 1.5rem; border: none; background: var(--blue-primary); color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">OK</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById(modalId);
      const input = modal.querySelector('.modal-input');
      const cleanup = () => modal.remove();

      modal.querySelector('.modal-confirm-btn').addEventListener('click', () => {
        const value = String(input.value || '').trim();
        cleanup();
        resolve(value || null);
      });

      modal.querySelector('.modal-cancel-btn').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      });

      input.focus();
    });
  }
};

// Router
const Router = {
  routes: {
    'login': renderLoginPage,
    'register': renderRegisterPage,
    'dashboard': renderDashboardPage,
    'search': renderSearchPage,
    // New simplified UX
    'create-session': renderCreateSessionHomePage,
    'teach': renderTeachOfferPage,
    'learn': renderLearnOffersPage,

    // Backwards-compatible aliases (old Tutor/Student pages removed from sidebar)
    'tutors-current': renderLearnOffersPage,
    'tutors-upcoming': renderLearnOffersPage,
    'tutors-past': renderLearnOffersPage,
    'students-current': renderSessionsPage,
    'students-upcoming': renderSessionsPage,
    'students-past': renderSessionsPage,
    'sessions': renderSessionsPage,
    'request-session': renderRequestSessionPage,
    'create-session-form': renderCreateSessionPage,
    'past-sessions': renderPastSessionsPage,
    'achievements': renderAchievementsPage,
    'profile': renderProfilePage,
    // Settings page removed from UX; keep route as alias to profile for backwards safety
    'settings': renderProfilePage,
    'messages': renderMessagesPage,
    'reports': renderReportsPage,
    'admin': renderAdminPage,
    'works-cited': renderWorksCitedPage,
    'ai-tutor': renderAITutorPage
  },

  navigate(page) {
    // Allow pages to clean up timers/listeners when navigating away
    if (typeof AppState.cleanup === 'function') {
      try {
        AppState.cleanup();
      } catch {
        // ignore cleanup failures
      } finally {
        AppState.cleanup = null;
      }
    }

    AppState.currentPage = page;
    const renderFunc = this.routes[page];
    if (renderFunc) {
      // Handle both sync and async render functions
      const result = renderFunc();
      if (result && typeof result.catch === 'function') {
        result.catch(error => {
          console.error(`Error rendering page '${page}':`, error);
          render404Page();
        });
      }
    } else {
      render404Page();
    }

    // Update active nav items
    document.querySelectorAll('.sidebar-nav-item, .sidebar-nav-child').forEach(item => {
      item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }
};

// Expose Router for inline onclick handlers (global const/let aren't on window)
window.Router = Router;

// Star Rating Component (reusable)
function clampRatingValue(value, min = 0, max = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function roundToStep(value, step = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n) || step <= 0) return 0;
  return Math.round(n / step) * step;
}

function formatRatingDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return (Math.round(n * 10) / 10).toString();
}

function buildStarLayers(fillPercent) {
  const pct = Math.max(0, Math.min(100, fillPercent));
  return `
    <span class="star-rating-star" aria-hidden="true">
      <i class="fas fa-star star-empty"></i>
      <span class="star-fill" style="width:${pct}%;">
        <i class="fas fa-star star-full"></i>
      </span>
    </span>
  `;
}

function buildStarsHTML(value, maxStars = 5, { interactive = false, label = 'Rating' } = {}) {
  const max = Number.isFinite(Number(maxStars)) ? Math.max(1, Math.floor(Number(maxStars))) : 5;
  const v = clampRatingValue(roundToStep(value, 0.5), 0, max);
  const stars = [];

  for (let i = 1; i <= max; i++) {
    const delta = v - (i - 1);
    const fill = delta >= 1 ? 100 : delta >= 0.5 ? 50 : 0;
    const starInner = buildStarLayers(fill);

    if (!interactive) {
      stars.push(starInner);
      continue;
    }

    stars.push(`
      <button type="button" class="star-rating-btn" data-star="${i}" aria-label="${i} out of ${max} stars">
        ${starInner}
      </button>
    `);
  }

  const roleAttr = interactive
    ? `role="group" aria-label="${label}"`
    : `role="img" aria-label="${formatRatingDisplay(v)} out of ${max} stars"`;

  return `<div class="star-rating-stars" ${roleAttr}>${stars.join('')}</div>`;
}

function starRatingComponentHTML({
  id,
  value = 0,
  max = 5,
  mode = 'readonly',
  name,
  label = 'Rating',
  showValue = true
} = {}) {
  const isInteractive = mode === 'interactive';
  const v = clampRatingValue(roundToStep(value, 0.5), 0, max);
  const safeId = id ? String(id) : '';
  const hiddenInput = isInteractive && name
    ? `<input type="hidden" name="${String(name)}" value="${v}" data-role="value-input">`
    : '';

  return `
    <div class="star-rating" ${safeId ? `id="${safeId}"` : ''} data-mode="${isInteractive ? 'interactive' : 'readonly'}" data-max="${max}" data-value="${v}">
      ${showValue ? `<output class="star-rating-value" aria-live="polite" data-role="value">${formatRatingDisplay(v)}</output>` : ''}
      ${buildStarsHTML(v, max, { interactive: isInteractive, label })}
      ${hiddenInput}
    </div>
  `;
}

function setStarRatingValue(el, nextValue, { silent = false } = {}) {
  if (!el) return;
  const max = Number(el.dataset.max || 5);
  const value = clampRatingValue(roundToStep(nextValue, 0.5), 0, max);
  el.dataset.value = String(value);

  const valueEl = el.querySelector('[data-role="value"]');
  if (valueEl) valueEl.textContent = formatRatingDisplay(value);

  const hidden = el.querySelector('[data-role="value-input"]');
  if (hidden) hidden.value = String(value);

  const starsContainer = el.querySelector('.star-rating-stars');
  if (starsContainer) {
    starsContainer.outerHTML = buildStarsHTML(value, max, {
      interactive: el.dataset.mode === 'interactive',
      label: starsContainer.getAttribute('aria-label') || 'Rating'
    });
  }

  if (!silent) {
    el.dispatchEvent(new CustomEvent('ratingchange', { detail: { value } }));
  }
}

function initializeStarRatings(root = document) {
  const elements = Array.from(root.querySelectorAll('.star-rating'));
  elements.forEach((el) => {
    if (el.dataset.initialized === 'true') return;
    el.dataset.initialized = 'true';

    // Initial render from attribute
    setStarRatingValue(el, el.dataset.value || 0, { silent: true });

    // Auto-update if data-value changes externally
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-value') {
          setStarRatingValue(el, el.dataset.value || 0, { silent: true });
        }
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-value'] });

    if (el.dataset.mode !== 'interactive') return;

    const max = Number(el.dataset.max || 5);

    const getValueFromPointer = (button, clientX) => {
      const starIndex = Number(button.dataset.star || 1);
      const rect = button.getBoundingClientRect();
      const isLeftHalf = clientX < rect.left + rect.width / 2;
      return isLeftHalf ? Math.max(0, starIndex - 0.5) : starIndex;
    };

    el.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('.star-rating-btn');
      if (!btn || !el.contains(btn)) return;
      const preview = getValueFromPointer(btn, e.clientX);
      el.dataset.preview = String(preview);
      setStarRatingValue(el, preview, { silent: true });
    });

    el.addEventListener('mouseleave', () => {
      const current = Number(el.dataset.value || 0);
      delete el.dataset.preview;
      setStarRatingValue(el, current, { silent: true });
    });

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.star-rating-btn');
      if (!btn || !el.contains(btn)) return;
      const next = getValueFromPointer(btn, e.clientX);
      setStarRatingValue(el, next);
    });

    el.addEventListener('keydown', (e) => {
      const isArrow = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      const isHomeEnd = e.key === 'Home' || e.key === 'End';
      if (!isArrow && !isHomeEnd) return;

      e.preventDefault();
      const current = Number(el.dataset.value || 0);
      const step = 0.5;

      let next = current;
      if (e.key === 'ArrowLeft') next = current - step;
      if (e.key === 'ArrowRight') next = current + step;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = max;

      setStarRatingValue(el, next);
    });

    // Ensure the group is focusable for arrow-key support
    el.tabIndex = 0;
  });
}

window.StarRating = {
  init: initializeStarRatings,
  setValue: (elOrId, value) => {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    setStarRatingValue(el, value);
  },
  getValue: (elOrId) => {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    return el ? Number(el.dataset.value || 0) : 0;
  }
};

// Component Builders
const Components = {
  sidebar() {
    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    return `
      <aside class="sidebar ${AppState.sidebarOpen ? '' : 'collapsed'}" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="sidebar-logo-bg">
              <img src="LogoNoTitle__Logo_-removebg-preview.png" alt="SkillSwap">
            </div>
          </div>
          <div class="sidebar-brand">
            <div class="sidebar-brand-text">SKILL</div>
            <div class="sidebar-brand-text">SWAP</div>
          </div>
        </div>
        
        <nav class="sidebar-nav">
          ${isAdmin ? `
          <a href="#" class="sidebar-nav-item" data-page="search">
            <span class="sidebar-nav-item-icon"><i class="fas fa-search"></i></span>
            <span>Search</span>
          </a>

          <a href="#" class="sidebar-nav-item" data-page="messages">
            <span class="sidebar-nav-item-icon"><i class="fas fa-envelope"></i></span>
            <span>Messages</span>
            <span id="messages-unread-badge" class="notification-badge" style="position: static; margin-left: auto; width: 22px; height: 22px; font-size: 0.75rem; display: none;"></span>
          </a>
          
          <a href="#" class="sidebar-nav-item" data-page="admin">
            <span class="sidebar-nav-item-icon"><i class="fas fa-shield-alt"></i></span>
            <span>Admin Panel</span>
          </a>
          ` : `
          <a href="#" class="sidebar-nav-item" data-page="dashboard">
            <span class="sidebar-nav-item-icon"><i class="fas fa-chart-line"></i></span>
            <span>Dashboard</span>
          </a>

          <a href="#" class="sidebar-nav-item" data-page="create-session">
            <span class="sidebar-nav-item-icon"><i class="fas fa-plus-circle"></i></span>
            <span>Create Session</span>
          </a>
          
          <a href="#" class="sidebar-nav-item" data-page="search">
            <span class="sidebar-nav-item-icon"><i class="fas fa-search"></i></span>
            <span>Search</span>
          </a>
          
          <a href="#" class="sidebar-nav-item" data-page="achievements">
            <span class="sidebar-nav-item-icon"><i class="fas fa-trophy"></i></span>
            <span>Achievements</span>
          </a>

          <a href="#" class="sidebar-nav-item" data-page="past-sessions">
            <span class="sidebar-nav-item-icon"><i class="fas fa-history"></i></span>
            <span>View Past Sessions</span>
          </a>

          <a href="#" class="sidebar-nav-item" data-page="messages">
            <span class="sidebar-nav-item-icon"><i class="fas fa-envelope"></i></span>
            <span>Messages</span>
            <span id="messages-unread-badge" class="notification-badge" style="position: static; margin-left: auto; width: 22px; height: 22px; font-size: 0.75rem; display: none;"></span>
          </a>
          `}
        </nav>
        
        <div class="sidebar-footer">
          <a href="#" class="sidebar-nav-item" data-page="logout">
            <span class="sidebar-nav-item-icon"><i class="fas fa-sign-out-alt"></i></span>
            <span>Logout</span>
          </a>
          
          <!-- BPA Team Information -->
          <div class="sidebar-team-info" style="padding: 1rem; margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.7rem; color: rgba(255,255,255,0.6); line-height: 1.4;">
            <div style="font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 0.25rem;">Reedy HS BPA Chapter</div>
            <div>Jyothir Manchu, Aaryan Porwal, Rishik Pamuru</div>
            <div style="margin-top: 0.25rem;">Reedy High School</div>
            <div>Frisco, Texas • 2026</div>
            <div style="margin-top: 0.5rem;">
              <a href="#" class="sidebar-team-link" data-page="works-cited" style="color: rgba(255,255,255,0.85); font-weight: 600; text-decoration: underline;">Works Cited</a>
            </div>
          </div>
        </div>
      </aside>
    `;
  },

  topbar() {
    const user = getCurrentUser();
    const profileImage = user.profileImage ? `<img src="${user.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : Utils.getInitials(user.fullName || user.username || 'U');
    return `
      <div class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle" type="button" aria-label="Toggle sidebar"><i class="fas fa-bars"></i></button>
        </div>
        <div class="topbar-right">
          <button class="user-menu-btn">
            ${profileImage}
          </button>
        </div>
      </div>
    `;
  },

  userCard(user, buttonText = 'More user details', buttonVariant = 'primary') {
    return `
      <div class="user-card">
        <div class="user-avatar">
          ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : Utils.getInitials(user.name)}
        </div>
        <div class="user-name">${user.name}</div>
        <div class="user-divider"></div>
        <div class="user-profession">${user.profession}</div>
        ${user.className ? `<div class="user-class">${user.className}</div>` : ''}
        <button class="btn btn-${buttonVariant}" onclick="viewUserDetails(${user.id})">
          ${buttonText}
        </button>
      </div>
    `;
  },

  sessionCard(user, time) {
    return `
      <div class="session-card">
        <div class="session-avatar">
          ${Utils.getInitials(user.name)}
        </div>
        <div class="session-info">
          <div class="session-name">${user.name}</div>
          <div class="session-class">${user.className}</div>
          ${time ? `<div class="session-time">${time}</div>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="viewSessionDetails(${user.id})">
          Meeting Times
        </button>
      </div>
    `;
  },

  achievementCard(achievement) {
    return `
      <div class="achievement-card">
        <div class="achievement-icon-container">
          <span class="achievement-icon ${achievement.unlocked ? '' : 'locked'}">${achievement.icon}</span>
          ${achievement.unlocked ? '<span class="achievement-sparkles"><i class="fas fa-star"></i></span>' : ''}
        </div>
        <div class="achievement-info">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-description">${achievement.description}</div>
          ${achievement.unlocked
        ? (achievement.date
          ? `<span class="achievement-date">${Utils.escapeHtml(Utils.formatDate(achievement.date))}</span>`
          : '<span class="achievement-date">Unlocked</span>')
        : '<div class="achievement-unlock">How To Get</div>'
      }
        </div>
      </div>
    `;
  },

  modal(content, id = 'modal') {
    return `
      <div class="modal-overlay" id="${id}" onclick="closeModal('${id}')">
        <div class="modal" style="max-width: 1200px; width: 100%;" onclick="event.stopPropagation()">
          ${content}
        </div>
      </div>
    `;
  },

  starRating(options) {
    return starRatingComponentHTML(options);
  },

  ratingModal() {
    return `
      <div class="modal-header">
        <div class="modal-title">How did your meeting go?</div>
        <div class="modal-subtitle">Rate your experience</div>
      </div>
      <div class="modal-body">
        ${Components.starRating({ id: 'rating-control', value: 0, max: 5, mode: 'interactive', name: 'rating', label: 'Session rating', showValue: true })}
        <div class="form-group">
          <label class="form-label">Provide any feedback or suggestions <span style="color: var(--text-secondary);">(optional)</span></label>
          <textarea class="form-textarea" placeholder="Enter here..." id="feedback-text"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('rating-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="submitRating()">Submit</button>
      </div>
    `;
  }
};

function setAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}

function formatValidationErrors(result) {
  if (!result || typeof result !== 'object') return '';
  if (result.errors && typeof result.errors === 'object') {
    return Object.values(result.errors).filter(Boolean).join('\n');
  }
  return result.message || '';
}

// Page Renderers
function renderLoginPage() {
  document.body.innerHTML = `
    <div class="auth-container">
      <div class="auth-left">
        <div class="auth-logo-container">
          <div class="auth-logo-wrapper">
            <img src="LogoNoTitle__Logo_-removebg-preview.png" alt="SkillSwap" class="auth-logo-img">
            <div class="auth-logo-text">
              <div>SKILL</div>
              <div>SWAP</div>
            </div>
          </div>
        </div>
        <div class="auth-card">
          <div class="auth-title">Welcome Back</div>
          <div class="auth-subtitle">Please enter your details</div>
          
          <form id="login-form">
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-user"></i></span>
              <input type="text" class="form-input" placeholder="Username" required>
            </div>
            
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-lock"></i></span>
              <input type="password" class="form-input" placeholder="Password" required>
            </div>
            
            <button type="submit" class="btn btn-secondary btn-lg btn-full">Login</button>
            <div id="login-error" class="auth-error" aria-live="polite" style="display:none;"></div>
            
            <div style="text-align: center; margin-top: 1rem;">
              Don't have an account? <a href="#" id="login-register-link">Register</a>
            </div>
          </form>
          
          <!-- BPA Team Footer -->
          <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-light); text-align: center; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5;">
            <div style="font-weight: 600; color: var(--text-primary);">Reedy HS BPA Chapter</div>
            <div>Jyothir Manchu • Aaryan Porwal • Rishik Pamuru</div>
            <div>Reedy High School, Frisco, Texas • 2026</div>
            <div style="margin-top: 0.5rem;">
              <a href="#" id="login-works-cited-link" style="color: var(--blue-primary); font-weight: 600; text-decoration: underline;">Works Cited</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listener after DOM is ready
  setTimeout(() => {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', handleLogin);
    }

    const registerLink = document.getElementById('login-register-link');
    if (registerLink) {
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('register');
      });
    }

    const worksCitedLink = document.getElementById('login-works-cited-link');
    worksCitedLink?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('works-cited');
    });
  }, 0);
}

function renderRegisterPage() {
  document.body.innerHTML = `
    <div class="auth-container">
      <div class="auth-left">
        <div class="auth-logo-container">
          <div class="auth-logo-wrapper">
            <img src="LogoNoTitle__Logo_-removebg-preview.png" alt="SkillSwap" class="auth-logo-img">
            <div class="auth-logo-text">
              <div>SKILL</div>
              <div>SWAP</div>
            </div>
          </div>
        </div>
        <div class="auth-card">
          <div class="auth-icon"><i class="fas fa-user-plus"></i></div>
          <div class="auth-title">Sign Up</div>
          <div class="auth-subtitle">Create your account</div>
          
          <form id="register-form">
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-id-card"></i></span>
              <input type="text" name="fullName" class="form-input" placeholder="Full Name" required>
            </div>

            <div class="form-group">
              <span class="form-icon"><i class="fas fa-envelope"></i></span>
              <input type="email" name="email" class="form-input" placeholder="Email" required>
            </div>
            
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-user"></i></span>
              <input type="text" name="username" class="form-input" placeholder="Username" required>
            </div>
            
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-lock"></i></span>
              <input type="password" name="password" class="form-input" placeholder="Password" required>
            </div>
            
            <div class="form-group">
              <span class="form-icon"><i class="fas fa-lock"></i></span>
              <input type="password" name="confirmPassword" class="form-input" placeholder="Confirm Password" required>
            </div>

            <div class="form-group">
              <textarea name="bio" class="form-textarea" placeholder="About Me" required style="min-height: 110px;"></textarea>
              <div class="form-helper">Tell us a bit about yourself (max 500 characters)</div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-lg btn-full">Sign Up</button>
            <div id="register-error" class="auth-error" aria-live="polite" style="display:none;"></div>
          </form>
          
          <div class="auth-footer">
            Already have an account? <a href="#" id="register-login-link">Login</a>
          </div>
          
          <!-- BPA Team Footer -->
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light); text-align: center; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5;">
            <div style="font-weight: 600; color: var(--text-primary);">Reedy HS BPA Chapter</div>
            <div>Jyothir Manchu • Aaryan Porwal • Rishik Pamuru</div>
            <div>Reedy High School, Frisco, Texas • 2026</div>
            <div style="margin-top: 0.5rem;">
              <a href="#" id="register-works-cited-link" style="color: var(--blue-primary); font-weight: 600; text-decoration: underline;">Works Cited</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listener after DOM is ready
  setTimeout(() => {
    const form = document.getElementById('register-form');
    if (form) {
      form.addEventListener('submit', handleRegister);
    }

    const loginLink = document.getElementById('register-login-link');
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('login');
      });
    }

    const worksCitedLink = document.getElementById('register-works-cited-link');
    worksCitedLink?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('works-cited');
    });
  }, 0);
}

function renderDashboardPage() {
  const user = getCurrentUser();
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Welcome back, ${user.fullName || user.username}!</h1>
            <p class="page-subtitle">Click your profile picture in the top right to view and edit your profile</p>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📚</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Total Sessions</h3>
              <p style="font-size: 2.5rem; font-weight: 700; color: var(--blue-primary);">${user.totalSessions || 0}</p>
            </div>
            
            <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">⭐</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Average Rating</h3>
              <p style="font-size: 2.5rem; font-weight: 700; color: var(--blue-primary);">${(user.averageRating || 0).toFixed(1)}</p>
            </div>
            
            <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎯</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Skills Offered</h3>
              <p style="font-size: 2.5rem; font-weight: 700; color: var(--blue-primary);">${(user.skillsOffer || []).length}</p>
            </div>
          </div>

          <div style="margin-top: 2rem; background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
            <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="font-weight: 800; font-size: 1.125rem;">Quick Actions</div>
                <div style="color: var(--text-secondary); font-size: 0.95rem;">Common things you’ll do</div>
              </div>
              <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-light); color: var(--text-secondary); display:flex; align-items:center; justify-content:center;"><i class="fas fa-bolt"></i></div>
            </div>
            <div style="display:flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;">
              <button class="btn btn-primary" id="dash-offer-teach"><i class="fas fa-plus-circle"></i> Offer to Teach</button>
              <button class="btn btn-secondary" id="dash-find-session"><i class="fas fa-search"></i> Find a Session</button>
              <button class="btn btn-outline" id="dash-past-sessions"><i class="fas fa-history"></i> View Past Sessions</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <div style="background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
              <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
                <div>
                  <div style="font-weight: 800; font-size: 1.125rem;">Session Requests</div>
                  <div style="color: var(--text-secondary); font-size: 0.95rem;">Requests from students</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--blue-light); color: white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-inbox"></i></div>
              </div>
              <div id="dashboard-incoming-requests" style="margin-top: 1rem;">
                <div style="text-align:center; padding: 1.25rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>
              </div>
            </div>

            <div style="background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
              <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
                <div>
                  <div style="font-weight: 800; font-size: 1.125rem;">My Requests</div>
                  <div style="color: var(--text-secondary); font-size: 0.95rem;">Requests you sent</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--green-primary); color: white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-paper-plane"></i></div>
              </div>
              <div id="dashboard-outgoing-requests" style="margin-top: 1rem;">
                <div style="text-align:center; padding: 1.25rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>
              </div>
            </div>
          </div>

          <div style="margin-top: 1.5rem; background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
            <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="font-weight: 800; font-size: 1.125rem;">My Open Offers</div>
                <div style="color: var(--text-secondary); font-size: 0.95rem;">Offers you published (waiting for requests)</div>
              </div>
              <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--blue-light); color: white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-bullhorn"></i></div>
            </div>
            <div id="dashboard-my-offers" style="margin-top: 1rem;">
              <div style="text-align:center; padding: 1.25rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            <div style="background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
              <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
                <div>
                  <div style="font-weight: 800; font-size: 1.125rem;">Upcoming Teaching</div>
                  <div style="color: var(--text-secondary); font-size: 0.95rem;">Sessions where you are the tutor</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--blue-primary); color: white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-chalkboard-teacher"></i></div>
              </div>
              <div id="dashboard-upcoming-teaching" style="margin-top: 1rem;">
                <div style="text-align:center; padding: 1.25rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>
              </div>
            </div>

            <div style="background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
              <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
                <div>
                  <div style="font-weight: 800; font-size: 1.125rem;">Upcoming Learning</div>
                  <div style="color: var(--text-secondary); font-size: 0.95rem;">Sessions where you are the student</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--green-primary); color: white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-book-open"></i></div>
              </div>
              <div id="dashboard-upcoming-learning" style="margin-top: 1rem;">
                <div style="text-align:center; padding: 1.25rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  document.getElementById('dash-offer-teach')?.addEventListener('click', () => Router.navigate('create-session-form'));
  document.getElementById('dash-find-session')?.addEventListener('click', () => Router.navigate('learn'));
  document.getElementById('dash-past-sessions')?.addEventListener('click', () => Router.navigate('past-sessions'));

  // Load offers + sessions widgets
  (async () => {
    try {
      const [incomingRes, outgoingRes, teachingRes, learningRes, myOffersRes] = await Promise.all([
        fetch('/api/offers/requests/list?role=tutor&status=all'),
        fetch('/api/offers/requests/list?role=student&status=all'),
        fetch('/api/sessions?role=tutor&status=scheduled'),
        fetch('/api/sessions?role=student&status=scheduled'),
        fetch('/api/offers/mine?status=open')
      ]);

      const incomingAll = incomingRes.ok ? (await incomingRes.json()).requests || [] : [];
      const outgoingAll = outgoingRes.ok ? (await outgoingRes.json()).requests || [] : [];
      const teaching = teachingRes.ok ? (await teachingRes.json()).sessions || [] : [];
      const learning = learningRes.ok ? (await learningRes.json()).sessions || [] : [];
      const myOffers = myOffersRes.ok ? (await myOffersRes.json()).offers || [] : [];

      const incomingEl = document.getElementById('dashboard-incoming-requests');
      const outgoingEl = document.getElementById('dashboard-outgoing-requests');
      const teachingEl = document.getElementById('dashboard-upcoming-teaching');
      const learningEl = document.getElementById('dashboard-upcoming-learning');
      const myOffersEl = document.getElementById('dashboard-my-offers');

      const statusCounts = (list) => {
        const counts = { pending: 0, accepted: 0, declined: 0, cancelled: 0 };
        for (const r of (Array.isArray(list) ? list : [])) {
          const s = String(r.status || '').toLowerCase();
          if (counts[s] !== undefined) counts[s] += 1;
        }
        return counts;
      };

      const statusPill = (status) => {
        const s = String(status || '').toLowerCase();
        const map = {
          pending: { bg: 'rgba(59,130,246,0.12)', bd: 'rgba(59,130,246,0.25)', fg: 'var(--blue-primary)', label: 'Pending' },
          accepted: { bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.25)', fg: 'var(--green-primary)', label: 'Accepted' },
          declined: { bg: 'rgba(239,68,68,0.10)', bd: 'rgba(239,68,68,0.25)', fg: 'var(--red-primary)', label: 'Declined' },
          cancelled: { bg: 'rgba(107,114,128,0.10)', bd: 'rgba(107,114,128,0.25)', fg: 'var(--text-secondary)', label: 'Cancelled' }
        };
        const v = map[s] || { bg: 'rgba(107,114,128,0.10)', bd: 'rgba(107,114,128,0.25)', fg: 'var(--text-secondary)', label: 'Unknown' };
        return `<span style="display:inline-flex; align-items:center; padding: 0.15rem 0.5rem; border-radius: 999px; background: ${v.bg}; border: 1px solid ${v.bd}; color: ${v.fg}; font-weight: 800; font-size: 0.75rem;">${v.label}</span>`;
      };

      const incomingCounts = statusCounts(incomingAll);
      const outgoingCounts = statusCounts(outgoingAll);
      const incomingPending = incomingAll.filter(r => String(r.status).toLowerCase() === 'pending');
      const outgoingPending = outgoingAll.filter(r => String(r.status).toLowerCase() === 'pending');

      if (incomingEl) {
        if (incomingAll.length === 0) {
          incomingEl.innerHTML = '<div style="color: var(--text-secondary); padding: 0.75rem;">No requests yet.</div>';
        } else {
          const summary = `
            <div style="display:flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Pending: <strong style=\"color: var(--blue-primary);\">${incomingCounts.pending}</strong></span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Accepted: <strong style=\"color: var(--green-primary);\">${incomingCounts.accepted}</strong></span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Declined: <strong style=\"color: var(--red-primary);\">${incomingCounts.declined}</strong></span>
            </div>
          `;

          // Only show pending requests on dashboard
          const listHtml = incomingPending.length === 0
            ? '<div style="color: var(--text-secondary); padding: 0.5rem;">No pending requests.</div>'
            : incomingPending.slice(0, 4).map(r => {
              const studentName = (r.studentFullName || r.studentUsername || '').trim();
              const when = Utils.formatDateTime(r.scheduledDate);
              const pill = statusPill(r.status);
              return `
                  <div style="border: 1px solid var(--border-light); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="display:flex; align-items:flex-start; justify-content: space-between; gap: 0.75rem;">
                      <div style="min-width:0;">
                        <div style="font-weight: 800;">${Utils.escapeHtml(studentName)}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">@${Utils.escapeHtml(r.studentUsername || '')} • ${Utils.escapeHtml(r.skillName || '')}</div>
                        <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-calendar"></i> ${Utils.escapeHtml(when)} (${Number(r.duration) || 60}min)</div>
                        <div style="margin-top: 0.35rem;">${pill}</div>
                      </div>
                      <div style="display:flex; gap: 0.5rem; flex-shrink:0;">
                        <button class="btn btn-sm btn-success offer-request-action" data-request-id="${r.id}" data-action="accept">Accept</button>
                        <button class="btn btn-sm btn-outline offer-request-action" data-request-id="${r.id}" data-action="decline">Decline</button>
                      </div>
                    </div>
                  </div>
                `;
            }).join('');

          const viewAllBtn = `<button class="btn btn-sm btn-outline view-all-requests-btn" data-type="incoming" style="width: 100%; margin-top: 0.5rem;">View All Requests</button>`;
          incomingEl.innerHTML = summary + listHtml + viewAllBtn;
        }
      }

      if (outgoingEl) {
        if (outgoingAll.length === 0) {
          outgoingEl.innerHTML = '<div style="color: var(--text-secondary); padding: 0.75rem;">No requests yet.</div>';
        } else {
          const summary = `
            <div style="display:flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Pending: <strong style=\"color: var(--blue-primary);\">${outgoingCounts.pending}</strong></span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Accepted: <strong style=\"color: var(--green-primary);\">${outgoingCounts.accepted}</strong></span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">Declined: <strong style=\"color: var(--red-primary);\">${outgoingCounts.declined}</strong></span>
            </div>
          `;

          // Only show pending requests on dashboard
          const listHtml = outgoingPending.length === 0
            ? '<div style="color: var(--text-secondary); padding: 0.5rem;">No pending requests.</div>'
            : outgoingPending.slice(0, 4).map(r => {
              const tutorName = (r.tutorFullName || r.tutorUsername || '').trim();
              const when = Utils.formatDateTime(r.scheduledDate);
              const pill = statusPill(r.status);
              return `
                  <div style="border: 1px solid var(--border-light); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="font-weight: 800;">${Utils.escapeHtml(tutorName)}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">@${Utils.escapeHtml(r.tutorUsername || '')} • ${Utils.escapeHtml(r.skillName || '')}</div>
                    <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-calendar"></i> ${Utils.escapeHtml(when)} (${Number(r.duration) || 60}min)</div>
                    <div style="margin-top: 0.35rem;">${pill}</div>
                  </div>
                `;
            }).join('');

          const viewAllBtn = `<button class="btn btn-sm btn-outline view-all-requests-btn" data-type="outgoing" style="width: 100%; margin-top: 0.5rem;">View All Requests</button>`;
          outgoingEl.innerHTML = summary + listHtml + viewAllBtn;
        }
      }

      if (teachingEl) {
        if (teaching.length === 0) {
          teachingEl.innerHTML = '<div style="color: var(--text-secondary); padding: 0.75rem;">No upcoming teaching sessions.</div>';
        } else {
          teachingEl.innerHTML = `<div class="user-grid">${teaching.slice(0, 3).map(s => renderSessionCard(s)).join('')}</div>`;
        }
      }

      if (learningEl) {
        if (learning.length === 0) {
          learningEl.innerHTML = '<div style="color: var(--text-secondary); padding: 0.75rem;">No upcoming learning sessions.</div>';
        } else {
          learningEl.innerHTML = `<div class="user-grid">${learning.slice(0, 3).map(s => renderSessionCard(s)).join('')}</div>`;
        }
      }

      if (myOffersEl) {
        if (myOffers.length === 0) {
          myOffersEl.innerHTML = `
            <div style="color: var(--text-secondary); padding: 0.75rem;">
              No open offers yet.
              <div style="margin-top: 0.75rem;"><button class="btn btn-primary" id="dash-create-offer">Publish an Offer</button></div>
            </div>
          `;
          document.getElementById('dash-create-offer')?.addEventListener('click', () => Router.navigate('create-session-form'));
        } else {
          myOffersEl.innerHTML = myOffers.slice(0, 6).map(o => {
            const slotCount = Array.isArray(o.slots) ? o.slots.length : 0;
            const pending = Number(o.pendingCount) || 0;
            const firstSlot = Array.isArray(o.slots) && o.slots.length ? Utils.formatDateTime(o.slots[0].scheduledDate) : '';
            return `
              <div style="border: 1px solid var(--border-light); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem;">
                <div style="display:flex; align-items:flex-start; justify-content: space-between; gap: 0.75rem;">
                  <div style="min-width:0;">
                    <div style="font-weight: 800;">${Utils.escapeHtml(o.skillName || '')}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">${Utils.escapeHtml(o.title || '')}</div>
                    <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9rem;">
                      <i class="fas fa-calendar"></i> ${Utils.escapeHtml(firstSlot || '—')} • ${slotCount} slot${slotCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style="flex-shrink:0; text-align:right;">
                    <div style="font-weight: 800; color: ${pending ? 'var(--blue-primary)' : 'var(--text-secondary)'};">${pending} pending</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">requests</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // Wire request actions
      document.querySelectorAll('.offer-request-action').forEach(btn => {
        btn.addEventListener('click', async () => {
          const requestId = Number(btn.getAttribute('data-request-id'));
          const action = String(btn.getAttribute('data-action') || '');
          if (!requestId || !['accept', 'decline'].includes(action)) return;
          btn.disabled = true;
          await handleOfferRequestAction(requestId, action);
          await refreshCurrentUser();
          Router.navigate('dashboard');
        });
      });

      // Wire "View All" buttons
      document.querySelectorAll('.view-all-requests-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-type');
          showAllRequestsModal(type === 'incoming' ? incomingAll : outgoingAll, type);
        });
      });
    } catch (e) {
      console.error('Dashboard widgets error:', e);
      document.getElementById('dashboard-incoming-requests')?.replaceChildren();
      document.getElementById('dashboard-outgoing-requests')?.replaceChildren();
      document.getElementById('dashboard-upcoming-teaching')?.replaceChildren();
      document.getElementById('dashboard-upcoming-learning')?.replaceChildren();
      document.getElementById('dashboard-my-offers')?.replaceChildren();
    }
  })();
}

function renderCreateSessionHomePage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Create Session</h1>
            <p class="page-subtitle">Choose whether you want to teach or learn</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
            <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: var(--blue-light); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;"><i class="fas fa-chalkboard-teacher"></i></div>
              <div style="font-size: 1.25rem; font-weight: 800;">Teach</div>
              <div style="color: var(--text-secondary);">Offer a skill with up to 5 date/time options.</div>
              <div style="margin-top: 0.75rem;">
                <button id="go-teach" class="btn btn-primary" style="width: 100%;">Offer to Teach</button>
              </div>
            </div>

            <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: var(--green-primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;"><i class="fas fa-book-open"></i></div>
              <div style="font-size: 1.25rem; font-weight: 800;">Learn</div>
              <div style="color: var(--text-secondary);">Browse open offers and request a specific time slot.</div>
              <div style="margin-top: 0.75rem;">
                <button id="go-learn" class="btn btn-secondary" style="width: 100%;">Find a Session</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  document.getElementById('go-teach')?.addEventListener('click', () => Router.navigate('teach'));
  document.getElementById('go-learn')?.addEventListener('click', () => Router.navigate('learn'));
}

async function renderTeachOfferPage() {
  Router.navigate('create-session-form');
}

async function renderLearnOffersPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Learn</h1>
            <p class="page-subtitle">Pick an offer and request one of the time slots</p>
          </div>
          <div id="learn-offers" style="text-align:center; padding: 3rem; color: var(--text-secondary);">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  const container = document.getElementById('learn-offers');
  try {
    const res = await fetch('/api/offers');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load offers');
    }

    const offers = data.offers || [];
    if (offers.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-secondary);">
          No open offers right now.
          <div style="margin-top: 0.75rem;"><button class="btn btn-primary" id="learn-refresh">Refresh</button></div>
        </div>
      `;
      document.getElementById('learn-refresh')?.addEventListener('click', () => Router.navigate('learn'));
      return;
    }

    container.style.textAlign = 'left';
    container.style.padding = '0';
    container.innerHTML = `
      <div class="user-grid">
        ${offers.map(o => {
      const name = (o.tutorFullName || o.tutorUsername || '').trim();
      const avatar = o.tutorProfileImage
        ? `<img src="${o.tutorProfileImage}" alt="${Utils.escapeHtml(name)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">`
        : `<div class="user-avatar" style="width: 72px; height: 72px; font-size: 1.25rem;">${Utils.getInitials(name || 'U')}</div>`;

      const slots = Array.isArray(o.slots) ? o.slots : [];
      const slotOptions = slots.length
        ? slots.map((s, idx) => {
          const label = `${Utils.formatDateTime(s.scheduledDate)} (${Number(s.duration) || 60}min)`;
          return `
                <label style="display:flex; align-items:flex-start; gap: 0.5rem; padding: 0.5rem; border: 1px solid var(--border-light); border-radius: 10px; margin-top: 0.5rem; cursor: pointer;">
                  <input type="radio" name="offer-slot-${o.id}" value="${s.id}" ${idx === 0 ? 'checked' : ''} style="margin-top: 0.2rem;">
                  <span style="color: var(--text-secondary); font-size: 0.95rem;">${Utils.escapeHtml(label)}</span>
                </label>
              `;
        }).join('')
        : '<div style="color: var(--text-secondary);">No slots available.</div>';

      const locationLine = o.locationType === 'online'
        ? 'Online'
        : (o.location ? Utils.escapeHtml(o.location) : 'In-person');

      return `
            <div class="user-card" style="display:flex; flex-direction: column; gap: 0.75rem;">
              <div style="display:flex; align-items:center; gap: 1rem;">
                ${avatar}
                <div style="flex: 1; min-width:0;">
                  <div style="font-weight: 800; font-size: 1.125rem;">${Utils.escapeHtml(name)}</div>
                  <div style="color: var(--text-secondary);">@${Utils.escapeHtml(o.tutorUsername || '')}</div>
                </div>
              </div>
              <div style="font-weight: 800;">${Utils.escapeHtml(o.skillName || '')}</div>
              <div style="color: var(--text-secondary); font-size: 0.95rem;">${Utils.escapeHtml(o.title || '')}</div>
              ${o.notes ? `<div style="color: var(--text-secondary); font-size: 0.95rem;">${Utils.escapeHtml(o.notes)}</div>` : ''}
              <div style="color: var(--text-secondary); font-size: 0.95rem;"><i class="fas fa-map-marker-alt"></i> ${locationLine}</div>
              <div style="margin-top: 0.25rem;">
                <div style="font-weight: 800; font-size: 0.95rem;">Available times</div>
                ${slotOptions}
              </div>
              <div style="margin-top: 0.5rem;">
                <button class="btn btn-secondary offer-request-btn" data-offer-id="${o.id}" style="width: 100%;">Request Selected Slot</button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

    document.querySelectorAll('.offer-request-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const offerId = Number(btn.getAttribute('data-offer-id'));
        if (!offerId) return;
        const selected = document.querySelector(`input[name="offer-slot-${offerId}"]:checked`);
        const slotId = selected ? Number(selected.value) : null;
        if (!slotId) {
          showToast('Please select a time slot', 'error');
          return;
        }
        btn.disabled = true;
        await requestOfferSlot(offerId, slotId);
        btn.disabled = false;
      });
    });
  } catch (error) {
    console.error('Learn offers error:', error);
    container.innerHTML = `<p style="color: var(--red-primary);">Failed to load offers.</p>`;
  }
}

async function renderPastSessionsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Past Sessions</h1>
            <p class="page-subtitle">Completed and cancelled sessions</p>
          </div>
          <div id="past-sessions" style="text-align:center; padding: 3rem; color: var(--text-secondary);">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  const container = document.getElementById('past-sessions');
  try {
    const [completedRes, cancelledRes] = await Promise.all([
      fetch('/api/sessions?status=completed'),
      fetch('/api/sessions?status=cancelled')
    ]);
    const completed = completedRes.ok ? (await completedRes.json()).sessions || [] : [];
    const cancelled = cancelledRes.ok ? (await cancelledRes.json()).sessions || [] : [];

    const all = [...completed, ...cancelled].sort((a, b) => {
      const ad = new Date(a.scheduledDate).getTime();
      const bd = new Date(b.scheduledDate).getTime();
      return bd - ad;
    });

    if (all.length === 0) {
      container.innerHTML = `
        <div style="padding: 3rem; text-align: center;">
          <i class="fas fa-history" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">No Past Sessions</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">You haven't completed or cancelled any sessions yet.</p>
          <a href="#" onclick="Router.navigate('learn'); return false;" class="btn btn-primary">
            <i class="fas fa-search"></i> Find a Session
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="user-grid">
        ${all.map(session => renderSessionCard(session)).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Past sessions error:', e);
    // Show "no sessions" message instead of error when connection fails
    container.innerHTML = `
      <div style="padding: 3rem; text-align: center;">
        <i class="fas fa-history" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">No Past Sessions</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">You haven't completed or cancelled any sessions yet.</p>
        <a href="#" onclick="Router.navigate('learn'); return false;" class="btn btn-primary">
          <i class="fas fa-search"></i> Find a Session
        </a>
      </div>
    `;
  }
}

async function renderSearchPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Search</h1>
            <p class="page-subtitle">Find tutors by skills or search users by name</p>
          </div>
          
          <div class="search-container">
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
              <button id="search-type-skills" class="btn btn-secondary" style="flex: 1;">Search by Skills</button>
              <button id="search-type-users" class="btn btn-secondary" style="flex: 1;">Search by Users</button>
              <button id="search-type-ai" class="btn btn-secondary" style="flex: 1;"><i class="fas fa-magic"></i> AI Search</button>
            </div>
            <div class="search-bar">
              <span class="search-icon"><i class="fas fa-search"></i></span>
              <input type="text" id="search-input" class="search-input" placeholder="Search for skills (e.g., Math, Python, Guitar)...">
            </div>
            <div id="ai-suggestion" style="display: none; margin-top: 0.75rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); border-radius: var(--radius-lg); border: 1px solid rgba(99, 102, 241, 0.2);">
              <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                <i class="fas fa-robot" style="color: var(--purple-primary); margin-top: 0.2rem;"></i>
                <div id="ai-suggestion-text" style="font-size: 0.95rem; color: var(--text-primary);"></div>
              </div>
            </div>
          </div>

          <div id="open-sessions-panel" style="margin-top: 1.25rem; background: white; border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-md);">
            <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="font-weight: 800; font-size: 1.125rem;">Open Sessions</div>
                <div style="color: var(--text-secondary); font-size: 0.95rem;">All currently available session offers</div>
              </div>
              <button class="btn btn-outline" id="refresh-open-sessions" type="button"><i class="fas fa-rotate"></i> Refresh</button>
            </div>
            <div id="open-sessions" style="margin-top: 1rem; text-align:center; padding: 1.5rem; color: var(--text-secondary);">
              <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
            </div>
          </div>
          
          <div id="search-results">
            <p style="text-align: center; padding: 3rem; color: var(--text-secondary);">
              Enter a skill name or username to search
            </p>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  // Search state
  let searchType = 'skills'; // 'skills' or 'users' or 'ai'

  const searchInput = document.getElementById('search-input');
  const resultsDiv = document.getElementById('search-results');
  const btnSkills = document.getElementById('search-type-skills');
  const btnUsers = document.getElementById('search-type-users');
  const btnAI = document.getElementById('search-type-ai');
  const openSessionsPanel = document.getElementById('open-sessions-panel');
  const aiSuggestionDiv = document.getElementById('ai-suggestion');
  let searchTimeout;

  function setOpenSessionsVisible(visible) {
    if (!openSessionsPanel) return;
    openSessionsPanel.style.display = visible ? '' : 'none';
  }

  function setActiveSearchBtn(activeBtn) {
    [btnSkills, btnUsers, btnAI].forEach(btn => {
      if (btn === activeBtn) {
        btn.classList.add('active');
        btn.style.background = btn === btnAI ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'var(--blue-primary)';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
      }
    });
  }

  // Set initial active button
  setActiveSearchBtn(btnSkills);

  // Toggle search type
  btnSkills.addEventListener('click', () => {
    searchType = 'skills';
    setActiveSearchBtn(btnSkills);
    searchInput.placeholder = 'Search for skills (e.g., Math, Python, Guitar)...';
    resultsDiv.innerHTML = '<p style="text-align: center; padding: 3rem; color: var(--text-secondary);">Enter a skill name to search</p>';
    searchInput.value = '';
    setOpenSessionsVisible(true);
    aiSuggestionDiv.style.display = 'none';
  });

  btnUsers.addEventListener('click', () => {
    searchType = 'users';
    setActiveSearchBtn(btnUsers);
    searchInput.placeholder = 'Search for users by name or username...';
    resultsDiv.innerHTML = '<p style="text-align: center; padding: 3rem; color: var(--text-secondary);">Enter a name or username to search</p>';
    searchInput.value = '';
    setOpenSessionsVisible(true);
    aiSuggestionDiv.style.display = 'none';
  });

  btnAI.addEventListener('click', () => {
    searchType = 'ai';
    setActiveSearchBtn(btnAI);
    searchInput.placeholder = 'Describe what you want to learn (e.g., "help with calculus" or "learn guitar basics")...';
    resultsDiv.innerHTML = '<p style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-magic" style="margin-right: 0.5rem;"></i>AI will find related skills and tutors for you</p>';
    searchInput.value = '';
    setOpenSessionsVisible(true);
    aiSuggestionDiv.style.display = 'none';
  });

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const rawValue = String(e.target.value || '');
    const query = rawValue.trim();

    // Hide open sessions and AI suggestion as soon as user starts typing
    setOpenSessionsVisible(rawValue.length === 0);
    if (rawValue.length === 0) aiSuggestionDiv.style.display = 'none';

    if (query.length < 2) {
      resultsDiv.innerHTML = '<p style="text-align: center; padding: 3rem; color: var(--text-secondary);">Enter at least 2 characters to search</p>';
      return;
    }

    resultsDiv.innerHTML = '<div style="text-align: center; padding: 3rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i></div>';

    searchTimeout = setTimeout(async () => {
      try {
        // AI search uses different endpoint
        if (searchType === 'ai') {
          const response = await fetch('/api/ai/search-skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'AI search failed');
          }

          // Show AI suggestion
          if (data.aiSuggestion) {
            aiSuggestionDiv.style.display = 'block';
            document.getElementById('ai-suggestion-text').textContent = data.aiSuggestion;
          } else {
            aiSuggestionDiv.style.display = 'none';
          }

          const tutors = data.tutors || [];
          if (tutors.length === 0) {
            resultsDiv.innerHTML = `<p style="text-align: center; padding: 3rem; color: var(--text-secondary);">No tutors found for "${Utils.escapeHtml(query)}". Try describing your learning goal differently.</p>`;
            return;
          }

          resultsDiv.innerHTML = `
            <div style="margin-bottom: 1rem; padding: 0.5rem 0;">
              <span style="font-weight: 600;">Found skills:</span>
              ${data.skills.map(s => `<span style="display: inline-block; margin: 0.25rem; padding: 0.25rem 0.75rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15)); color: #6366f1; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600;">${Utils.escapeHtml(s)}</span>`).join('')}
            </div>
            <div class="user-grid">
              ${tutors.map(user => `
                <div class="user-card search-user-card" role="button" tabindex="0" data-user-id="${user.id}" aria-label="View profile">
                  ${user.profileImage
              ? `<img src="${user.profileImage}" alt="${Utils.escapeHtml(user.fullName || user.username)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">`
              : `<div class="user-avatar">${Utils.getInitials(user.fullName || user.username)}</div>`
            }
                  <h3 class="user-name">${user.fullName || user.username}</h3>
                  <p class="user-title">@${user.username}</p>
                  ${user.avgRating ? `<div style="color: #f59e0b; font-size: 0.9rem; margin: 0.25rem 0;"><i class="fas fa-star"></i> ${user.avgRating} (${user.totalRatings} reviews)</div>` : ''}
                  ${user.school ? `<p class="user-info"><i class="fas fa-school"></i> ${user.school}</p>` : ''}
                  <div style="margin: 1rem 0;">
                    <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Offers:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                      ${user.offeredSkills.slice(0, 3).map(skill => `<span style="padding: 0.25rem 0.75rem; background: var(--blue-light); color: var(--blue-primary); border-radius: var(--radius-md); font-size: 0.875rem;">${skill}</span>`).join('')}
                      ${user.offeredSkills.length > 3 ? `<span style="padding: 0.25rem 0.75rem; color: var(--text-secondary); font-size: 0.875rem;">+${user.offeredSkills.length - 3} more</span>` : ''}
                    </div>
                  </div>
                  <button type="button" class="btn btn-primary search-request-session" data-user-id="${user.id}" data-username="${Utils.escapeHtml(user.username)}" data-full-name="${Utils.escapeHtml(user.fullName || '')}">Request Session</button>
                </div>
              `).join('')}
            </div>
          `;
          return;
        }

        // Standard search
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&type=${searchType}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Search failed');
        }

        const users = data.users || [];

        if (users.length === 0) {
          resultsDiv.innerHTML = `<p style="text-align: center; padding: 3rem; color: var(--text-secondary);">No ${searchType === 'skills' ? 'tutors found for this skill' : 'users found'}. Try a different search term.</p>`;
          return;
        }

        resultsDiv.innerHTML = `
          <div class="user-grid">
            ${users.map(user => `
              <div class="user-card search-user-card" role="button" tabindex="0" data-user-id="${user.id}" aria-label="View profile">
                <div class="user-avatar">${Utils.getInitials(user.fullName || user.username)}</div>
                <h3 class="user-name">${user.fullName || user.username}</h3>
                <p class="user-title">@${user.username}</p>
                ${user.school ? `<p class="user-info"><i class="fas fa-school"></i> ${user.school}</p>` : ''}
                <div style="margin: 1rem 0;">
                  <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Offers:</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                    ${user.offeredSkills.slice(0, 3).map(skill => `<span style="padding: 0.25rem 0.75rem; background: var(--blue-light); color: var(--blue-primary); border-radius: var(--radius-md); font-size: 0.875rem;">${skill}</span>`).join('')}
                    ${user.offeredSkills.length > 3 ? `<span style="padding: 0.25rem 0.75rem; color: var(--text-secondary); font-size: 0.875rem;">+${user.offeredSkills.length - 3} more</span>` : ''}
                  </div>
                </div>
                <button type="button" class="btn btn-primary search-request-session" data-user-id="${user.id}" data-username="${Utils.escapeHtml(user.username)}" data-full-name="${Utils.escapeHtml(user.fullName || '')}">Request Session</button>
              </div>
            `).join('')}
          </div>
        `;
      } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<p style="text-align: center; padding: 3rem; color: var(--red-primary);">Search failed: ${error.message}</p>`;
      }
    }, 400);
  });

  // CSP-safe delegated click/keyboard handlers for search results
  resultsDiv?.addEventListener('click', (e) => {
    const requestBtn = e.target?.closest?.('.search-request-session');
    if (requestBtn) {
      e.preventDefault();
      e.stopPropagation();
      const userId = Number(requestBtn.getAttribute('data-user-id'));
      const username = String(requestBtn.getAttribute('data-username') || '');
      const fullName = String(requestBtn.getAttribute('data-full-name') || '');
      if (!userId) return;
      requestTutorSession(userId, username, fullName);
      return;
    }

    const card = e.target?.closest?.('.search-user-card');
    if (card && resultsDiv.contains(card)) {
      const userId = Number(card.getAttribute('data-user-id'));
      if (!userId) return;
      openUserProfileModal(userId);
    }
  });
  resultsDiv?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target?.closest?.('.search-user-card');
    if (!card || !resultsDiv.contains(card)) return;
    e.preventDefault();
    const userId = Number(card.getAttribute('data-user-id'));
    if (!userId) return;
    openUserProfileModal(userId);
  });

  async function loadOpenSessions() {
    const container = document.getElementById('open-sessions');
    if (!container) return;
    container.style.textAlign = 'center';
    container.style.padding = '1.5rem';
    container.style.color = 'var(--text-secondary)';
    container.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';

    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load offers');

      const offers = (data.offers || []).slice(0, 50);
      if (offers.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary);">No open sessions right now.</div>';
        return;
      }

      container.style.textAlign = 'left';
      container.style.padding = '0';
      container.innerHTML = `
        <div class="user-grid">
          ${offers.map(o => {
        const name = (o.tutorFullName || o.tutorUsername || '').trim();
        const avatar = o.tutorProfileImage
          ? `<img src="${o.tutorProfileImage}" alt="${Utils.escapeHtml(name)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;">`
          : `<div class="user-avatar" style="width: 72px; height: 72px; font-size: 1.25rem;">${Utils.getInitials(name || 'U')}</div>`;

        const slots = Array.isArray(o.slots) ? o.slots : [];
        const slotSelect = slots.length ? `
              <select class="form-select open-session-slot" data-offer-id="${o.id}" style="margin-top: 0.5rem;">
                ${slots.map(s => {
          const label = `${Utils.formatDateTime(s.scheduledDate)} (${Number(s.duration) || 60}min)`;
          return `<option value="${s.id}">${Utils.escapeHtml(label)}</option>`;
        }).join('')}
              </select>
            ` : '<div style="color: var(--text-secondary); margin-top: 0.5rem;">No slots available.</div>';

        const locationLine = o.locationType === 'online'
          ? 'Online'
          : (o.location ? Utils.escapeHtml(o.location) : 'In-person');

        return `
              <div class="user-card" style="display:flex; flex-direction: column; gap: 0.75rem;">
                <div style="display:flex; align-items:center; gap: 1rem;">
                  ${avatar}
                  <div style="flex: 1; min-width:0;">
                    <div style="font-weight: 800; font-size: 1.125rem;">${Utils.escapeHtml(name)}</div>
                    <div style="color: var(--text-secondary);">@${Utils.escapeHtml(o.tutorUsername || '')}</div>
                  </div>
                </div>
                <div style="font-weight: 800;">${Utils.escapeHtml(o.skillName || '')}</div>
                <div style="color: var(--text-secondary); font-size: 0.95rem;">${Utils.escapeHtml(o.title || '')}</div>
                ${o.notes ? `<div style="color: var(--text-secondary); font-size: 0.95rem;">${Utils.escapeHtml(o.notes)}</div>` : ''}
                <div style="color: var(--text-secondary); font-size: 0.95rem;"><i class="fas fa-map-marker-alt"></i> ${locationLine}</div>
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem;">Pick a time</div>
                  ${slotSelect}
                </div>
                <div style="margin-top: 0.25rem;">
                  <button class="btn btn-secondary open-session-request-btn" data-offer-id="${o.id}" ${slots.length ? '' : 'disabled'} style="width: 100%;">Request Session</button>
                </div>
              </div>
            `;
      }).join('')}
        </div>
      `;

      document.querySelectorAll('.open-session-request-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const offerId = Number(btn.getAttribute('data-offer-id'));
          const select = document.querySelector(`select.open-session-slot[data-offer-id="${offerId}"]`);
          const slotId = select ? Number(select.value) : null;
          if (!offerId || !slotId) {
            showToast('Please select a valid time slot', 'error');
            return;
          }
          btn.disabled = true;
          await requestOfferSlot(offerId, slotId);
          btn.disabled = false;
        });
      });
    } catch (error) {
      console.error('Load open sessions error:', error);
      container.innerHTML = '<div style="color: var(--red-primary);">Failed to load open sessions.</div>';
    }
  }

  document.getElementById('refresh-open-sessions')?.addEventListener('click', loadOpenSessions);
  loadOpenSessions();
}

function requestTutorSession(userId, username, fullName) {
  // Store tutor info and navigate to request session page
  sessionStorage.setItem('requestTutorId', userId);
  sessionStorage.setItem('requestTutorUsername', username);
  const cleanName = String(fullName || '').trim();
  if (cleanName) sessionStorage.setItem('requestTutorFullName', cleanName);
  else sessionStorage.removeItem('requestTutorFullName');
  Router.navigate('request-session');
}

window.requestTutorSession = requestTutorSession;

async function openUserProfileModal(userId) {
  const me = getCurrentUser();
  if (!me?.id) {
    Router.navigate('login');
    return;
  }
  if (!userId || Number(userId) === Number(me.id)) {
    openProfileModal();
    return;
  }

  try {
    const res = await fetch(`/api/users/profile/${userId}`, { credentials: 'same-origin' });
    const ct = String(res.headers.get('content-type') || '');
    if (!ct.includes('application/json')) {
      throw new Error('Server returned HTML (restart server and log in again).');
    }
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load profile');
    }
    const u = data.user || {};
    const displayName = (u.fullName || u.username || '').trim();
    const profileImage = u.profileImage
      ? `<img src="${u.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
      : Utils.getInitials(displayName || u.username || 'U');

    const modalHtml = `
      <div id="user-profile-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem;">
        <div style="background: white; border-radius: 12px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <div style="padding: 2rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 700;">${Utils.escapeHtml(displayName || 'Profile')}</h2>
            <button class="user-profile-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">&times;</button>
          </div>

          <div style="padding: 2.5rem; display: grid; grid-template-columns: 350px 1fr; gap: 3rem;">
            <div>
              <div style="text-align: center; margin-bottom: 2rem;">
                <div style="position: relative; display: inline-block;">
                  <div style="width: 180px; height: 180px; border-radius: 50%; background: var(--blue-light); color: var(--blue-primary); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; font-weight: 700; margin: 0 auto; position: relative; overflow: hidden;">
                    ${profileImage}
                  </div>
                </div>
                <h3 style="margin: 1.25rem 0 0.5rem 0; font-size: 1.5rem; font-weight: 700;">${Utils.escapeHtml(displayName || u.username || '')}</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 1rem;">@${Utils.escapeHtml(u.username || '')}</p>
              </div>

              <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div style="background: var(--gray-light); padding: 1.5rem; border-radius: 12px; text-align: center;">
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Total Sessions</div>
                  <div style="font-size: 2rem; font-weight: 700; color: var(--blue-primary);">${Number(u.totalSessions || 0)}</div>
                </div>
                <div style="background: var(--gray-light); padding: 1.5rem; border-radius: 12px; text-align: center;">
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Average Rating</div>
                  <div style="font-size: 1.5rem;">
                    ${Array.from({ length: 5 }, (_, i) => {
      const rating = Number(u.averageRating || 0);
      if (i < Math.floor(rating)) {
        return '<i class="fas fa-star" style="color: #fbbf24;"></i>';
      } else if (i < rating) {
        return '<i class="fas fa-star-half-alt" style="color: #fbbf24;"></i>';
      } else {
        return '<i class="far fa-star" style="color: #d1d5db;"></i>';
      }
    }).join('')}
                  </div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">${(Number(u.averageRating || 0)).toFixed(1)} / 5.0</div>
                </div>
              </div>
            </div>

            <div>
              <div style="margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, var(--red-light) 0%, var(--red-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                  <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                    <i class="fas fa-user" style="font-size: 1.25rem;"></i> About Me
                  </div>
                </div>
                <p style="margin: 0; color: #1f2937; line-height: 1.8; font-size: 1rem; padding: 0 1rem;">${Utils.escapeHtml(u.bio || 'No bio yet')}</p>
              </div>

              <div style="margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                  <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                    <i class="fas fa-bolt" style="font-size: 1.25rem;"></i> Skills I Offer
                  </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0 1rem;">
                  ${(Array.isArray(u.skillsOffer) && u.skillsOffer.length > 0)
        ? u.skillsOffer.map(skill => `<span style="padding: 0.5rem 1rem; background: transparent; color: #1f2937; border: 2px solid var(--blue-primary); border-radius: 20px; font-size: 1rem; font-weight: 600;">${Utils.escapeHtml(skill)}</span>`).join('')
        : '<span style="color: #1f2937; font-size: 1rem;">No skills added yet</span>'}
                </div>
              </div>

              <div style="margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, var(--green-light) 0%, var(--green-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                  <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                    <i class="fas fa-bullseye" style="font-size: 1.25rem;"></i> Skills I Seek
                  </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0 1rem;">
                  ${(Array.isArray(u.skillsSeek) && u.skillsSeek.length > 0)
        ? u.skillsSeek.map(skill => `<span style="padding: 0.5rem 1rem; background: transparent; color: #1f2937; border: 2px solid var(--green-primary); border-radius: 20px; font-size: 1rem; font-weight: 600;">${Utils.escapeHtml(skill)}</span>`).join('')
        : '<span style="color: #1f2937; font-size: 1rem;">No skills added yet</span>'}
                </div>
              </div>

              <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="user-profile-message-btn btn btn-primary" data-user-id="${u.id}" data-username="${Utils.escapeHtml(u.username || '')}" style="padding: 0.875rem 2rem; font-size: 1rem;">Message</button>
                <button type="button" class="user-profile-close-bottom-btn btn btn-secondary" style="padding: 0.875rem 2rem; font-size: 1rem;">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const close = () => {
      const modal = document.getElementById('user-profile-modal');
      modal?.remove();
    };
    document.querySelector('.user-profile-close-btn')?.addEventListener('click', close);
    document.querySelector('.user-profile-close-bottom-btn')?.addEventListener('click', close);
    document.getElementById('user-profile-modal')?.addEventListener('click', (e) => {
      if (e.target?.id === 'user-profile-modal') close();
    });

    document.querySelector('.user-profile-message-btn')?.addEventListener('click', () => {
      close();
      startDmWithUser(Number(u.id), String(u.username || ''), String(u.fullName || ''), String(u.profileImage || ''));
    });
  } catch (e) {
    console.error('Open user profile modal error:', e);
    showToast(e.message || 'Failed to load profile', 'error');
  }
}

function startDmWithUser(otherId, otherUsername, otherFullName, otherAvatar) {
  if (!otherId) return;
  AppState.dm = AppState.dm || {};
  AppState.dm.pendingOpen = {
    otherId,
    otherUsername,
    otherFullName,
    otherAvatar
  };
  Router.navigate('messages');
}

async function renderCurrentTutorsPage() {
  // Show loading state
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Current Tutors</h1>
          </div>
          <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  // Fetch sessions where current user is student
  try {
    const response = await fetch('/api/sessions?role=student&status=scheduled');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    const sessions = data.sessions || [];

    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Current Tutors</h1>
            </div>
            
            <div class="search-container">
              <div class="search-bar">
                <span class="search-icon"><i class="fas fa-search"></i></span>
                <input type="text" class="search-input" placeholder="Search for tutors...">
                <button class="filter-btn"><i class="fas fa-filter"></i></button>
              </div>
            </div>
            
            <div class="user-grid">
              ${sessions.length === 0 ? '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No current tutors. <a href="#" onclick="Router.navigate(\'search\'); return false;">Search for tutors</a> to request a session.</p>' : sessions.map(session => renderSessionCard(session)).join('')}
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();
  } catch (error) {
    console.error('Load tutors error:', error);
    showToast('Failed to load tutors: ' + error.message, 'error');
  }
}

function renderUpcomingTutorsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Upcoming Tutors</h1>
          </div>
          
          <div class="search-container">
            <div class="search-bar">
              <span class="search-icon"><i class="fas fa-search"></i></span>
              <input type="text" class="search-input" placeholder="Search for tutors...">
              <button class="filter-btn"><i class="fas fa-filter"></i></button>
            </div>
          </div>
          
          <div class="user-grid">
            ${MockData.users.slice(0, 4).map(user =>
    Components.userCard(user, 'Meeting Times', 'primary')
  ).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();
}

async function renderPastTutorsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Past Tutors</h1>
          </div>
          <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  try {
    const response = await fetch('/api/sessions?role=student&status=completed');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    const sessions = data.sessions || [];

    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Past Tutors</h1>
            </div>
            
            <div class="search-container">
              <div class="search-bar">
                <span class="search-icon"><i class="fas fa-search"></i></span>
                <input type="text" class="search-input" placeholder="Search for tutors...">
                <button class="filter-btn"><i class="fas fa-filter"></i></button>
              </div>
            </div>
            
            <div class="user-grid">
              ${sessions.length === 0 ? '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No past sessions with tutors.</p>' : sessions.map(session => renderSessionCard(session)).join('')}
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();
  } catch (error) {
    console.error('Load past tutors error:', error);
    showToast('Failed to load past tutors: ' + error.message, 'error');
  }
}

async function renderYourSessionsPage() {
  // Show loading state
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Your Sessions</h1>
          </div>
          <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  // Fetch sessions
  try {
    const response = await fetch('/api/sessions?status=scheduled');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    const sessions = data.sessions || [];

    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Your Sessions</h1>
            </div>
            
            <div class="user-grid">
              ${sessions.map(session => renderSessionCard(session)).join('')}
              <div class="user-card create-session-btn" style="cursor: pointer; justify-content: center; align-items: center; min-height: 300px;">
                <div style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 1rem;"><i class="fas fa-plus-circle"></i></div>
                <div style="font-weight: 600; color: var(--text-secondary);">Create New Session</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();

    // Add click handler for create session button
    const createBtn = document.querySelector('.create-session-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        Router.navigate('create-session');
      });
    }
  } catch (error) {
    console.error('Load sessions error:', error);
    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Your Sessions</h1>
            </div>
            <div style="text-align: center; padding: 3rem;">
              <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--red-primary);"></i>
              <p style="margin-top: 1rem;">Failed to load sessions. ${error.message}</p>
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();
  }
}

function renderSessionCard(session) {
  const user = getCurrentUser();
  const isTutor = session.tutorId === user?.id;
  const otherPerson = isTutor ? {
    id: session.studentId,
    name: session.studentFullName || session.studentUsername,
    username: session.studentUsername,
    profileImage: session.studentProfileImage
  } : {
    id: session.tutorId,
    name: session.tutorFullName || session.tutorUsername,
    username: session.tutorUsername,
    profileImage: session.tutorProfileImage
  };

  const date = new Date(session.scheduledDate);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const avatarHtml = otherPerson.profileImage
    ? `<img src="${Utils.escapeHtml(otherPerson.profileImage)}" alt="${Utils.escapeHtml(otherPerson.name)}" class="user-avatar" style="cursor: pointer; object-fit: cover;" data-view-profile="${otherPerson.id}">`
    : `<div class="user-avatar" style="cursor: pointer;" data-view-profile="${otherPerson.id}">${Utils.getInitials(otherPerson.name)}</div>`;

  // Meeting link display (for online sessions)
  let meetingLinkHtml = '';
  if (session.meetingLink && session.status === 'scheduled') {
    // Ensure meeting link has proper protocol
    let meetingUrl = session.meetingLink.trim();
    if (!/^https?:\/\//i.test(meetingUrl)) {
      meetingUrl = 'https://' + meetingUrl;
    }
    meetingLinkHtml = `<p class="user-info"><i class="fas fa-video"></i> <a href="${Utils.escapeHtml(meetingUrl)}" target="_blank" rel="noopener" style="color: var(--blue-primary);">Join Meeting</a></p>`;
  } else if (isTutor && session.status === 'scheduled' && (session.location?.toLowerCase().includes('online') || session.location?.toLowerCase().includes('zoom') || session.location?.toLowerCase().includes('meet'))) {
    meetingLinkHtml = `<button class="btn btn-sm btn-outline set-meeting-link-btn" data-session-id="${session.id}" style="margin-top: 0.25rem; font-size: 0.75rem;"><i class="fas fa-link"></i> Add Meeting Link</button>`;
  }

  // Show "Rate Session" button for students on completed sessions they haven't rated yet
  const showRateButton = session.status === 'completed' && !isTutor && !session.hasRated;

  return `
    <div class="user-card">
      ${avatarHtml}
      <h3 class="user-name" style="cursor: pointer;" data-view-profile="${otherPerson.id}">${otherPerson.name}</h3>
      <p class="user-title">@${otherPerson.username}</p>
      <p class="user-info"><i class="fas fa-book"></i> ${session.skillName}</p>
      <p class="user-info"><i class="fas fa-calendar"></i> ${dateStr}</p>
      <p class="user-info"><i class="fas fa-clock"></i> ${timeStr}${session.duration ? ` (${session.duration}min)` : ''}</p>
      <p class="user-info"><i class="fas fa-map-marker-alt"></i> ${session.location || 'TBD'}</p>
      ${meetingLinkHtml}
      ${session.status === 'scheduled' ? `
        <button class="btn btn-sm btn-success session-action-btn" data-session-id="${session.id}" data-status="completed" data-is-tutor="${isTutor}" data-other-name="${Utils.escapeHtml(otherPerson.name)}" data-tutor-id="${session.tutorId}" style="margin-top: 0.5rem;">Mark Complete</button>
        <button class="btn btn-sm btn-outline session-action-btn" data-session-id="${session.id}" data-status="cancelled" style="margin-top: 0.5rem;">Cancel</button>
      ` : ''}
      ${showRateButton ? `
        <button class="btn btn-sm btn-primary rate-session-btn" data-session-id="${session.id}" data-tutor-id="${session.tutorId}" data-tutor-name="${Utils.escapeHtml(otherPerson.name)}" style="margin-top: 0.5rem;"><i class="fas fa-star"></i> Rate Session</button>
      ` : ''}
    </div>
  `;
}

async function renderUpcomingStudentsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Upcoming Students</h1>
          </div>
          <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  try {
    const response = await fetch('/api/sessions?role=tutor&status=scheduled');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    const sessions = data.sessions || [];

    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Upcoming Students</h1>
            </div>
            
            <div class="user-grid">
              ${sessions.length === 0 ? '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No upcoming sessions with students.</p>' : sessions.map(session => renderSessionCard(session)).join('')}
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();
  } catch (error) {
    console.error('Load upcoming students error:', error);
    showToast('Failed to load upcoming students: ' + error.message, 'error');
  }
}

async function renderPastStudentsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Past Students</h1>
          </div>
          <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  try {
    const response = await fetch('/api/sessions?role=tutor&status=completed');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    const sessions = data.sessions || [];

    document.body.innerHTML = `
      <div class="app-container">
        ${Components.sidebar()}
        <main class="main-content">
          ${Components.topbar()}
          <div class="page-container">
            <div class="page-header">
              <h1 class="page-title">Past Students</h1>
            </div>
            
            <div class="user-grid">
              ${sessions.length === 0 ? '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No past sessions with students.</p>' : sessions.map(session => renderSessionCard(session)).join('')}
            </div>
          </div>
        </main>
      </div>
    `;
    initializeSidebar();
  } catch (error) {
    console.error('Load past students error:', error);
    showToast('Failed to load past students: ' + error.message, 'error');
  }
}

function renderSessionsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Your Sessions</h1>
          </div>
          <div>
            ${MockData.users.slice(0, 6).map(user =>
    Components.sessionCard(user, 'Next session: Today at 3:00 PM')
  ).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();
}

async function renderRequestSessionPage() {
  // This page is now a real offer-slot request flow (CSP-safe).
  const tutorId = Number(sessionStorage.getItem('requestTutorId') || 0);
  const tutorUsername = String(sessionStorage.getItem('requestTutorUsername') || '').trim();
  const tutorFullName = String(sessionStorage.getItem('requestTutorFullName') || '').trim();

  if (!tutorId) {
    Router.navigate('search');
    return;
  }

  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div style="max-width: 820px; margin: 0 auto;">
            <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem;">
              <button class="btn btn-ghost" id="req-back">← Back</button>
              <div style="font-weight: 700; color: var(--text-secondary);">Request a Session</div>
            </div>

            <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                  <div style="font-weight: 800; font-size: 1.25rem;">${Utils.escapeHtml(tutorFullName || tutorUsername || 'Tutor')}</div>
                  ${tutorUsername ? `<div style="color: var(--text-secondary);">@${Utils.escapeHtml(tutorUsername)}</div>` : ''}
                </div>
                <div style="display:flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">
                  <button type="button" class="btn btn-outline" id="req-view-profile">View Profile</button>
                  <button type="button" class="btn btn-secondary" id="req-message">Message</button>
                </div>
              </div>

              <form id="request-offer-form">
                <div class="form-group">
                  <label class="form-label">Skill</label>
                  <select id="req-skill" class="form-select" required>
                    <option value="">Loading skills…</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Choose a time slot</label>
                  <select id="req-slot" class="form-select" required disabled>
                    <option value="">Select a skill first…</option>
                  </select>
                  <div id="req-slot-meta" class="form-helper" style="display:none;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">Notes (optional)</label>
                  <textarea id="req-notes" class="form-textarea" placeholder="Anything the tutor should know?" maxlength="1000" style="min-height: 110px;"></textarea>
                </div>

                <div id="req-error" class="form-error" style="display:none;"></div>

                <div style="display:flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 1rem;">
                  <button type="button" class="btn btn-outline" id="req-cancel">Cancel</button>
                  <button type="submit" class="btn btn-primary" id="req-submit" disabled>Request</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  const showReqError = (msg) => {
    const el = document.getElementById('req-error');
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  };

  const btnBack = document.getElementById('req-back');
  const btnCancel = document.getElementById('req-cancel');
  const btnViewProfile = document.getElementById('req-view-profile');
  const btnMessage = document.getElementById('req-message');
  const form = document.getElementById('request-offer-form');
  const skillSelect = document.getElementById('req-skill');
  const slotSelect = document.getElementById('req-slot');
  const slotMeta = document.getElementById('req-slot-meta');
  const notesEl = document.getElementById('req-notes');
  const submitBtn = document.getElementById('req-submit');

  btnBack?.addEventListener('click', () => Router.navigate('search'));
  btnCancel?.addEventListener('click', () => Router.navigate('search'));
  btnViewProfile?.addEventListener('click', () => openUserProfileModal(tutorId));
  btnMessage?.addEventListener('click', () => startDmWithUser(tutorId, tutorUsername, tutorFullName, ''));

  // Load tutor offers
  let offers = [];
  try {
    const res = await fetch(`/api/offers?tutorId=${encodeURIComponent(String(tutorId))}`, { credentials: 'same-origin' });
    const ct = String(res.headers.get('content-type') || '');
    if (!ct.includes('application/json')) {
      throw new Error('Server returned HTML (restart server and log in again).');
    }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load offers');
    offers = Array.isArray(data.offers) ? data.offers : [];
  } catch (e) {
    console.error('Request session load offers error:', e);
    showReqError(e.message || 'Failed to load offers');
    if (skillSelect) {
      skillSelect.innerHTML = '<option value="">Failed to load skills</option>';
      skillSelect.disabled = true;
    }
    return;
  }

  if (!offers.length) {
    showReqError('This tutor has no open session offers yet. Ask them to publish an offer, or send them a message.');
    if (skillSelect) {
      skillSelect.innerHTML = '<option value="">No open offers</option>';
      skillSelect.disabled = true;
    }
    return;
  }

  // Fill tutor display name from offer payload if missing
  if ((!tutorFullName || !tutorUsername) && offers[0]) {
    const nameFromOffer = String(offers[0].tutorFullName || '').trim();
    const userFromOffer = String(offers[0].tutorUsername || '').trim();
    if (nameFromOffer && !tutorFullName) sessionStorage.setItem('requestTutorFullName', nameFromOffer);
    if (userFromOffer && !tutorUsername) sessionStorage.setItem('requestTutorUsername', userFromOffer);
  }

  // Index offers by skill
  const skills = new Map(); // skillId -> { name, items: [{offerId, offerTitle, locationLine, slotId, scheduledDate, duration}] }
  for (const o of offers) {
    const sid = Number(o.skillId);
    if (!sid) continue;
    if (!skills.has(sid)) skills.set(sid, { name: String(o.skillName || '').trim(), items: [] });
    const locationLine = o.locationType === 'online' ? 'Online' : (o.location ? String(o.location) : 'In-person');
    const slots = Array.isArray(o.slots) ? o.slots : [];
    for (const s of slots) {
      skills.get(sid).items.push({
        offerId: Number(o.id),
        offerTitle: String(o.title || '').trim(),
        locationLine,
        slotId: Number(s.id),
        scheduledDate: String(s.scheduledDate || ''),
        duration: Number(s.duration) || 60
      });
    }
  }

  const sortedSkillEntries = Array.from(skills.entries()).sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)));
  skillSelect.innerHTML = '<option value="">Select a skill…</option>' + sortedSkillEntries
    .map(([sid, info]) => `<option value="${sid}">${Utils.escapeHtml(info.name || 'Skill')}</option>`)
    .join('');

  const refreshSlots = () => {
    showReqError('');
    if (!slotSelect || !submitBtn || !slotMeta) return;

    const sid = Number(skillSelect.value || 0);
    const info = skills.get(sid);
    if (!sid || !info || !info.items.length) {
      slotSelect.disabled = true;
      slotSelect.innerHTML = '<option value="">No slots available for this skill</option>';
      slotMeta.style.display = 'none';
      submitBtn.disabled = true;
      return;
    }

    const items = [...info.items].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    slotSelect.disabled = false;
    slotSelect.innerHTML = '<option value="">Select a time slot…</option>' + items.map(it => {
      const label = `${Utils.formatDateTime(it.scheduledDate)} (${it.duration}min) — ${it.offerTitle || 'Offer'}`;
      return `<option value="${it.offerId}:${it.slotId}">${Utils.escapeHtml(label)}</option>`;
    }).join('');
    slotMeta.style.display = 'none';
    submitBtn.disabled = true;
  };

  skillSelect.addEventListener('change', refreshSlots);
  slotSelect.addEventListener('change', () => {
    const value = String(slotSelect.value || '');
    submitBtn.disabled = !value;
    slotMeta.style.display = 'none';
    if (!value) return;
    const [offerIdStr, slotIdStr] = value.split(':');
    const offerId = Number(offerIdStr);
    const slotId = Number(slotIdStr);
    const sid = Number(skillSelect.value || 0);
    const info = skills.get(sid);
    const picked = info?.items?.find(it => it.offerId === offerId && it.slotId === slotId);
    if (picked) {
      slotMeta.textContent = `Location: ${picked.locationLine}`;
      slotMeta.style.display = 'block';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showReqError('');
    const value = String(slotSelect.value || '');
    if (!value) {
      showReqError('Please choose a time slot');
      return;
    }
    const [offerIdStr, slotIdStr] = value.split(':');
    const offerId = Number(offerIdStr);
    const slotId = Number(slotIdStr);
    if (!offerId || !slotId) {
      showReqError('Invalid selection');
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetch(`/api/offers/${offerId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slotId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to request slot');

      const note = String(notesEl?.value || '').trim();
      if (note) {
        try {
          await fetch(`/api/messages/with/${tutorId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ content: `Session request note: ${note}` })
          });
        } catch (err) {
          console.warn('Failed to send note DM:', err);
        }
      }

      showToast('Request sent!', 'success');
      setTimeout(() => Router.navigate('dashboard'), 300);
    } catch (err) {
      console.error('Request session submit error:', err);
      showReqError(err.message || 'Failed to request session');
      submitBtn.disabled = false;
    }
  });

  // Initial state
  refreshSlots();
}

async function renderCreateSessionPage() {
  // Fetch user's offered skills
  let userSkills = [];
  try {
    const response = await fetch('/api/skills/mine');
    if (response.ok) {
      const data = await response.json();
      userSkills = data.skillsOffer || [];
    }
  } catch (error) {
    console.error('Failed to load skills:', error);
  }

  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="display:flex; align-items:center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem;">
              <button class="btn btn-ghost" id="offer-back">← Back</button>
              <div style="font-weight: 700; color: var(--text-secondary);">Publish Offer</div>
            </div>

            <form id="create-offer-form">
              <div class="form-group">
                <label class="form-label">Skill to Teach</label>
                <select name="skillId" class="form-select" required ${userSkills.length === 0 ? 'disabled' : ''}>
                  <option value="">Select a skill...</option>
                  ${userSkills.map(skill => `<option value="${skill.id}">${skill.name}</option>`).join('')}
                </select>
                ${userSkills.length === 0 ? '<div class="form-helper" style="color: var(--red-primary);">You have no offered skills. <a href="#" id="go-profile-from-offer" style="color: var(--blue-primary); font-weight: 700; text-decoration: none;">Add skills to your profile</a> first.</div>' : ''}
              </div>

              <div class="form-group">
                <label class="form-label">Offer Title</label>
                <input type="text" name="title" class="form-input" placeholder="e.g., Math Tutoring Session" required maxlength="100" ${userSkills.length === 0 ? 'disabled' : ''}>
              </div>

              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea name="notes" class="form-textarea" placeholder="Brief description of what you'll cover..." maxlength="500" ${userSkills.length === 0 ? 'disabled' : ''}></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Time Slots (up to 5)</label>
                <div id="slots-container"></div>
                <div style="display:flex; gap: 0.75rem; margin-top: 0.75rem;">
                  <button type="button" class="btn btn-outline" id="add-slot" ${userSkills.length === 0 ? 'disabled' : ''}><i class="fas fa-plus"></i> Add Slot</button>
                </div>
                <div class="form-helper">Students will pick one of these times when requesting your offer.</div>
              </div>

              <div class="form-group">
                <label class="form-label">Location Type</label>
                <select name="locationType" class="form-select" id="location-type" required ${userSkills.length === 0 ? 'disabled' : ''}>
                  <option value="">Select location type...</option>
                  <option value="online">Online</option>
                  <option value="in-person">In-Person</option>
                </select>
              </div>

              <div class="form-group" id="address-field" style="display: none;">
                <label class="form-label">Address</label>
                <input type="text" name="address" class="form-input" id="address-input" placeholder="e.g., Library, Room 204, 123 Main St">
              </div>

              <div id="offer-form-message" style="display:none; margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 12px;"></div>

              <div style="display:flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 1.25rem;">
                <button type="button" class="btn btn-outline" id="offer-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary" ${userSkills.length === 0 ? 'disabled' : ''}>Publish Offer</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `;

  // CSP-safe navigation
  document.getElementById('offer-back')?.addEventListener('click', () => Router.navigate('create-session'));
  document.getElementById('offer-cancel')?.addEventListener('click', () => Router.navigate('create-session'));
  document.getElementById('go-profile-from-offer')?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('profile');
  });
  initializeSidebar();

  // Handle location type change
  const locationTypeSelect = document.getElementById('location-type');
  const addressField = document.getElementById('address-field');
  const addressInput = document.getElementById('address-input');

  locationTypeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'in-person') {
      addressField.style.display = 'block';
      addressInput.required = true;
    } else {
      addressField.style.display = 'none';
      addressInput.required = false;
      addressInput.value = '';
    }
  });

  // Slots UI
  const slotsContainer = document.getElementById('slots-container');
  const addSlotBtn = document.getElementById('add-slot');
  const minDate = new Date().toISOString().split('T')[0];

  function slotRowHtml(index) {
    return `
      <div class="slot-row" data-slot-index="${index}" style="border: 1px solid var(--border-light); border-radius: 14px; padding: 0.75rem; margin-top: 0.75rem;">
        <div style="display:flex; align-items:center; justify-content: space-between; gap: 0.75rem;">
          <div class="slot-title" style="font-weight: 800;">Option ${index + 1}</div>
          <button type="button" class="btn btn-sm btn-outline remove-slot" ${index === 0 ? 'disabled' : ''}><i class="fas fa-times"></i></button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
          <div>
            <label class="form-label" style="margin-bottom: 0.35rem;">Date</label>
            <input type="date" class="form-input slot-date" required min="${minDate}">
          </div>
          <div>
            <label class="form-label" style="margin-bottom: 0.35rem;">Time</label>
            <input type="time" class="form-input slot-time" required>
          </div>
          <div>
            <label class="form-label" style="margin-bottom: 0.35rem;">Duration (min)</label>
            <input type="number" class="form-input slot-duration" min="15" max="240" value="60">
          </div>
        </div>
      </div>
    `;
  }

  function refreshSlotNumbers() {
    document.querySelectorAll('.slot-row').forEach((row, idx) => {
      row.setAttribute('data-slot-index', String(idx));
      const title = row.querySelector('.slot-title');
      if (title) title.textContent = `Option ${idx + 1}`;
      const removeBtn = row.querySelector('.remove-slot');
      if (removeBtn) removeBtn.disabled = idx === 0;
    });
  }

  function bindSlotRowRemove(row) {
    const removeBtn = row.querySelector('.remove-slot');
    if (!removeBtn) return;
    removeBtn.addEventListener('click', () => {
      row.remove();
      refreshSlotNumbers();
      if (addSlotBtn) addSlotBtn.disabled = (document.querySelectorAll('.slot-row').length >= 5);
    });
  }

  function addSlot() {
    if (!slotsContainer) return;
    const currentCount = document.querySelectorAll('.slot-row').length;
    if (currentCount >= 5) return;
    slotsContainer.insertAdjacentHTML('beforeend', slotRowHtml(currentCount));
    const rows = document.querySelectorAll('.slot-row');
    const newRow = rows[rows.length - 1];
    if (newRow) bindSlotRowRemove(newRow);
    refreshSlotNumbers();
    if (addSlotBtn) addSlotBtn.disabled = (document.querySelectorAll('.slot-row').length >= 5);
  }

  // Initialize with 1 slot
  slotsContainer.innerHTML = '';
  addSlot();

  addSlotBtn?.addEventListener('click', addSlot);

  // Handle submit
  const form = document.getElementById('create-offer-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createOfferFromForm(e.target);
  });
}

async function createOfferFromForm(form) {
  const msg = document.getElementById('offer-form-message');
  const formData = new FormData(form);

  const skillId = Number(formData.get('skillId'));
  const title = String(formData.get('title') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const locationType = String(formData.get('locationType') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const location = locationType === 'in-person' ? address : '';

  const slots = Array.from(document.querySelectorAll('.slot-row')).map(row => {
    const date = String(row.querySelector('.slot-date')?.value || '').trim();
    const time = String(row.querySelector('.slot-time')?.value || '').trim();
    const duration = Number(row.querySelector('.slot-duration')?.value || 60) || 60;
    return { date, time, duration };
  }).filter(s => s.date && s.time);

  if (!skillId || !title || !['online', 'in-person'].includes(locationType)) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  if (locationType === 'in-person' && !location) {
    showToast('Please enter a location for in-person sessions', 'error');
    return;
  }
  if (slots.length === 0) {
    showToast('Please add at least one valid time slot', 'error');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillId,
        title,
        notes,
        locationType,
        location,
        slots
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const message = data.message || 'Failed to publish offer';
      showToast(message, 'error');
      if (msg) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(239, 68, 68, 0.1)';
        msg.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        msg.style.color = 'var(--red-primary)';
        msg.textContent = message;
      }
      return;
    }

    showToast('Offer published!', 'success');
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(16, 185, 129, 0.12)';
      msg.style.border = '1px solid rgba(16, 185, 129, 0.25)';
      msg.style.color = 'var(--green-primary)';
      msg.textContent = 'Offer published successfully.';
    }
    setTimeout(() => Router.navigate('dashboard'), 400);
  } catch (error) {
    console.error('Create offer error:', error);
    showToast('Error publishing offer: ' + error.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function requestOfferSlot(offerId, slotId) {
  try {
    const response = await fetch(`/api/offers/${offerId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      showToast(data.message || 'Failed to request slot', 'error');
      return null;
    }
    showToast('Request sent!', 'success');
    setTimeout(() => Router.navigate('dashboard'), 400);
    return data.requestId;
  } catch (error) {
    console.error('Request offer slot error:', error);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

async function handleOfferRequestAction(requestId, action) {
  try {
    const response = await fetch(`/api/offers/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      showToast(data.message || 'Failed to update request', 'error');
      return null;
    }
    showToast(action === 'accept' ? 'Request accepted' : 'Request declined', 'success');
    return true;
  } catch (error) {
    console.error('Handle request error:', error);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

async function getAchievementStats() {
  const me = getCurrentUser();
  if (!me?.id) return null;

  const safeJson = async (url) => {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      const ct = String(res.headers.get('content-type') || '');
      if (!ct.includes('application/json')) return null;
      const data = await res.json();
      if (!res.ok || data?.success === false) return null;
      return data;
    } catch {
      return null;
    }
  };

  const [tutorCompleted, studentCompleted, offersMine, requestsStudent, conversations] = await Promise.all([
    safeJson('/api/sessions?role=tutor&status=completed'),
    safeJson('/api/sessions?role=student&status=completed'),
    safeJson('/api/offers/mine?status=all'),
    safeJson('/api/offers/requests/list?role=student&status=all'),
    safeJson('/api/messages/conversations')
  ]);

  const tutorSessionsCompleted = Array.isArray(tutorCompleted?.sessions) ? tutorCompleted.sessions.length : 0;
  const studentSessionsCompleted = Array.isArray(studentCompleted?.sessions) ? studentCompleted.sessions.length : 0;
  const offersPublished = Array.isArray(offersMine?.offers) ? offersMine.offers.length : 0;
  const requestsMade = Array.isArray(requestsStudent?.requests) ? requestsStudent.requests : [];
  const requestCount = requestsMade.length;
  const requestedSkillIds = new Set(requestsMade.map(r => Number(r.skillId)).filter(Boolean));
  const conversationsList = Array.isArray(conversations?.conversations) ? conversations.conversations : [];
  const conversationsCount = conversationsList.length;
  const unreadTotal = conversationsList.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);

  return {
    me,
    tutorSessionsCompleted,
    studentSessionsCompleted,
    sessionsCompletedTotal: tutorSessionsCompleted + studentSessionsCompleted,
    offersPublished,
    requestCount,
    requestedUniqueSkills: requestedSkillIds.size,
    conversationsCount,
    unreadTotal
  };
}

function computeAchievements(defs, stats) {
  const isProfileComplete = () => {
    const fullNameOk = String(stats.me.fullName || '').trim().length >= 3;
    const bioOk = String(stats.me.bio || '').trim().length >= 10;
    // "school" isn't currently in the session payload; use skills as the 3rd signal.
    const skillsOk = Array.isArray(stats.me.skillsOffer) && stats.me.skillsOffer.length > 0;
    return fullNameOk && bioOk && skillsOk;
  };

  const ruleById = {
    1: () => stats.sessionsCompletedTotal >= 1,
    2: () => false, // requires rating history; keep locked until ratings are implemented
    3: () => stats.tutorSessionsCompleted >= 50,
    4: () => Number(stats.me.averageRating || 0) >= 5,

    5: () => isProfileComplete(),
    6: () => Boolean(stats.me.profileImage),
    7: () => Array.isArray(stats.me.skillsOffer) && stats.me.skillsOffer.length >= 1,
    8: () => Array.isArray(stats.me.skillsOffer) && stats.me.skillsOffer.length >= 5,
    9: () => Array.isArray(stats.me.skillsOffer) && stats.me.skillsOffer.length >= 10,

    10: () => stats.offersPublished >= 1,
    11: () => stats.offersPublished >= 5,
    12: () => stats.offersPublished >= 10,
    13: () => stats.offersPublished >= 25,

    14: () => stats.requestCount >= 1,
    15: () => stats.requestCount >= 5,
    16: () => stats.requestCount >= 10,
    17: () => stats.requestedUniqueSkills >= 5,

    18: () => stats.tutorSessionsCompleted >= 1,
    19: () => stats.tutorSessionsCompleted >= 5,
    20: () => stats.tutorSessionsCompleted >= 10,
    21: () => stats.tutorSessionsCompleted >= 25,
    22: () => stats.tutorSessionsCompleted >= 50,

    23: () => stats.studentSessionsCompleted >= 1,
    24: () => stats.studentSessionsCompleted >= 5,
    25: () => stats.studentSessionsCompleted >= 10,
    26: () => stats.studentSessionsCompleted >= 25,

    27: () => false, // needs request accept timing
    28: () => stats.sessionsCompletedTotal >= 10,
    29: () => false, // needs punctuality tracking

    30: () => stats.conversationsCount >= 1,
    31: () => false, // needs message count
    32: () => stats.conversationsCount >= 10,
    33: () => stats.conversationsCount > 0 && stats.unreadTotal === 0,

    34: () => false, // ratings not implemented
    35: () => false,
    36: () => false,
    37: () => false,

    38: () => false,
    39: () => false,
    40: () => false
  };

  return defs.map(a => {
    const check = ruleById[a.id];
    const unlocked = typeof check === 'function' ? Boolean(check()) : false;
    return {
      ...a,
      unlocked,
      // keep date null unless you later decide to persist unlock dates
      date: unlocked ? (a.date || null) : null
    };
  });
}

async function renderAchievementsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Achievements</h1>
            <div style="background: var(--red-primary); color: white; padding: 0.75rem 2rem; border-radius: var(--radius-xl); display: inline-block; margin-top: 1rem; font-weight: 700; position: relative;">
              <div style="position: absolute; left: -30px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 20px solid transparent; border-bottom: 20px solid transparent; border-right: 30px solid var(--red-primary);"></div>
              My Awards
              <div style="position: absolute; right: -30px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 20px solid transparent; border-bottom: 20px solid transparent; border-left: 30px solid var(--red-primary);"></div>
            </div>
          </div>
          
          <div class="achievement-grid" id="achievement-grid">
            <div style="text-align:center; padding: 2rem; color: var(--text-secondary);">Loading achievements…</div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  const stats = await getAchievementStats();
  const grid = document.getElementById('achievement-grid');
  if (!grid) return;
  if (!stats) {
    grid.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">Log in to view achievements.</div>';
    return;
  }

  const computed = computeAchievements(MockData.achievements, stats);
  AppState.achievements = computed;
  grid.innerHTML = computed.map(achievement => Components.achievementCard(achievement)).join('');
}

function renderProfilePage() {
  const user = getCurrentUser();
  if (!user?.id) {
    Router.navigate('login');
    return;
  }
  const displayName = (user.fullName || user.username || '').trim();
  // Handle both old string array format and new {id, name} object format
  const skillsOffer = Array.isArray(user.skillsOffer)
    ? user.skillsOffer.map(s => typeof s === 'string' ? s : s.name)
    : [];
  const skillsSeek = Array.isArray(user.skillsSeek)
    ? user.skillsSeek.map(s => typeof s === 'string' ? s : s.name)
    : [];
  const totalSessions = Number.isFinite(Number(user.totalSessions)) ? Number(user.totalSessions) : 0;
  const averageRating = Number.isFinite(Number(user.averageRating)) ? Number(user.averageRating) : 0;
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div style="max-width: 900px; margin: 0 auto;">
            <h1 class="page-title" style="text-align: left; margin-bottom: 2rem;">My Profile</h1>
            
            <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md); margin-bottom: 2rem;">
              <div style="display: flex; gap: 2rem; align-items: start;">
                <div class="profile-avatar-large">
                  ${Utils.getInitials(displayName || 'User')}
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div>
                      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">${displayName}</h2>
                      <p style="color: var(--text-secondary); margin-bottom: 1rem;">@${user.username}</p>
                    </div>
                    <button id="profile-edit-profile" type="button" class="btn btn-secondary" style="align-self: flex-start;">Edit Profile</button>
                  </div>
                  <p style="margin-bottom: 1rem;">${user.bio || ''}</p>
                  <div style="display: flex; gap: 2rem; margin-bottom: 1rem;">
                    <div>
                      <div style="font-size: 1.5rem; font-weight: 700; color: var(--blue-primary);">${totalSessions}</div>
                      <div style="color: var(--text-secondary); font-size: 0.875rem;">Sessions</div>
                    </div>
                    <div>
                      <div style="font-size: 1.5rem; font-weight: 700; color: var(--blue-primary);">${averageRating}</div>
                      <div style="color: var(--text-secondary); font-size: 0.875rem;">Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
              <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md);">
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Skills I Offer</h3>
                <div style="display: flex; flex-wrap: gap; gap: 0.5rem;">
                  ${skillsOffer.map(skill => `<span class="skill-badge">${skill}</span>`).join('')}
                </div>
              </div>
              
              <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md);">
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Skills I Seek</h3>
                <div style="display: flex; flex-wrap: gap; gap: 0.5rem;">
                  ${skillsSeek.map(skill => `<span class="skill-badge skill-badge-outline">${skill}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  setTimeout(() => {
    document.getElementById('profile-edit-profile')?.addEventListener('click', openProfileEditor);
  }, 0);
}

function renderSettingsPage() {
  const user = getCurrentUser();
  if (!user?.id) {
    Router.navigate('login');
    return;
  }

  const fullName = (user.fullName || user.username || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts.length ? parts[0] : '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const skillsOfferText = (user.skillsOffer || []).join(', ');
  const skillsSeekText = (user.skillsSeek || []).join(', ');
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div style="max-width: 900px; margin: 0 auto;">
            <h1 class="page-title" style="text-align: left; margin-bottom: 2rem;">Account Settings</h1>
            
            <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
                <div style="flex-shrink: 0;">
                  <div class="profile-avatar-large" style="position: relative;">
                    ${Utils.getInitials(fullName || 'User')}
                    <div style="position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; background: var(--bg-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; cursor: pointer;"><i class="fas fa-camera"></i></div>
                  </div>
                  <div style="margin-top: 1rem; text-align: center;">
                    <div style="font-weight: 700; margin-bottom: 0.5rem;">About Me</div>
                    <textarea id="settings-bio" class="form-textarea" style="min-height: 120px;" placeholder="Enter here..." maxlength="500">${user.bio || ''}</textarea>
                  </div>
                  <button class="btn btn-secondary btn-full" style="margin-top: 1rem;">View Public Profile</button>
                </div>
                
                <div style="flex: 1;">
                  <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Edit Profile</h2>
                  
                  <form onsubmit="saveSettings(event)">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                      <div class="form-group">
                        <label class="form-label">First Name</label>
                        <input type="text" name="firstName" class="form-input" value="${firstName}">
                      </div>
                      
                      <div class="form-group">
                        <label class="form-label">Last Name</label>
                        <input type="text" name="lastName" class="form-input" value="${lastName}">
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Email Address</label>
                      <input type="email" name="email" class="form-input" value="${user.email}">
                    </div>

                    <div class="form-group">
                      <label class="form-label">Skills I Offer</label>
                      <input type="text" name="skillsOffer" class="form-input" value="${skillsOfferText}" placeholder="e.g., Algebra, Python, Writing">
                      <div class="form-helper">Comma separated</div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Skills I Want to Learn</label>
                      <input type="text" name="skillsSeek" class="form-input" value="${skillsSeekText}" placeholder="e.g., Spanish, Guitar">
                      <div class="form-helper">Comma separated</div>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Current Password</label>
                      <input type="password" name="currentPassword" class="form-input" placeholder="TripleT">
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">New Password</label>
                      <input type="password" name="newPassword" class="form-input" placeholder="*****">
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                      <button type="button" class="btn btn-outline" onclick="Router.navigate('dashboard')">Cancel</button>
                      <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();
}

function renderMessagesPage() {
  const user = getCurrentUser();
  if (!user?.id) {
    Router.navigate('login');
    return;
  }

  // DM state
  AppState.dm = AppState.dm || {
    selectedOtherId: null,
    conversations: [],
    messages: [],
    pollingConversations: null,
    pollingThread: null
  };

  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; gap: 1rem;">
            <div>
              <h1 class="page-title">Messages</h1>
              <p class="page-subtitle">Direct messages with other users</p>
            </div>
            <button id="dm-new" type="button" class="btn btn-primary">New Message</button>
          </div>

          <div class="dm-layout" aria-label="Direct messages">
            <section class="dm-inbox" aria-label="Conversations">
              <div id="dm-conversations" class="dm-conversations" aria-live="polite"></div>
              <div id="dm-conversations-empty" class="dm-empty" style="display:none;">No conversations yet. Click “New Message”.</div>
            </section>

            <section class="dm-chat" aria-label="Chat">
              <div class="dm-chat-header" id="dm-chat-header">
                <div class="dm-chat-title">Select a conversation</div>
              </div>
              <div id="dm-thread" class="dm-thread" aria-live="polite"></div>
              <div id="dm-thread-empty" class="dm-empty">Start a conversation from “New Message”.</div>
              <form id="dm-send-form" class="dm-composer" autocomplete="off" style="display:none;">
                <input id="dm-input" name="content" class="form-input" type="text" placeholder="Type a message…" aria-label="Message" maxlength="2000" />
                <button class="btn btn-secondary" type="submit">Send</button>
              </form>
              <div id="dm-error" class="form-error" style="display:none; margin-top: var(--space-2);"></div>
            </section>
          </div>
        </div>
      </main>
    </div>
  `;

  initializeSidebar();

  const errorEl = document.getElementById('dm-error');
  const showError = (msg) => {
    if (!errorEl) return;
    errorEl.textContent = msg || '';
    errorEl.style.display = msg ? 'block' : 'none';
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const renderConversations = () => {
    const container = document.getElementById('dm-conversations');
    const empty = document.getElementById('dm-conversations-empty');
    if (!container) return;

    const conversations = Array.isArray(AppState.dm.conversations) ? AppState.dm.conversations : [];
    if (empty) empty.style.display = conversations.length ? 'none' : 'block';
    container.innerHTML = conversations.map(c => {
      const displayName = (c.otherFullName || c.otherUsername || '').trim();
      const initials = Utils.getInitials(displayName || c.otherUsername || 'U');
      const last = c.lastMessage ? Utils.escapeHtml(String(c.lastMessage)) : '';
      const selected = String(AppState.dm.selectedOtherId || '') === String(c.otherUserId);
      const unread = Number(c.unreadCount || 0);
      return `
        <button type="button" class="dm-conversation ${selected ? 'active' : ''}" data-other-id="${c.otherUserId}">
          <div class="dm-avatar" aria-hidden="true">${initials}</div>
          <div class="dm-conversation-body">
            <div class="dm-conversation-top">
              <div class="dm-name">${Utils.escapeHtml(displayName || 'User')}</div>
              <div class="dm-time">${Utils.escapeHtml(formatTime(c.lastMessageAt))}</div>
            </div>
            <div class="dm-preview">${last}</div>
          </div>
          ${unread > 0 ? `<div class="dm-unread" aria-label="${unread} unread">${unread}</div>` : ''}
        </button>
      `;
    }).join('');
  };

  const renderThread = () => {
    const thread = document.getElementById('dm-thread');
    const empty = document.getElementById('dm-thread-empty');
    const form = document.getElementById('dm-send-form');
    if (!thread || !empty || !form) return;

    const msgs = Array.isArray(AppState.dm.messages) ? AppState.dm.messages : [];
    const hasSelection = !!AppState.dm.selectedOtherId;
    form.style.display = hasSelection ? 'flex' : 'none';

    if (!hasSelection) {
      empty.textContent = 'Start a conversation from “New Message”.';
      empty.style.display = 'block';
      thread.innerHTML = '';
      return;
    }

    empty.textContent = msgs.length ? '' : 'No messages yet. Say hi!';
    empty.style.display = msgs.length ? 'none' : 'block';
    thread.innerHTML = msgs.map(m => {
      const isMine = Number(m.senderId) === Number(user.id);
      const content = Utils.escapeHtml(String(m.content || ''));
      const time = Utils.escapeHtml(formatTime(m.createdAt));
      const meta = isMine ? (Number(m.readStatus) === 1 ? 'Read' : 'Sent') : '';
      return `
        <div class="dm-row ${isMine ? 'mine' : 'theirs'}">
          <div class="dm-bubble">
            <div class="dm-text">${content}</div>
            <div class="dm-meta">${time}${meta ? ` • ${meta}` : ''}</div>
          </div>
        </div>
      `;
    }).join('');

    // Auto-scroll
    thread.scrollTop = thread.scrollHeight;
  };

  const setChatHeader = (conversation) => {
    const header = document.getElementById('dm-chat-header');
    if (!header) return;
    if (!conversation) {
      header.innerHTML = '<div class="dm-chat-title">Select a conversation</div>';
      return;
    }
    const displayName = (conversation.otherFullName || conversation.otherUsername || '').trim();
    const initials = Utils.getInitials(displayName || conversation.otherUsername || 'U');
    header.innerHTML = `
      <div class="dm-chat-user">
        <div class="dm-avatar" aria-hidden="true">${initials}</div>
        <div>
          <div class="dm-chat-title">${Utils.escapeHtml(displayName || 'User')}</div>
          <div class="dm-chat-sub">@${Utils.escapeHtml(conversation.otherUsername || '')}</div>
        </div>
      </div>
    `;
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations', { credentials: 'same-origin' });
      const ct = String(res.headers.get('content-type') || '');
      if (!ct.includes('application/json')) {
        throw new Error('Server returned HTML (restart server and log in again).');
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load conversations');
      AppState.dm.conversations = Array.isArray(data.conversations) ? data.conversations : [];

      // Update global unread badge
      const totalUnread = AppState.dm.conversations.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
      setUnreadMessagesCount(totalUnread);

      renderConversations();

      // Keep header in sync if currently selected
      if (AppState.dm.selectedOtherId) {
        const selected = AppState.dm.conversations.find(c => String(c.otherUserId) === String(AppState.dm.selectedOtherId));
        setChatHeader(selected || null);
      }
    } catch (e) {
      showError(e.message || 'Failed to load conversations');
    }
  };

  const fetchThread = async (otherId) => {
    try {
      const res = await fetch(`/api/messages/with/${otherId}?limit=200`, { credentials: 'same-origin' });
      const ct = String(res.headers.get('content-type') || '');
      if (!ct.includes('application/json')) {
        throw new Error('Server returned HTML (restart server and log in again).');
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load messages');
      AppState.dm.messages = Array.isArray(data.messages) ? data.messages : [];
      renderThread();

      // Refresh conversations so unread counts clear quickly
      fetchConversations();
    } catch (e) {
      showError(e.message || 'Failed to load messages');
    }
  };

  const openConversation = async (otherId, otherMeta) => {
    showError('');
    AppState.dm.selectedOtherId = otherId;
    renderConversations();

    const selected = (AppState.dm.conversations || []).find(c => String(c.otherUserId) === String(otherId));
    setChatHeader(selected || otherMeta || null);
    await fetchThread(otherId);

    const input = document.getElementById('dm-input');
    input?.focus();

    if (AppState.dm.pollingThread) {
      clearInterval(AppState.dm.pollingThread);
      AppState.dm.pollingThread = null;
    }
    AppState.dm.pollingThread = setInterval(() => {
      if (AppState.currentPage !== 'messages') return;
      if (!AppState.dm.selectedOtherId) return;
      fetchThread(AppState.dm.selectedOtherId);
    }, 7000);
  };

  const openNewDmModal = () => {
    const modalContent = `
      <div style="padding: 1.5rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap: 1rem; margin-bottom: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">New Message</h2>
          <button type="button" class="btn btn-outline" id="dm-search-close">Close</button>
        </div>
        <div class="form-group">
          <label class="form-label" for="dm-user-search">Search users</label>
          <input id="dm-user-search" type="text" class="form-input" placeholder="Username, name, or email" autocomplete="off" />
          <div class="form-helper">Type to search</div>
        </div>
        <div id="dm-search-results" style="display:flex; flex-direction:column; gap: 0.5rem;"></div>
        <div id="dm-search-empty" class="dm-empty" style="display:none;">No results.</div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = Components.modal(modalContent, 'dm-new-modal');
    document.body.appendChild(wrapper);
    setTimeout(() => document.getElementById('dm-new-modal')?.classList.add('show'), 10);

    const closeBtn = document.getElementById('dm-search-close');
    closeBtn?.addEventListener('click', () => closeModal('dm-new-modal'));

    const input = document.getElementById('dm-user-search');
    const results = document.getElementById('dm-search-results');
    const empty = document.getElementById('dm-search-empty');

    let timer = null;
    const runSearch = async () => {
      const q = String(input?.value || '').trim();
      if (!results || !empty) return;
      if (q.length < 1) {
        results.innerHTML = '';
        empty.style.display = 'none';
        return;
      }
      try {
        const res = await fetch(`/api/messages/user-search?query=${encodeURIComponent(q)}`, { credentials: 'same-origin' });
        const ct = String(res.headers.get('content-type') || '');
        if (!ct.includes('application/json')) {
          throw new Error('Server returned HTML (restart server and log in again).');
        }
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Search failed');
        const users = Array.isArray(data.users) ? data.users : [];
        empty.style.display = users.length ? 'none' : 'block';
        results.innerHTML = users.map(u2 => {
          const name = (u2.fullName || u2.username || '').trim();
          const initials = Utils.getInitials(name || u2.username || 'U');
          return `
            <button type="button" class="dm-search-result" data-user-id="${u2.id}">
              <div class="dm-avatar" aria-hidden="true">${initials}</div>
              <div style="text-align:left;">
                <div class="dm-name">${Utils.escapeHtml(name || 'User')}</div>
                <div class="dm-preview">@${Utils.escapeHtml(u2.username || '')}</div>
              </div>
            </button>
          `;
        }).join('');

        results.querySelectorAll('[data-user-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = Number(btn.dataset.userId);
            const picked = users.find(u3 => String(u3.id) === String(id));
            const otherMeta = picked ? {
              otherUserId: picked.id,
              otherUsername: picked.username,
              otherFullName: picked.fullName,
              otherAvatar: picked.avatar
            } : null;
            closeModal('dm-new-modal');
            openConversation(id, otherMeta);
          });
        });
      } catch (e) {
        results.innerHTML = `<div class="dm-empty">${Utils.escapeHtml(e.message || 'Search failed')}</div>`;
        empty.style.display = 'none';
      }
    };

    input?.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(runSearch, 250);
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('dm-new-modal');
      }
      if (e.key === 'Enter') {
        const first = results?.querySelector('[data-user-id]');
        if (first) {
          e.preventDefault();
          first.click();
        }
      }
    });

    setTimeout(() => input?.focus(), 0);
  };

  // Events
  document.getElementById('dm-new')?.addEventListener('click', openNewDmModal);
  document.getElementById('dm-conversations')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-other-id]');
    if (!btn) return;
    const otherId = Number(btn.dataset.otherId);
    if (!otherId) return;
    openConversation(otherId);
  });
  document.getElementById('dm-send-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const otherId = AppState.dm.selectedOtherId;
    if (!otherId) return;
    const input = document.getElementById('dm-input');
    const content = String(input?.value || '').trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/messages/with/${otherId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ content })
      });
      const ct = String(res.headers.get('content-type') || '');
      if (!ct.includes('application/json')) {
        throw new Error('Server returned HTML (restart server and log in again).');
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send');
      if (input) input.value = '';
      await fetchThread(otherId);
    } catch (err) {
      showError(err.message || 'Failed to send');
    }
  });
  // Enter naturally submits the form for single-line inputs; submit handler above sends.

  // Initial load + polling
  const pending = AppState.dm?.pendingOpen ? { ...AppState.dm.pendingOpen } : null;
  if (AppState.dm) AppState.dm.pendingOpen = null;

  fetchConversations().then(() => {
    if (!pending) return;
    openConversation(Number(pending.otherId), {
      otherUserId: Number(pending.otherId),
      otherUsername: pending.otherUsername,
      otherFullName: pending.otherFullName,
      otherAvatar: pending.otherAvatar
    });
  });
  if (AppState.dm.pollingConversations) {
    clearInterval(AppState.dm.pollingConversations);
  }
  AppState.dm.pollingConversations = setInterval(() => {
    if (AppState.currentPage !== 'messages') return;
    fetchConversations();
  }, 15000);

  // Cleanup when leaving page
  AppState.cleanup = () => {
    if (AppState.dm?.pollingConversations) clearInterval(AppState.dm.pollingConversations);
    if (AppState.dm?.pollingThread) clearInterval(AppState.dm.pollingThread);
    if (document.getElementById('dm-new-modal')) closeModal('dm-new-modal');
  };
}

function renderReportsPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Reports & Analytics</h1>
            <p class="page-subtitle">Track your progress and view detailed statistics</p>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();
}

async function renderAdminPage() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    Router.navigate('dashboard');
    return;
  }

  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Admin Panel</h1>
            <p class="page-subtitle">Manage users, sessions, and platform settings</p>
          </div>
          
          <div style="margin-bottom: 2rem;">
            <div style="display: flex; gap: 1rem; border-bottom: 2px solid var(--border-light); flex-wrap: wrap;">
              <button class="admin-tab active" data-tab="reports" style="padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid var(--blue-primary); font-weight: 600; cursor: pointer;"><i class="fas fa-chart-bar"></i> Reports</button>
              <button class="admin-tab" data-tab="public-sessions" style="padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; cursor: pointer; color: var(--text-secondary);">Public Sessions</button>
              <button class="admin-tab" data-tab="private-sessions" style="padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; cursor: pointer; color: var(--text-secondary);">Private Sessions</button>
              <button class="admin-tab" data-tab="users" style="padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; cursor: pointer; color: var(--text-secondary);">Users</button>
              <button class="admin-tab" data-tab="skills" style="padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; cursor: pointer; color: var(--text-secondary);">Skills</button>
              <button class="admin-tab" data-tab="database" id="database-tab-btn" style="display: none; padding: 1rem 2rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; cursor: pointer; color: var(--text-secondary);"><i class="fas fa-database"></i> Database</button>
            </div>
          </div>
          
          <div id="admin-content">
            <div style="text-align: center; padding: 3rem;">
              <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();

  // Add click handlers for tabs
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAdminTab(btn.dataset.tab);
    });
  });

  // F11 keyboard shortcut for database export
  document.addEventListener('keydown', handleAdminKeydown);

  // Load reports by default
  loadAdminReports();
}

// Handle F11 for DB export (admin only)
function handleAdminKeydown(e) {
  if (e.key === 'F11') {
    e.preventDefault();
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      exportDatabase();
    }
  }
}

// Export database file
async function exportDatabase() {
  showToast('Exporting database...', 'info');
  try {
    const response = await fetch('/api/admin/database-export');
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillswap-backup-${new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Database exported successfully!', 'success');
  } catch (err) {
    showToast('Failed to export database: ' + err.message, 'error');
  }
}

// Import database file
async function importDatabase(file) {
  if (!file) return;
  
  if (!confirm('⚠️ This will REPLACE the current database. All current data will be backed up but replaced. The server will restart. Continue?')) {
    return;
  }
  
  showToast('Uploading database...', 'info');
  
  try {
    const formData = new FormData();
    formData.append('database', file);
    
    const response = await fetch('/api/admin/database-import', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || 'Import failed');
    
    showToast('Database imported! Server restarting...', 'success');
    
    // Wait and reload
    setTimeout(() => window.location.reload(), 3000);
    
  } catch (err) {
    showToast('Failed to import database: ' + err.message, 'error');
  }
}

// Load Database management tab
async function loadAdminDatabase() {
  const contentDiv = document.getElementById('admin-content');
  
  contentDiv.innerHTML = `
    <div class="glass-card" style="padding: 2rem;">
      <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-database"></i> Database Management</h3>
      
      <div style="display: grid; gap: 2rem; max-width: 600px;">
        
        <div style="padding: 1.5rem; background: var(--bg-secondary); border-radius: 12px;">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-download" style="color: var(--blue-primary);"></i> Export Database</h4>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Download the entire database file as a backup. You can restore this later.</p>
          <button id="export-db-btn" class="btn btn-primary" style="width: 100%;">
            <i class="fas fa-download"></i> Export Database (F11)
          </button>
        </div>
        
        <div style="padding: 1.5rem; background: var(--bg-secondary); border-radius: 12px;">
          <h4 style="margin-bottom: 1rem;"><i class="fas fa-upload" style="color: var(--green-primary);"></i> Import Database</h4>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Upload a previously exported database file to restore data. <strong>Warning:</strong> This will replace all current data!</p>
          <input type="file" id="import-db-file" accept=".db,.sqlite,.sqlite3" style="display: none;">
          <button id="import-db-btn" class="btn btn-secondary" style="width: 100%;">
            <i class="fas fa-upload"></i> Import Database
          </button>
        </div>
        
        <div style="padding: 1rem; background: var(--yellow-light, #fff3cd); border-radius: 8px; border-left: 4px solid var(--yellow-primary, #ffc107);">
          <p style="margin: 0; color: #856404;"><i class="fas fa-info-circle"></i> <strong>Note:</strong> After importing, the server will restart automatically. This may take a few seconds.</p>
        </div>
        
      </div>
    </div>
  `;
  
  // Export button
  document.getElementById('export-db-btn').addEventListener('click', exportDatabase);
  
  // Import button triggers file input
  document.getElementById('import-db-btn').addEventListener('click', () => {
    document.getElementById('import-db-file').click();
  });
  
  // File selected - upload it
  document.getElementById('import-db-file').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importDatabase(e.target.files[0]);
    }
  });
}

async function loadAdminSessions(type, searchTerm = '') {
  const contentDiv = document.getElementById('admin-content');

  try {
    const response = await fetch(`/api/admin/sessions?type=${type}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load sessions');
    }

    let sessions = data.sessions || [];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      sessions = sessions.filter(s => 
        s.skillName?.toLowerCase().includes(term) ||
        s.tutorFullName?.toLowerCase().includes(term) ||
        s.tutorUsername?.toLowerCase().includes(term) ||
        s.studentFullName?.toLowerCase().includes(term) ||
        s.studentUsername?.toLowerCase().includes(term) ||
        s.location?.toLowerCase().includes(term)
      );
    }

    contentDiv.innerHTML = `
      <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${type === 'public' ? 'Public' : 'Private'} Sessions (${sessions.length})</h2>
          <div style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
            <input type="text" id="admin-sessions-search" placeholder="Search sessions..." value="${searchTerm}" style="padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); width: 250px;">
          </div>
        </div>
        ${sessions.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No sessions found.</p>' : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-light);">
                  <th style="padding: 1rem; text-align: left; font-weight: 600;">${type === 'public' ? 'Title / Skill' : 'Skill'}</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600;">Tutor</th>
                  ${type === 'private' ? '<th style="padding: 1rem; text-align: left; font-weight: 600;">Student</th>' : ''}
                  <th style="padding: 1rem; text-align: left; font-weight: 600;">Date/Time</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600;">Location</th>
                  <th style="padding: 1rem; text-align: left; font-weight: 600;">Status</th>
                  <th style="padding: 1rem; text-align: center; font-weight: 600;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.map(session => {
      const date = session.scheduledDate ? new Date(session.scheduledDate) : null;
      const dateStr = date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No slots';
      const displayName = type === 'public' ? (session.title ? `${session.title} (${session.skillName})` : session.skillName) : session.skillName;
      const locationDisplay = type === 'public' ? (session.locationType === 'online' ? '🌐 Online' : session.location || 'In-Person') : (session.location || 'TBD');
      return `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 1rem;">${Utils.escapeHtml(displayName)}</td>
                      <td style="padding: 1rem;">${Utils.escapeHtml(session.tutorFullName || session.tutorUsername)}</td>
                      ${type === 'private' ? `<td style="padding: 1rem;">${Utils.escapeHtml(session.studentFullName || session.studentUsername)}</td>` : ''}
                      <td style="padding: 1rem;">${dateStr}</td>
                      <td style="padding: 1rem;">${Utils.escapeHtml(locationDisplay)}</td>
                      <td style="padding: 1rem;"><span style="padding: 0.25rem 0.75rem; background: ${session.status === 'scheduled' || session.status === 'open' ? 'var(--blue-light)' : session.status === 'completed' ? 'var(--green-light)' : 'var(--gray-light)'}; color: ${session.status === 'scheduled' || session.status === 'open' ? 'var(--blue-primary)' : session.status === 'completed' ? 'var(--green-primary)' : 'var(--text-secondary)'}; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600;">${session.status}</span></td>
                      <td style="padding: 1rem; text-align: center;">
                        <button class="delete-session-btn" data-session-id="${session.id}" data-session-type="${type}" style="background: var(--red-primary); color: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); border: none; cursor: pointer; font-weight: 600;">Delete</button>
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    // Add search handler
    const searchInput = document.getElementById('admin-sessions-search');
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadAdminSessions(type, e.target.value), 300);
    });

    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteAdminSession(parseInt(btn.dataset.sessionId), btn.dataset.sessionType);
      });
    });
  } catch (error) {
    console.error('Load sessions error:', error);
    contentDiv.innerHTML = `<p style="text-align: center; color: var(--red-primary); padding: 2rem;">Failed to load sessions: ${error.message}</p>`;
  }
}

async function loadAdminUsers(searchTerm = '') {
  const contentDiv = document.getElementById('admin-content');

  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load users');
    }

    let users = data.users || [];
    const currentUser = getCurrentUser();
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(u => 
        u.username?.toLowerCase().includes(term) ||
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    contentDiv.innerHTML = `
      <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0;">All Users (${users.length})</h2>
          <div style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
            <input type="text" id="admin-users-search" placeholder="Search users..." value="${searchTerm}" style="padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); width: 250px;">
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-light);">
                <th style="padding: 1rem; text-align: left; font-weight: 600;">Username</th>
                <th style="padding: 1rem; text-align: left; font-weight: 600;">Full Name</th>
                <th style="padding: 1rem; text-align: left; font-weight: 600;">Email</th>
                <th style="padding: 1rem; text-align: left; font-weight: 600;">Status</th>
                <th style="padding: 1rem; text-align: left; font-weight: 600;">Joined</th>
                <th style="padding: 1rem; text-align: center; font-weight: 600;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No users found</td></tr>' : users.map(user => `
                <tr style="border-bottom: 1px solid var(--border-light);">
                  <td style="padding: 1rem;">@${user.username}</td>
                  <td style="padding: 1rem;">${user.fullName || '-'}</td>
                  <td style="padding: 1rem;">${user.email}</td>
                  <td style="padding: 1rem;"><span style="padding: 0.25rem 0.75rem; background: ${user.status === 'active' ? 'var(--green-light)' : 'var(--gray-light)'}; color: ${user.status === 'active' ? 'var(--green-primary)' : 'var(--text-secondary)'}; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600;">${user.status}</span></td>
                  <td style="padding: 1rem;">${new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style="padding: 1rem; text-align: center;">
                    ${user.id === currentUser?.id ? '<span style="color: var(--text-secondary); font-style: italic;">You</span>' : `<button class="delete-user-btn" data-user-id="${user.id}" data-username="${user.username}" style="background: var(--red-primary); color: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); border: none; cursor: pointer; font-weight: 600;">Delete</button>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Add search handler
    const searchInput = document.getElementById('admin-users-search');
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadAdminUsers(e.target.value), 300);
    });

    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteAdminUser(parseInt(btn.dataset.userId), btn.dataset.username);
      });
    });
  } catch (error) {
    console.error('Load users error:', error);
    contentDiv.innerHTML = `<p style="text-align: center; color: var(--red-primary); padding: 2rem;">Failed to load users: ${error.message}</p>`;
  }
}

/**
 * Load all skills with users who teach/learn them
 */
async function loadAdminSkills(searchTerm = '') {
  const contentDiv = document.getElementById('admin-content');

  try {
    const response = await fetch('/api/admin/skills');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load skills');
    }

    let skills = data.skills || [];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      skills = skills.filter(s => s.skillName?.toLowerCase().includes(term));
    }

    contentDiv.innerHTML = `
      <div style="background: white; border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0;">All Skills (${skills.length})</h2>
          <div style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
            <input type="text" id="admin-skills-search" placeholder="Search skills..." value="${searchTerm}" style="padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); width: 250px;">
          </div>
        </div>
        ${skills.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No skills found</p>' : `
          <div style="display: grid; gap: 1rem;">
            ${skills.map(skill => `
              <div style="border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; margin: 0;">${Utils.escapeHtml(skill.skillName)}</h3>
                    <span style="padding: 0.25rem 0.75rem; background: var(--bg-light); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--text-secondary);">${skill.teaching.length + skill.learning.length} users</span>
                  </div>
                  <button class="admin-delete-skill-btn" data-skill="${Utils.escapeHtml(skill.skillName)}" style="padding: 0.5rem 1rem; background: var(--red-light); color: var(--red-primary); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 0.875rem; font-weight: 600;" title="Delete this skill for all users">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                  <div>
                    <div style="font-weight: 600; color: var(--green-primary); margin-bottom: 0.5rem;"><i class="fas fa-chalkboard-teacher"></i> Teaching (${skill.teaching.length})</div>
                    ${skill.teaching.length === 0 ? '<p style="color: var(--text-secondary); font-size: 0.875rem;">No one teaching this skill</p>' : `
                      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${skill.teaching.map(u => `
                          <span style="padding: 0.375rem 0.75rem; background: var(--green-light); color: var(--green-primary); border-radius: var(--radius-md); font-size: 0.875rem; cursor: pointer;" onclick="Router.navigate('profile/${u.userId}')">${Utils.escapeHtml(u.fullName)} <span style="opacity: 0.7;">@${u.username}</span></span>
                        `).join('')}
                      </div>
                    `}
                  </div>
                  <div>
                    <div style="font-weight: 600; color: var(--blue-primary); margin-bottom: 0.5rem;"><i class="fas fa-graduation-cap"></i> Learning (${skill.learning.length})</div>
                    ${skill.learning.length === 0 ? '<p style="color: var(--text-secondary); font-size: 0.875rem;">No one learning this skill</p>' : `
                      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${skill.learning.map(u => `
                          <span style="padding: 0.375rem 0.75rem; background: var(--blue-light); color: var(--blue-primary); border-radius: var(--radius-md); font-size: 0.875rem; cursor: pointer;" onclick="Router.navigate('profile/${u.userId}')">${Utils.escapeHtml(u.fullName)} <span style="opacity: 0.7;">@${u.username}</span></span>
                        `).join('')}
                      </div>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    // Add search handler
    const searchInput = document.getElementById('admin-skills-search');
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadAdminSkills(e.target.value), 300);
    });
    
    // Secret: type "db" and press Enter to reveal Database tab
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.toLowerCase() === 'db') {
        e.preventDefault();
        const dbTab = document.getElementById('database-tab-btn');
        if (dbTab) {
          dbTab.style.display = 'block';
          switchAdminTab('database');
          e.target.value = '';
        }
      }
    });
    
    // Add delete button handlers
    document.querySelectorAll('.admin-delete-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const skillName = btn.dataset.skill;
        if (skillName) {
          deleteAdminSkill(skillName);
        }
      });
    });
  } catch (error) {
    console.error('Load skills error:', error);
    contentDiv.innerHTML = `<p style="text-align: center; color: var(--red-primary); padding: 2rem;">Failed to load skills: ${error.message}</p>`;
  }
}

function switchAdminTab(tab) {
  // Update tab styles
  document.querySelectorAll('.admin-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
      btn.style.borderBottom = '3px solid var(--blue-primary)';
      btn.style.color = 'inherit';
    } else {
      btn.classList.remove('active');
      btn.style.borderBottom = '3px solid transparent';
      btn.style.color = 'var(--text-secondary)';
    }
  });

  // Load content
  if (tab === 'reports') {
    loadAdminReports();
  } else if (tab === 'public-sessions') {
    loadAdminSessions('public');
  } else if (tab === 'private-sessions') {
    loadAdminSessions('private');
  } else if (tab === 'users') {
    loadAdminUsers();
  } else if (tab === 'skills') {
    loadAdminSkills();
  } else if (tab === 'database') {
    loadAdminDatabase();
  }
}

/**
 * Load comprehensive reports and analytics
 */
async function loadAdminReports() {
  const contentDiv = document.getElementById('admin-content');
  contentDiv.innerHTML = `<div style="text-align: center; padding: 3rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i><p style="margin-top: 1rem;">Loading reports...</p></div>`;

  try {
    // Fetch all report data in parallel
    const [dashboardRes, skillsRes, tutorsRes, engagementRes] = await Promise.all([
      fetch('/api/reports/dashboard'),
      fetch('/api/reports/skills/popular'),
      fetch('/api/reports/tutors/top'),
      fetch('/api/reports/engagement')
    ]);

    const dashboard = await dashboardRes.json();
    const skills = await skillsRes.json();
    const tutors = await tutorsRes.json();
    const engagement = await engagementRes.json();

    if (!dashboard.success) throw new Error('Failed to load dashboard');

    const stats = dashboard.stats;
    const u = stats.users || {};
    const s = stats.sessions || {};
    const r = stats.ratings || {};
    const sk = stats.skills || {};
    const m = stats.messages || {};
    const eng = engagement.data || {};

    // Build rating distribution bar
    const totalRatings = (r.fiveStarCount || 0) + (r.fourStarCount || 0) + (r.threeStarCount || 0) + (r.twoStarCount || 0) + (r.oneStarCount || 0);
    const ratingBars = totalRatings > 0 ? `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${[5, 4, 3, 2, 1].map(star => {
      const count = r[['', 'oneStarCount', 'twoStarCount', 'threeStarCount', 'fourStarCount', 'fiveStarCount'][star]] || 0;
      const pct = Math.round((count / totalRatings) * 100);
      return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 20px; text-align: right;">${star}★</span>
              <div style="flex: 1; background: var(--bg-gray); border-radius: 4px; height: 20px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${star >= 4 ? 'var(--green-primary)' : star === 3 ? 'var(--blue-primary)' : 'var(--red-primary)'}; transition: width 0.3s;"></div>
              </div>
              <span style="width: 40px; font-size: 0.875rem; color: var(--text-secondary);">${count}</span>
            </div>
          `;
    }).join('')}
      </div>
    ` : '<p style="color: var(--text-secondary);">No ratings yet</p>';

    // Top skills lists
    const offeredList = (skills.data?.offered || []).slice(0, 5).map(s => `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light);"><span>${s.name}</span><span style="font-weight: 600;">${s.count}</span></div>`).join('') || '<p style="color: var(--text-secondary);">No data</p>';
    const soughtList = (skills.data?.sought || []).slice(0, 5).map(s => `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light);"><span>${s.name}</span><span style="font-weight: 600;">${s.count}</span></div>`).join('') || '<p style="color: var(--text-secondary);">No data</p>';

    // Top tutors
    const tutorsList = (tutors.data || []).slice(0, 5).map(t => `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light);">
        <div style="width: 40px; height: 40px; background: var(--navy-dark); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;">${(t.fullName || t.username || 'U').charAt(0).toUpperCase()}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${t.fullName || t.username}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">@${t.username}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: var(--green-primary);">★ ${t.avgRating || 0}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${t.totalSessions || 0} sessions</div>
        </div>
      </div>
    `).join('') || '<p style="color: var(--text-secondary);">No rated tutors yet</p>';

    contentDiv.innerHTML = `
      <div style="display: grid; gap: 1.5rem;">
        <!-- Overview Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div style="background: linear-gradient(135deg, var(--blue-primary), var(--blue-dark)); color: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <div style="font-size: 0.875rem; opacity: 0.9;">Total Users</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${u.totalUsers || 0}</div>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;"><i class="fas fa-arrow-up"></i> ${u.newThisWeek || 0} this week</div>
          </div>
          
          <div style="background: linear-gradient(135deg, var(--green-primary), var(--green-dark)); color: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <div style="font-size: 0.875rem; opacity: 0.9;">Total Sessions</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${s.totalSessions || 0}</div>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;"><i class="fas fa-check"></i> ${s.completedSessions || 0} completed</div>
          </div>
          
          <div style="background: linear-gradient(135deg, var(--red-primary), var(--red-dark)); color: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <div style="font-size: 0.875rem; opacity: 0.9;">Avg Rating</div>
            <div style="font-size: 2.5rem; font-weight: 700;">★ ${r.averageRating || '0.0'}</div>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${r.totalRatings || 0} total ratings</div>
          </div>
          
          <div style="background: linear-gradient(135deg, var(--navy-dark), var(--navy-darker)); color: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <div style="font-size: 0.875rem; opacity: 0.9;">Messages</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${m.totalMessages || 0}</div>
            <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;"><i class="fas fa-envelope"></i> ${m.messagesThisWeek || 0} this week</div>
          </div>
        </div>
        
        <!-- Detailed Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          <!-- User Breakdown -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-users" style="color: var(--blue-primary);"></i> User Breakdown</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--green-primary);">${u.activeUsers || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Active</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--blue-primary);">${u.totalUsers || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Users</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--red-primary);">${u.adminCount || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Admins</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${u.newThisMonth || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">New (30d)</div>
              </div>
            </div>
          </div>
          
          <!-- Session Breakdown -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-calendar-check" style="color: var(--green-primary);"></i> Session Breakdown</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--blue-primary);">${s.scheduledSessions || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Scheduled</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--green-primary);">${s.completedSessions || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Completed</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--red-primary);">${s.cancelledSessions || 0}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Cancelled</div>
              </div>
              <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${s.avgDuration || 0}m</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Avg Duration</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Skills and Ratings Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          <!-- Top Offered Skills -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-hand-holding-heart" style="color: var(--green-primary);"></i> Top Offered Skills</h3>
            ${offeredList}
          </div>
          
          <!-- Top Sought Skills -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-search" style="color: var(--blue-primary);"></i> Top Sought Skills</h3>
            ${soughtList}
          </div>
          
          <!-- Rating Distribution -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-star" style="color: var(--red-primary);"></i> Rating Distribution</h3>
            ${ratingBars}
          </div>
        </div>
        
        <!-- Top Tutors and Engagement -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          <!-- Top Tutors -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-trophy" style="color: var(--red-primary);"></i> Top Rated Tutors</h3>
            ${tutorsList}
          </div>
          
          <!-- Engagement Metrics -->
          <div style="background: white; padding: 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-chart-pie" style="color: var(--blue-primary);"></i> Engagement Metrics</h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Profile Completion</span>
                  <span style="font-weight: 600;">${eng.profileCompletion?.percentage || 0}%</span>
                </div>
                <div style="background: var(--bg-gray); border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="width: ${eng.profileCompletion?.percentage || 0}%; height: 100%; background: var(--green-primary);"></div>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
                <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                  <div style="font-size: 1.25rem; font-weight: 700;">${eng.sessionEngagement?.tutors || 0}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Users Teaching</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                  <div style="font-size: 1.25rem; font-weight: 700;">${eng.sessionEngagement?.students || 0}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Users Learning</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                  <div style="font-size: 1.25rem; font-weight: 700;">${eng.skillEngagement?.usersWithSkills || 0}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Users w/ Skills</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: var(--bg-light); border-radius: var(--radius-md);">
                  <div style="font-size: 1.25rem; font-weight: 700;">${sk.uniqueSkills || 0}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Unique Skills</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Platform Summary -->
        <div style="background: linear-gradient(135deg, var(--navy-dark), var(--navy-darker)); color: white; padding: 2rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;"><i class="fas fa-info-circle"></i> Platform Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; text-align: center;">
            <div>
              <div style="font-size: 2rem; font-weight: 700;">${u.totalUsers || 0}</div>
              <div style="opacity: 0.8;">Registered Users</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 700;">${s.totalSessions || 0}</div>
              <div style="opacity: 0.8;">Total Sessions</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 700;">${sk.totalSkills || 0}</div>
              <div style="opacity: 0.8;">Skills Listed</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 700;">${m.totalMessages || 0}</div>
              <div style="opacity: 0.8;">Messages Sent</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 700;">${r.totalRatings || 0}</div>
              <div style="opacity: 0.8;">Reviews Given</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Load reports error:', error);
    contentDiv.innerHTML = `<p style="text-align: center; color: var(--red-primary); padding: 2rem;">Failed to load reports: ${error.message}</p>`;
  }
}

async function deleteAdminSession(sessionId, type) {
  const reason = await Utils.showPromptModal(
    'This reason will be sent to the tutor in a message.',
    'Delete Session - Enter Reason',
    'Enter reason for deletion...'
  );

  if (!reason || !reason.trim()) {
    showToast('Deletion cancelled - reason is required', 'error');
    return;
  }

  const confirmed = await Utils.showConfirmModal(
    'Are you sure you want to delete this session? This action cannot be undone.',
    'Confirm Deletion'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim(), type: type })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Failed to delete session', 'error');
      return;
    }

    showToast('Session deleted and notifications sent', 'success');
    loadAdminSessions(type);
  } catch (error) {
    console.error('Delete session error:', error);
    showToast('Failed to delete session', 'error');
  }
}

async function deleteAdminUser(userId, username) {
  const confirmed = await Utils.showConfirmModal(
    `Are you sure you want to delete user @${username}? This action cannot be undone.`,
    'Delete User'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Failed to delete user', 'error');
      return;
    }

    showToast('User deleted successfully', 'success');
    loadAdminUsers();
  } catch (error) {
    console.error('Delete user error:', error);
    showToast('Failed to delete user', 'error');
  }
}

// Delete a skill from the system (admin only)
async function deleteAdminSkill(skillName) {
  if (!confirm(`Are you sure you want to delete the skill "${skillName}"?\n\nThis will remove it from ALL users who have it listed.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/skills/${encodeURIComponent(skillName)}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete skill');
    }
    
    showToast(data.message || 'Skill deleted successfully', 'success');
    
    // Refresh the skills list
    loadAdminSkills();
    
    // Clear the skills cache so autocomplete gets updated
    allSkillsCache = null;
    
  } catch (error) {
    console.error('Delete skill error:', error);
    showToast('Failed to delete skill: ' + error.message, 'error');
  }
}

// Make functions globally accessible for inline onclick handlers
window.switchAdminTab = switchAdminTab;
window.deleteAdminSession = deleteAdminSession;
window.deleteAdminUser = deleteAdminUser;
window.deleteAdminSkill = deleteAdminSkill;

function renderWorksCitedPage() {
  const worksCitedInner = `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Works Cited</h1>
        <p class="page-subtitle">Resources and References</p>
      </div>

      <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md); max-width: 1000px; margin: 0 auto;">
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--blue-primary); padding-bottom: 0.5rem;">Original Work Declaration</h2>
              <p style="line-height: 1.6; color: var(--text-secondary);">This project represents 100% original code written by our team. All functionality, features, and implementations were developed specifically for this BPA competition without the use of prohibited frameworks or third-party code libraries beyond those explicitly allowed in the competition guidelines.</p>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--blue-primary); padding-bottom: 0.5rem;">Technical Resources</h2>
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">Express.js Documentation</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Official documentation for Express web framework</p>
                <a href="https://expressjs.com/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://expressjs.com/</a>
              </div>
              
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">SQLite Documentation</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Database design and SQL syntax reference</p>
                <a href="https://www.sqlite.org/docs.html" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://www.sqlite.org/docs.html</a>
              </div>
              
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">Node.js Documentation</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Server-side JavaScript runtime reference</p>
                <a href="https://nodejs.org/docs/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://nodejs.org/docs/</a>
              </div>
              
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">MDN Web Docs</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">HTML, CSS, and JavaScript reference</p>
                <a href="https://developer.mozilla.org/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://developer.mozilla.org/</a>
              </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--blue-primary); padding-bottom: 0.5rem;">Design Resources</h2>
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">Font Awesome Icons</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Icon library for user interface (Free License)</p>
                <a href="https://fontawesome.com/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://fontawesome.com/</a>
              </div>
              
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">Google Fonts</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Web typography resources</p>
                <a href="https://fonts.google.com/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://fonts.google.com/</a>
              </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--blue-primary); padding-bottom: 0.5rem;">Security & Best Practices</h2>
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">OWASP Security Guidelines</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Web application security best practices</p>
                <a href="https://owasp.org/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://owasp.org/</a>
              </div>
              
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">bcrypt.js Documentation</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Password hashing implementation reference</p>
                <a href="https://www.npmjs.com/package/bcryptjs" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://www.npmjs.com/package/bcryptjs</a>
              </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--blue-primary); padding-bottom: 0.5rem;">Learning Resources</h2>
              <div style="margin-bottom: 1rem; padding-left: 1rem; border-left: 3px solid var(--border-light);">
                <p style="font-weight: 600; margin-bottom: 0.25rem;">Database Design Principles</p>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Normalization and schema design concepts</p>
                <a href="https://www.w3schools.com/sql/" target="_blank" style="color: var(--blue-primary); font-size: 0.875rem;">https://www.w3schools.com/sql/</a>
              </div>
            </div>
            
            <div style="background: var(--bg-light); border-radius: var(--radius-xl); padding: 1.5rem; margin-top: 2rem;">
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;"><strong>Note:</strong> All external resources were used solely for reference and learning purposes. No code was directly copied from these sources. This project complies with all BPA competition guidelines regarding originality and permitted use of development tools and libraries.</p>
            </div>
            
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-light); text-align: center; color: var(--text-secondary); font-size: 0.875rem;">
              <p style="margin-bottom: 0.5rem;"><strong>SkillSwap - Student Talent Exchange Platform</strong></p>
              <p style="margin-bottom: 0.5rem;">BPA Web Application Team Competition 2026</p>
              <p style="margin: 0;">Reedy High School BPA Chapter • Frisco, Texas</p>
              <p style="margin-top: 0.5rem; font-weight: 600;">Team: Jyothir Manchu, Aaryan Porwal, Rishik Pamuru</p>
            </div>
      </div>
    </div>
  `;

  const user = getCurrentUser();
  if (!user) {
    document.body.innerHTML = `
      <div class="auth-container">
        <div class="auth-left">
          <div class="auth-logo-container">
            <div class="auth-logo-wrapper">
              <img src="LogoNoTitle__Logo_-removebg-preview.png" alt="SkillSwap" class="auth-logo-img">
              <div class="auth-logo-text">
                <div>SKILL</div>
                <div>SWAP</div>
              </div>
            </div>
          </div>
          <div class="auth-card" style="max-width: 1100px; width: min(1100px, 100%);">
            ${worksCitedInner}
            <div style="text-align: center; margin-top: 1.25rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
              <a href="#" id="works-cited-back-to-login" style="color: var(--blue-primary); font-weight: 700; text-decoration: underline;">Back to Login</a>
              <a href="#" id="works-cited-back-to-register" style="color: var(--blue-primary); font-weight: 700; text-decoration: underline;">Back to Register</a>
            </div>
            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); text-align: center; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5;">
              <div style="font-weight: 600; color: var(--text-primary);">Reedy HS BPA Chapter</div>
              <div>Jyothir Manchu • Aaryan Porwal • Rishik Pamuru</div>
              <div>Reedy High School, Frisco, Texas • 2026</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('works-cited-back-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('login');
    });
    document.getElementById('works-cited-back-to-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('register');
    });
    return;
  }

  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        ${worksCitedInner}
      </main>
    </div>
  `;
  initializeSidebar();
}

function renderAITutorPage() {
  document.body.innerHTML = `
    <div class="app-container">
      ${Components.sidebar()}
      <main class="main-content">
        ${Components.topbar()}
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">AI Tutor</h1>
            <p class="page-subtitle">Get instant help from our AI-powered tutoring assistant</p>
          </div>
          
          <div style="background: white; border-radius: var(--radius-2xl); padding: 2rem; box-shadow: var(--shadow-md); max-width: 800px; margin: 0 auto;">
            <div id="ai-chat-messages" style="min-height: 400px; max-height: 500px; overflow-y: auto; padding: 2rem; background: var(--bg-light); border-radius: var(--radius-xl); margin-bottom: 1.5rem;">
              <div style="text-align: center; color: var(--text-secondary); padding: 4rem 0;">
                👋 Hi! I'm SkillBot, your AI tutoring assistant. Ask me anything about finding tutors or learning new skills!
              </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
              <input type="text" id="ai-chat-input" class="form-input" placeholder="Ask a question..." style="flex: 1;" onkeypress="if(event.key==='Enter')sendAIMessage()">
              <button class="btn btn-primary" onclick="sendAIMessage()">Send</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  initializeSidebar();
}

async function sendAIMessage() {
  const input = document.getElementById('ai-chat-input');
  const messagesDiv = document.getElementById('ai-chat-messages');
  const message = (input?.value || '').trim();

  if (!message) return;

  // Add user message to chat
  const userMsgDiv = document.createElement('div');
  userMsgDiv.style.cssText = 'margin-bottom: 1rem; text-align: right;';
  userMsgDiv.innerHTML = `<div style="display: inline-block; background: var(--blue-primary); color: white; padding: 0.75rem 1rem; border-radius: 1rem; max-width: 70%; text-align: left;">${Utils.escapeHtml(message)}</div>`;
  messagesDiv.appendChild(userMsgDiv);

  input.value = '';
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = 'margin-bottom: 1rem;';
  loadingDiv.innerHTML = `<div style="display: inline-block; background: white; padding: 0.75rem 1rem; border-radius: 1rem; max-width: 70%;"><i class="fas fa-spinner fa-spin"></i> Thinking...</div>`;
  messagesDiv.appendChild(loadingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: [] })
    });

    loadingDiv.remove();

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'AI service unavailable');
    }

    const data = await response.json();

    // Add AI response
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.style.cssText = 'margin-bottom: 1rem;';
    aiMsgDiv.innerHTML = `<div style="display: inline-block; background: white; padding: 0.75rem 1rem; border-radius: 1rem; max-width: 70%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">${Utils.escapeHtml(data.response || 'Sorry, I could not process that.')}</div>`;
    messagesDiv.appendChild(aiMsgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

  } catch (error) {
    loadingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'margin-bottom: 1rem;';
    errorDiv.innerHTML = `<div style="display: inline-block; background: #fee; color: #c33; padding: 0.75rem 1rem; border-radius: 1rem; max-width: 70%;">⚠️ ${Utils.escapeHtml(error.message)}</div>`;
    messagesDiv.appendChild(errorDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

window.sendAIMessage = sendAIMessage;

function render404Page() {
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg-light); text-align: center; padding: 2rem;">
      <div>
        <h1 style="font-size: 6rem; font-weight: 700; color: var(--red-primary); margin-bottom: 1rem;">404</h1>
        <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">Page Not Found</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">The page you're looking for doesn't exist.</p>
        <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Go to Dashboard</button>
      </div>
    </div>
  `;
}

// Event Handlers
async function handleLogin(event) {
  event.preventDefault();

  setAuthError('login-error', '');

  const form = event.target;
  const username = form.querySelector('input[type="text"]').value;
  const password = form.querySelector('input[type="password"]').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      AppState.currentUser = data.user;
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('user', JSON.stringify(data.user));
      Router.navigate('dashboard');
    } else {
      setAuthError('login-error', formatValidationErrors(data) || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    setAuthError('login-error', 'Login failed. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();

  setAuthError('register-error', '');

  const form = event.target;
  const formData = new FormData(form);

  const data = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    fullName: formData.get('fullName'),
    bio: formData.get('bio')
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      AppState.currentUser = result.user;
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('user', JSON.stringify(result.user));
      Router.navigate('dashboard');
    } else {
      setAuthError('register-error', formatValidationErrors(result) || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    setAuthError('register-error', 'Registration failed. Please try again.');
  }
}

async function logout() {
  // Confirm logout
  const confirmed = await Utils.showConfirmModal(
    'Are you sure you want to log out?',
    'Confirm Logout'
  );

  if (!confirmed) {
    return;
  }

  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Clear all session and local storage
  sessionStorage.clear();
  localStorage.removeItem('user');
  localStorage.removeItem('token');

  stopUnreadMessagesPolling();
  setUnreadMessagesCount(0);

  // Reset app state
  AppState.currentUser = null;
  AppState.currentPage = 'login';

  // Navigate to login
  Router.navigate('login');
}

function openProfileModal() {
  const user = getCurrentUser();
  const profileImage = user.profileImage
    ? `<img src="${user.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
    : Utils.getInitials(user.fullName || user.username || 'U');

  const modalHtml = `
    <div id="profile-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem;">
      <div style="background: white; border-radius: 12px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div style="padding: 2rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 1.5rem; font-weight: 700;">My Profile</h2>
          <button class="modal-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">&times;</button>
        </div>
        
        <div style="padding: 2.5rem; display: grid; grid-template-columns: 350px 1fr; gap: 3rem;">
          <div>
            <div style="text-align: center; margin-bottom: 2rem;">
              <div style="position: relative; display: inline-block;">
                <div id="profile-avatar-display" style="width: 180px; height: 180px; border-radius: 50%; background: var(--blue-light); color: var(--blue-primary); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; font-weight: 700; margin: 0 auto; position: relative; overflow: hidden;">
                  ${profileImage}
                </div>
                <button class="upload-pic-btn" style="position: absolute; bottom: 5px; right: 5px; width: 48px; height: 48px; border-radius: 50%; background: var(--blue-primary); color: white; border: 4px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                  <i class="fas fa-camera"></i>
                </button>
                <input type="file" id="profile-pic-input" accept="image/*" style="display: none;">
              </div>
              <h3 style="margin: 1.25rem 0 0.5rem 0; font-size: 1.5rem; font-weight: 700;">${user.fullName || user.username}</h3>
              <p style="margin: 0; color: var(--text-secondary); font-size: 1rem;">@${user.username}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem;">
              <div style="background: var(--gray-light); padding: 1.5rem; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Total Sessions</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--blue-primary);">${user.totalSessions || 0}</div>
              </div>
              <div style="background: var(--gray-light); padding: 1.5rem; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Average Rating</div>
                <div style="font-size: 1.5rem;">
                  ${Array.from({ length: 5 }, (_, i) => {
    const rating = user.averageRating || 0;
    if (i < Math.floor(rating)) {
      return '<i class="fas fa-star" style="color: #fbbf24;"></i>';
    } else if (i < rating) {
      return '<i class="fas fa-star-half-alt" style="color: #fbbf24;"></i>';
    } else {
      return '<i class="far fa-star" style="color: #d1d5db;"></i>';
    }
  }).join('')}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">${(user.averageRating || 0).toFixed(1)} / 5.0</div>
              </div>
            </div>
          </div>
          
          <div>
            <div style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(135deg, var(--red-light) 0%, var(--red-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                  <i class="fas fa-user" style="font-size: 1.25rem;"></i> About Me
                </div>
              </div>
              <p style="margin: 0; color: #1f2937; line-height: 1.8; font-size: 1rem; padding: 0 1rem;">${user.bio || 'No bio yet'}</p>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                  <i class="fas fa-bolt" style="font-size: 1.25rem;"></i> Skills I Offer
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0 1rem;">
                ${(user.skillsOffer || []).length > 0
      ? user.skillsOffer.map(skill => `<span style="padding: 0.5rem 1rem; background: transparent; color: #1f2937; border: 2px solid var(--blue-primary); border-radius: 20px; font-size: 1rem; font-weight: 600;">${skill}</span>`).join('')
      : '<span style="color: #1f2937; font-size: 1rem;">No skills added yet</span>'}
              </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(135deg, var(--green-light) 0%, var(--green-primary) 100%); padding: 0.75rem 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; color: white;">
                  <i class="fas fa-bullseye" style="font-size: 1.25rem;"></i> Skills I Seek
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0 1rem;">
                ${(user.skillsSeek || []).length > 0
      ? user.skillsSeek.map(skill => `<span style="padding: 0.5rem 1rem; background: transparent; color: #1f2937; border: 2px solid var(--green-primary); border-radius: 20px; font-size: 1rem; font-weight: 600;">${skill}</span>`).join('')
      : '<span style="color: #1f2937; font-size: 1rem;">No skills added yet</span>'}
              </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button class="modal-edit-btn btn btn-primary" style="padding: 0.875rem 2rem; font-size: 1rem;">Edit Profile</button>
              <button class="modal-close-bottom-btn btn btn-secondary" style="padding: 0.875rem 2rem; font-size: 1rem;">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Add event listeners
  document.getElementById('profile-pic-input').addEventListener('change', handleProfilePictureUpload);

  document.querySelector('.upload-pic-btn').addEventListener('click', () => {
    document.getElementById('profile-pic-input').click();
  });

  document.querySelector('.modal-close-btn').addEventListener('click', closeProfileModal);
  document.querySelector('.modal-close-bottom-btn').addEventListener('click', closeProfileModal);
  document.querySelector('.modal-edit-btn').addEventListener('click', () => {
    closeProfileModal();
    openProfileEditor();
  });

  // Close on backdrop click
  document.getElementById('profile-modal').addEventListener('click', (e) => {
    if (e.target.id === 'profile-modal') {
      closeProfileModal();
    }
  });
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.remove();
  }
}

async function handleProfilePictureUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size must be less than 5MB', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('profileImage', file);

  try {
    const response = await fetch('/api/users/profile/picture', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload profile picture');
    }

    // Update user in session storage
    const user = getCurrentUser();
    user.profileImage = data.imageUrl;
    sessionStorage.setItem('user', JSON.stringify(user));
    AppState.currentUser = user;

    // Update the avatar display in modal
    const avatarDisplay = document.getElementById('profile-avatar-display');
    if (avatarDisplay) {
      avatarDisplay.innerHTML = `<img src="${data.imageUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }

    // Update topbar avatar
    const topbarBtn = document.querySelector('.user-menu-btn');
    if (topbarBtn) {
      topbarBtn.innerHTML = `<img src="${data.imageUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }

    showToast('Profile picture updated successfully', 'success');
  } catch (error) {
    console.error('Profile picture upload error:', error);
    showToast(error.message || 'Failed to upload profile picture', 'error');
  }
}

window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;

function toggleSidebar() {
  AppState.sidebarOpen = !AppState.sidebarOpen;
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

function initializeSidebar() {
  // Initialize nav items
  document.querySelectorAll('.sidebar-nav-item, .sidebar-nav-child, .sidebar-team-link').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) {
        if (page === 'logout') {
          logout();
          return;
        }
        Router.navigate(page);
      }
    });
  });

  // Initialize nav groups
  document.querySelectorAll('.sidebar-nav-parent').forEach(parent => {
    parent.addEventListener('click', (e) => {
      e.stopPropagation();
      const group = parent.dataset.group;
      const children = document.getElementById(`${group}-nav`);
      if (children) {
        children.classList.toggle('expanded');
        parent.classList.toggle('active');
      }
    });
  });

  // Prevent default on all sidebar links
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // Initialize profile button
  const profileBtn = document.querySelector('.user-menu-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', openProfileModal);
  }

  // Menu toggle (CSP-safe)
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar();
    });
  }

  // Keep Messages badge in sync after sidebar renders
  syncUnreadMessagesBadge();
  
  // Add floating AI Tutor button if not already present
  if (!document.getElementById('ai-chat-fab')) {
    const aiButtonHtml = `
      <button id="ai-chat-fab" style="position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); border: none; color: white; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); z-index: 9999; transition: transform 0.2s, box-shadow 0.2s;" title="Ask SkillBot">
        <i class="fas fa-robot"></i>
      </button>
      <div id="ai-chat-panel" style="display: none; position: fixed; bottom: 100px; right: 24px; width: 380px; max-width: calc(100vw - 48px); height: 500px; max-height: calc(100vh - 150px); background: #ffffff; border-radius: var(--radius-xl); box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9998; flex-direction: column; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-robot" style="font-size: 1.25rem;"></i>
            <div>
              <div style="font-weight: 700;">SkillBot</div>
              <div style="font-size: 0.8rem; opacity: 0.9;">AI Tutoring Assistant</div>
            </div>
          </div>
          <button id="ai-chat-close" style="background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer; opacity: 0.8;">×</button>
        </div>
        <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); padding: 0.75rem 1rem; border-radius: 12px; max-width: 90%;">
            <div style="font-size: 0.95rem;">Hi! I'm <strong>SkillBot</strong> 🤖 I can help you:</div>
            <ul style="margin: 0.5rem 0 0 1rem; font-size: 0.9rem; color: var(--text-secondary);">
              <li>Find the right tutor for your needs</li>
              <li>Explain concepts and topics</li>
              <li>Give learning advice</li>
            </ul>
            <div style="margin-top: 0.5rem; font-size: 0.95rem;">What would you like to learn today?</div>
          </div>
        </div>
        <div style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem;">
          <input type="text" id="ai-chat-input" placeholder="Ask me anything..." style="flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: 999px; font-size: 0.95rem;">
          <button id="ai-chat-send" style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', aiButtonHtml);
    initializeAIChatbot();
  }
}

// AI Chatbot state
const aiChatHistory = [];

function initializeAIChatbot() {
  const fab = document.getElementById('ai-chat-fab');
  const panel = document.getElementById('ai-chat-panel');
  const closeBtn = document.getElementById('ai-chat-close');
  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');
  const messagesDiv = document.getElementById('ai-chat-messages');

  if (!fab || !panel || !input || !sendBtn || !messagesDiv) return;

  const setPanelOpen = (open) => {
    panel.style.display = open ? 'flex' : 'none';
    fab.style.transform = open ? 'scale(0.9)' : '';
    if (open) input.focus();
  };

  fab.addEventListener('click', () => {
    const isOpen = panel.style.display === 'flex';
    setPanelOpen(!isOpen);
  });

  closeBtn?.addEventListener('click', () => setPanelOpen(false));

  const appendErrorBubble = (msg) => {
    const err = document.createElement('div');
    err.style.cssText = 'background: rgba(239, 68, 68, 0.10); color: #b91c1c; padding: 0.75rem 1rem; border-radius: 12px 12px 12px 4px; max-width: 85%; border: 1px solid rgba(239, 68, 68, 0.25);';
    err.textContent = msg;
    messagesDiv.appendChild(err);
  };

  async function sendMessage() {
    const message = String(input.value || '').trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'align-self: flex-end; background: var(--blue-primary); color: white; padding: 0.75rem 1rem; border-radius: 12px 12px 4px 12px; max-width: 85%;';
    userMsg.textContent = message;
    messagesDiv.appendChild(userMsg);

    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = 'background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); padding: 0.75rem 1rem; border-radius: 12px 12px 12px 4px; max-width: 85%;';
    loadingMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
    messagesDiv.appendChild(loadingMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: aiChatHistory })
      });

      const ct = String(response.headers.get('content-type') || '');
      if (!ct.includes('application/json')) {
        throw new Error('AI service returned an unexpected response. Try logging in again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chat failed');
      }

      aiChatHistory.push({ role: 'user', content: message });
      aiChatHistory.push({ role: 'assistant', content: data.response || '' });
      if (aiChatHistory.length > 20) aiChatHistory.splice(0, 2);

      const aiMsg = document.createElement('div');
      aiMsg.style.cssText = 'background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); padding: 0.75rem 1rem; border-radius: 12px 12px 12px 4px; max-width: 85%;';

      const safeText = String(data.response || 'Sorry, I could not process that.');
      const formattedResponse = Utils.escapeHtml(safeText)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/@([A-Za-z0-9_]+)/g, '<a href="#" class="ai-user-link" data-username="$1" style="color: #6366f1; font-weight: 600;">@$1</a>');

      aiMsg.innerHTML = `<div style="font-size: 0.95rem; line-height: 1.5;">${formattedResponse}</div>`;

      if (Array.isArray(data.mentionedUsers) && data.mentionedUsers.length > 0) {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
        data.mentionedUsers.forEach((u) => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-sm';
          btn.style.cssText = 'background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; font-size: 0.8rem; padding: 0.35rem 0.75rem;';
          const firstName = String(u?.name || 'User').split(' ')[0];
          btn.innerHTML = `<i class="fas fa-user"></i> View ${Utils.escapeHtml(firstName)}`;
          btn.addEventListener('click', () => {
            if (u?.userId) openUserProfileModal(u.userId);
          });
          actionsDiv.appendChild(btn);
        });
        aiMsg.appendChild(actionsDiv);
      }

      messagesDiv.appendChild(aiMsg);
      loadingMsg.remove();

      aiMsg.querySelectorAll('.ai-user-link').forEach((link) => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const username = String(link.getAttribute('data-username') || '').trim();
          if (!username) return;
          try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(username)}&type=users`);
            const payload = await res.json();
            const users = payload?.users || [];
            if (users.length > 0) {
              openUserProfileModal(users[0].id);
            } else {
              showToast(`No user found for @${username}`, 'info');
            }
          } catch {
            showToast('Could not look up that user.', 'error');
          }
        });
      });

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
      try { loadingMsg.remove(); } catch { }
      appendErrorBubble(`⚠️ ${String(error?.message || 'AI service unavailable')}`);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessage();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Global modal close function - used by Components.modal() inline onclick handlers
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    // Remove from DOM after transition
    setTimeout(() => modal.remove(), 200);
  }
}

function selectRating(rating) {
  // Backwards-compatible helper (used by older markup)
  window.StarRating?.setValue('rating-control', rating);
}

function submitRating() {
  const rating = window.StarRating?.getValue('rating-control') || 0;
  if (!rating) {
    alert('Please select a rating');
    return;
  }

  closeModal('rating-modal');

  // Show success message
  const successMsg = document.createElement('div');
  successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--green-primary); color: white; padding: 1rem 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); z-index: 10000;';
  successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Rating submitted successfully!';
  document.body.appendChild(successMsg);
  setTimeout(() => successMsg.remove(), 3000);
}

function showNotifications() {
  const notifications = [
    { id: 1, text: 'New session request from Sarah Chen', time: '5 min ago', unread: true },
    { id: 2, text: 'Your session with Alex Johnson starts in 1 hour', time: '30 min ago', unread: true },
    { id: 3, text: 'You received a 5-star rating!', time: '2 hours ago', unread: true }
  ];

  const modalContent = `
    <div style="padding: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">Notifications</h2>
      <div style="max-height: 400px; overflow-y: auto;">
        ${notifications.map(notif => `
          <div style="padding: 1rem; background: ${notif.unread ? 'var(--bg-light)' : 'white'}; border-radius: var(--radius-lg); margin-bottom: 0.5rem; cursor: pointer;" onclick="this.style.background='white'">
            <div style="font-weight: ${notif.unread ? '600' : '400'}; margin-bottom: 0.25rem;">${notif.text}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">${notif.time}</div>
          </div>
        `).join('')}
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button class="btn btn-primary" onclick="closeModal('notifications-modal')">Close</button>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.innerHTML = Components.modal(modalContent, 'notifications-modal');
  document.body.appendChild(modal);
  setTimeout(() => {
    document.getElementById('notifications-modal').classList.add('show');
  }, 10);
}

async function createSession(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Validate form data
  const skillIdStr = formData.get('skillId');
  const title = formData.get('title');
  const date = formData.get('date');
  const time = formData.get('time');
  const duration = formData.get('duration');
  const locationType = formData.get('locationType');
  const address = formData.get('address');
  const notes = formData.get('notes');
  const studentIdStr = formData.get('studentId');

  if (!skillIdStr || !title || !date || !time || !locationType) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  // Determine location string
  let location = '';
  if (locationType === 'online') {
    location = 'Online';
  } else if (locationType === 'in-person') {
    if (!address || !address.trim()) {
      showToast('Please enter an address for in-person sessions', 'error');
      return;
    }
    location = address.trim();
  }

  const skillId = parseInt(skillIdStr);
  const studentId = studentIdStr ? parseInt(studentIdStr) : null;

  // If no student specified, we need to create an "open session"
  // For now, require a student
  if (!studentId) {
    showToast('Please select a student for this session. Open sessions coming soon!', 'error');
    return;
  }

  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: studentId,
        skillId: skillId,
        scheduledDate: `${date}T${time}`,
        duration: duration ? parseInt(duration) : 60,
        location: location,
        notes: notes || title
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Failed to create session', 'error');
      return;
    }

    showToast('Session created successfully!', 'success');
    setTimeout(() => Router.navigate('students-current'), 500);
  } catch (error) {
    console.error('Create session error:', error);
    showToast('Error creating session: ' + error.message, 'error');
  }
}

async function requestSession(tutorId, skillId, scheduledDate, duration, location, notes) {
  try {
    const response = await fetch('/api/sessions/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorId,
        skillId,
        scheduledDate,
        duration,
        location,
        notes
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Failed to request session', 'error');
      return null;
    }

    showToast('Session requested successfully!', 'success');
    return data.session;
  } catch (error) {
    console.error('Request session error:', error);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

async function updateSessionStatus(sessionId, status) {
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Failed to update session', 'error');
      return null;
    }

    showToast(`Session ${status}!`, 'success');
    return data.session;
  } catch (error) {
    console.error('Update session error:', error);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

function showToast(message, type = 'info') {
  const colors = {
    success: 'var(--green-primary)',
    error: 'var(--red-primary)',
    info: 'var(--blue-primary)'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${colors[type]}; color: white; padding: 1rem 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); z-index: 10000;`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Show all requests modal (incoming or outgoing)
function showAllRequestsModal(requests, type) {
  document.getElementById('all-requests-modal')?.remove();

  const isIncoming = type === 'incoming';
  const title = isIncoming ? 'Session Requests' : 'My Requests';
  const subtitle = isIncoming ? 'Requests from students' : 'Requests you sent';

  const statusPill = (status) => {
    const s = String(status || '').toLowerCase();
    const map = {
      pending: { bg: 'rgba(59,130,246,0.12)', bd: 'rgba(59,130,246,0.25)', fg: 'var(--blue-primary)', label: 'Pending' },
      accepted: { bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.25)', fg: 'var(--green-primary)', label: 'Accepted' },
      declined: { bg: 'rgba(239,68,68,0.10)', bd: 'rgba(239,68,68,0.25)', fg: 'var(--red-primary)', label: 'Declined' },
      cancelled: { bg: 'rgba(107,114,128,0.10)', bd: 'rgba(107,114,128,0.25)', fg: 'var(--text-secondary)', label: 'Cancelled' }
    };
    const v = map[s] || { bg: 'rgba(107,114,128,0.10)', bd: 'rgba(107,114,128,0.25)', fg: 'var(--text-secondary)', label: 'Unknown' };
    return `<span style="display:inline-flex; align-items:center; padding: 0.15rem 0.5rem; border-radius: 999px; background: ${v.bg}; border: 1px solid ${v.bd}; color: ${v.fg}; font-weight: 800; font-size: 0.75rem;">${v.label}</span>`;
  };

  const modal = document.createElement('div');
  modal.id = 'all-requests-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  const requestsList = requests.map(r => {
    const personName = isIncoming
      ? (r.studentFullName || r.studentUsername || '').trim()
      : (r.tutorFullName || r.tutorUsername || '').trim();
    const personUsername = isIncoming ? r.studentUsername : r.tutorUsername;
    const when = Utils.formatDateTime(r.scheduledDate);
    const pill = statusPill(r.status);
    const isPending = String(r.status).toLowerCase() === 'pending';

    return `
      <div style="border: 1px solid var(--border-light); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem;">
        <div style="display:flex; align-items:flex-start; justify-content: space-between; gap: 0.75rem;">
          <div style="min-width:0;">
            <div style="font-weight: 800;">${Utils.escapeHtml(personName)}</div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">@${Utils.escapeHtml(personUsername || '')} • ${Utils.escapeHtml(r.skillName || '')}</div>
            <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-calendar"></i> ${Utils.escapeHtml(when)} (${Number(r.duration) || 60}min)</div>
            <div style="margin-top: 0.35rem;">${pill}</div>
          </div>
          ${isIncoming && isPending ? `
            <div style="display:flex; gap: 0.5rem; flex-shrink:0;">
              <button class="btn btn-sm btn-success modal-request-action" data-request-id="${r.id}" data-action="accept">Accept</button>
              <button class="btn btn-sm btn-outline modal-request-action" data-request-id="${r.id}" data-action="decline">Decline</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: var(--radius-xl); max-width: 600px; width: 95%; max-height: 80vh; overflow: hidden; box-shadow: var(--shadow-lg); display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-light);">
        <div>
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">${title}</h2>
          <p style="margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.9rem;">${subtitle}</p>
        </div>
        <button id="close-requests-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); line-height: 1;">×</button>
      </div>
      <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
        ${requests.length === 0 ? '<div style="color: var(--text-secondary); text-align: center; padding: 2rem;">No requests found.</div>' : requestsList}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('#close-requests-modal')?.addEventListener('click', () => modal.remove());

  // Backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Action buttons
  modal.querySelectorAll('.modal-request-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = Number(btn.getAttribute('data-request-id'));
      const action = String(btn.getAttribute('data-action') || '');
      if (!requestId || !['accept', 'decline'].includes(action)) return;
      btn.disabled = true;
      await handleOfferRequestAction(requestId, action);
      modal.remove();
      await refreshCurrentUser();
      Router.navigate('dashboard');
    });
  });
}

// Show meeting link input modal
function showMeetingLinkModal(sessionId) {
  // Remove existing modal if any
  document.getElementById('meeting-link-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'meeting-link-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: var(--radius-xl); padding: 2rem; max-width: 450px; width: 90%; box-shadow: var(--shadow-lg);">
      <h2 style="margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700;">Add Meeting Link</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Enter the video call link for this session (Zoom, Google Meet, Teams, etc.)</p>
      
      <div class="form-group">
        <label class="form-label">Meeting URL</label>
        <input type="url" id="meeting-link-input" class="form-input" placeholder="https://zoom.us/j/..." style="width: 100%;">
      </div>
      
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button id="meeting-link-cancel-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
        <button id="meeting-link-save-btn" class="btn btn-primary" style="flex: 1;">Save Link</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inputEl = modal.querySelector('#meeting-link-input');
  const saveBtn = modal.querySelector('#meeting-link-save-btn');
  const cancelBtn = modal.querySelector('#meeting-link-cancel-btn');

  // Focus input
  setTimeout(() => inputEl?.focus(), 100);

  // Cancel button
  cancelBtn.addEventListener('click', () => modal.remove());

  // Save button
  saveBtn.addEventListener('click', async () => {
    const link = inputEl.value.trim();
    if (!link) {
      showToast('Please enter a meeting link', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink: link })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update meeting link');

      modal.remove();
      showToast('Meeting link added!', 'success');
      Router.navigate(AppState.currentPage || 'sessions');
    } catch (error) {
      console.error('Set meeting link error:', error);
      showToast('Failed to add meeting link: ' + error.message, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Link';
    }
  });

  // Enter key to save
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveBtn.click();
    }
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Show rating modal after session completion (for learner)
function showRatingModal(sessionId, tutorId, tutorName) {
  // Remove existing modal if any
  document.getElementById('rating-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'rating-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: var(--radius-xl); padding: 2rem; max-width: 450px; width: 90%; box-shadow: var(--shadow-lg);">
      <h2 style="margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 800;">Rate Your Session</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">How was your session with <strong>${Utils.escapeHtml(tutorName)}</strong>?</p>
      
      <div id="rating-stars" style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem;">
        ${[1, 2, 3, 4, 5].map(i => `
          <button type="button" class="rating-star-btn" data-rating="${i}" style="
            background: none; border: none; cursor: pointer; font-size: 2rem; color: var(--border-light);
            transition: color 0.15s, transform 0.15s;
          " aria-label="${i} stars">★</button>
        `).join('')}
      </div>
      
      <div class="form-group">
        <label class="form-label">Feedback (optional)</label>
        <textarea id="rating-feedback" class="form-textarea" rows="3" placeholder="Share your experience..." maxlength="500"></textarea>
      </div>
      
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button id="rating-skip-btn" class="btn btn-secondary" style="flex: 1;">Skip</button>
        <button id="rating-submit-btn" class="btn btn-primary" style="flex: 1;" disabled>Submit Rating</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let selectedRating = 0;
  const starBtns = modal.querySelectorAll('.rating-star-btn');
  const submitBtn = modal.querySelector('#rating-submit-btn');
  const skipBtn = modal.querySelector('#rating-skip-btn');
  const feedbackEl = modal.querySelector('#rating-feedback');

  // Star rating interaction
  starBtns.forEach((btn, index) => {
    btn.addEventListener('mouseenter', () => {
      starBtns.forEach((b, i) => {
        b.style.color = i <= index ? 'var(--yellow-500, #eab308)' : 'var(--border-light)';
        b.style.transform = i <= index ? 'scale(1.1)' : 'scale(1)';
      });
    });

    btn.addEventListener('click', () => {
      selectedRating = index + 1;
      submitBtn.disabled = false;
      starBtns.forEach((b, i) => {
        b.style.color = i < selectedRating ? 'var(--yellow-500, #eab308)' : 'var(--border-light)';
      });
    });
  });

  modal.querySelector('#rating-stars').addEventListener('mouseleave', () => {
    starBtns.forEach((b, i) => {
      b.style.color = i < selectedRating ? 'var(--yellow-500, #eab308)' : 'var(--border-light)';
      b.style.transform = 'scale(1)';
    });
  });

  // Skip button
  skipBtn.addEventListener('click', () => {
    modal.remove();
    Router.navigate(AppState.currentPage || 'sessions');
  });

  // Submit rating
  submitBtn.addEventListener('click', async () => {
    if (!selectedRating) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rating: selectedRating,
          feedback: feedbackEl.value.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit rating');

      modal.remove();
      showToast('Thank you for your rating!', 'success');
      Router.navigate(AppState.currentPage || 'dashboard');
    } catch (error) {
      console.error('Rating submit error:', error);
      showToast('Failed to submit rating: ' + error.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Rating';
    }
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      Router.navigate(AppState.currentPage || 'sessions');
    }
  });
}

// Show user profile modal when clicking on a profile avatar/name
async function showUserProfileModal(userId) {
  // Remove existing modal if any
  document.getElementById('user-profile-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'user-profile-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: var(--radius-xl); padding: 2rem; max-width: 500px; width: 90%; box-shadow: var(--shadow-lg); text-align: center;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--text-secondary);"></i>
      <p style="color: var(--text-secondary); margin-top: 1rem;">Loading profile...</p>
    </div>
  `;

  document.body.appendChild(modal);

  try {
    const response = await fetch(`/api/users/profile/${userId}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to load profile');

    const user = data.user;
    const displayName = user.fullName || user.username || 'User';
    const avatarHtml = user.profileImage
      ? `<img src="${Utils.escapeHtml(user.profileImage)}" alt="${Utils.escapeHtml(displayName)}" style="width: 140px; height: 140px; border-radius: 50%; object-fit: cover;">`
      : `<div class="profile-avatar-large">${Utils.getInitials(displayName)}</div>`;

    const skillsOffer = (user.skillsOffer || []).map(s => typeof s === 'string' ? s : s.name);
    const skillsSeek = (user.skillsSeek || []).map(s => typeof s === 'string' ? s : s.name);
    const avgRating = Number(user.averageRating) || 0;
    const totalSessions = Number(user.totalSessions) || 0;

    // Generate star rating display
    const starsHtml = [1, 2, 3, 4, 5].map(i =>
      `<span style="color: ${i <= Math.round(avgRating) ? 'var(--yellow-500, #eab308)' : 'var(--border-light)'};">★</span>`
    ).join('');

    modal.innerHTML = `
      <div style="background: #ffffff; border-radius: var(--radius-xl); max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-light);">
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Profile</h2>
          <button id="close-profile-modal-x" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); line-height: 1;">×</button>
        </div>
        
        <div style="display: flex; gap: 2rem; padding: 2rem; flex-wrap: wrap;">
          <!-- Left column: Avatar + Stats -->
          <div style="flex: 0 0 220px; text-align: center;">
            <div style="position: relative; display: inline-block;">
              ${avatarHtml}
            </div>
            <h3 style="margin: 1rem 0 0.25rem; font-size: 1.25rem; font-weight: 700;">${Utils.escapeHtml(displayName)}</h3>
            <p style="color: var(--text-secondary); margin: 0;">@${Utils.escapeHtml(user.username)}</p>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-light, #f8f9fa); border-radius: var(--radius-lg);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 600;">Total Sessions</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--yellow-500, #eab308); margin-top: 0.25rem;">${totalSessions}</div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-light, #f8f9fa); border-radius: var(--radius-lg);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 600;">Average Rating</div>
              <div style="margin-top: 0.5rem;">${starsHtml}</div>
              <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.25rem;">${avgRating.toFixed(1)} / 5.0</div>
            </div>
          </div>
          
          <!-- Right column: Bio + Skills -->
          <div style="flex: 1; min-width: 280px;">
            <div style="background: linear-gradient(135deg, var(--red-primary), var(--red-secondary, #be185d)); color: white; padding: 0.75rem 1rem; border-radius: var(--radius-lg); display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
              <i class="fas fa-user"></i> About Me
            </div>
            <p style="padding: 1rem; color: var(--text-primary); margin: 0;">${user.bio ? Utils.escapeHtml(user.bio) : '<em style="color: var(--text-secondary);">No bio provided</em>'}</p>
            
            <div style="background: linear-gradient(135deg, var(--blue-primary), #2563eb); color: white; padding: 0.75rem 1rem; border-radius: var(--radius-lg); display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-top: 1rem;">
              <i class="fas fa-bolt"></i> Skills I Offer
            </div>
            <div style="padding: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${skillsOffer.length ? skillsOffer.map(s => `<span style="padding: 0.35rem 0.75rem; border: 1.5px solid var(--blue-primary); border-radius: 999px; font-size: 0.875rem; color: var(--text-primary);">${Utils.escapeHtml(s)}</span>`).join('') : '<em style="color: var(--text-secondary);">None listed</em>'}
            </div>
            
            <div style="background: linear-gradient(135deg, var(--green-primary), #059669); color: white; padding: 0.75rem 1rem; border-radius: var(--radius-lg); display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-top: 1rem;">
              <i class="fas fa-bullseye"></i> Skills I Seek
            </div>
            <div style="padding: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${skillsSeek.length ? skillsSeek.map(s => `<span style="padding: 0.35rem 0.75rem; border: 1.5px solid var(--green-primary); border-radius: 999px; font-size: 0.875rem; color: var(--text-primary);">${Utils.escapeHtml(s)}</span>`).join('') : '<em style="color: var(--text-secondary);">None listed</em>'}
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
              <button id="profile-modal-message-btn" class="btn btn-primary" style="min-width: 120px;">
                <i class="fas fa-envelope"></i> Message
              </button>
              <button id="profile-modal-close-btn" class="btn btn-secondary" style="min-width: 100px;">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('#close-profile-modal-x')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#profile-modal-close-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#profile-modal-message-btn')?.addEventListener('click', () => {
      modal.remove();
      startDmWithUser(userId, user.username || '', user.fullName || '', user.profileImage || '');
    });

  } catch (error) {
    console.error('Load profile error:', error);
    modal.innerHTML = `
      <div style="background: #ffffff; border-radius: var(--radius-xl); padding: 2rem; max-width: 400px; width: 90%; box-shadow: var(--shadow-lg); text-align: center;">
        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--red-primary);"></i>
        <p style="margin-top: 1rem;">Failed to load profile</p>
        <button class="btn btn-secondary" style="margin-top: 1rem;" id="profile-error-close">Close</button>
      </div>
    `;
    modal.querySelector('#profile-error-close')?.addEventListener('click', () => modal.remove());
  }

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function openProfileEditor() {
  const user = getCurrentUser();
  if (!user?.id) {
    Router.navigate('login');
    return;
  }

  // Avoid duplicates
  const existing = document.getElementById('profile-editor-modal');
  if (existing) {
    existing.classList.add('show');
    setTimeout(() => document.getElementById('settings-bio')?.focus(), 0);
    return;
  }

  const displayName = (user.fullName || user.username || '').trim();
  const parts = displayName.split(/\s+/).filter(Boolean);
  const firstName = parts.length ? parts[0] : '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  // Handle both old string array format and new {id, name} object format
  const skillsOfferText = (user.skillsOffer || [])
    .map(s => typeof s === 'string' ? s : s.name)
    .join(', ');
  const skillsSeekText = (user.skillsSeek || [])
    .map(s => typeof s === 'string' ? s : s.name)
    .join(', ');

  const modalContent = `
    <div style="padding: 2rem;">
      <div style="display: flex; gap: 2rem;">
        <div style="flex-shrink: 0;">
          <div class="profile-avatar-large" style="position: relative;">
            ${Utils.getInitials(displayName || 'User')}
            <label for="profile-pic-input" id="profile-camera-btn" style="position: absolute; bottom: -4px; right: -4px; width: 44px; height: 44px; background: var(--blue-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; cursor: pointer; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 1.1rem; transition: transform 0.15s ease;"><i class="fas fa-camera"></i></label>
            <input type="file" id="profile-pic-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;">
          </div>
          <div style="margin-top: 1rem; text-align: center;">
            <div style="font-weight: 700; margin-bottom: 0.5rem;">About Me</div>
            <textarea id="settings-bio" class="form-textarea" style="min-height: 120px;" placeholder="Enter here..." maxlength="500">${user.bio || ''}</textarea>
          </div>
        </div>

        <div style="flex: 1;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Edit Profile</h2>

          <form id="profile-editor-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" name="firstName" class="form-input" value="${firstName}">
              </div>

              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" name="lastName" class="form-input" value="${lastName}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" name="email" class="form-input" value="${user.email}">
            </div>

            <div class="form-group">
              <label class="form-label">Skills I Offer</label>
              <div id="skills-offer-container" class="skills-tag-container" style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.5rem; min-height: 44px; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; position: relative;">
                <input type="text" id="skills-offer-input" class="skills-tag-input" placeholder="Type a skill..." style="border: none; outline: none; flex: 1; min-width: 120px; padding: 0.25rem;">
                <div id="skills-offer-dropdown" class="skills-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-md); max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: var(--shadow-md);"></div>
              </div>
              <input type="hidden" name="skillsOffer" id="skills-offer-hidden" value="${skillsOfferText}">
              <div class="form-helper">Type to search or add new skills</div>
            </div>

            <div class="form-group">
              <label class="form-label">Skills I Want to Learn</label>
              <div id="skills-seek-container" class="skills-tag-container" style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.5rem; min-height: 44px; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; position: relative;">
                <input type="text" id="skills-seek-input" class="skills-tag-input" placeholder="Type a skill..." style="border: none; outline: none; flex: 1; min-width: 120px; padding: 0.25rem;">
                <div id="skills-seek-dropdown" class="skills-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-md); max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: var(--shadow-md);"></div>
              </div>
              <input type="hidden" name="skillsSeek" id="skills-seek-hidden" value="${skillsSeekText}">
              <div class="form-helper">Type to search or add new skills</div>
            </div>

            <div class="form-group">
              <label class="form-label">Profile Visibility</label>
              <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.75rem 1rem; border: 2px solid var(--border-light); border-radius: var(--radius-md); flex: 1; transition: all 0.2s;">
                  <input type="radio" name="privacyLevel" value="public" ${(user.privacyLevel || 'public') === 'public' ? 'checked' : ''} style="accent-color: var(--green-primary);">
                  <div>
                    <div style="font-weight: 600;"><i class="fas fa-globe" style="color: var(--green-primary);"></i> Public</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Anyone can view your profile</div>
                  </div>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.75rem 1rem; border: 2px solid var(--border-light); border-radius: var(--radius-md); flex: 1; transition: all 0.2s;">
                  <input type="radio" name="privacyLevel" value="private" ${user.privacyLevel === 'private' ? 'checked' : ''} style="accent-color: var(--red-primary);">
                  <div>
                    <div style="font-weight: 600;"><i class="fas fa-lock" style="color: var(--red-primary);"></i> Private</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Only you can view your profile</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" name="currentPassword" class="form-input" placeholder="Current password">
            </div>

            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" name="newPassword" class="form-input" placeholder="New password">
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
              <button id="profile-editor-cancel" type="button" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.innerHTML = Components.modal(modalContent, 'profile-editor-modal');
  document.body.appendChild(modal);
  setTimeout(() => {
    const overlay = document.getElementById('profile-editor-modal');
    overlay?.classList.add('show');

    // Bind handlers programmatically so buttons reliably work
    // even if inline handlers are blocked or markup changes.
    const modalEl = overlay?.querySelector('.modal');
    if (overlay) {
      overlay.addEventListener('click', () => closeModal('profile-editor-modal'));
    }
    if (modalEl) {
      modalEl.addEventListener('click', (e) => e.stopPropagation());
    }

    const form = document.getElementById('profile-editor-form');
    if (form) {
      form.addEventListener('submit', saveSettings);
    }

    const cancelBtn = document.getElementById('profile-editor-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeProfileEditor();
      });
    }

    // Initialize skill tag inputs with autocomplete
    initSkillTagInput('skills-offer', skillsOfferText);
    initSkillTagInput('skills-seek', skillsSeekText);

    // Profile picture upload handler
    const picInput = document.getElementById('profile-pic-input');
    if (picInput) {
      picInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image must be less than 5MB');
          return;
        }

        const formData = new FormData();
        formData.append('profileImage', file);

        try {
          const res = await fetch('/api/users/profile/picture', {
            method: 'POST',
            body: formData
          });

          if (res.ok) {
            alert('Profile picture updated! Please refresh to see changes.');
            // Refresh user data
            await refreshSession();
          } else {
            const data = await res.json();
            alert(data.message || 'Failed to upload image');
          }
        } catch (err) {
          console.error('Upload error:', err);
          alert('Failed to upload image');
        }
      });
    }

    document.getElementById('settings-bio')?.focus();
  }, 10);
}

// Skill tag input with autocomplete
let allSkillsCache = null;

// Convert to Title Case (capitalize first letter of each word)
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchAllSkills() {
  if (allSkillsCache) return allSkillsCache;
  try {
    const res = await fetch('/api/skills/all');
    const data = await res.json();
    // Ensure we have an array of strings
    const skills = data.skills || [];
    allSkillsCache = skills.map(s => typeof s === 'string' ? s : (s.name || s.skill_name || String(s)));
    return allSkillsCache;
  } catch (err) {
    console.error('Failed to fetch skills:', err);
    return [];
  }
}

function initSkillTagInput(prefix, initialValue) {
  const container = document.getElementById(`${prefix}-container`);
  const input = document.getElementById(`${prefix}-input`);
  const dropdown = document.getElementById(`${prefix}-dropdown`);
  const hidden = document.getElementById(`${prefix}-hidden`);
  
  if (!container || !input || !dropdown || !hidden) return;
  
  // Parse initial skills
  let skills = initialValue ? initialValue.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  // Render existing tags
  function renderTags() {
    // Remove existing tags
    container.querySelectorAll('.skill-tag').forEach(t => t.remove());
    // Add tags before input
    skills.forEach((skill, idx) => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: var(--blue-light); color: #1a1a1a; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500;';
      tag.innerHTML = `${Utils.escapeHtml(skill)} <button type="button" data-idx="${idx}" style="background: none; border: none; cursor: pointer; color: #666; font-size: 1rem; line-height: 1; padding: 0;">&times;</button>`;
      container.insertBefore(tag, input);
    });
    // Update hidden input
    hidden.value = skills.join(', ');
  }
  
  // Remove tag on click
  container.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.idx !== undefined) {
      skills.splice(parseInt(e.target.dataset.idx), 1);
      renderTags();
    }
  });
  
  // Show dropdown with filtered suggestions
  async function showDropdown(query) {
    const allSkills = await fetchAllSkills();
    const q = query.toLowerCase();
    const filtered = allSkills.filter(s => 
      s.toLowerCase().includes(q) && !skills.some(existing => existing.toLowerCase() === s.toLowerCase())
    ).slice(0, 10);
    
    if (filtered.length === 0 && query.length > 0) {
      // Show "Add new skill" option
      dropdown.innerHTML = `<div class="skill-dropdown-item skill-add-new" style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-light); color: var(--green-primary); font-weight: 600;"><i class="fas fa-plus"></i> Add "${Utils.escapeHtml(query)}"</div>`;
      dropdown.style.display = 'block';
    } else if (filtered.length > 0) {
      dropdown.innerHTML = filtered.map(s => 
        `<div class="skill-dropdown-item" style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-light);">${Utils.escapeHtml(s)}</div>`
      ).join('');
      // Add "Add new" option if query doesn't exactly match
      if (query.length > 0 && !filtered.some(s => s.toLowerCase() === q)) {
        dropdown.innerHTML += `<div class="skill-dropdown-item skill-add-new" style="padding: 0.75rem 1rem; cursor: pointer; color: var(--green-primary); font-weight: 600;"><i class="fas fa-plus"></i> Add "${Utils.escapeHtml(query)}"</div>`;
      }
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }
  }
  
  // Handle input
  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      showDropdown(val);
    } else {
      dropdown.style.display = 'none';
    }
  });
  
  // Handle dropdown item click
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.skill-dropdown-item');
    if (item) {
      let skillName;
      if (item.classList.contains('skill-add-new')) {
        skillName = toTitleCase(input.value.trim());
      } else {
        skillName = item.textContent.trim();
      }
      if (skillName && !skills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
        skills.push(skillName);
        renderTags();
      }
      input.value = '';
      dropdown.style.display = 'none';
      input.focus();
    }
  });
  
  // Handle Enter key to add skill
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = toTitleCase(input.value.trim());
      if (val && !skills.some(s => s.toLowerCase() === val.toLowerCase())) {
        skills.push(val);
        renderTags();
      }
      input.value = '';
      dropdown.style.display = 'none';
    } else if (e.key === 'Backspace' && input.value === '' && skills.length > 0) {
      skills.pop();
      renderTags();
    }
  });
  
  // Hide dropdown on blur (with delay to allow click)
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });
  
  // Show dropdown on focus if there's text
  input.addEventListener('focus', () => {
    if (input.value.trim().length > 0) {
      showDropdown(input.value.trim());
    }
  });
  
  // Hover effect on dropdown items
  dropdown.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.skill-dropdown-item');
    if (item) item.style.background = 'var(--bg-light)';
  });
  dropdown.addEventListener('mouseout', (e) => {
    const item = e.target.closest('.skill-dropdown-item');
    if (item) item.style.background = '';
  });
  
  // Render initial tags
  renderTags();
}

function closeProfileEditor() {
  closeModal('profile-editor-modal');
}

async function saveSettings(event) {
  event.preventDefault();

  const user = getCurrentUser();
  if (!user?.id) {
    Router.navigate('login');
    return;
  }

  const form = event.target;
  const formData = new FormData(form);

  const firstName = String(formData.get('firstName') || '').trim();
  const lastName = String(formData.get('lastName') || '').trim();
  const full_name = `${firstName} ${lastName}`.trim();
  const bio = String(document.getElementById('settings-bio')?.value || '').trim();
  const privacy_level = String(formData.get('privacyLevel') || 'public');

  const skillsOffer = String(formData.get('skillsOffer') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const skillsSeek = String(formData.get('skillsSeek') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  try {
    // Update profile
    const profileRes = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name,
        bio,
        privacy_level,
        school: null,
        grade_level: null
      })
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.success) {
      const msg = formatValidationErrors(profileData) || profileData.message || 'Failed to update profile';
      alert(msg);
      return;
    }

    // Update skills
    const skillsRes = await fetch('/api/skills/mine', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillsOffer, skillsSeek })
    });
    const skillsData = await skillsRes.json();
    if (!skillsRes.ok || !skillsData.success) {
      const msg = (skillsData.errors && Array.isArray(skillsData.errors))
        ? skillsData.errors.join('\n')
        : skillsData.message || 'Failed to update skills';
      alert(msg);
      return;
    }

    // Refresh session-backed user payload so UI updates everywhere
    await refreshCurrentUser();

    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--green-primary); color: white; padding: 1rem 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); z-index: 10000;';
    successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Profile updated successfully!';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2500);

    closeProfileEditor();
    setTimeout(() => Router.navigate(AppState.currentPage || 'profile'), 300);
  } catch (error) {
    console.error('Save settings error:', error);
    alert('Failed to save changes. Please try again.');
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // CSP-safe delegated handlers (works across SPA re-renders)

  // Handle profile clicks (view profile modal)
  document.addEventListener('click', async (e) => {
    const profileEl = e.target?.closest?.('[data-view-profile]');
    if (!profileEl) return;
    e.preventDefault();
    const userId = Number(profileEl.getAttribute('data-view-profile'));
    if (userId) {
      await showUserProfileModal(userId);
    }
  });

  // Handle "Add Meeting Link" button
  document.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('.set-meeting-link-btn');
    if (!btn) return;
    e.preventDefault();
    const sessionId = Number(btn.getAttribute('data-session-id'));
    if (!sessionId) return;

    showMeetingLinkModal(sessionId);
  });

  // Handle "Rate Session" button for completed sessions
  document.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('.rate-session-btn');
    if (!btn) return;
    e.preventDefault();
    const sessionId = Number(btn.getAttribute('data-session-id'));
    const tutorId = Number(btn.getAttribute('data-tutor-id'));
    const tutorName = btn.getAttribute('data-tutor-name') || 'the tutor';
    if (!sessionId) return;

    showRatingModal(sessionId, tutorId, tutorName);
  });

  // Handle session action buttons (complete/cancel)
  document.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('.session-action-btn');
    if (!btn) return;
    e.preventDefault();

    const sessionId = Number(btn.getAttribute('data-session-id'));
    const status = String(btn.getAttribute('data-status') || '');
    const isTutor = btn.getAttribute('data-is-tutor') === 'true';
    const otherName = btn.getAttribute('data-other-name') || 'the tutor';
    const tutorId = Number(btn.getAttribute('data-tutor-id'));

    if (!sessionId || !['completed', 'cancelled'].includes(status)) return;

    btn.disabled = true;
    await updateSessionStatus(sessionId, status);
    btn.disabled = false;

    // If learner marked session as completed, prompt for rating
    if (status === 'completed' && !isTutor) {
      showRatingModal(sessionId, tutorId, otherName);
    } else {
      Router.navigate(AppState.currentPage || 'sessions');
    }
  });

  (async () => {
    // Honor direct navigation (e.g., refresh on /messages)
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    const routeMap = {
      '/': 'login',
      '/login': 'login',
      '/register': 'register',
      '/dashboard': 'dashboard',
      '/profile': 'profile',
      '/messages': 'messages',
      '/sessions': 'sessions',
      '/search': 'search',
      '/request-session': 'request-session'
    };

    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn) {
      await refreshCurrentUser();
      const user = getCurrentUser();
      if (!user?.id) {
        sessionStorage.clear();
        Router.navigate('login');
        return;
      }
      const target = routeMap[path];
      Router.navigate(target && target !== 'login' && target !== 'register' ? target : 'dashboard');

      // Keep Messages unread badge updated in the sidebar
      startUnreadMessagesPolling();
      return;
    }

    // Not logged in: only allow auth routes
    const unauthTarget = routeMap[path];
    Router.navigate(unauthTarget === 'register' ? 'register' : 'login');
  })();
});

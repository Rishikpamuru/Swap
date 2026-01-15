# 🎓 SkillSwap: Student Talent Exchange Platform

**BPA Web Application Team Competition 2026 - National-Level Submission**

> A secure, database-driven web application connecting students for peer-to-peer skill exchange and tutoring sessions.

---

## 📋 Team Information

| Role | Name | School |
|------|------|--------|
| **Team Members** | Jyothir Manchu, Aaryan Porwal, Rishik Pamuru | Reedy High School |
| **Chapter** | Reedy HS BPA Chapter | Frisco, Texas |
| **Year** | 2026 | |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm v9+

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize database
node scripts/initDatabase.js

# 3. Seed demo data (optional)
node scripts/seedData.js

# 4. Start server
npm start

# 5. Open browser
# http://localhost:3000
```

---

## 👥 Demo Accounts

### Admin Account
| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin123!` | Administrator |

### Student Accounts (all use password: `Student123!`)
| Username | Skills Offered |
|----------|---------------|
| `alice_math` | Mathematics, Calculus |
| `bob_coder` | Python, JavaScript |
| `carol_artist` | Drawing, Painting |
| `david_music` | Guitar, Piano |
| `emma_science` | Chemistry, Physics |

---

## ✅ BPA Rubric Compliance Matrix

### Primary Objectives (All Implemented ✅)

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| User registration and login | ✅ | Secure auth with bcrypt (12 rounds) |
| Profile creation with skills | ✅ | Offered/sought skills with autocomplete |
| Session scheduling system | ✅ | Public offers + private sessions |
| Rating and feedback | ✅ | 1-5 star ratings with comments |
| Admin panel | ✅ | Full user/session/skill management |

### Optional Features (All Implemented ✅)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Gamified achievements | ✅ | 30+ unlockable badges |
| Messaging system | ✅ | Real-time DM with read receipts |
| Privacy settings | ✅ | Public/private profile options |
| AI Tutor | ✅ | Floating SkillBot assistant |
| Reports/Analytics | ✅ | Comprehensive admin dashboard |

### Technical Requirements

| Requirement | Status | Details |
|-------------|--------|---------|
| Database-driven | ✅ | SQLite with 12 normalized tables |
| Server-side scripting | ✅ | Node.js + Express.js |
| External API | ✅ | OpenAI API for AI Tutor |
| Original code | ✅ | No CMS, 100% custom code |
| Security | ✅ | bcrypt, helmet.js, rate limiting |
| Audit trail | ✅ | Complete action logging |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  index.html │  │ modern-ui   │  │   app-modern.js     │ │
│  │  (SPA Entry)│  │    .css     │  │ (6700+ lines JS)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────▼────────────────────────────────┐
│                      SERVER LAYER                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Express.js                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │  Routes  │ │Middleware│ │ Security │ │Sessions│  │   │
│  │  │ (10 API) │ │(auth,val)│ │(helmet)  │ │(cookie)│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ SQL Queries
┌────────────────────────────▼────────────────────────────────┐
│                     DATABASE LAYER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    SQLite                            │   │
│  │  12 Tables │ Foreign Keys │ Triggers │ Indexes      │   │
│  │  Views     │ Constraints  │ Audit Log│ Encryption   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema (12 Tables)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `roles` | RBAC permissions | Admin/Student roles |
| `users` | Core auth data | Unique username/email, bcrypt hash |
| `user_profiles` | Extended info | Bio, avatar, privacy settings |
| `skills` | User skills | Offered/sought with autocomplete |
| `skill_requests` | Exchange requests | Status tracking |
| `sessions` | Scheduled meetings | Tutor/student assignments |
| `session_offers` | Public offerings | Multi-slot availability |
| `session_offer_slots` | Time slots | Up to 5 per offer |
| `ratings` | Feedback system | 1-5 stars + comments |
| `messages` | Internal messaging | Read receipts, threading |
| `achievements` | Gamification | 30+ badges |
| `audit_logs` | Action tracking | Complete audit trail |

See [docs/Database_Schema.md](docs/Database_Schema.md) for full ER diagram.

---

## 🔒 Security Implementation

| Feature | Implementation | Code Location |
|---------|----------------|---------------|
| Password Hashing | bcrypt (12 rounds) | `middleware/auth.js` |
| SQL Injection | Parameterized queries | All routes |
| XSS Prevention | Input sanitization | `middleware/validation.js` |
| Session Security | httpOnly, SameSite cookies | `server.js` |
| Rate Limiting | 100 req/15min | `server.js` |
| HTTPS Headers | Helmet.js | `server.js` |
| RBAC | Role-based middleware | `middleware/auth.js` |
| Audit Logging | All admin actions | `middleware/audit.js` |

---

## 📁 Project Structure

```
BPA_Web/
├── config/
│   ├── database.js          # DB connection & helpers
│   └── schema.sql           # Complete SQL schema
├── docs/
│   ├── Database_Schema.md   # ER diagram & tables
│   ├── System_Architecture.md
│   ├── BPA_Rubric_Alignment.md
│   └── Works_Cited.md
├── middleware/
│   ├── auth.js              # Authentication & RBAC
│   ├── audit.js             # Action logging
│   └── validation.js        # Input sanitization
├── public/
│   ├── index.html           # SPA entry point
│   ├── css/modern-ui.css    # Design system
│   └── js/app-modern.js     # Client application
├── routes/
│   ├── admin.js             # Admin panel API
│   ├── auth.js              # Login/register
│   ├── messages.js          # Messaging system
│   ├── ratings.js           # Feedback system
│   ├── reports.js           # Analytics API
│   ├── sessions.js          # Session management
│   ├── skills.js            # Skill CRUD
│   └── users.js             # User profiles
├── scripts/
│   ├── initDatabase.js      # Schema creation
│   └── seedData.js          # Demo data
├── server.js                # Express server
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Current user |

### Users & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/profile/picture` | Upload avatar |
| GET | `/api/users/search` | Search users |

### Skills
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills/mine` | User's skills |
| PUT | `/api/skills/mine` | Update skills |
| GET | `/api/skills/all` | All skills (autocomplete) |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | User's sessions |
| POST | `/api/sessions` | Create session |
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Cancel session |

### Admin (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/sessions` | All sessions |
| GET | `/api/admin/skills` | All skills |
| GET | `/api/admin/audit-logs` | Audit trail |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Stats overview |
| GET | `/api/reports/skills/popular` | Skill analytics |
| GET | `/api/reports/tutors/top` | Top tutors |
| GET | `/api/reports/engagement` | Engagement metrics |

---

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secure-secret-key
OPENAI_API_KEY=your-openai-key (optional)
```

### Production Deployment
```bash
# Set production mode
export NODE_ENV=production

# Install production dependencies
npm install --production

# Initialize database
node scripts/initDatabase.js

# Start server
npm start
```

### Recommended Hosting
- **Render.com** - Free tier available
- **Railway** - Easy Node.js deployment
- **Heroku** - PaaS with SQLite support
- **DigitalOcean App Platform** - Scalable option

---

## 📊 Testing Checklist

- [ ] User registration with validation
- [ ] Login/logout flow
- [ ] Profile editing with skill autocomplete
- [ ] Session creation (public + private)
- [ ] Session scheduling and completion
- [ ] Rating submission after session
- [ ] Messaging between users
- [ ] Achievement unlocking
- [ ] Admin user management
- [ ] Admin session management
- [ ] Admin skill overview
- [ ] Reports and analytics
- [ ] AI Tutor (SkillBot) functionality

---

## 📜 Works Cited

See [docs/Works_Cited.md](docs/Works_Cited.md) for complete attribution.

---

## 📄 License

This project was created for the BPA Web Application Team Competition 2026.

**© 2026 Reedy HS BPA Chapter - Jyothir Manchu, Aaryan Porwal, Rishik Pamuru**

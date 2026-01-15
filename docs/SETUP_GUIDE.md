# 🚀 SkillSwap - Quick Start Guide

**Complete setup instructions for judges, developers, and team members.**  
**Reedy HS BPA Chapter | Frisco, Texas | 2026**

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

| Requirement | Minimum Version | Download Link |
|-------------|-----------------|---------------|
| **Node.js** | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.0.0+ | Included with Node.js |
| **Web Browser** | Modern | Chrome, Firefox, Safari, Edge |

> **Note:** SQLite is bundled with the project - no separate database installation required!

---

## ⚡ Quick Setup (Under 3 Minutes)

### Step 1: Verify Node.js Installation

Open your terminal/command prompt and verify:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version
```

**Expected Output:**
```
v18.x.x or higher
9.x.x or higher
```

### Step 2: Install Dependencies

Navigate to the project folder and run:

```bash
# Install all required packages
npm install
```

This installs ~15 packages in approximately 30 seconds.

### Step 3: Initialize Database

```bash
# Create database and all tables
npm run init-db

# Load demo data (RECOMMENDED for testing)
npm run seed-db
```

**Expected Output:**
```
✅ Database initialized successfully
✅ 12 tables created
✅ Indexes and triggers created
✅ Demo data seeded: 6 users, 20 skills, 15 sessions
```

### Step 4: Start Server

```bash
npm start
```

**Expected Output:**
```
🚀 SkillSwap server running on http://localhost:3000
📊 Environment: development
🔒 Security features enabled
✅ Database connected successfully
```

### Step 5: Access Application

Open your browser and navigate to:

```
http://localhost:3000
```

---

## 🎭 Demo Accounts

### Administrator Account

| Field | Value |
|-------|-------|
| **Email** | `admin@skillswap.local` |
| **Password** | `AdminPass123!` |
| **Access** | Full admin panel, user management, reports, audit logs |

### Student Accounts

| Name | Email | Password |
|------|-------|----------|
| Alice Johnson | `alice.johnson@school.edu` | `Student123!` |
| Bob Smith | `bob.smith@school.edu` | `Student123!` |
| Carol Davis | `carol.davis@school.edu` | `Student123!` |
| David Wilson | `david.wilson@school.edu` | `Student123!` |
| Emma Brown | `emma.brown@school.edu` | `Student123!` |

All student accounts have:
- ✅ Complete profiles with bio and school info
- ✅ Multiple skills (offered and sought)
- ✅ Session history
- ✅ Messages exchanged
- ✅ Ratings given/received

---

## 🧪 Feature Testing Checklist

### User Features

#### 1. Registration & Login
- [ ] Navigate to `/register`
- [ ] Fill out registration form
- [ ] Verify password requirements are enforced:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- [ ] Verify email validation
- [ ] Complete registration
- [ ] Login with new account
- [ ] Verify dashboard loads

#### 2. Profile Management
- [ ] Click "Profile" in sidebar
- [ ] Update display name and bio
- [ ] Set school and grade level
- [ ] Upload profile picture (camera icon)
- [ ] Add skills you OFFER with proficiency level
- [ ] Add skills you SEEK
- [ ] Verify skills appear in profile

#### 3. Skill Search & Discovery
- [ ] Navigate to "Find Skills"
- [ ] Search for "JavaScript" or "Guitar"
- [ ] Apply category filter
- [ ] Sort results
- [ ] Click on a user to view their profile
- [ ] Request a session from search results

#### 4. Session Scheduling
- [ ] From user profile, click "Request Session"
- [ ] Select skill and date/time
- [ ] Add session notes
- [ ] Submit request
- [ ] Check "My Sessions" for pending request
- [ ] As provider: Accept session request
- [ ] Complete session and add notes

#### 5. Messaging System
- [ ] Navigate to "Messages"
- [ ] Compose new message
- [ ] Search for recipient
- [ ] Send message
- [ ] Check "Sent" folder
- [ ] Login as recipient
- [ ] Read message (verify read receipt)
- [ ] Reply to message

#### 6. Rating & Feedback
- [ ] Complete a session (mark as completed)
- [ ] Leave a 1-5 star rating
- [ ] Write detailed feedback
- [ ] Submit rating
- [ ] View rating on user profile
- [ ] Check average rating calculation

#### 7. AI Tutor (SkillBot)
- [ ] Click floating AI button (bottom-right)
- [ ] Ask a question about a skill
- [ ] Verify response is helpful
- [ ] Close chat window

### Admin Features

Login as admin (`admin@skillswap.local` / `AdminPass123!`):

#### 1. Dashboard Overview
- [ ] View platform statistics
- [ ] Check total users count
- [ ] Verify active session count
- [ ] Review recent activity

#### 2. User Management
- [ ] Navigate to Admin Panel
- [ ] View all users in table
- [ ] Use search to find specific user
- [ ] Click "Edit" on a user
- [ ] Modify user details
- [ ] Save changes
- [ ] Suspend a user account
- [ ] Reactivate a user account
- [ ] Change user role

#### 3. Skills Management
- [ ] Click "Skills" tab in Admin Panel
- [ ] Search for skills by name
- [ ] View skill owners
- [ ] Delete a skill if needed

#### 4. Content Moderation
- [ ] View all messages in system
- [ ] Search for specific content
- [ ] Delete inappropriate messages
- [ ] Review flagged content

#### 5. Reports & Analytics
- [ ] Navigate to Reports section
- [ ] View session statistics
- [ ] Check popular skills chart
- [ ] Analyze user growth
- [ ] Export data if needed

#### 6. Audit Logs
- [ ] View audit trail
- [ ] Filter by action type
- [ ] Filter by date range
- [ ] Verify all admin actions logged

---

## 🛠️ Troubleshooting

### Common Issues

#### "npm install" fails
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

#### Port 3000 already in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or start on different port
set PORT=3001 && npm start
```

#### Database errors
```bash
# Delete and reinitialize database
del skillswap.db
npm run init-db
npm run seed-db
```

#### Login not working
- Verify you're using correct email format
- Password is case-sensitive
- Check for spaces before/after password
- Ensure database was seeded with demo data

#### Session expired
- Sessions expire after 24 hours
- Clear cookies and login again
- Check if server was restarted

---

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with hot reload (nodemon) |
| `npm run init-db` | Initialize database tables |
| `npm run seed-db` | Load demo data |
| `npm test` | Run tests (if available) |

---

## 📁 Project Structure

```
BPA_Web/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── skillswap.db           # SQLite database (auto-created)
├── config/
│   ├── database.js        # Database connection
│   └── schema.sql         # Table definitions
├── middleware/
│   ├── auth.js            # Authentication
│   ├── validation.js      # Input validation
│   └── audit.js           # Audit logging
├── routes/
│   ├── admin.js           # Admin endpoints
│   ├── auth.js            # Login/register
│   ├── skills.js          # Skill CRUD
│   ├── sessions.js        # Session management
│   ├── messages.js        # Messaging
│   └── ...                # Other routes
├── public/
│   ├── index.html         # Main SPA page
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── css/               # Stylesheets
│   └── js/                # Frontend JavaScript
└── docs/                  # Documentation
```

---

## 🚀 Production Deployment

### Environment Setup

Create `.env` file for production:

```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-secure-random-string-here-min-32-chars
OPENAI_API_KEY=sk-your-key-here  # Optional for AI features
```

### Deployment Steps

1. **Set production environment**
   ```bash
   set NODE_ENV=production
   ```

2. **Initialize fresh database**
   ```bash
   npm run init-db
   npm run seed-db  # Optional for demo
   ```

3. **Start server**
   ```bash
   npm start
   ```

### Recommended Hosting

- **Heroku**: Easy Node.js deployment
- **Vercel**: Good for static + serverless
- **Railway**: Modern, simple deployment
- **DigitalOcean App Platform**: Full control

---

## ✅ Pre-Presentation Checklist

- [ ] Server starts without errors
- [ ] All demo accounts accessible
- [ ] Admin panel fully functional
- [ ] All features tested
- [ ] Database has sample data
- [ ] Browser cleared of old sessions
- [ ] Backup of working project saved
- [ ] Team can explain all code
- [ ] Documentation printed (if required)

---

## 📞 Support

If you encounter issues:

1. Check Troubleshooting section above
2. Review error messages in terminal
3. Check browser console for frontend errors
4. Verify Node.js and npm versions

---

**Document Version:** 2.0  
**Last Updated:** January 14, 2026  
**Team:** Jyothir Manchu, Aaryan Porwal, Rishik Pamuru  
**Chapter:** Reedy HS BPA Chapter, Frisco, Texas

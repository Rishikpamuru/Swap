# 🚀 SkillSwap - 30 Second Quick Start

**Get SkillSwap running in under a minute!**

---

## ⚡ Instant Setup

### Prerequisites
- **Node.js v18+** installed ([Download](https://nodejs.org/))

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Initialize database with demo data
npm run init-db
npm run seed-db

# 3. Start server
npm start
```

### Access Application

Open browser to: **http://localhost:3000**

---

## 🎭 Demo Accounts

### Admin (Full Access)
```
Email: admin@skillswap.local
Password: AdminPass123!
```

---

## ✅ Quick Feature Tour

### 1. Login
- Go to http://localhost:3000
- Enter demo credentials above
- Click "Login"

### 2. Dashboard
- View your profile statistics
- See recent activity
- Check unread messages

### 3. Find Skills
- Click "Find Skills" in sidebar
- Search for "JavaScript" or "Guitar"
- Click on users to view profiles

### 4. My Sessions
- View scheduled sessions
- Check upcoming and past sessions
- Complete sessions and rate tutors

### 5. Messages
- Click "Messages" in sidebar
- View inbox and sent messages
- Compose new messages

### 6. Admin Panel (Admin only)
- Click "Admin" in sidebar
- Manage users, skills, sessions
- View audit logs and reports

### 7. AI Tutor
- Click floating 🤖 button (bottom-right)
- Ask learning questions
- Get AI-powered assistance

---

## 🗂️ Project Structure

```
BPA_Web/
├── server.js          # Express server
├── package.json       # Dependencies
├── skillswap.db       # SQLite database
├── config/            # Database config
├── routes/            # API endpoints
├── middleware/        # Auth, validation
├── public/            # Frontend files
│   ├── index.html     # Main SPA
│   ├── css/           # Styles
│   └── js/            # Frontend JS
└── docs/              # Documentation
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `set PORT=3001 && npm start` |
| Database errors | `del skillswap.db` then reinitialize |
| Login fails | Ensure database was seeded |

---

## 📚 More Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Full setup instructions
- [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) - Feature testing
- [README.md](../README.md) - Complete project overview

---

**Team:** Jyothir Manchu, Aaryan Porwal, Rishik Pamuru  
**Chapter:** Reedy HS BPA Chapter, Frisco, Texas | 2026

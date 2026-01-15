# SkillSwap System Architecture

## Overview

SkillSwap is a database-driven web application built on a Node.js/Express backend with SQLite database storage. This document provides a comprehensive view of the system architecture for the BPA Web Application Team Competition.

---

## High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Web Browser"]
        SPA["Single Page Application<br/>(HTML/CSS/JS)"]
    end
    
    subgraph Server["Server Layer (Node.js/Express)"]
        direction TB
        Express["Express.js Server"]
        
        subgraph Middleware["Middleware Stack"]
            Helmet["Helmet.js<br/>(Security Headers)"]
            RateLimit["Rate Limiter<br/>(1000 req/15min)"]
            Session["Session Manager<br/>(express-session)"]
            Auth["Authentication<br/>(bcrypt)"]
            Audit["Audit Logger"]
            Validation["Input Validation"]
        end
        
        subgraph Routes["API Routes"]
            AuthRoutes["/api/auth"]
            UserRoutes["/api/users"]
            SessionRoutes["/api/sessions"]
            OfferRoutes["/api/offers"]
            MessageRoutes["/api/messages"]
            RatingRoutes["/api/ratings"]
            AdminRoutes["/api/admin"]
            ReportRoutes["/api/reports"]
            AIRoutes["/api/ai"]
        end
    end
    
    subgraph Database["Data Layer"]
        SQLite["SQLite Database<br/>(skillswap.db)"]
    end
    
    subgraph External["External Services"]
        GeminiAI["Google Gemini AI API<br/>(AI Tutor)"]
        FontAwesome["Font Awesome CDN"]
    end
    
    Browser --> SPA
    SPA --> Express
    Express --> Middleware
    Middleware --> Routes
    Routes --> SQLite
    AIRoutes --> GeminiAI
    SPA --> FontAwesome
```

---

## Database Entity Relationship Diagram

```mermaid
erDiagram
    ROLES ||--o{ USERS : "has"
    USERS ||--o| USER_PROFILES : "has"
    USERS ||--o{ SKILLS : "offers/seeks"
    USERS ||--o{ SESSIONS : "tutors"
    USERS ||--o{ SESSIONS : "learns"
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ MESSAGES : "receives"
    USERS ||--o{ RATINGS : "gives"
    USERS ||--o{ RATINGS : "receives"
    USERS ||--o{ ACHIEVEMENTS : "earns"
    USERS ||--o{ AUDIT_LOGS : "creates"
    SESSIONS ||--o| RATINGS : "has"
    SKILLS ||--o{ SESSIONS : "for"
    USERS ||--o{ SESSION_OFFERS : "creates"
    SESSION_OFFERS ||--o{ SESSION_OFFER_SLOTS : "has"
    SESSION_OFFERS ||--o{ SESSION_REQUESTS : "receives"
    
    ROLES {
        int id PK
        string name
        json permissions
    }
    
    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        int role_id FK
        string status
    }
    
    USER_PROFILES {
        int id PK
        int user_id FK
        string full_name
        string bio
        string profile_image
        string privacy_level
        boolean is_under_16
    }
    
    SKILLS {
        int id PK
        int user_id FK
        string skill_name
        string skill_type
        string proficiency
    }
    
    SESSIONS {
        int id PK
        int tutor_id FK
        int student_id FK
        int skill_id FK
        datetime scheduled_date
        int duration
        string status
        string meeting_link
    }
    
    RATINGS {
        int id PK
        int session_id FK
        int rater_id FK
        int rated_id FK
        int rating
        string feedback
    }
    
    MESSAGES {
        int id PK
        int sender_id FK
        int receiver_id FK
        string subject
        string content
        int read_status
    }
    
    ACHIEVEMENTS {
        int id PK
        int user_id FK
        string badge_name
        string badge_type
    }
    
    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity_type
        int entity_id
        json old_value
        json new_value
        string ip_address
    }
```

---

## Request Flow Diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Express Server
    participant M as Middleware
    participant R as Route Handler
    participant D as SQLite DB
    participant A as External API
    
    B->>E: HTTP Request
    E->>M: Helmet (Security Headers)
    M->>M: Rate Limiter Check
    M->>M: Cookie Parser
    M->>M: Session Validation
    M->>R: Route Handler
    
    alt Requires Auth
        R->>M: Check Authentication
        M-->>R: User Context
    end
    
    R->>D: Database Query
    D-->>R: Query Result
    
    alt AI Tutor Request
        R->>A: Gemini AI API Call
        A-->>R: AI Response
    end
    
    R->>M: Audit Log
    M->>D: Store Audit Entry
    R-->>B: JSON Response
```

---

## Security Architecture

```mermaid
flowchart LR
    subgraph Security["Security Layers"]
        direction TB
        
        subgraph Network["Network Security"]
            Helmet["Helmet.js<br/>CSP, X-Frame-Options"]
            RateLimit["Rate Limiting<br/>1000 req/15min"]
        end
        
        subgraph Auth["Authentication"]
            Bcrypt["Password Hashing<br/>bcrypt (12 rounds)"]
            Session["Secure Sessions<br/>httpOnly, sameSite"]
            RBAC["Role-Based Access<br/>admin/student"]
        end
        
        subgraph Data["Data Protection"]
            Validation["Input Validation<br/>Server + Client"]
            Sanitize["XSS Sanitization"]
            Params["Parameterized Queries<br/>SQL Injection Prevention"]
        end
        
        subgraph Audit["Compliance"]
            Logs["Audit Trail<br/>All Actions Logged"]
            Privacy["Privacy Controls<br/>public/friends/private"]
        end
    end
    
    Network --> Auth --> Data --> Audit
```

---

## Component Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | HTML5, CSS3, JavaScript | Single Page Application |
| **Styling** | Vanilla CSS with CSS Variables | Design system, responsive layout |
| **Icons** | Font Awesome 6.4 | UI iconography |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | SQLite (better-sqlite3/sqlite3) | Persistent data storage |
| **Authentication** | bcryptjs + express-session | Password hashing, session management |
| **Security** | Helmet.js + express-rate-limit | HTTP security headers, DDoS protection |
| **External API** | Google Gemini AI | AI-powered tutoring assistant |

---

## External API Integration

### Google Gemini AI (AI Tutor Feature)

The application integrates with **Google's Gemini AI API** to provide an AI-powered tutoring assistant:

- **Endpoint:** `/api/ai/chat`
- **Purpose:** Answer student questions, explain concepts, provide tutoring support
- **Security:** API key stored in environment variables (`.env`)
- **Rate Limiting:** Subject to global rate limits + API quota

```javascript
// Example API call (routes/ai.js)
const response = await fetch('https://generativelanguage.googleapis.com/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [...] })
});
```

---

## File Structure

```
BPA_Web/
├── server.js              # Main entry point
├── config/
│   ├── database.js        # Database connection
│   └── schema.sql         # Database schema
├── middleware/
│   ├── auth.js            # Authentication functions
│   ├── audit.js           # Audit logging
│   └── validation.js      # Input validation
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management
│   ├── sessions.js        # Session scheduling
│   ├── offers.js          # Session offers
│   ├── messages.js        # Messaging system
│   ├── ratings.js         # Rating system
│   ├── admin.js           # Admin panel
│   ├── reports.js         # Analytics reports
│   └── ai.js              # AI tutor integration
├── public/
│   ├── index.html         # SPA entry point
│   ├── css/modern-ui.css  # Stylesheet
│   └── js/app-modern.js   # Frontend logic
└── docs/                  # Documentation
```

---

## BPA Team Information

**Chapter:** Reedy High School BPA Chapter  
**Team Members:** Jyothir Manchu, Aaryan Porwal, Rishik Pamuru  
**Location:** Frisco, Texas  
**Year:** 2026

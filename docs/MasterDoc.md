
# SkillSwap
## Project Submission
---

## BPA Team Information
Chapter: Reedy High School BPA Chapter
School: Reedy High School
Team Members: Jyothir Manchu, Aaryan Porwal, Rishik Pamuru
TeamID: V04-WAT-S~02-1309-1
Location: Frisco, Texas
Date: January 15th, 2026


---
## Nessecary Info

Project Files: [https://drive.google.com/drive/folders/1x3xbBp9qk3woFguSVp85BaHjaNe52N67?usp=sharing](https://drive.google.com/drive/folders/1x3xbBp9qk3woFguSVp85BaHjaNe52N67?usp=sharing)

Github (Optional): [https://github.com/Rishikpamuru/Swap
](https://github.com/Rishikpamuru/SkillSwap_Website)

Live Website: [https://SkillSwapBPA.com](https://swap-production-bb01.up.railway.app/)

Logins:

### Admin:
User: admin
Password: Admin123!

### Test User:
User: alexm_dev01
Password: SecureA9!x

---

## Quick Overview
SkillSwap is a web application that aims to provide students with a community where they can exchange skills by connecting with tutors/learners in a secure, structured way. Users are able to register, log in, manage their profile, list skills they can either teach or want to learn, as well as communicate through built-in messaging. SkillSwap's system supports scheduling tutoring sessions through the use of offers and requests, which include details such as time, duration, location/meeting link, as well as session status tracking from creation to completion. After a session, students can leave their ratings and feedback to promote accountability and quality. Administrators specifically have elevated access for moderation and reporting, with their actions recorded for the sake of transparency.

SkillSwap runs on a Node.js + Express backend along with an SQLite database designed in normalized (3NF) form, using foreign keys, indexes, and supporting triggers/views for both performance and consistency. Security is a pivotal focus: passwords are stored as bcrypt hashes, sessions use secure cookie-based handling, requests are validated and parameterized to avoid injection, and security headers/rate limiting reduce common web risks. The platform additionally includes an optional AI tutoring assistant endpoint that can answer questions and provide learning help whilst keeping API keys protected via environment variables. In all, SkillSwap is built for the purpose of being an audit-friendly, privacy-aware, and reliable space for a school setting where safe collaboration and clear data integrity matter.

---


# Database Overview

```mermaid
classDiagram
    class DatabaseOverview {
        Database_Type : SQLite 3
        Driver : sqlite3 (async)
        Tooling : better-sqlite3
        Normalization : Third Normal Form (3NF)
        Total_Tables : 13 (excluding views)
        Total_Indexes : 18 explicit (+ SQLite auto indexes)
        Triggers : 5
        Views : 3
        Data_Integrity : CHECK constraints + Foreign Keys enforced
        Data_Encryption : bcrypt-hashed credentials + OS-level DB file protection
    }
```

---

## A. Initialization & Runtime Migrations

SkillSwap uses a self-healing SQLite architecture.

* Canonical schema defined in `config/schema.sql`
* Database file (`skillswap.db`) is created automatically on first run
* Startup migrations in `config/database.js` perform PRAGMA checks and safe ALTER TABLE operations to maintain backward compatibility

Note on Query Logic:
SQLite does not support stored procedures. All complex business logic is implemented using secure, 
parameterized SQL queries and transactional operations within the Node.js server layer.

---

## B. Database Entity Relationship Diagram

```mermaid
erDiagram
    ROLES ||--o{ USERS : has
    USERS ||--o| USER_PROFILES : has
    USERS ||--o{ SKILLS : offers_or_seeks
    USERS ||--o{ SESSIONS : tutors
    USERS ||--o{ SESSIONS : learns
    USERS ||--o{ SESSION_OFFERS : creates
    USERS ||--o{ SESSION_REQUESTS : submits
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ MESSAGES : receives
    USERS ||--o{ RATINGS : gives
    USERS ||--o{ RATINGS : receives
    USERS ||--o{ ACHIEVEMENTS : earns
    USERS ||--o{ AUDIT_LOGS : creates
    
    SKILLS ||--o{ SESSIONS : used_in
    SKILL_REQUESTS ||--o{ SESSIONS : creates
    SESSION_OFFERS ||--o{ SESSION_OFFER_SLOTS : has
    SESSION_OFFERS ||--o{ SESSIONS : generates
    SESSION_OFFER_SLOTS ||--o{ SESSIONS : schedules
    SESSIONS ||--o| RATINGS : has
```

---

## C. Core Database Tables

### Roles

```mermaid
classDiagram
    class ROLES {
        int id PK
        string name UNIQUE
        json permissions  -- Defines RBAC permissions
        datetime created_at
    }
```

### Users

```mermaid
classDiagram
    class USERS {
        int id PK
        string username UNIQUE
        string email UNIQUE
        string password_hash   -- bcrypt hashed password
        int role_id FK         -- references ROLES.id
        string status          -- active | suspended | deleted
        datetime created_at
        datetime updated_at
    }
```

### User Profiles

```mermaid
classDiagram
    class USER_PROFILES {
        int id PK
        int user_id FK UNIQUE -- references USERS.id
        string full_name
        string bio
        string profile_image
        string privacy_level
        string privacy_level   -- public | friends | private
        int is_under_16        -- additional privacy enforcement
        datetime updated_at
    }
```

### Skills

```mermaid
classDiagram
    class SKILLS {
        int id PK
        int user_id FK
        string skill_name
        string skill_type
        string proficiency
        string description
        datetime created_at
    }
```

### Sessions

```mermaid
classDiagram
    class SESSIONS {
        int id PK
        int request_id FK
        int offer_id FK
        int slot_id FK
        boolean is_group
        int tutor_id FK
        int student_id FK
        int skill_id FK
        datetime scheduled_date
        int duration
        string location
        string meeting_link
        string status
        string notes
        datetime created_at
        datetime completed_at
    }
```

---

## D. Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware
    participant Route
    participant DB
    participant AI
    
    Client->>Express: HTTP Request
    Express->>Middleware: Security & Session Validation
    Middleware->>Route: Authenticated Context
    Route->>DB: SQL Query
    DB-->>Route: Result
    
    alt AI Tutor Request
        Route->>AI: GPT API Call
        AI-->>Route: AI Response
    end
    
    Route->>Middleware: Audit Log
    Middleware->>DB: Store Audit Entry
    Route-->>Client: JSON Response
```

---

## E. Security Architecture

```mermaid
flowchart LR
    Network["Network Security<br/>Helmet + Rate Limiting"]
    Auth["Authentication<br/>bcrypt + Sessions + RBAC"]
    Data["Data Protection<br/>Validation + SQL Parameters"]
    Audit["Audit & Compliance<br/>Full Action Logging"]
    
    Network --> Auth --> Data --> Audit
```

---

## F. Security Controls

```mermaid
classDiagram
    class SecurityControls {
        Password_Hashing : bcrypt (12 rounds)
        Sessions : httpOnly cookies
        RBAC : role_id + permissions JSON
        SQL_Injection : Parameterized Queries
        XSS : Input Sanitization + Helmet
        Audit_Trail : All Admin Actions Logged
        Rate_Limiting : 100 req / 15 min
        Session_State : Server-managed sessions using express-session with secure, httpOnly cookies
        
    }
```
## G. Admin Functions

```mermaid
classDiagram
    class AdministrativeReporting {
        Access_Control : Admin-only reports enforced by RBAC
        User_Analytics : Registrations + role distribution + account status
        Session_Metrics : Created vs completed + trends over time
        Tutor_Quality : Average ratings + feedback summaries
        Offer_Request_Funnel : Offers -> requests -> accepted -> completed
        Audit_Log_Review : Who/what/when/IP for sensitive actions
        Data_Source : Live database views + indexed queries
        Performance_Goal : Fast read-only reporting at scale
        Compliance_Purpose : Moderation support + transparency
    }
```

## H. Core Application Functions

```mermaid
classDiagram
    class CoreApplicationFeatures {
        Authentication_Accounts : Registration + Login + Secure Sessions
        User_Profiles_Privacy : Bio + Avatar + Privacy Level Controls
        Skills_Marketplace : Teach/learn listings with proficiency + descriptions
        Session_Offers : Tutors create public session offers
        Session_Requests : Students request sessions and select slots
        Scheduling_Status : Date + duration + location/meeting link + lifecycle status
        Messaging_System : Direct messages for coordination
        Ratings_Feedback : Post-session ratings + written feedback
        Role_Based_Access : Admin vs student permissions (RBAC)
        Audit_Compliance : Action logging for accountability
        AI_Tutor_Optional : AI help endpoint for tutoring-style Q&A
        
    }
```

---

## I. Normalization Compliance

```mermaid
classDiagram
    class Normalization {
        First_Normal_Form : Compliant
        Second_Normal_Form : Compliant
        Third_Normal_Form : Compliant
        Evidence : No partial or transitive dependencies
    }
```
Unique Key Enforcement:
Primary and unique key constraints are used to prevent duplicate identities and ensure entity integrity. 
Examples include unique usernames and emails in USERS, a one-to-one relationship between USERS and USER_PROFILES, 
and a single rating per session enforced through a unique session_id constraint.

---

## J. BPA Rubric Alignment

```mermaid
classDiagram
    class BPARubric {
        Database_Driven : Yes
        Tables : 13
        Foreign_Keys : 15+
        Indexes : 18
        Triggers : 5
        Views : 3 (optimized read-only reporting)
        Security : bcrypt + RBAC + Audit Logs
        ER_Diagram : Complete
        
    }
```

---

## K. Technology Stack

```mermaid
classDiagram
    class Frontend {
        HTML5
        CSS3
        JavaScript
    }
    class Backend {
        NodeJS
        ExpressJS
    }
    class Database {
        SQLite
    }
    class Security {
        Helmet
        bcrypt
        express-session
    }
    class ExternalAPI {
        ChatGPT_AI
    }
```

---

## L. File Structure

```
BPA_Web/
├── server.js
├── config/
│   ├── database.js
│   └── schema.sql
├── middleware/
├── routes/
├── public/
└── docs/
```

## Raw Schema is uploaded 

---

## M. External API Integration 

SkillSwap integrates ChatGPT AI via `/api/ai/chat` to provide AI-powered tutoring assistance. API keys are stored in environment variables and protected by rate limiting and audit logging.

---

# SkillSwap System Architecture



## A. High-Level System Architecture

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
        ChatGPT["ChatGPT API<br/>(AI Tutor)"]
        FontAwesome["Font Awesome CDN"]
    end
    
    Browser --> SPA
    SPA --> Express
    Express --> Middleware
    Middleware --> Routes
    Routes --> SQLite
    AIRoutes --> ChatGPT
    SPA --> FontAwesome
```

---

## B. Database Entity Relationship Diagram

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
    SESSION_OFFERS ||--o{ SESSIONS : "creates"
    SESSION_OFFER_SLOTS ||--o{ SESSIONS : "schedules"
    
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
        int offer_id FK
        int slot_id FK
        boolean is_group
        datetime scheduled_date
        int duration
        string status
        string meeting_link
    }

    SESSION_OFFERS {
        int id PK
        int tutor_id FK
        int skill_id FK
        string title
        string location_type
        string location
        boolean is_group
        int max_participants
        string status
    }

    SESSION_OFFER_SLOTS {
        int id PK
        int offer_id FK
        datetime scheduled_date
        int duration
    }

    SESSION_REQUESTS {
        int id PK
        int offer_id FK
        int slot_id FK
        int tutor_id FK
        int student_id FK
        string status
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

## C. Request Flow Diagram

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
        R->>A: ChatGPT API Call
        A-->>R: AI Response
    end
    
    R->>M: Audit Log
    M->>D: Store Audit Entry
    R-->>B: JSON Response
```

---

## D. Security Architecture

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

## E. Component Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | HTML5, CSS3, JavaScript | Single Page Application |
| **Styling** | Vanilla CSS with CSS Variables | Design system, responsive layout |
| **Icons** | Font Awesome 6.4 | UI iconography |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | SQLite (better-sqlite3/sqlite3) | Persistent data storage |
| **Authentication** | bcryptjs + express-session | Password hashing, session management |
| **Security** | Helmet.js + express-rate-limit | HTTP security headers, DDoS protection |
| **External API** | ChatGPT | AI-powered tutoring assistant |

---

## F. External API Integration

### ChatGPT (AI Tutor Feature)

The application integrates with **ChatGPT API** to provide an AI-powered tutoring assistant:

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

## G. File Structure

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

# Works Cited

---

## Technologies & Frameworks

### Backend Technologies

**Node.js**  
OpenJS Foundation. "Node.js." *Node.js*, 2024, https://nodejs.org/. Accessed 14 Jan. 2026.

**Express.js**  
OpenJS Foundation. "Express - Node.js Web Application Framework." *Express.js*, 2024, https://expressjs.com/. Accessed 14 Jan. 2026.

**SQLite**  
Hipp, D. Richard. "SQLite." *SQLite*, 2024, https://www.sqlite.org/. Accessed 14 Jan. 2026.

### Security Libraries

**bcryptjs**  
"bcryptjs - npm." *npm*, 2024, https://www.npmjs.com/package/bcryptjs. Accessed 14 Jan. 2026.

**Helmet.js**  
"Helmet.js - Help secure Express apps with various HTTP headers." *Helmet.js*, 2024, https://helmetjs.github.io/. Accessed 14 Jan. 2026.

**express-rate-limit**  
"express-rate-limit - npm." *npm*, 2024, https://www.npmjs.com/package/express-rate-limit. Accessed 14 Jan. 2026.

**express-session**  
"express-session - npm." *npm*, 2024, https://www.npmjs.com/package/express-session. Accessed 14 Jan. 2026.

**express-validator**  
"express-validator - npm." *npm*, 2024, https://www.npmjs.com/package/express-validator. Accessed 14 Jan. 2026.

### Frontend Libraries

**Font Awesome**  
Fonticons, Inc. "Font Awesome." *Font Awesome*, 2024, https://fontawesome.com/. Accessed 14 Jan. 2026.

**Google Fonts (Inter)**  
Google. "Google Fonts." *Google Fonts*, 2026, https://fonts.google.com/. Accessed 15 Jan. 2026.  
Rasmus Andersson. "Inter." *Google Fonts*, 2026, https://fonts.google.com/specimen/Inter. Accessed 15 Jan. 2026.

**cdnjs (CDN Hosting)**  
cdnjs. "cdnjs - The #1 free and open source CDN." *cdnjs*, 2026, https://cdnjs.com/. Accessed 15 Jan. 2026.

### External APIs

**OpenAI API**  
OpenAI. "OpenAI API." *OpenAI*, 2024, https://platform.openai.com/. Accessed 14 Jan. 2026.  
*Used for: AI Tutor (SkillBot) feature - Optional integration for educational assistance.*

---

## Development Tools

**Visual Studio Code**  
Microsoft. "Visual Studio Code." *Visual Studio Code*, 2024, https://code.visualstudio.com/. Accessed 14 Jan. 2026.

**npm (Node Package Manager)**  
npm, Inc. "npm." *npm*, 2024, https://www.npmjs.com/. Accessed 14 Jan. 2026.

**Git**  
Software Freedom Conservancy. "Git." *Git*, 2024, https://git-scm.com/. Accessed 14 Jan. 2026.

**Claude Opus**
Anthropic. "Claude." *Anthropic*, 2026, www.anthropic.com. Accessed 15 Jan. 2026.


---

## Design Resources

**CSS Color Variables**  
All color schemes and design tokens were created by the team based on modern UI/UX principles.

**Icons**  
All icons used are from Font Awesome Free (MIT License).  
Fonticons, Inc. "Font Awesome Free License." *Font Awesome*, 2024, https://fontawesome.com/license/free. Accessed 14 Jan. 2026.

---

## Educational References

**BPA Workplace Skills Assessment Program**  
Business Professionals of America. "Workplace Skills Assessment Program." *Business Professionals of America*, 2025, https://bpa.org/. Accessed 14 Jan. 2026.

**BPA Web Application Team Competition Resources**  
Business Professionals of America. "Competitive Events." *Business Professionals of America*, 2026, https://bpa.org/competitive-events/. Accessed 15 Jan. 2026.  
Business Professionals of America. "Web Application Team." *Business Professionals of America*, 2026, https://bpa.org/competitive-events/web-application-team/. Accessed 15 Jan. 2026.  
Business Professionals of America. "BPA Release Forms." *Business Professionals of America*, 2026, https://bpa.org/competitive-events/competitive-event-submission-process/. Accessed 15 Jan. 2026.

**Web Security Best Practices**  
OWASP Foundation. "OWASP Top Ten." *OWASP*, 2024, https://owasp.org/www-project-top-ten/. Accessed 14 Jan. 2026.  
*Referenced for: SQL injection prevention, XSS mitigation, secure session management.*

**Database Normalization**  
Codd, E.F. "A Relational Model of Data for Large Shared Data Banks." *Communications of the ACM*, vol. 13, no. 6, 1970, pp. 377-387.  
*Referenced for: Database schema design principles.*

---

## Image Assets

**SkillSwap Logo**  
Original artwork created by team members.  
© 2026 Reedy HS BPA Chapter

**Authentication Background Image (RedAndBlueBack.png)**  
Background image used on authentication pages (public/RedAndBlueBack.png). Original artwork created by team members.  
© 2026 Reedy HS BPA Chapter

**Profile Avatars**  
Default avatars are generated using user initials (no external images required).

---

## Code Attribution

**All source code in this project is original work by:**
- Jyothir Manchu
- Aaryan Porwal
- Rishik Pamuru

No code was copied from external sources, tutorials, or third-party repositories. All functionality was developed from scratch following BPA competition guidelines prohibiting the use of application generators, pre-built templates, or auto-generated site builders.

---

## Third-Party npm Packages Used

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| express | ^4.18.2 | MIT | Web server framework |
| sqlite3 | ^5.1.7 | BSD-3-Clause | Database driver |
| better-sqlite3 | ^9.6.0 | MIT | Sync SQLite driver |
| bcryptjs | ^2.4.3 | MIT | Password hashing |
| express-session | ^1.17.3 | MIT | Session management |
| express-rate-limit | ^7.1.5 | MIT | Rate limiting |
| express-validator | ^7.0.1 | MIT | Input validation |
| helmet | ^7.1.0 | MIT | Security headers |
| multer | ^1.4.5-lts.1 | MIT | File uploads |
| cookie-parser | ^1.4.6 | MIT | Cookie parsing |
| dotenv | ^16.3.1 | BSD-2-Clause | Environment config |

### npm Package Citations (Additional)

**sqlite3 (npm package)**  
"sqlite3 - npm." *npm*, 2024, https://www.npmjs.com/package/sqlite3. Accessed 14 Jan. 2026.

**better-sqlite3**  
"better-sqlite3 - npm." *npm*, 2024, https://www.npmjs.com/package/better-sqlite3. Accessed 14 Jan. 2026.

**multer**  
"multer - npm." *npm*, 2024, https://www.npmjs.com/package/multer. Accessed 14 Jan. 2026.

**cookie-parser**  
"cookie-parser - npm." *npm*, 2024, https://www.npmjs.com/package/cookie-parser. Accessed 14 Jan. 2026.

**dotenv**  
"dotenv - npm." *npm*, 2024, https://www.npmjs.com/package/dotenv. Accessed 14 Jan. 2026.

---

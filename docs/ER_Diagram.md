# SkillSwap Database Schema & Entity-Relationship Documentation

**BPA Web Application Team – SkillSwap**  
**Reedy HS BPA Chapter | Frisco, Texas | 2026**

---

## 1. Database Architecture Overview

| Property | Value |
|--------|-------|
| Database System | SQLite 3 |
| Driver | better-sqlite3 (sync) + sqlite3 (async) |
| Total Tables | 13 |
| Foreign Key Relationships | 15+ |
| Indexes | 18 |
| Triggers | 5 |
| Views | 3 |
| Normalization Level | Third Normal Form (3NF) |

---

## 2. Entity-Relationship Diagram (Conceptual)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SKILLSWAP ENTITY-RELATIONSHIP DIAGRAM                    │
│                                   12 TABLES IN 3NF                               │
└─────────────────────────────────────────────────────────────────────────────────┘


                                    ┌──────────────┐
                                    │    ROLES     │
                                    ├──────────────┤
                                    │ • id (PK)    │
                                    │ • name (UQ)  │
                                    │ • permissions│
                                    │ • created_at │
                                    └──────┬───────┘
                                           │
                                           │ 1:N
                                           │
    ┌──────────────────────────────────────▼─────────────────────────────────────┐
    │                                                                            │
    │  ┌──────────────────┐                              ┌──────────────────┐    │
    │  │      USERS       │            1:1               │   USER_PROFILES  │    │
    │  ├──────────────────┤   ─────────────────────────► ├──────────────────┤    │
    │  │ • id (PK)        │                              │ • id (PK)        │    │
    │  │ • username (UQ)  │                              │ • user_id (FK,UQ)│    │
    │  │ • email (UQ)     │                              │ • full_name      │    │
    │  │ • password_hash  │                              │ • bio            │    │
    │  │ • role_id (FK)───┼──────────────────────────────┤ • profile_image  │    │
    │  │ • status         │                              │ • privacy_level  │    │
    │  │ • created_at     │                              │ • is_under_16    │    │
    │  │ • updated_at     │                              │                  │    │
    │  └────────┬─────────┘                              │ • updated_at     │    │
    │           │                                        └──────────────────┘    │
    │           │                                                                │
    └───────────┼────────────────────────────────────────────────────────────────┘
                │
    ┌───────────┼─────────────────────────────────────────────────────────────────┐
    │           │                         USER OWNED ENTITIES                     │
    │           │                                                                 │
    │           ▼ 1:N                                                             │
    │  ┌──────────────────┐         ┌──────────────────┐    ┌──────────────────┐  │
    │  │      SKILLS      │         │   ACHIEVEMENTS   │    │   AUDIT_LOGS     │  │
    │  ├──────────────────┤         ├──────────────────┤    ├──────────────────┤  │
    │  │ • id (PK)        │         │ • id (PK)        │    │ • id (PK)        │  │
    │  │ • user_id (FK)───┼─────────┤ • user_id (FK)   │    │ • user_id (FK)   │  │
    │  │ • skill_name     │         │ • badge_name     │    │ • action         │  │
    │  │ • skill_type     │ offered │ • badge_type     │    │ • entity_type    │  │
    │  │   (offered/sought)│ sought │ • description    │    │ • entity_id      │  │
    │  │ • proficiency    │         │ • earned_at      │    │ • old_value      │  │
    │  │ • description    │         └──────────────────┘    │ • new_value      │  │
    │  │ • created_at     │                                 │ • ip_address     │  │
    │  └────────┬─────────┘                                 │ • user_agent     │  │
    │           │                                           │ • created_at     │  │
    │           │                                           └──────────────────┘  │
    └───────────┼─────────────────────────────────────────────────────────────────┘
                │
    ┌───────────┼─────────────────────────────────────────────────────────────────┐
    │           │                         SKILL EXCHANGES                         │
    │           ▼ N:1                                                             │
    │  ┌──────────────────┐                              ┌──────────────────┐     │
    │  │  SKILL_REQUESTS  │            1:N               │     SESSIONS     │     │
    │  ├──────────────────┤   ─────────────────────────► ├──────────────────┤     │
    │  │ • id (PK)        │                              │ • id (PK)        │     │
    │  │ • requester_id   │◄─ FK to users                │ • request_id (FK)│     │
    │  │ • provider_id    │◄─ FK to users                │ • tutor_id (FK)  │◄─┐  │
    │  │ • skill_id (FK)──┼──────────────────────────────┤ • student_id (FK)│◄─┤  │
    │  │ • status         │ pending/accepted/declined    │ • skill_id (FK)  │  │  │
    │  │ • message        │                              │ • scheduled_date │  │  │
    │  │ • created_at     │                              │ • duration       │  │  │
    │  │ • updated_at     │                              │ • location       │  │  │
    │  └──────────────────┘                              │ • status         │  │  │
    │                                                    │ • notes          │  │  │
    │                                                    │ • created_at     │  │  │
    │                                                    │ • completed_at   │  │  │
    │                                                    └────────┬─────────┘  │  │
    │                                                             │            │  │
    │                                                             │ 1:1        │  │
    │                                                             ▼            │  │
    │                                                    ┌──────────────────┐  │  │
    │                                                    │     RATINGS      │  │  │
    │                                                    ├──────────────────┤  │  │
    │                                                    │ • id (PK)        │  │  │
    │                                                    │ • session_id(FK,UQ)  │  │
    │                                                    │ • rater_id (FK)──┼──┘  │
    │                                                    │ • rated_id (FK)──┼─────┘
    │                                                    │ • rating (1-5)   │     │
    │                                                    │ • feedback       │     │
    │                                                    │ • created_at     │     │
    │                                                    └──────────────────┘     │
    └─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                            SESSION OFFERS SYSTEM                            │
    │                                                                             │
    │  ┌──────────────────┐         ┌──────────────────────┐                      │
    │  │  SESSION_OFFERS  │   1:N   │ SESSION_OFFER_SLOTS  │                      │
    │  ├──────────────────┤ ──────► ├──────────────────────┤                      │
    │  │ • id (PK)        │         │ • id (PK)            │                      │
    │  │ • tutor_id (FK)◄─┼─────────┤ • offer_id (FK)      │                      │
    │  │ • skill_id (FK)  │         │ • scheduled_date     │                      │
    │  │ • title          │         │ • duration           │                      │
    │  │ • notes          │         │ • created_at         │                      │
    │  │ • location_type  │         │                      │                      │
    │  │ • location       │         │                      │                      │
    │  │ • is_group       │         │                      │                      │
    │  │ • max_participants│        │                      │                      │
    │  │ • status         │         │                      │                      │
    │  │ • created_at     │         │                      │                      │
    │  │ • updated_at     │         └──────────────────────┘                      │
    │  └──────────────────┘                                                       │
    └─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                              MESSAGING SYSTEM                               │
    │                                                                             │
    │  ┌──────────────────┐                                                       │
    │  │     MESSAGES     │                                                       │
    │  ├──────────────────┤                                                       │
    │  │ • id (PK)        │                                                       │
    │  │ • sender_id (FK)─┼──────► FK to users                                    │
    │  │ • receiver_id(FK)┼──────► FK to users                                    │
    │  │ • subject        │                                                       │
    │  │ • content        │                                                       │
    │  │ • read_status    │  0 = unread, 1 = read                                 │
    │  │ • created_at     │                                                       │
    │  │ • read_at        │                                                       │
    │  └──────────────────┘                                                       │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Entities and Table Definitions

### 3.1 ROLES
Defines role-based access control (RBAC).

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | UNIQUE, NOT NULL |
| permissions | TEXT | NOT NULL (JSON array) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.2 USERS
Handles authentication and account lifecycle.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| username | TEXT | UNIQUE, NOT NULL |
| email | TEXT | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| role_id | INTEGER | FK → roles(id) |
| status | TEXT | DEFAULT 'active' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.3 USER_PROFILES
Extended user information (1:1 relationship).

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| user_id | INTEGER | FK → users(id), UNIQUE |
| full_name | TEXT | |
| bio | TEXT | |
| profile_image | TEXT | |
| privacy_level | TEXT | DEFAULT 'public' |
| is_under_16 | INTEGER | DEFAULT 0 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.4 SKILLS
Skills offered or sought by users.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| user_id | INTEGER | FK → users(id), ON DELETE CASCADE |
| skill_name | TEXT | NOT NULL |
| skill_type | TEXT | offered / sought |
| proficiency | TEXT | |
| description | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.5 SKILL_REQUESTS
Direct skill exchange requests.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| requester_id | INTEGER | FK → users(id) |
| provider_id | INTEGER | FK → users(id) |
| skill_id | INTEGER | FK → skills(id) |
| status | TEXT | pending / accepted / declined |
| message | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.6 SESSIONS
Scheduled learning sessions.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| request_id | INTEGER | FK → skill_requests(id) |
| offer_id | INTEGER | FK → session_offers(id) |
| slot_id | INTEGER | FK → session_offer_slots(id) |
| is_group | INTEGER | DEFAULT 0 |
| tutor_id | INTEGER | FK → users(id) |
| student_id | INTEGER | FK → users(id) |
| skill_id | INTEGER | FK → skills(id) |
| scheduled_date | DATETIME | NOT NULL |
| duration | INTEGER | |
| location | TEXT | |
| meeting_link | TEXT | |
| status | TEXT | scheduled / completed / cancelled |
| notes | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| completed_at | DATETIME | |

---

### 3.7 RATINGS
Post-session feedback (1:1 with sessions).

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| session_id | INTEGER | FK → sessions(id), UNIQUE |
| rater_id | INTEGER | FK → users(id) |
| rated_id | INTEGER | FK → users(id) |
| rating | INTEGER | CHECK (1–5) |
| feedback | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.8 SESSION_OFFERS
Public tutor offers.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| tutor_id | INTEGER | FK → users(id) |
| skill_id | INTEGER | FK → skills(id) |
| title | TEXT | NOT NULL |
| notes | TEXT | |
| location_type | TEXT | DEFAULT 'online' |
| location | TEXT | |
| is_group | INTEGER | DEFAULT 0 |
| max_participants | INTEGER | DEFAULT 1 |
| status | TEXT | DEFAULT 'open' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.9 SESSION_OFFER_SLOTS
Available time slots for offers.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| offer_id | INTEGER | FK → session_offers(id), ON DELETE CASCADE |
| scheduled_date | DATETIME | NOT NULL |
| duration | INTEGER | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.10 SESSION_REQUESTS
Students request a specific offer + time slot.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| offer_id | INTEGER | FK → session_offers(id), ON DELETE CASCADE |
| slot_id | INTEGER | FK → session_offer_slots(id), ON DELETE CASCADE |
| tutor_id | INTEGER | FK → users(id) |
| student_id | INTEGER | FK → users(id) |
| status | TEXT | pending / accepted / declined / cancelled |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.11 MESSAGES
Internal messaging system.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| sender_id | INTEGER | FK → users(id) |
| receiver_id | INTEGER | FK → users(id) |
| subject | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| read_status | INTEGER | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| read_at | DATETIME | |

---

### 3.12 ACHIEVEMENTS
Gamification and engagement tracking.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| user_id | INTEGER | FK → users(id), ON DELETE CASCADE |
| badge_name | TEXT | NOT NULL |
| badge_type | TEXT | |
| description | TEXT | |
| earned_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

### 3.13 AUDIT_LOGS
Security and administrative auditing.

| Column | Type | Constraints |
|------|------|-------------|
| id | INTEGER | PK |
| user_id | INTEGER | FK → users(id) |
| action | TEXT | NOT NULL |
| entity_type | TEXT | NOT NULL |
| entity_id | INTEGER | |
| old_value | TEXT | |
| new_value | TEXT | |
| ip_address | TEXT | |
| user_agent | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## 4. Indexes, Triggers, and Views

- **Indexes:** Optimized for authentication, messaging, sessions, and auditing (18 total)
- **Triggers:** Auto-update timestamp fields on users, profiles, requests, and offers
- **Views:**
  - `v_user_details`
  - `v_session_summary`
  - `v_user_ratings`

---

## 5. Referential Integrity Rules (Summary)

| Parent | Child | On Delete |
|------|-------|----------|
| roles | users | RESTRICT |
| users | user_profiles, skills, messages, achievements | CASCADE |
| skills | skill_requests | CASCADE |
| skill_requests | sessions | SET NULL |
| sessions | ratings | CASCADE |
| session_offers | session_offer_slots, session_requests | CASCADE |
| session_offer_slots | session_requests | CASCADE |
| session_offers | sessions | SET NULL |
| session_offer_slots | sessions | SET NULL |

---

## 6. Security Implementation

| Measure | Implementation |
|------|----------------|
| Password Security | bcrypt (12 rounds) |
| Session Handling | httpOnly cookies |
| Access Control | RBAC |
| SQL Injection Prevention | Parameterized queries |
| XSS Prevention | Input sanitization |
| Audit Trail | Full admin logging |
| Rate Limiting | 100 requests / 15 minutes |

---


**Document Version:** 2.0  
**Last Updated:** January 14, 2026  
**Team:** Jyothir Manchu, Aaryan Porwal, Rishik Pamuru  
**Chapter:** Reedy High School BPA – Frisco, Texas

# 📊 Database Entity-Relationship Diagram

**SkillSwap - Web Application Team Competition**  
**Reedy HS BPA Chapter | Frisco, Texas | 2026**

---

## 🗃️ Database Architecture Overview

| Property | Value |
|----------|-------|
| **Database System** | SQLite 3 |
| **Total Tables** | 12 |
| **Total Relationships** | 15+ Foreign Keys |
| **Normalization Level** | Third Normal Form (3NF) |
| **Indexes** | 8 |
| **Triggers** | 5 |
| **Views** | 3 |

---

## 📋 Conceptual ER Diagram

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
    │  │ • created_at     │                              │ • school         │    │
    │  │ • updated_at     │                              │ • grade_level    │    │
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
    │  │ • skill_id (FK)  │         │ • slot_date          │                      │
    │  │ • description    │         │ • slot_time          │                      │
    │  │ • location       │         │ • duration           │                      │
    │  │ • created_at     │         │ • is_taken           │                      │
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

## 📐 Relationship Summary

| Relationship | Type | From → To | Description |
|--------------|------|-----------|-------------|
| Role → Users | 1:N | roles.id → users.role_id | One role has many users |
| User → Profile | 1:1 | users.id → user_profiles.user_id | One user, one profile |
| User → Skills | 1:N | users.id → skills.user_id | User has many skills |
| User → Messages | 1:N | users.id → messages.sender_id/receiver_id | Users send/receive messages |
| User → Achievements | 1:N | users.id → achievements.user_id | User earns many badges |
| User → Audit Logs | 1:N | users.id → audit_logs.user_id | User creates audit entries |
| Skill → Skill Requests | 1:N | skills.id → skill_requests.skill_id | Skill requested many times |
| Skill Request → Sessions | 1:N | skill_requests.id → sessions.request_id | Request creates sessions |
| Session → Rating | 1:1 | sessions.id → ratings.session_id | One rating per session |
| User → Session Offers | 1:N | users.id → session_offers.tutor_id | Tutor creates offers |
| Session Offer → Slots | 1:N | session_offers.id → session_offer_slots.offer_id | Offer has many slots |

---

## 🔑 Key Notation

| Symbol | Meaning |
|--------|---------|
| **PK** | Primary Key (auto-increment) |
| **FK** | Foreign Key (references another table) |
| **UQ** | Unique constraint |
| **1:1** | One-to-one relationship |
| **1:N** | One-to-many relationship |
| **N:M** | Many-to-many relationship |

---

## 📊 Cardinality Matrix

| Table A | Table B | Cardinality | Notes |
|---------|---------|-------------|-------|
| roles | users | 1:N | Role has many users |
| users | user_profiles | 1:1 | Exactly one profile per user |
| users | skills | 1:N | User has many skills |
| users | messages | 1:N (×2) | As sender and receiver |
| users | sessions | 1:N (×2) | As tutor and student |
| skills | skill_requests | 1:N | Skill requested multiple times |
| skill_requests | sessions | 1:N | Request may lead to multiple sessions |
| sessions | ratings | 1:1 | One rating per completed session |
| users | achievements | 1:N | User earns multiple badges |
| users | audit_logs | 1:N | User actions tracked |
| session_offers | session_offer_slots | 1:N | Offer has multiple time slots |

---

## 🛡️ Referential Integrity Rules

| Parent Table | Child Table | On Delete | On Update |
|--------------|-------------|-----------|-----------|
| roles | users | RESTRICT | CASCADE |
| users | user_profiles | CASCADE | CASCADE |
| users | skills | CASCADE | CASCADE |
| users | messages | CASCADE | CASCADE |
| users | achievements | CASCADE | CASCADE |
| users | audit_logs | SET NULL | CASCADE |
| skills | skill_requests | CASCADE | CASCADE |
| skill_requests | sessions | CASCADE | CASCADE |
| sessions | ratings | CASCADE | CASCADE |
| session_offers | session_offer_slots | CASCADE | CASCADE |

---

## 📐 Normalization Analysis

### First Normal Form (1NF) ✅
- All attributes contain atomic values
- No repeating groups or arrays in columns
- Each column has a unique name
- Order of rows/columns doesn't matter

### Second Normal Form (2NF) ✅
- Meets 1NF requirements
- All non-key attributes depend on the entire primary key
- No partial dependencies (no composite keys with partial deps)

### Third Normal Form (3NF) ✅
- Meets 2NF requirements
- No transitive dependencies
- Non-key attributes depend only on the primary key

**Examples of 3NF Compliance:**
- User authentication (users) separated from profile data (user_profiles)
- Role definitions (roles) separated from user assignments
- Skills as separate entities linked by foreign keys
- Session ratings separate from sessions themselves
- Audit logs independent with nullable user reference

---

## 📁 Physical Schema Details

See [Database_Schema.md](Database_Schema.md) for complete table definitions including:
- Column data types
- Constraints
- Default values
- Indexes
- Triggers
- Views

---

## 🎯 BPA Rubric Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ER Diagram included | ✅ | This document |
| All entities shown | ✅ | 12 tables documented |
| Relationships labeled | ✅ | Cardinality on all relationships |
| Primary keys marked | ✅ | PK notation used |
| Foreign keys marked | ✅ | FK notation used |
| Normalization documented | ✅ | 1NF, 2NF, 3NF analysis |

---

**Document Version:** 2.0  
**Last Updated:** January 14, 2026  
**Team:** Jyothir Manchu, Aaryan Porwal, Rishik Pamuru  
**Chapter:** Reedy HS BPA Chapter, Frisco, Texas

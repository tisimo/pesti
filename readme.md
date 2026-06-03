# JustCauses Backoffice — Developer Reference

This document is the primary source of context for developing the JustCauses admin backoffice. It covers the project structure, tech stack, architectural decisions, development rules, and the full ordered backlog of user stories.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture](#4-architecture)
5. [RBAC — Roles & Permissions](#5-rbac--roles--permissions)
6. [Development Rules & Best Practices](#6-development-rules--best-practices)
7. [URL Structure](#7-url-structure)
8. [Backlog — User Stories (ordered by BOSH number)](#8-backlog--user-stories)
9. [Pending JustCauses Entity Changes](#9-pending-justcauses-entity-changes)

---

## 1. Project Overview

The **JustCauses Backoffice** is a dedicated, standalone admin panel for the JustCauses crowdfunding platform. It is **not** an extension of the JustCauses user-facing frontend — it is a separate application with its own frontend and backend, designed to be operated exclusively by internal team members.

It enables operators to:
- Review and approve/reject campaigns and KYC submissions
- Monitor platform analytics and financial flows
- Moderate reported content and handle support tickets
- Manage admin users, roles, and permissions
- Maintain a full immutable audit trail of all internal actions

The backoffice is designed with the **OnlyHighIQ ecosystem** in mind — the architecture is intentionally modular so it can be extended to support other apps (e.g. Only High Value, Only Second Hand) without structural redesign.

---

## 2. Tech Stack

### Backend (`/be`)
| Concern | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5.x |
| Language | TypeScript 5.9.x |
| Dependency Injection | TypeDI |
| Validation | Celebrate (Joi) |
| Logging | Pino |
| Auth | AWS Cognito (JWT / JWKS) |
| Primary DB | PostgreSQL (`pg`) |
| Audit DB | AWS DynamoDB |
| File Storage | AWS S3 |
| Email | AWS SES |
| Testing | Jest + Supertest |

### Frontend (`/fe`)
| Concern | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7.x |
| Routing | React Router 7.x |
| UI | Bootstrap 5 + React-Bootstrap |
| Auth | AWS Amplify |
| HTTP | Axios |

---

## 3. Repository Structure

```
backoffice/
├── be/                         # Backoffice backend (Express + TypeScript)
│   └── src/
│       ├── api/
│       │   ├── index.ts        # Mounts all route groups
│       │   ├── middlewares/    # Auth, error handling
│       │   └── routes/
│       │       ├── ojc/        # OJC-specific routes (overview, users, campaigns…)
│       │       ├── roles.ts
│       │       └── permissions.ts
│       ├── controllers/
│       │   ├── ojc/            # OJC controllers
│       │   └── IControllers/   # Interfaces
│       ├── services/
│       │   └── ojc/            # OJC services
│       ├── repos/
│       │   └── ojc/            # OJC repositories
│       ├── loaders/            # App bootstrapping (DI, DB, routes)
│       └── app.ts
├── fe/                         # Backoffice frontend (React + Vite)
│   └── src/
│       ├── app/
│       │   └── router.tsx      # Route definitions + protected routes
│       ├── features/
│       │   └── admin/
│       │       └── ui/
│       │           └── AdminLayout.tsx  # Sidebar + layout
│       └── pages/              # One folder per page/module
├── JustCauses/                 # Main JustCauses app (separate project)
│   ├── backend/
│   └── frontend/
└── shared-backend/             # Shared blockchain/Web3 services
```

---

## 4. Architecture

### Separation of concerns (backend)
The backend follows a **layered DDD-inspired structure** per module:

```
Route → Controller → Service → Repository → DB
```

- **Routes** (`api/routes/`): Define HTTP endpoints, apply Celebrate validation, inject controllers via TypeDI.
- **Controllers** (`controllers/`): Handle the HTTP request/response cycle. No business logic.
- **Services** (`services/`): Contain all business logic. Talk to repositories only.
- **Repositories** (`repos/`): Abstract all database access. One class per aggregate/table group.

### OJC vs shared modules
Files specific to OnlyJustCauses are placed inside `ojc/` subfolders within each layer:
- `controllers/ojc/`, `services/ojc/`, `repos/ojc/`, `routes/ojc/`

Shared cross-app infrastructure (roles, permissions, users, auth) lives at the flat layer level.

### Persistence
- **PostgreSQL** — transactional data from the JustCauses platform: users, campaigns, donations, KYC, withdrawals, categories.
- **AWS DynamoDB** — backoffice configuration and audit data:
  - `BO_Roles` — predefined and custom roles
  - `BO_Permissions` — available permissions per category (view/action/admin)
  - `BO_PageGates` — page-level permission requirements (route access config)
  - `BO_Logs` — immutable audit log entries; partition key = entityId, sort key = ISO timestamp; TTL managed natively

### Authentication
Every API request passes through Cognito JWT validation middleware (`middlewares/cognitoAuth.ts`). The decoded token carries the user's role/group, which is then used for RBAC enforcement at the service layer.

---

## 5. RBAC — Roles & Permissions

There are **6 predefined roles** that cannot be deleted. The Super Admin role cannot be modified.

Roles are split across two applications:
- **backoffice** — Super Admin (and supplementary Backoffice Admin, Backoffice Auditor, Default roles for admin management pages)
- **just_causes** — Senior Admin, Compliance Officer, Moderator, Tech Lead, Support Staff

| Role | Application | Description |
|---|---|---|
| **Super Admin** | backoffice | Full unrestricted access to all modules and operations. Cannot be modified or deleted. |
| **Senior Admin** | just_causes | Full access to all operational modules except role configuration and admin user management. |
| **Compliance Officer** | just_causes | KYC review, fraud investigation, user flagging, audit log access, and data export. |
| **Moderator** | just_causes | Campaign review (approve/reject/block), report moderation. No access to financial or user management modules. |
| **Tech Lead** | just_causes | Access to reports, audit logs, and data export. No access to user data or financial modules. |
| **Support Staff** | just_causes | User support, ticket handling, email response. Read-only access to user profiles. |

### Permissions (just_causes application)

Permissions are divided into three categories:

**View:** `view_users`, `view_campaigns`, `view_donations`, `view_reports`, `view_email`, `view_audit_logs`
**Action:** `approve_reject`, `block_suspend`, `flag_escalate`, `respond`, `view_kyc`, `export`
**Admin:** `manage_admins`, `view_admin_logs`, `configure_roles`, `change_settings`

### Permission matrix

| Module | Super Admin | Senior Admin | Compliance Officer | Moderator | Tech Lead | Support Staff |
|---|---|---|---|---|---|---|
| Users | V+A+Adm | V+A | V+A | — | — | V |
| Campaigns | V+A+Adm | V+A | — | V+A | — | — |
| Categories | V+A+Adm | V+A | — | V+A | — | — |
| KYC | V+A+Adm | V+A | V | — | — | — |
| Donations | V+A+Adm | V | — | — | — | — |
| Withdrawals | V+A+Adm | V | — | — | — | — |
| Transactions | V+A+Adm | V | — | — | — | — |
| Moderation | V+A+Adm | V+A | — | V+A | V | — |
| Support | V+A+Adm | V+A | — | — | — | V+A |
| Dashboard / Analytics | V+A+Adm | V+A | A | V | V | V |
| Audit Logs | V+A+Adm | V | V | — | V | — |
| Role Management | V+A+Adm | — | — | — | — | — |

*V = View · A = Action · Adm = Administration · — = No access*

### Enforcement rules
- **Frontend**: Route guards and UI visibility checks based on the role stored in the JWT. Hidden ≠ protected — always enforce server-side too.
- **Backend**: Every write endpoint checks the actor's role/permissions before executing. The role is extracted from the validated Cognito token.
- Predefined roles cannot be deleted via any API call. Super Admin permissions cannot be toggled.
- Endpoint-level permission mapping is documented in [permissions-endpoints.md](./permissions-endpoints.md).

---

## 6. Development Rules & Best Practices

### General
- TypeScript strict mode is enabled. No `any` unless there is no alternative — document why.
- All endpoints must be authenticated. No public routes in the backoffice API.
- All write operations must write an audit log entry to DynamoDB (entityId, actorId, action, timestamp, metadata).
- Business logic lives in services. Controllers are thin — validate input, call service, return response.

### Validation
- Use **Celebrate + Joi** for all request validation (body, params, query).
- Route params that are predefined role IDs use `Joi.string().min(1)` (not `.uuid()`) because predefined role IDs use a custom format.
- Never trust client-supplied role or permission data — always read from the database.

### API design
- REST conventions: `GET` for reads, `POST` for creates, `PUT` for full updates, `PATCH` for partial updates, `DELETE` for deletions.
- Return consistent error shapes: `{ error: string, details?: any }`.
- Use `200` for success, `201` for resource creation, `400` for validation errors, `401` for unauthenticated, `403` for forbidden, `404` for not found.
- Pagination on all list endpoints: `{ data: [], total: number, page: number, limit: number }`.

### Database
- Use parameterised queries only. Never interpolate user input into SQL strings.
- All tables have `createdAt` and `updatedAt` timestamp columns.
- Soft-delete preferred over hard-delete for user-facing entities (use `deletedAt` or `status` flags).
- Analytics queries must support conditional period filtering — never hardcode time ranges.

### Frontend
- One folder per page under `src/pages/`. Each folder contains the page component and any page-local components.
- Shared UI components go in `src/components/`.
- API calls are centralised in service files — never call `axios` directly from a component.
- Route protection is handled by the router wrapper — check role before rendering protected pages.
- Avoid direct DOM manipulation. Use React state.

### Audit trail
Every sensitive action must be logged. Minimum fields per log entry:
```
{
  actorId: string,       // admin user ID
  action: string,        // e.g. "CAMPAIGN_APPROVED"
  entityType: string,    // e.g. "Campaign"
  entityId: string,
  timestamp: string,     // ISO 8601
  metadata: object       // action-specific details (reason, previous state, etc.)
}
```
Audit entries are **immutable** — no update or delete operations on the audit table.

### Code organisation
- OJC-specific files go in `ojc/` subfolders inside each layer folder.
- Shared infrastructure (auth, RBAC, audit) stays at the root of each layer.
- Do not create top-level module folders that span multiple layers — keep layers as the top-level grouping.

---

## 7. URL Structure

| Area | URL |
|---|---|
| Login | `/backoffice/login` |
| App Selector | `/backoffice/panel` |
| OJC Dashboard | `/ojc/overview` |
| OJC module pages | `/ojc/<module>` (e.g. `/ojc/users`, `/ojc/campaigns`) |
| Roles & Permissions | `/admin/roles-permissions` |
| Team Management | `/admin/team-management` |

---


# 8. Backlog 

## BOSH Project — User Stories by Sprint

All user stories for each sprint in the BOSH project, grouped by sprint, with exact and complete descriptions and full acceptance criteria.  
Stories are not ordered by issue key.

---

## 📅 Sprint 1: BOSH Sprint 1
**Timeline:** 2026-03-04 to 2026-03-18  
**Goal:** Shared Homepage, Specific OJC Backoffice, Auth and Roles (BE and FE working)

### User Stories

#### BOSH-15: Infrastructure and DevOps
- **Description:**  
  As a developer, I want to implement a secure authentication pipeline for admin panel and deploy to AWS, so that admins can securely access the backoffice in dev and production environments.
- **Acceptance Criteria:**  
  (Not explicitly detailed in description, noted as a collaborative task for the team to learn pipeline implementation.)

---

#### BOSH-14: Documentation and Training
- **Description:**  
  As an administrator / developer, I want complete documentation of the backoffice system so that onboarding is smooth, troubleshooting is efficient, and compliance is auditable.
- **Acceptance Criteria:**
    1. **Documentation Sections:** Overview, User Guide, Role Definitions, API Reference, Workflows, Troubleshooting, FAQ, Security & Compliance.
    2. **For Each Feature:** What it does, Who can use it, Step-by-step instructions with screenshots, Related features, Audit trail implications, Common mistakes.
    3. **For Each Role:** Job description, Permissions granted, Key responsibilities, Escalation procedures, Examples of tasks.
    4. **Technical Documentation:** Database schema, API authentication, Audit log structure, Environment setup, Deployment procedures.
    5. **Format:** Markdown files in GitHub, HTML-rendered version, PDF export.
    6. **Maintenance:** Every feature PR must include doc update, Version history tracked.

---

#### BOSH-26: Backoffice Authentication (Login/Logout)
- **Description:**  
  As an admin user, I want to log in at /backoffice/login with email and password, so that I can access the shared backoffice securely.
- **Acceptance Criteria:**
    1. Login Page at /backoffice/login (shared for entire OnlyHighIQ ecosystem).
    2. Email + Password authentication.
    3. One login session serves all apps.
    4. Logout from any app logs out from entire backoffice.

---

#### BOSH-21: View Predefined Roles
- **Description:**  
  As a Super Admin, I want to see a list of all predefined roles and their descriptions at /admin/roles-permissions, so that I understand the role structure before making changes.
- **Acceptance Criteria:**
    1. Page at /admin/roles-permissions displays all 6 predefined roles:
        - **Support Staff:** Answer emails, view user profiles, escalate tickets.
        - **Moderator:** Review causes, reject/approve causes, view reports.
        - **Compliance Officer:** Review KYC, flag users, manage fraud cases, view audit logs.
        - **Tech Lead:** View technical reports, manage category taxonomy, system health.
        - **Senior Admin:** All permissions except user role creation/deletion.
        - **Super Admin:** Full platform access.
    2. Each role shows its name and description visible to team.
    3. Super Admin role cannot be restricted.

---

#### BOSH-22: Configure Role Permissions (Toggle On/Off)
- **Description:**  
  As a Super Admin, I want to enable/disable specific permissions for each role, so that I can fine-tune what each role can do across the platform.
- **Acceptance Criteria:**
    1. For each role, Super Admin can toggle permissions in 3 categories:
        - **View:** Users, Causes, Donations, Reports, Email, Audit Logs.
        - **Action:** Approve Cause, Reject Cause, Block Cause, Suspend User, Flag User, Escalate Ticket, Respond Email, View KYC, Export Data.
        - **Admin:** Create Admin User, Edit Admin User, View Admin Logs, Configure Roles, Change System Settings.
    2. Each permission has a toggle (on/off) per role.
    3. Permission changes apply immediately.
    4. Super Admin role permissions cannot be modified.

---

## 📅 Sprint 2: BOSH Sprint 2
**Timeline:** 2026-03-18 to 2026-04-01

### User Stories

#### BOSH-27: Application Selector Dashboard
- **Description:**  
  As an authenticated admin user, I want to see a list of applications I have access to after login, so that I can choose which app to manage.
- **Acceptance Criteria:**
    1. After successful login, user sees list of applications (e.g., OnlyJustCause).
    2. Each app shows: App name, Role in that app, Last accessed date.
    3. User clicks on application → Redirects to app-specific backoffice dashboard.
    4. If user has no access: Show "Access Denied" message.

---

#### BOSH-28: App-Specific Permission Enforcement
- **Description:**  
  As an admin user inside an app's backoffice, I want to see only the features my role allows, so that the interface is clean and I cannot access unauthorized areas.
- **Acceptance Criteria:**
    1. Permission Check on Entry: User's role in selected app is loaded.
    2. Features visible based on role permissions.
    3. If user has no access to app: Show "Access Denied".
    4. If user role has no permission for feature: Hide that feature.
    5. Persists which app user is viewing in session.
    6. Permission checks occur on both frontend and backend.

---

#### BOSH-29: App Switching & Navigation Context
- **Description:**  
  As an admin user, I want to switch between ecosystem apps without re-authenticating, and always see which app I am currently in, so that navigation is seamless and contextually clear.
- **Acceptance Criteria:**
    1. Header Shows Context: Current app name, Current user name + role, "Switch App" / "Logout" buttons.
    2. Switch Application: "Back to App Selector" link/button in header.
    3. Returns to app list, can switch between apps without re-authenticating.
    4. No re-authentication needed between apps (single session).

---

#### BOSH-23: View Role Assignments (Users per Role)
- **Description:**  
  As a Super Admin, I want to see which admin users are assigned to which roles, so that I can audit team access at a glance.
- **Acceptance Criteria:**
    1. View role assignments: Which users have which role.
    2. Each entry shows: User name, Email, Assigned role.
    3. Filterable by role.
    4. Accessible from the /admin/roles-permissions page.

---

#### BOSH-24: Audit Log for Permission Changes
- **Description:**  
  As a Super Admin, I want to see a log of all changes made to role permissions, so that I have traceability of who changed what and when.
- **Acceptance Criteria:**
    1. Audit log: Changes to role permissions, by ActorID, timestamp.
    2. Log displayed in a table, sorted by most recent first.
    3. Accessible from the /admin/roles-permissions page.
    4. Log entries are immutable.

---

#### BOSH-30: Backoffice Access Audit Trail
- **Description:**  
  As a Super Admin, I want all login and app access events to be logged, so that I have full traceability of who accessed what and when.
- **Acceptance Criteria:**
    1. Login logged: Email, IP, Timestamp, Apps accessible.
    2. App access logged: Which app, when, UserID.
    3. All access attempts logged (success and failed).

---

## 📅 Sprint 3: BOSH Sprint 3
**Timeline:** 2026-04-01 to 2026-04-15

### User Stories

#### BOSH-12: Admin User Creation and Role Assignment
- **Description:**  
  As a Super Admin, I want to create admin users and assign them specific roles, so that I can manage team access and permissions systematically.
- **Acceptance Criteria:**
    1. Super Admin navigates to /admin/team-management.
    2. Click "Create Admin User": Enter Email, Full Name, Role.
    3. Temp password auto-generated and emailed; must change on first login.
    4. Super Admin can: View all admin users, Edit user (role/status), View user activity.
    5. User deactivation: Prevent login, revoke API keys, log event.
    6. Password reset: Admin user can request reset → Email sent.
    7. All actions logged by ActorID and timestamp.

---

#### BOSH-17: Admin User Management
- **Description:**  
  As an administrator, I want to search and view detailed user profiles so that I can monitor user activity, verify compliance, and manage user accounts.
- **Acceptance Criteria:**
    1. Search by Email, Username, or Account ID.
    2. User list displays: Username, Email, Account ID, Role, KYC Status, Created Date.
    3. Detailed profile shows: Account info, KYC info, Creator info (Campaigns, Actions), Donor info (Donations, Totals), Account Activity (Last Login/IP).
    4. All data access logged by AdminID with timestamp.

---

#### BOSH-1: Review Causes
- **Description:**  
  As a admin, I want to review and approve causes so that only legitimate causes are published.
- **Acceptance Criteria:**
    1. Pending causes queue: Shows all causes with status "pending_approval".
    2. Each cause shows: Title, Category, Goal, Creator info, Verification status, Creation date, Preview button.
    3. Actions: Approve, Reject (with reason), Request changes.
    4. On approve: Status → "published", Creator notified.
    5. On reject: Status → "rejected", Creator notified with reason.
    6. Approval history logged by AccountID.

---

## 📅 Sprint 4: BOSH Sprint 4
**Timeline:** 2026-04-15 to 2026-04-29

### User Stories

#### BOSH-2: Review KYC Submissions (Admin)
- **Description:**  
  As an admin, I want to review KYC submissions so that I can verify user identities before allowing cause creation.
- **Acceptance Criteria:**
    1. "KYC Queue" in admin dashboard.
    2. List shows: User name, Country, Submission date, Status.
    3. Detailed view: Side-by-side ID photo vs Selfie.
    4. Checklist: Photo quality, Name matches, ID not expired, Selfie matches ID, Address proof valid.
    5. Actions: Approve, Reject (with reason), Request resubmission.
    6. On Approve: User status → Verified, Email sent, "Create Cause" enabled.
    7. Approval time SLA: 48 hours.

---

#### BOSH-7: Manage Cause Categories
- **Description:**  
  As an admin, I want to manage the list of cause categories so that creators have relevant options when creating causes.
- **Acceptance Criteria:**
    1. "Categories" section in Admin dashboard.
    2. CRUD operations: Create, Read, Update, Delete categories.
    3. Each category: Name, Icon, Description, Display order, Active/Inactive.
    4. Can reorder categories (drag & drop).
    5. Cannot delete category if causes use it.

---

#### BOSH-8: Validate Cause Edits After Publication
- **Description:**  
  As an administrator, I want to review edits made to published causes so that creators cannot alter causes after approval.
- **Acceptance Criteria:**
    1. Creator edits published cause → Status → "pending_edit_approval".
    2. Creator notified of review (~24 hours); original stays online.
    3. Admin sees diff view (old vs new), reason for edit, timestamp.
    4. Actions: Approve edit, Reject edit (with reason).
    5. On approve: Edited version replaces original.
    6. All edits logged by AccountID with IP, timestamp, and fields changed.

---

## 📅 Sprint 5: BOSH Sprint 5
**Timeline:** 2026-04-29 to 2026-05-13

### User Stories

#### BOSH-5: Process Withdrawal (Admin)
- **Description:**  
  As an admin, I want to review and approve withdrawal requests so that I can prevent fraud and ensure compliance.
- **Acceptance Criteria:**
    1. Admin dashboard shows all pending withdrawals.
    2. Shows: Creator name, Cause, Amount, Bank/Crypto details, Request date.
    3. Actions: Approve, Reject (with reason), Request more info.
    4. On Approve: Moves to "Processing"; initiates transfer via API.
    5. Processing time: 3-5 days (bank), 1-2 hours (crypto).
    6. Transaction recorded in history; Email sent to creator.

---

#### BOSH-10: Fraud Detection and Cause Emergency Blocking
- **Description:**  
  As an administrator/compliance officer, I want to immediately block fraudulent causes and protect affected donors so that I can prevent further harm.
- **Acceptance Criteria:**
    1. "Block Cause" button → Status → "blocked_fraud_investigation".
    2. On block: Cause removed from public, fundraising paused, Creator notified, Donors notified.
    3. Escalate automatically to Compliance Team.
    4. Compliance can: Keep blocked or Unblock.
    5. Block reason documented and logged by AdminID.

---

## 📅 Sprint 6: BOSH Sprint 6
**Timeline:** 2026-05-13 to 2026-05-27

### User Stories

#### BOSH-3: Platform Analytics Dashboard
- **Description:**  
  As a admin, I want to view platform-wide analytics so that I can monitor growth and health.
- **Acceptance Criteria:**
    1. Dashboard metrics: Total users, Total causes, Total raised, Active causes, Pending approvals, New users (30 days), Revenue (7% fee).
    2. Charts: Users, Donations, and Revenue over time; Top categories.
    3. Tables: Top causes, Top donors, Top creators.
    4. Filters: Date range, Category.
    5. Export data button (PDF/Excel).

---

#### BOSH-6: Review Reports (Admin)
- **Description:**  
  As an admin, I want to review reported causes so that I can take action on fraudulent/inappropriate content.
- **Acceptance Criteria:**
    1. "Reports" section in Admin dashboard.
    2. List: Cause name, Reporter, Reason, Date, Status.
    3. Details: Full report, Cause content, Reporter message, Evidence.
    4. Actions: Approve, Remove cause, Warn creator, Request changes, Dismiss.
    5. On Remove: Cause unpublished, Creator notified.
    6. On Warn: Creator receives warning, Strike recorded (3 strikes → Suspension).

---

## 📅 Sprint 7: BOSH Sprint 7
**Timeline:** 2026-05-27 to 2026-06-10

### User Stories

#### BOSH-9: Support Ticket Escalation System
- **Description:**  
  As an administrator, I want to escalate support tickets to specialized teams so that complex issues reach the right expertise level.
- **Acceptance Criteria:**
    1. Ticket types: General, High-Value, Fraud, Technical, Compliance.
    2. Auto-escalation rules (e.g., Amount > €5,000 → Senior Admin).
    3. Escalation queue: Pending, In Progress, Resolved.
    4. Escalated ticket shows: Original request, Assigned to, Reason, Deadline.
    5. All escalations logged by AccountID, timestamp, reason.

---

#### BOSH-11: Admin Email Inbox and Communication Center
- **Description:**  
  As a support staff / administrator, I want to manage incoming emails and respond to users from the backoffice so that I can handle all user communications in one place.
- **Acceptance Criteria:**
    1. "Email Inbox" section at /admin/email.
    2. Inbox displays: From, Subject, Date, Status, Thread view.
    3. Reply: Text editor, Attachments (up to 5MB), CC/BCC, Drafts.
    4. Bulk actions: Mark as read, Delete, Archive, Assign.
    5. Search: By sender, subject, date range.
    6. All emails logged with responder ID, timestamp, content hash.

---

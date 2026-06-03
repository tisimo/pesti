# Report AI Handoff — JustCauses Backoffice PESTI Report

This document gives a future AI assistant everything it needs to continue working on the internship report located at `docs/PESTI-Mine/PESTI-Template/`.

---

## 1. Report Overview

- **Type**: PESTI (ISEP internship) report, written in LaTeX
- **Template root**: `docs/PESTI-Mine/PESTI-Template/`
- **Student**: Tiago Silva (student number in PDF metadata)
- **Company**: OnlyHighIQ (Porto) — product: JustCauses (crowdfunding platform)
- **Period**: 23 Feb 2026 → ~10 Jun 2026
- **Current date at last edit**: 2026-03-31 (Sprints 1 & 2 complete, Sprint 3 in progress)

### LaTeX entry point
```
docs/PESTI-Mine/PESTI-Template/main.tex
```
Chapters are included from `chapters/ch1/` through `chapters/ch5/` and appendix from `appendices/appendixA.tex`.

---

## 2. Chapter Status

### Chapter 1 — Introdução ✅ COMPLETE
File: `chapters/ch1/chapter1.tex`
- Sections: Enquadramento, Descrição do Problema, Objetivos, Abordagem, Contributos, Planeamento (sprint table), Estrutura do relatório
- One remaining TODO: sprint dates table needs updating as sprints are completed (supervisor fills these)

### Chapter 2 — Estado da Arte ✅ COMPLETE
File: `chapters/ch2/chapter2.tex`
- Technology comparison tables present (BE frameworks, FE frameworks, databases)
- Has Conclusão section

### Chapter 3 — Análise e Desenho ✅ SUBSTANTIALLY COMPLETE
File: `chapters/ch3/chapter3.tex`
- Sections: RF/RNF requirements, C4 model (Levels 1–3), Vista Física (new, AWS infrastructure table), SSDs (simplified), SSD section references Appendix A for full diagrams, Modelo de permissões, Page Gates, Alternativas ao design (new), Conclusão
- **Remaining TODO**: Vista Física has a TODO for inserting the actual AWS infrastructure diagram PNG (when available)
- FURPS+ not used — RNF are in tabular form (acceptable)

### Chapter 4 — Implementação da Solução ✅ SUBSTANTIALLY COMPLETE
File: `chapters/ch4/chapter4.tex`
- All sections filled. No more TODO stubs for prose content.
- **Remaining TODOs** (all are screenshot placeholders — cannot be filled programmatically):
  - Login page screenshot (`sec:autenticacao_impl`)
  - `cognitoAuth.ts` code snippet (`sec:autenticacao_impl`)
  - App selector screenshot (`subsec:impl_app_selector`)
  - Roles/permissions screenshots (`subsec:impl_rbac`)
  - Audit logs page screenshot (`subsec:impl_audit`)
  - AdminOverviewPage KPI cards screenshot (`subsec:impl_dashboard`)
  - UsersPage screenshot (`subsec:impl_users`)
  - Campaigns queue + review modal screenshots (`subsec:impl_campaigns`)
  - CategoriesPage screenshot (`subsec:impl_categories`)
  - AnalyticsPage screenshot (`subsec:impl_analytics`)
  - ReportsPage + ReportsDetailPage screenshots (`subsec:impl_reports`)
  - KycQueuePage screenshot (`subsec:impl_kyc`)
  - WithdrawalsPage screenshot (`subsec:impl_withdrawals`)
  - TransactionsPage screenshot (`subsec:impl_transactions`)
  - AdminUsersPage + Super Admin transfer modal screenshots (`subsec:impl_admin_users`)
  - Audit logs page screenshot (`subsec:impl_audit`)
  - CI/CD config description (when available)

### Chapter 5 — Conclusões ✅ COMPLETE
File: `chapters/ch5/chapter5.tex`
- All three sections filled: Objetivos concretizados (table), Limitações e trabalho futuro, Apreciação final
- No remaining TODOs

### Appendix A — Detailed SSDs ✅ COMPLETE
File: `appendices/appendixA.tex`
- Contains 8 detailed SSD sections (BOSH-26, 12, 21/22/23, 1, 7, 6, 2, 5)
- Each references a PlantUML-generated PNG: `frontmatter/assets/backoffice/ch3/uml/{BOSH-ID}/ssd-full`
- The PNGs need to be compiled from the .puml files in `docs/UML/`

---

## 3. BOSH Story Implementation Status (as of 2026-03-31)

| Story | Title | Status |
|-------|-------|--------|
| BOSH-26 | Authentication (Login/MFA/Reset) | ✅ Complete |
| BOSH-27 | Application Selector Dashboard | ✅ Complete |
| BOSH-28 | App-Specific Permission Enforcement | ✅ Complete |
| BOSH-29 | App Switching & Navigation | ✅ Complete |
| BOSH-21 | View Predefined Roles | ✅ Complete |
| BOSH-22 | Configure Role Permissions | ✅ Complete |
| BOSH-23 | View Role Assignments | ✅ Complete |
| BOSH-12 | Admin User Creation & Management | ✅ Complete |
| BOSH-1  | Review Campaigns (Approve/Reject/Request Changes) | 🟡 Partial — missing external preview link |
| BOSH-6  | Review Reported Content | ✅ Substantially Complete |
| BOSH-7  | Manage Categories (Full CRUD) | ✅ Complete |
| BOSH-2  | KYC Queue | 🟡 Partial — queue done, approve/reject missing |
| BOSH-5  | Withdrawal Approval | 🟡 Partial — BE done, FE read-only |
| BOSH-3  | Platform Analytics | 🟡 Partial — no top donors/creators table, no export |
| BOSH-17 | User Management (Platform Users) | 🟡 Partial — list only, no detail page |
| BOSH-30 | Access Audit Trail | 🟡 Partial — login events not confirmed |
| BOSH-8  | Validate Cause Edits Post-Publication | ❌ Missing |
| BOSH-10 | Fraud Detection & Emergency Blocking | ❌ Missing |
| BOSH-11 | Admin Email Inbox | ❌ Missing |
| BOSH-9  | Support Ticket Escalation | ❌ Missing (Nice to Have) |
| BOSH-24 | Audit Log for Permission Changes | ❌ Missing (Nice to Have) |

---

## 4. RF Requirement Mapping (for ch4 Avaliação table)

| RF | Description | Status |
|----|-------------|--------|
| RF01 | List/search/filter platform user accounts | Parcial |
| RF02 | User detail with history, campaigns, transactions | Não concluído |
| RF03 | Suspend/reactivate user accounts | Não concluído |
| RF04 | KYC queue with document access | Concluído |
| RF05 | Approve/reject KYC decisions | Não concluído |
| RF06 | Campaign review queue | Concluído |
| RF07 | Approve/reject/request changes on campaigns | Concluído |
| RF08 | Create/edit/deactivate categories | Concluído |
| RF09 | Creator profile with campaign history | Não concluído |
| RF10 | Donation history with filters | Parcial |
| RF11 | Refund management | Não concluído |
| RF12 | Withdrawal queue | Concluído |
| RF13 | Approve/reject withdrawals | Parcial (BE done, FE pending) |
| RF14 | View transactions (on-chain + fiat) | Concluído |
| RF15 | Reports queue | Concluído |
| RF16 | Act on reports (dismiss/suspend/warn/request change) | Concluído |
| RF17 | Support ticket queue | Não concluído |
| RF18 | Respond to support tickets | Não concluído |
| RF19 | Dashboard with operational KPIs | Concluído |
| RF20 | Immutable audit log for operator actions | Concluído |
| RF21 | RBAC with 6 roles and configurable permissions | Concluído |
| RF22 | Platform settings management | Parcial (Page Gates only) |

---

## 5. Architecture Key Facts

### Tech Stack
- **BE**: Node.js + Express 5, TypeScript 5.9, TypeDI, PostgreSQL (`pg`), DynamoDB, Cognito (JWKS JWT), Celebrate, Pino
- **FE**: React 19, TypeScript 5.9, Vite 7, React Router 7, Bootstrap 5, AWS Amplify (auth), Axios

### BE Pattern
`Route → Controller → Service → Repository → DB`
- OJC-specific code in `ojc/` subfolders at each layer
- Shared RBAC/auth/audit at root level
- PostgreSQL for transactional data; DynamoDB for audit logs (`BO_Logs` table) and Page Gates

### Key File Paths
- BE entry: `be/src/app.ts`
- BE DI registration: `be/src/loaders/index.ts`
- FE entry: `fe/src/main.tsx`
- FE router: `fe/src/app/router.tsx`
- Auth provider: `fe/src/app/providers/AuthProvider.tsx`
- Roles types: `fe/src/features/roles/model/types.ts`

### AWS Infrastructure (11 services)
Route 53 → CloudFront → S3 (FE static), Cognito, ALB → EC2/ECS (Node.js BE), RDS PostgreSQL, DynamoDB (BO_Logs), SES (email), CloudWatch (monitoring), S3 (docs/evidence storage)

### Important Patterns
- **Draft state per card**: RolesPermissionsPage + PageGatesPage use draft + Save/Discard (not instant-save)
- **PageGate requiredPermissions**: `string[]` with OR logic. Empty = open to all with app access
- **requirePermission middleware**: Applied to every OJC route; OR logic; Super Admin bypass; denied attempts logged as `APP_ACCESS_FAILED` with 15s dedup cache
- **Transfer Super Admin**: 3-step modal (warning → second warning → type target email) + `await logout()` on success
- **getStringParam**: Used in all controllers to narrow Express 5's `req.params.id: string | string[]` → `string`
- **Analytics ordering fix**: `ORDER BY COALESCE(SUM(d."amount"), 0) DESC`
- **DashboardPage vs AdminOverviewPage**: DashboardPage = app selector at `/backoffice`; AdminOverviewPage = 7 KPI stats at `/ojc`
- **KYC 3-pool query**: Verifications (sharedPool) → Profiles (ojcPool) → Account (sharedPool) using `= ANY($1::uuid[])` enrichment
- **Reports WARN_CREATOR**: incrementStrikeCount; at ≥3 → auto-suspend account; in-app notification (TTL 90d) + SES email
- **OjcReportNotesRepo**: Injected directly into controller (not through service layer); stores in PostgreSQL `ReportNotes` table

---

## 6. UML / Diagram Assets

PlantUML source files are in `docs/UML/` organized by BOSH story:
```
docs/UML/
├── BOSH-1/      ssd.puml, ssd-full.puml
├── BOSH-2/      ssd.puml, ssd-full.puml
├── BOSH-5/      ssd.puml, ssd-full.puml
├── BOSH-6/      ssd.puml, ssd-full.puml
├── BOSH-7/      ssd.puml, ssd-full.puml
├── BOSH-12/     ssd.puml, ssd-full.puml
├── BOSH-21-22-23/ ssd.puml, ssd-full.puml
└── BOSH-26/     ssd.puml, ssd-full.puml
```

PNG outputs must go to:
`docs/PESTI-Mine/PESTI-Template/frontmatter/assets/backoffice/ch3/uml/{BOSH-ID}/ssd.png` (simplified)
`docs/PESTI-Mine/PESTI-Template/frontmatter/assets/backoffice/ch3/uml/{BOSH-ID}/ssd-full.png` (detailed)

---

## 7. What Remains To Do

### High priority (needed for submission)
1. **Insert screenshots** into all ch4 TODO screenshot placeholders — requires running the app and taking UI screenshots
2. **Compile PlantUML diagrams** to PNG for ch3 SSD figures and Appendix A
3. **AWS infrastructure diagram** for ch3 Vista Física section (currently a TODO placeholder)
4. **Review/proofread** all chapter text, especially ch3 alternativas ao design section and ch4 prose
5. **Update sprint table** in ch1 as sprints 3–7 complete (fill in actual dates and descriptions)
6. **Check glossary** — ensure all \gls{} references in the text have matching entries in the .gls file

### Medium priority (quality improvements)
7. **Add code snippets** — ch4 mentions `cognitoAuth.ts` middleware; could include a listing with the JWKS validation logic
8. **Add `\section{Conclusão}` to ch4** — ch4 currently ends with Avaliação da solução without a closing paragraph; consider adding a brief concluding paragraph
9. **Update BOSH implementation memory file** (`memory/bosh-implementation-status.md`) as stories are completed in later sprints

### Low priority (nice to have)
10. **BOSH-7 ambiguity**: The implementation status memory says BOSH-7 is READ-ONLY (no Categories DB table, GET only), but ch4 was written describing full CRUD. Verify actual code state in `be/src/ojc/` and reconcile ch4 text if needed.
11. **ch4 CI/CD TODO**: Fill in `sec:ambiente_infraestrutura` CI/CD paragraph when pipeline is set up.
12. **ch3 FURPS+**: Report uses tabular RNF format instead of FURPS+ — this is acceptable but if professor requires FURPS+ format, restructure the RNF table in ch3.

---

## 8. Glossary Entries to Verify

The report uses `\gls{}` references extensively. Ensure these are defined in the glossary file:
`SSD`, `API`, `RBAC`, `KYC`, `JWT`, `JWKS`, `SES`, `TTL`, `SSE`, `MVP`, `CI/CD`, `KPI`, `CRUD`, `E2E`, `PDF`, `CSV`, `IA`, `UC`, `LEI-PROJ`, `ISEP`

---

## 9. Memory Files Reference

For full AC-level story status: `memory/bosh-implementation-status.md`
For project overview: `memory/MEMORY.md` (loaded automatically)

# Permission to Endpoint Matrix

This file documents which backend endpoints are accessible for each permission in the backoffice API.

All protected routes are mounted under `/api` and require a valid Cognito-backed backoffice session unless explicitly marked as public.

## Important Notes

- `Super Admin` bypasses all permission checks.
- Users whose role belongs to the `backoffice` application also bypass OJC-specific permission checks in `requirePermission(...)`.
- Some routes use OR logic.
  - Example: `GET /api/logs` accepts `view_audit_logs` or `view_admin_logs`.
- Some routes use combined checks.
  - Example: report write routes require `view_reports` and at least one moderation permission.

## Public or Authenticated-Only Routes

These routes are not tied to a specific permission:

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/status` | Public |
| `POST` | `/api/auth/login-failed` | Public |
| `POST` | `/api/logs/access-attempt` | Public |
| `GET` | `/api/status/me` | Any authenticated user |
| `GET` | `/api/users/me` | Any authenticated user |
| `POST` | `/api/auth/login-success-ip` | Any authenticated user |
| `GET` | `/api/page-gates` | Any authenticated user |
| `GET` | `/api/ojc/overview/stats` | Any authenticated user with app access |
| `POST` | `/api/logs/audit-trail/purge-old` | Super Admin only |

## Permission Reference

### `view_users`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/analytics` | Allowed as an alternative to `export` or `view_campaigns` |
| `GET` | `/api/ojc/users` | List OJC users |
| `GET` | `/api/ojc/users/:profileId` | Get one OJC user profile |
| `GET` | `/api/ojc/organizations` | List organization profiles |
| `GET` | `/api/ojc/organizations/:profileId` | Get one organization profile |

### `view_campaigns`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/campaigns` | List campaigns |
| `GET` | `/api/ojc/campaigns/:id` | Campaign detail |
| `GET` | `/api/ojc/campaign-revision-threads` | Campaign revision queue |
| `GET` | `/api/ojc/campaign-revision-threads/:threadId` | Campaign revision thread detail |
| `GET` | `/api/ojc/analytics` | Allowed as an alternative to `export` |
| `GET` | `/api/ojc/categories` | Allowed as one of several category-read permissions |

### `view_donations`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/donations` | Donation records list |
| `GET` | `/api/ojc/transactions` | Shared payment ledger list |

### `view_reports`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/reports` | List reports |
| `GET` | `/api/ojc/reports/:id` | Report detail |
| `GET` | `/api/ojc/reports/:id/notes` | Internal notes list |
| `PATCH` | `/api/ojc/reports/:id/status` | Also requires one of `approve_reject`, `block_suspend`, or `respond` |
| `POST` | `/api/ojc/reports/:id/action` | Also requires one of `approve_reject`, `block_suspend`, or `respond` |
| `POST` | `/api/ojc/reports/:id/notes` | Also requires one of `approve_reject`, `block_suspend`, or `respond` |

### `view_email`

No dedicated backend endpoints are implemented yet for this permission.

### `view_audit_logs`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/logs` | Shared logs endpoint, allowed by `view_audit_logs` or `view_admin_logs` |

### `approve_reject`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `PATCH` | `/api/ojc/campaigns/:id/status` | Campaign moderation status updates |
| `POST` | `/api/ojc/campaign-revision-threads/:threadId/approve` | Approve a pending revision thread |
| `POST` | `/api/ojc/campaign-revision-threads/:threadId/request-changes` | Request changes on a pending revision thread |
| `POST` | `/api/ojc/campaign-revision-threads/:threadId/reject` | Reject a pending revision thread |
| `GET` | `/api/ojc/categories` | Category list, allowed as one of several category-read permissions |
| `POST` | `/api/ojc/categories` | Category create, allowed by `approve_reject` or `change_settings` |
| `PATCH` | `/api/ojc/categories/:id` | Category update, allowed by `approve_reject` or `change_settings` |
| `DELETE` | `/api/ojc/categories/:id` | Category delete, allowed by `approve_reject` or `change_settings` |
| `PATCH` | `/api/ojc/reports/:id/status` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/action` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/notes` | Also requires `view_reports` |

### `block_suspend`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `PATCH` | `/api/ojc/users/:profileId/status` | Activate or deactivate OJC user |
| `PATCH` | `/api/ojc/users/:profileId/strikes` | Remove one or all strikes |
| `PATCH` | `/api/ojc/reports/:id/status` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/action` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/notes` | Also requires `view_reports` |

### `flag_escalate`

No dedicated backend endpoints are implemented yet for this permission.

### `respond`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `PATCH` | `/api/ojc/reports/:id/status` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/action` | Also requires `view_reports` |
| `POST` | `/api/ojc/reports/:id/notes` | Also requires `view_reports` |

### `view_kyc`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/kyc` | KYC queue list |

### `export`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/analytics` | Analytics data |
| `GET` | `/api/ojc/categories` | Category list, allowed as one of several category-read permissions |

### `view_withdrawals`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/withdrawals` | Withdrawal queue list |

### `process_withdrawals`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `PATCH` | `/api/ojc/withdrawals/:id/status` | Approve or reject withdrawal processing outcome |

### `manage_admins`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `POST` | `/api/cognito` | Create Cognito-backed admin account |
| `GET` | `/api/cognito` | List Cognito-backed admin accounts |
| `GET` | `/api/admins` | Backoffice admin summary list |
| `POST` | `/api/users` | Create backoffice admin user |
| `GET` | `/api/users` | List backoffice admin users |
| `GET` | `/api/users/:id` | Get backoffice admin user |
| `PUT` | `/api/users/:id` | Update backoffice admin user |
| `PATCH` | `/api/users/:id/deactivate` | Deactivate backoffice admin user |
| `POST` | `/api/users/:id/transfer-super-admin` | Transfer super-admin ownership |
| `POST` | `/api/users/:id/reset-password` | Trigger password reset |
| `PATCH` | `/api/users/:id/reactivate` | Reactivate backoffice admin user |
| `DELETE` | `/api/users/inactive/all` | Purge inactive backoffice admin users |
| `DELETE` | `/api/users/:id` | Permanently delete backoffice admin user |
| `GET` | `/api/roles` | Allowed as an alternative to `configure_roles` |
| `GET` | `/api/roles/:id` | Allowed as an alternative to `configure_roles` |
| `GET` | `/api/ojc/admins` | OJC-side admin listing endpoint |

### `view_admin_logs`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/logs` | Shared logs endpoint, allowed by `view_audit_logs` or `view_admin_logs` |
| `GET` | `/api/logs/audit-trail` | Backoffice access audit trail |

### `configure_roles`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/permissions` | Route is protected at router level |
| `GET` | `/api/permissions/inactive` | Route is protected at router level |
| `DELETE` | `/api/permissions/inactive/all` | Route is protected at router level |
| `GET` | `/api/permissions/:id` | Route is protected at router level |
| `POST` | `/api/permissions` | Route is protected at router level |
| `PUT` | `/api/permissions/:id` | Route is protected at router level |
| `PATCH` | `/api/permissions/:id/reactivate` | Route is protected at router level |
| `PATCH` | `/api/permissions/:id/deactivate` | Route is protected at router level |
| `DELETE` | `/api/permissions/:id/permanent` | Route is protected at router level |
| `POST` | `/api/roles` | Create role |
| `GET` | `/api/roles` | Allowed as an alternative to `manage_admins` |
| `GET` | `/api/roles/:id` | Allowed as an alternative to `manage_admins` |
| `POST` | `/api/roles/:id/permissions` | Add permission to role |
| `PUT` | `/api/roles/:id` | Update role |
| `DELETE` | `/api/roles/:id` | Delete role |
| `PATCH` | `/api/roles/:id/deactivate` | Deactivate role |
| `PATCH` | `/api/roles/:id/reactivate` | Reactivate role |
| `DELETE` | `/api/roles/inactive/all` | Purge inactive roles |
| `PUT` | `/api/page-gates/:id` | Update page-gate requirements |

### `change_settings`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/ojc/categories` | Category list, allowed as one of several category-read permissions |
| `POST` | `/api/ojc/categories` | Category create, allowed by `approve_reject` or `change_settings` |
| `PATCH` | `/api/ojc/categories/:id` | Category update, allowed by `approve_reject` or `change_settings` |
| `DELETE` | `/api/ojc/categories/:id` | Category delete, allowed by `approve_reject` or `change_settings` |

## Combined-Requirement Routes

These are the routes where one permission alone is not enough:

| Endpoint | Requirement |
| --- | --- |
| `GET /api/logs` | `view_audit_logs` or `view_admin_logs` |
| `GET /api/ojc/analytics` | `export` or `view_campaigns` or `view_users` |
| `GET /api/ojc/categories` | `view_campaigns` or `approve_reject` or `export` or `change_settings` |
| `POST /api/ojc/categories` | `approve_reject` or `change_settings` |
| `PATCH /api/ojc/categories/:id` | `approve_reject` or `change_settings` |
| `DELETE /api/ojc/categories/:id` | `approve_reject` or `change_settings` |
| `GET /api/roles` | `configure_roles` or `manage_admins` |
| `GET /api/roles/:id` | `configure_roles` or `manage_admins` |
| `PATCH /api/ojc/reports/:id/status` | `view_reports` and one of `approve_reject`, `block_suspend`, or `respond` |
| `POST /api/ojc/reports/:id/action` | `view_reports` and one of `approve_reject`, `block_suspend`, or `respond` |
| `POST /api/ojc/reports/:id/notes` | `view_reports` and one of `approve_reject`, `block_suspend`, or `respond` |

## Maintenance Note

When route guards change in `be/src/api/routes/**`, this file should be updated in the same PR so the RBAC documentation stays accurate.

# Profile Completion Backend Setup

This document describes how to set up the Profile Completion feature backend.

## Prerequisites

1. PostgreSQL database configured and running
2. Environment variables set in `.env` file
3. Node.js dependencies installed (`npm install`)

## Database Setup

Run the SQL schema file to create the required table:

```bash
psql -h <host> -U <user> -d <database> -f src/dataschema/user_profiles.sql
```

Or copy the contents of `src/dataschema/user_profiles.sql` and run in your database client.

### Table Structure

The `user_profiles` table contains:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| account_id | UUID | Unique account identifier (from auth/shared DB) |
| first_name | VARCHAR(100) | User's first name |
| last_name | VARCHAR(100) | User's last name |
| username | VARCHAR(50) | Unique username |
| bio | TEXT | User biography (max 250 chars) |
| country | VARCHAR(10) | Country code |
| city | VARCHAR(100) | City name |
| causes | JSONB | Array of selected causes |
| user_type | VARCHAR(20) | 'donor', 'creator', or 'both' |
| avatar_url | TEXT | URL to avatar image |
| verification_status | VARCHAR(20) | 'pending', 'verified', or 'not_required' |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Repository Implementation

The repository at `src/repos/userProfileRepo.ts` uses PostgreSQL queries via the `pg` client. If you need to tweak behavior, update the queries there.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/completion-data` | Get form configuration data |
| POST | `/api/profile/completion` | Save profile completion |
| GET | `/api/profile/verify` | Check verification status |
| POST | `/api/profile/verify` | Set verification status (dev/admin only) |
| GET | `/api/profile/me` | Get current user's profile |
| GET | `/api/profile/username/check?username=xxx` | Check username availability |
| GET | `/api/profile/username/:username` | Get profile by username |
| GET | `/api/profile/username/:username/stats` | Get profile stats |
| GET | `/api/profile/username/:username/supporters` | Get profile supporters |

## Authentication

The controller expects an `accountId` to be available on the request object. This should come from your authentication middleware (e.g., Cognito JWT verification).

Update `getAccountIdFromRequest()` in `src/controllers/userProfileController.ts` to extract the account ID from your auth token.

## Environment Variables

Ensure these are set in your `.env`:

```env
DB_HOST=your-database-host
DB_PORT=5432
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
PORT=4000
```

## Running the Backend

```bash
cd Backend
npm install
npm start
```

The server will start on port 4000 (or the PORT specified in .env).

## Frontend Configuration

The frontend is configured to connect to `http://localhost:4000/api` by default.

To change the API URL, set the `VITE_API_URL` environment variable in the frontend:

```env
VITE_API_URL=https://your-api-domain.com/api
```

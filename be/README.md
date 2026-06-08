# backoffice-backend

Node.js/TypeScript backend for the Backoffice, organized by layers (API -> Controller -> Service -> Repo -> Infra), with examples of persistence in PostgreSQL and DynamoDB.

## Objective

This repository serves as the backend foundation for backoffice features and also as an architecture reference.
The current routes (`cars`, `fruits`, `status`) are examples of integration with DynamoDB and SQL, so they may change without altering the base structure.

## Main Stack

- Node.js + Express
- TypeScript
- TypeDI (dependency injection)
- PostgreSQL (`pg`)
- AWS DynamoDB (`@aws-sdk/lib-dynamodb`)
- JWT authentication with AWS Cognito (JWKS)
- Swagger (OpenAPI)
- Jest (tests)

## Layered Architecture

Standard request flow:

```text
Route -> Controller -> Service -> Repo -> Database
                          |
                        Domain
                          |
                        Mapper/DTO
```

Responsibilities:

- `routes`: define endpoints, HTTP validation and forwarding.
- `controllers`: adapt HTTP to business rules (input/output, status codes).
- `services`: concentrate business rules and domain validations.
- `repos`: data access isolation (SQL/Dynamo/etc).
- `domain`: entities and domain behaviour (no HTTP dependency).
- `mappers` and `dto`: transformations between domain, persistence and API response.
- `loaders`: app bootstrap (DBs, DI, Express, logger).

## Folder Structure

```text
src/
  api/
    middlewares/       # auth and HTTP middlewares
    routes/            # endpoints
    types/             # type augmentations (Express)
  controllers/         # controller layer
  services/            # service layer
  repos/               # repository layer
  domain/              # domain entities
  mappers/             # Domain <-> Persistence/DTO mapping
  dto/                 # response contracts
  loaders/             # infra and DI initialization
  dataschema/          # SQL schemas
  core/                # base abstractions/utilities
  __tests__/           # tests
  app.ts               # entrypoint
  swagger.ts           # OpenAPI config
```

## Routes (overview)

- Main API prefix: `/api`.
- Current routes are in `src/api/routes` and are examples by domain (`cars`, `fruits`, `status`).
- Health checks also exist outside the prefix (`/status`) for operations.
- Swagger UI available at:
  - `/api-docs`
  - `/api/docs`

The key idea is: maintain the layer pattern regardless of the resource or data technology used.

## JWT and Authentication (Cognito)

Main middleware: `src/api/middlewares/cognitoAuth.ts`.

Behaviour:

1. Reads `Bearer <jwt>` token from the `Authorization` header.
2. Builds the Cognito `issuer` using `COGNITO_REGION` + `COGNITO_USER_POOL_ID`.
3. Fetches public key from JWKS (`/.well-known/jwks.json`).
4. Validates JWT signature with `RS256` algorithm.
5. Validates important claims:
   - `token_use` must be `access`
   - `client_id` must match `COGNITO_CLIENT_ID`
   - `sub` (Cognito user ID)
   - `accountId` (custom claim used by the app)
6. If valid, injects context into `req.auth`.

Notes:

- If the token or any required claim is missing, returns `401`.
- A legacy middleware exists (`isAuth.ts`, HS256). The recommended flow in the current state is Cognito JWKS (`requireCognitoAuth`).

## Environment Variables

Variables are loaded in `config.js`.

### Base app/log

- `PORT` (default: `4002`)
- `NODE_ENV` (`development`, `test`, `production`)
- `LOG_LEVEL` (default: `info`)

### AWS general

- `AWS_REGION` (default: `eu-west-1`)
- `AWS_ACCESS_KEY_ID` (optional if using IAM role)
- `AWS_SECRET_ACCESS_KEY` (optional if using IAM role)
- `AWS_SESSION_TOKEN` (optional)

### DynamoDB

- `DYNAMO_CARS_TABLE` (default: `cars`)

### S3 (when used)

- `S3_BUCKET_NAME`
- `S3_PUBLIC_BASE_URL`
- `S3_UPLOAD_EXPIRY_SECONDS` (default: `900`)

### Microsoft Graph mail (admin inbox + support sender)

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_USER_EMAIL` (mailbox used to read/send support emails)
- `MICROSOFT_GRAPH_SCOPE` (default: `https://graph.microsoft.com/.default`)
- `MICROSOFT_INBOX_MAX_SCAN` (default: `250`)

### Main PostgreSQL

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### Shared PostgreSQL (optional in current state)

- `DB_HOST_SHARED`
- `DB_PORT_SHARED`
- `DB_USER_SHARED`
- `DB_PASSWORD_SHARED`
- `DB_NAME_SHARED`

### Cognito/JWT

- `COGNITO_REGION` (fallback to `AWS_REGION`)
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

Best practices:

- Use `.env` only locally.
- Do not commit secrets.
- In production, prefer secret manager + IAM role.

## How to Run Locally

1. Install dependencies:

```bash
npm install
```

2. Configure `.env` with the variables above.

3. Start the backend:

```bash
npm run start
```

4. Validate:

- API: `http://localhost:4002/api`
- Swagger: `http://localhost:4002/api-docs`

## Useful Scripts

- `npm run build` - compiles TypeScript
- `npm start` - start with nodemon
- `npm run test` - tests
- `npm run test:coverage` - coverage
- `npm run lint` - lint

## How to Extend Following the Pattern

To add a new module (e.g. `orders`), follow this order:

1. Create entity in `domain`.
2. Define repository interface in `repos/IRepos`.
3. Implement repository (SQL, Dynamo, etc) in `repos`.
4. Define interface and implement service in `services`.
5. Create controller in `controllers`.
6. Create route in `api/routes`.
7. Register controller/service/repo in `src/loaders/index.ts` (DI).
8. Add Swagger schema to the route.

This way, changing storage (SQL <-> Dynamo, for example) is localised to the repository and does not break the other layers.
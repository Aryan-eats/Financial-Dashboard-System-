# Finance Dashboard Backend API

A role-based backend for managing users, financial records, and dashboard analytics, built with Express 5, TypeScript, Prisma 7, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express 5 |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Authentication | JWT (`jsonwebtoken`) and bcrypt |
| Validation | Zod |
| Testing | Vitest and Supertest |
| Containerization | Docker Compose |

## Project Structure

```text
prisma/
  migrations/         Database migrations
  schema.prisma       Prisma schema
  seed.ts             Seed runner
  seed-data.ts        Demo users and financial records
src/
  config/
    env.ts            Zod-validated environment variables
    prisma.ts         Prisma client singleton
  middleware/
    authenticate.ts   JWT verification and active-user check
    authorize.ts      Role-based access guard
    errorHandler.ts   Global error handler
    requestLogger.ts  Request logging
    validate.ts       Zod validation middleware
  modules/
    auth/             Register and login
    dashboard/        Summary, category breakdown, trends, recent activity
    records/          CRUD, filtering, sorting, soft delete
    users/            Profile, user list, role and status management
  types/
    common.ts         Shared types
    express.d.ts      Express Request augmentation
  utils/
    AppError.ts       Custom error class
    apiResponse.ts    Success response helper
    jwt.ts            Token helpers
    password.ts       Password hashing helpers
  app.ts              Express app factory
  server.ts           Entry point
tests/                Unit and route tests
docker-compose.yml    PostgreSQL container
prisma.config.ts      Prisma 7 config
tsconfig.json
package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- Docker Desktop or Docker Engine

### Installation

1. Install dependencies:

```powershell
npm install
```

2. Create the environment file:

```powershell
Copy-Item .env.example .env
```

Unix equivalent:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```powershell
docker compose up -d
```

4. Generate the Prisma client:

```powershell
npm run db:generate
```

5. Run the database migration:

```powershell
npx prisma migrate dev
```

6. Seed demo data:

```powershell
npm run db:seed
```

7. Start the development server:

```powershell
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/finance_dash` |
| `JWT_SECRET` | Secret used to sign JWTs | `change-me` |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Runtime environment | `development` |

## Demo Credentials

The seed script creates one user for each role:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@demo.com` | `Admin@123` |
| ANALYST | `analyst@demo.com` | `Analyst@123` |
| VIEWER | `viewer@demo.com` | `Viewer@123` |

## API Endpoints

All endpoints except Auth and Health require a Bearer token in the `Authorization` header.

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login and receive a JWT | No |

### Users

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/users/me` | Get current user profile | Any authenticated user |
| `GET` | `/api/users` | List users with pagination and filters | ADMIN |
| `PATCH` | `/api/users/:id/role` | Update a user's role | ADMIN |
| `PATCH` | `/api/users/:id/status` | Activate or deactivate a user | ADMIN |

### Records

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/records` | List records with filters, sorting, and pagination | ANALYST, ADMIN |
| `GET` | `/api/records/:id` | Get a single record by ID | ANALYST, ADMIN |
| `POST` | `/api/records` | Create a financial record | ADMIN |
| `PATCH` | `/api/records/:id` | Update a record | ADMIN |
| `DELETE` | `/api/records/:id` | Soft-delete a record | ADMIN |

`GET /api/records` query parameters:

- `page`
- `limit`
- `type`
- `category`
- `startDate`
- `endDate`
- `sortBy` as `date`, `amount`, or `createdAt`
- `sortOrder` as `asc` or `desc`

### Dashboard

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Total income, expenses, net balance, and record count | VIEWER, ANALYST, ADMIN |
| `GET` | `/api/dashboard/category-breakdown` | Totals grouped by category and type | VIEWER, ANALYST, ADMIN |
| `GET` | `/api/dashboard/trends` | Monthly income and expense trends | VIEWER, ANALYST, ADMIN |
| `GET` | `/api/dashboard/recent` | Most recent activity | VIEWER, ANALYST, ADMIN |

Dashboard query parameters:

- `startDate`
- `endDate`

Additional `/api/dashboard/recent` query parameter:

- `limit` from `1` to `20`, default `5`

### Health

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Health check | No |

## Role Permissions

| Capability | VIEWER | ANALYST | ADMIN |
|---|:---:|:---:|:---:|
| View own profile | Yes | Yes | Yes |
| View dashboard analytics | Yes | Yes | Yes |
| Read financial records | No | Yes | Yes |
| Create, update, delete records | No | No | Yes |
| List users | No | No | Yes |
| Change user role or status | No | No | Yes |

- Analysts can read records but cannot create, update, or delete them.
- Inactive users are blocked by the authentication middleware.

## Design Decisions

1. Modular architecture keeps auth, users, records, and dashboard logic isolated and testable.
2. UUID primary keys avoid predictable identifiers.
3. Financial amounts use `Decimal(12,2)` to avoid float precision issues.
4. Records use soft delete through `deletedAt` so deleted data can be retained for audit purposes.
5. `UserStatus` is separate from `Role`, which allows disabling accounts without removing authorization state.
6. Environment variables are validated at startup with Zod.
7. Authentication middleware is dependency-injected for unit testing.
8. A central error handler maps validation, Prisma, JSON parsing, and unexpected errors into consistent responses.
9. Prisma 7 uses the PostgreSQL driver adapter pattern through `@prisma/adapter-pg`.
10. Database indexes are aligned with common record-listing and aggregation queries.

## Assumptions

1. The system operates in a single currency.
2. Record categories are fixed enums and require a migration to extend.
3. Authentication uses one JWT and does not implement refresh tokens.
4. Soft-deleted records cannot currently be restored.
5. Trends are grouped monthly.
6. Self-registered users start as `VIEWER`.
7. Passwords must be at least 8 characters and contain one uppercase letter and one digit.
8. Rate limiting is not implemented in this project.

## Running Tests

Run all tests:

```powershell
npm test
```

Run a specific test file:

```powershell
npx vitest tests/middleware/authenticate.test.ts
```

Run coverage:

```powershell
npx vitest run --coverage
```

# Multi-Shop Sales, Inventory & Bill Verification

A starter implementation of the multi-shop sales, inventory, bill verification and accountability platform.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL
- Auth: JWT + Argon2id
- Sessions/rate limits: in-memory
- Bill photos: backend-only object storage (S3-compatible)
- UI: Tailwind CSS
- API: REST

## Structure

```text
backend/   NestJS + Prisma API
frontend/  React + Vite SPA
```

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173`.

Set `DATABASE_URL` to a PostgreSQL database. The Docker Compose file can provide PostgreSQL:

```bash
docker compose up -d postgres
```

## Important

This repository is a functional foundation/MVP, not a production deployment. Before production use, add production object storage, HTTPS, backups, hardened token transport, comprehensive tests, and operational monitoring.

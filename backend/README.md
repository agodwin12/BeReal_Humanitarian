# Be Real Humanitarian Works — Backend

Express MVC API, plain JavaScript. Companion to `../doc/Be Real Humanitarian Works - Website Specification (EN).docx` and `../doc/project-structure.md`.

## Structure

```
config/        env + database connection
models/        Sequelize models (one file per table, registered in models/index.js)
controllers/   request handlers, incl. controllers/forms/ for the 5 public forms
routes/        Express routers, mounted under /api in routes/index.js
middlewares/   auth (JWT), rate limiting, upload, validation, error handling
services/      email (Resend), media storage (Cloudflare R2), Turnstile anti-spam
validators/    express-validator rule sets
utils/         small shared helpers (api response shape, async handler)
uploads/       local scratch space before a file is pushed to R2 (gitignored)
```

Every file currently holds a one-line comment describing what goes there — no logic yet, by design. Nothing is implemented until we sit down and write it together.

## Before coding

1. Copy `.env.example` to `.env` and fill in local values (PostgreSQL credentials at minimum).
2. Create the local PostgreSQL database named in `DB_NAME`.
3. `npm run dev` once there is something in `server.js` to run.

## Dependencies already installed

express, sequelize, pg, pg-hstore, dotenv, cors, helmet, morgan, express-rate-limit, jsonwebtoken, bcryptjs, multer, @aws-sdk/client-s3, express-validator, nodemailer, cookie-parser, compression — dev: nodemon.

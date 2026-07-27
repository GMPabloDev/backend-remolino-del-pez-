## Project
Backend para Reservas de restaurantes y sucursales.

## Stack

- Runtime: Bun
- Framework: Hono v4
- Validation: Zod v4 + @hono/standard-validator
- ORM: Prisma Client (PostgreSQL)

**Responde siempre en español.**

## Commands

```sh
bun install
bun run dev
bun --bun run prisma generate
bun --bun run prisma migrate dev
bun --bun run prisma db push
```
## Architecture

- Use a feature-first modular architecture.
- Each feature lives inside `src/modules`.
- Shared code belongs in `src/shared`.
- Hono routers act as controllers. Never create a `controllers` folder.
- Routers only validate requests, invoke use cases and return responses.
- Business logic belongs exclusively inside use cases.
- Repositories are the only layer allowed to access the database (via Prisma Client).
- Validate every request using Zod and @hono/standard-validator.
- Prisma schema: `prisma/schema.prisma` — output to `src/generated/prisma`.

## Module Structure

```text
shared/
modules/
  <feature>/
    router.ts
    use-cases/
    repositories/
    services/
    schemas/
    exceptions/
    middleware/
    dto/
    mapper/
```

## Naming

Use one folder per use case.

```text
login/
    login.use-case.ts
    login.use-case.impl.ts
    login.types.ts # only if necessary
```

Services also separate contracts from implementations.

```text
token.service.ts
jwt-token.service.ts

email.service.ts
resend-email.service.ts
nodemailer-email.service.ts

password.service.ts
bun-password.service.ts
bcrypt-password.service.ts
```

## Dependency Injection

- Always depend on interfaces.
- Never inject concrete implementations.
- Instantiate implementations only in the composition root.
- Use constructor dependency injection.

## Classes

Use classes for:

- use cases
- repositories
- services

This keeps dependencies explicit and makes implementations replaceable.

## Exceptions

- One exception per file.
- Domain exceptions stay inside their module.
- Shared exceptions belong in `shared/errors`.

## Rules

- Avoid `any`.
- Prefer interfaces for contracts.
- Keep modules independent.
- Do not add new architectural layers.
- Do not generate tests. No testing framework exists yet.
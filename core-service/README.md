# Core Service

Spring Boot REST API for the meal planning application. It provides endpoints for authentication, recipes, meal plans, and grocery lists, backed by MySQL and Spring Data JPA.

> This is a separate, JWT-based backend retained in the workspace. The standard MOWM startup flow uses `sb-user-auth-service` for authentication and `node-meal-plan-service` for meal plans. `core-service` also defaults to port `2222`, so do not run both auth backends on that port at the same time.

## Requirements

- Java 25
- MySQL

## Run locally

Set the database environment variables if the defaults in `application.properties` do not match your local MySQL setup, then run:

```powershell
./mvnw.cmd spring-boot:run
```

The server listens on port `2222` by default. OpenAPI documentation is available at `/swagger-ui.html`, with the specification at `/v3/api-docs`.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `DB_URL` | JDBC connection URL | `jdbc:mysql://localhost:3306/mowm_db?createDatabaseIfNotExist=true&serverTimezone=UTC` |
| `DB_USERNAME` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `root@user1` |
| `JWT_SECRET` | Signing secret for authentication tokens | Development fallback; set a strong secret outside local development |

Do not use development fallback credentials or the fallback JWT secret in a deployed environment.

## Project layout

- `src/main/java/com/capstone/core_service/controller/` — REST endpoints
- `src/main/java/com/capstone/core_service/service/` — application workflows
- `src/main/java/com/capstone/core_service/repository/` — persistence queries
- `src/main/java/com/capstone/core_service/model/` — JPA entities
- `src/test/` — tests
- `docs/architecture.md` — architecture and ownership conventions
- `AGENTS.md` — guidance for contributors and coding agents

The frontend and deployment infrastructure are maintained separately. Keep service changes scoped to this repository and update the architecture documentation when its boundaries or behavior change.

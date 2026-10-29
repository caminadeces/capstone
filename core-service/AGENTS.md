# Project guidance

## Scope and structure

This repository is the Spring Boot backend for the meal planning application. Keep changes focused on this service; the frontend and deployment infrastructure live elsewhere.

- `src/main/java/com/capstone/core_service/controller/` — HTTP endpoints, request validation, and response mapping.
- `src/main/java/com/capstone/core_service/service/` — application workflows and transaction boundaries.
- `src/main/java/com/capstone/core_service/repository/` — Spring Data persistence queries.
- `src/main/java/com/capstone/core_service/model/` — JPA entities and their domain updates.
- `src/main/java/com/capstone/core_service/config/` and `security/` — application and authentication setup.
- `src/main/resources/` — runtime configuration.
- `src/test/` — tests; keep them in the matching Java package and near the behavior they cover.
- `docs/` — architecture and maintained project knowledge.

## Change conventions

- Preserve the `com.capstone.core_service` package name used by the source tree.
- Put request validation at the HTTP boundary. Put multi-step workflows, ownership checks, and transaction behavior in services when the feature has service-layer logic.
- Scope user-owned reads and writes by the authenticated user's ID. Do not trust an owner ID supplied in a request body.
- Keep persistence queries in repositories and entity invariants in the model. Avoid returning JPA entities directly from HTTP endpoints; map to response records.
- Use constructor injection and explicit transaction annotations for service workflows.
- Keep configuration secrets and environment-specific values external; do not commit credentials.
- Make the smallest coherent change for the requested task. Update documentation when behavior, setup, or architecture changes.

## Task workflow

1. Identify one task and its acceptance criteria; inspect the relevant source and existing docs first.
2. Implement a scoped change that follows nearby conventions.
3. Review the diff for unintended changes and report what was changed and any remaining limitations.

Do not run tests or other verification commands unless the user asks for verification. When asked, use the Maven wrapper and state the command and result.

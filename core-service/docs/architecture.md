# Architecture

## Service boundary

`core-service` is a Java 25 / Spring Boot application that exposes a REST API for recipes, meal plans, grocery lists, and authentication. It uses Spring MVC, Spring Security, Spring Data JPA, and MySQL. The frontend and deployment infrastructure are maintained outside this repository.

This is a separate JWT-based backend retained in the workspace, not one of the four services in the standard MOWM startup flow. The standard frontend uses `sb-user-auth-service` for account sessions and `node-meal-plan-service` for meal plans. Both Spring services default to port `2222`; run only one of them on that port at a time.

## Request and persistence flow

HTTP controllers under `com.capstone.core_service.controller` define routes, validate request records, obtain the authenticated principal, and map results to response records. Application services coordinate workflows and transactions. Spring Data repositories encapsulate persistence queries. JPA entities in `model` represent persisted domain data and own local update behavior. `config` and `security` contain application and authentication setup.

The current code is not fully uniform: recipe operations are implemented in `RecipeController`, while meal-plan operations use `MealPlanService`. Follow the closest established pattern for a focused change; for new workflows involving multiple steps or transaction-sensitive behavior, use a service.

## Ownership and API behavior

Authenticated user IDs are obtained from Spring Security's `Authentication` principal. User-owned data access must include that owner ID in repository queries so a caller cannot read or modify another user's records by changing a resource ID. Controllers use validated request records and response views rather than exposing entities as the API contract.

## Configuration and operations

Runtime settings are in `src/main/resources/application.properties` and support environment overrides for the JWT secret and database connection. Local fallback values are for development only. Hibernate schema management currently uses `ddl-auto=update`; assess migration needs before changing deployment or persistence behavior. OpenAPI endpoints are configured at `/v3/api-docs` and `/swagger-ui.html`; the application port defaults to `2222`.

## Source map

| Area | Location | Responsibility |
|---|---|---|
| HTTP API | `src/main/java/com/capstone/core_service/controller/` | Routes, input validation, response mapping |
| Workflows | `src/main/java/com/capstone/core_service/service/` | Application logic and transactions |
| Persistence | `src/main/java/com/capstone/core_service/repository/` | Data access queries |
| Domain model | `src/main/java/com/capstone/core_service/model/` | JPA entities and domain updates |
| Security/config | `src/main/java/com/capstone/core_service/security/`, `config/` | Authentication and framework setup |
| Runtime config | `src/main/resources/` | Environment-backed application settings |
| Tests | `src/test/` | Automated checks organized by Java package |

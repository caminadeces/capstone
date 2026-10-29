# MOWM User Authentication Service

Spring Boot API for account registration, login, session checks, logout, and password changes. It stores users in MySQL and hashes passwords with BCrypt. The service listens on port `2222` by default.

## Run locally

Configure MySQL and the environment variables, then run from this directory:

```powershell
.\mvnw.cmd spring-boot:run
```

Required local settings are `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `CORS_ALLOWED_ORIGIN`. The default CORS origin is `http://localhost:5173`. Credentialed requests are allowed only from the configured exact origin. Sessions and HttpOnly cookies last up to 30 days.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Creates an account; it does not sign the user in. Returns `201`. |
| `POST` | `/api/auth/login` | Verifies credentials and starts a browser session. |
| `GET` | `/api/auth/session` | Returns the current user's public details, or `401` without a valid session. |
| `PUT` | `/api/auth/password` | Changes the signed-in user's password after checking the current password. Returns `204`. |
| `POST` | `/api/auth/logout` | Invalidates the current session. Returns `204`. |

Registration requires a name (up to 100 characters), a valid email, and a password from 8 to 72 characters. Password changes require `currentPassword` and a `newPassword` from 8 to 72 characters. After registering, users must log in.

OpenAPI documentation is available at <http://localhost:2222/swagger-ui/index.html> when the service is running.

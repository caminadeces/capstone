# MOWM — Mom's Organized Weekly Meals

This workspace contains the MOWM meal-planning client and its backend services. The React app is the main interface; it connects to the Python chef chat, the Node meal-plan/PDF API, and the Spring Boot account API.

For the full architecture, data model, API reference, configuration, and operational notes, see [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md).

## Services at a glance

| Folder | Service | Responsibility | Local address |
| --- | --- | --- | --- |
| `react-mowm-ui` | React + Vite client | Login and registration screens, weekly calendar, meal details, grocery list, and Ask your Chef interface. | `http://localhost:5173` |
| `py-ai-chat` | Python + Flask chef chat | Guided weekly planning, seven-day fridge-based plans, MongoDB chat history, and PDF export requests. | `http://127.0.0.1:5000` |
| `node-meal-plan-service` | Node.js meal-plan and PDF API | DynamoDB meal plans and PDF archive; S3 PDFs and recipe images. | `http://127.0.0.1:4102` |
| `sb-user-auth-service` | Spring Boot user-auth API | MySQL-backed accounts, browser sessions, and BCrypt-hashed passwords. | `http://localhost:2222` |

`core-service` is a separate JWT-based backend retained in the workspace. It is not part of this four-service startup flow and also defaults to port `2222`; see its own documentation before running it.

## Current features

- First-time visitors see the login screen. Registration creates an account and returns the user to login; only login starts an HttpOnly session, which can last up to 30 days. Logging out invalidates it.
- Ask your Chef offers a guided weekly planner and a seven-day fridge-ingredient plan with breakfast, lunch, and dinner each day, household size, diet, and allergy fields.
- Saved plans appear in My Week and Grocery List. Grocery search filters ingredients, and its clear button restores the full list. Meal plan PDFs appear in the PDF archive and use temporary S3 download links.
- Users can change their password from the profile area by providing their current password and confirming a new password.
- The interface uses a cooking-mom logo and the tagline “MOWM, ano ulam?”

### Data ownership

- **MySQL (`mowm_db`)** stores account records for `sb-user-auth-service`.
- **MongoDB (`mowm`)** stores Python chat conversations. Meal plans are no longer stored there.
- **DynamoDB (`mowm-meal-plans`)** stores the canonical weekly meal plans used by the calendar and plan PDF renderer.
- **Amazon S3** stores generated PDFs and recipe images. Downloads use presigned URLs that expire according to `PRESIGNED_URL_TTL`.

The client sends an account-derived `ownerId` to the meal-plan service. The Node API does not validate this value against the auth session, so it is an application-level partition key, not a server-enforced authorization boundary. The browser keeps separate chat conversation IDs per owner ID, but the Flask service stores conversations under the shared `guest` owner and does not authenticate those IDs; this is not server-enforced per-account isolation.

## Start the workspace locally

Run each service in its own terminal. Start MongoDB, MySQL, and configure AWS access before starting the applications that depend on them.

### 1. Meal-plan and PDF service

Requirements: Node.js and an AWS identity with access to the configured DynamoDB table and S3 bucket. The AWS SDK reads credentials from the standard AWS credential chain or environment variables.

```powershell
cd node-meal-plan-service
npm install
```

Copy `.env.example` to `.env` if needed. Set `AWS_REGION`, `DYNAMODB_TABLE`, and `S3_BUCKET`; keep credentials private. The defaults use the `mowm-meal-plans` table in `us-east-1`. Set `S3_BUCKET` to a private bucket you own; this service stores generated PDFs under the `meal-plan-pdfs/` prefix.

Create the DynamoDB table once, then run the API:

```powershell
npm run setup:dynamodb
npm run dev
```

The table uses `id` as its partition key and an `ownerId-weekStart-index` global secondary index. The setup command uses on-demand billing. Initial setup requires `dynamodb:CreateTable` and `dynamodb:DescribeTable`; runtime access requires `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, and `dynamodb:Query` on the table and index. S3 runtime access requires `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on both the configured PDF prefix and `recipe-images/*`. Keep S3 Block Public Access enabled; the app uses presigned URLs and does not need a public bucket policy.

To migrate pre-existing MongoDB meal plans, configure `LEGACY_MONGODB_URI`, `LEGACY_MONGO_DB_NAME`, and `LEGACY_MONGO_COLLECTION`, create the table, then run `npm run migrate:mongodb`. The script copies records and does not remove the MongoDB source. Do not run it unless you need to migrate those plans.

### 2. Python chef chat

Requirements: Python, a running MongoDB instance, and an OpenAI API key.

```powershell
cd py-ai-chat
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The example config points chat history to MongoDB database `mowm` and the meal-plan API to `http://127.0.0.1:4102`.

```powershell
python app.py
```

Open <http://127.0.0.1:5000>. The welcome screen offers the guided weekly meal planner and a fridge flow that requests seven days of breakfast, lunch, and dinner based on ingredients on hand. Chat calls the OpenAI API and persists conversation turns in MongoDB. PDF exports are forwarded to the Node service, which stores PDFs in S3 and returns a temporary download URL.

### 3. User-auth service

Requirements: Java 25 and a running MySQL server. The default JDBC URL creates/uses database `mowm_db`; override it with `DB_URL` if needed. Configure `DB_USERNAME`, `DB_PASSWORD`, and `CORS_ALLOWED_ORIGIN` for your local setup. This property controls the exact browser origin and allows credentialed session requests.

```powershell
cd sb-user-auth-service
.\mvnw.cmd spring-boot:run
```

The API listens on port `2222` by default and supports browser sessions. Endpoints:

- `POST /api/auth/register` with `{ "name", "email", "password" }` creates an account but does not sign the user in.
- `POST /api/auth/login` with `{ "email", "password" }` verifies credentials and starts a session.
- `GET /api/auth/session` checks the active session.
- `POST /api/auth/logout` invalidates the active session.
- `PUT /api/auth/password` with `{ "currentPassword", "newPassword" }` changes the signed-in user's password.

Registration requires a valid email, a name up to 100 characters, and a password from 8 to 72 characters. After registering, users must log in. Login establishes an HttpOnly session cookie configured for up to 30 days. Password changes require the current password and a new password from 8 to 72 characters. The client sends cross-origin requests with credentials; configure CORS for the exact browser origin.

### 4. React client

Requirements: Node.js.

```powershell
cd react-mowm-ui
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and configure the service origins:

```env
VITE_AUTH_API_URL=http://localhost:2222
VITE_MEAL_API_URL=http://localhost:5000
VITE_MEAL_PLAN_API_URL=http://127.0.0.1:4102
```

Restart Vite after changing environment values. Open <http://localhost:5173>. The client verifies the auth session on load before showing the signed-in app. Its account-derived owner ID is sent to the meal-plan API, which currently does not independently verify the auth cookie.

## Service connections

```text
Browser (React/Vite :5173)
  ├── account registration/login ──> Spring Boot (:2222) ──> MySQL (mowm_db)
  ├── chef chat ────────────────────> Flask (:5000) ────────> OpenAI API
  │                                    ├── chat history ───> MongoDB (mowm)
  │                                    └── PDF export ─────> Node API (:4102)
  └── calendar and print ──────────> Node API (:4102) ─────> DynamoDB + S3
```

The Node API exposes `GET /health`; meal-plan CRUD at `GET/POST /api/meal-plans`, `GET/PUT/DELETE /api/meal-plans/:id`; `POST /api/meal-plans/:id/pdf` and `POST /api/meal-plans/save-and-export` for saved plans; `POST /api/pdfs` for a chat response; and PDF archive list/delete routes. New saved-plan PDF archive records link to their plan. Deleting one removes the PDF, linked DynamoDB plan record, associated recipe images, and the selected archive entry. Older PDFs without a plan link only remove their PDF and archive entry. See `node-meal-plan-service/examples/meal-plan.json` for a weekly plan payload.

The UI, Flask API, and auth API use local CORS defaults for the Vite origin `http://localhost:5173`. If you change ports or host the apps separately, update `CORS_ALLOWED_ORIGIN` in `py-ai-chat/.env` and `sb-user-auth-service`, plus `CORS_ALLOWED_ORIGINS` in the Node service.

## Useful checks

- Node API: open <http://127.0.0.1:4102/health>.
- Flask app: open <http://127.0.0.1:5000>.
- Spring API documentation: open <http://localhost:2222/swagger-ui/index.html>.
- Vite client: open <http://localhost:5173>.

Keep `.env`, `.env.local`, AWS keys, and OpenAI keys private. Use the `.env.example` files as templates, and never commit live credentials.

# MOWM Technical Documentation

## 1. Purpose and scope

MOWM (Mom's Organized Weekly Meals) is a meal-planning application for creating weekly plans, getting AI meal suggestions from ingredients on hand, organizing grocery lists, and exporting plans or chef responses as PDFs.

This document describes the current implementation in the workspace. It covers the React client, Spring Boot authentication API, Flask AI service, Node meal-plan/PDF API, and the backing data stores.

## 2. System architecture

~~~mermaid
flowchart LR
    Browser[React + Vite<br/>localhost:5173]
    Auth[Spring Boot Auth API<br/>localhost:2222]
    Flask[Flask Chef Chat<br/>localhost:5000]
    Node[Node Meal Plan API<br/>localhost:4102]
    OpenAI[OpenAI API]
    MySQL[(MySQL<br/>mowm_db)]
    Mongo[(MongoDB<br/>mowm)]
    Dynamo[(DynamoDB<br/>mowm-meal-plans)]
    S3[(Private S3 bucket)]

    Browser -->|login, session, logout| Auth
    Auth --> MySQL
    Browser -->|embedded chat and ownerId| Flask
    Flask -->|responses and image generation| OpenAI
    Flask --> Mongo
    Flask -->|plan/PDF/image operations| Node
    Browser -->|plans, grocery data, PDF archive| Node
    Node --> Dynamo
    Node --> S3
~~~

### Component responsibilities

| Component | Responsibility |
| --- | --- |
| react-mowm-ui | React/Vite user interface, login/session check, weekly calendar, recipe detail modal, grocery list, PDF archive, embedded chef chat. |
| sb-user-auth-service | Registration, password verification, and browser session endpoints. |
| py-ai-chat | Flask chat UI/API, guided meal planning, seven-day fridge-based plans, OpenAI Responses API requests, chat-history persistence, recipe-image generation, PDF-export forwarding. |
| node-meal-plan-service | Canonical plan CRUD, PDF rendering, PDF archive records, recipe-image upload, and S3 access. |
| MySQL | User account records. |
| MongoDB | Chef conversation records. |
| DynamoDB | Meal plan documents and PDF archive records. |
| Amazon S3 | Private PDF and generated recipe-image objects. |

## 3. Application flows

### Authentication

1. The React client starts with the login screen visible.
2. It calls GET /api/auth/session at the configured auth-service origin, including browser credentials.
3. If the session is valid, the API returns public user details and the client opens the signed-in app. If not, the login screen remains.
4. POST /api/auth/register creates the account but does not sign the user in; it invalidates any existing session. The client returns to the login screen.
5. POST /api/auth/login verifies the credentials and places the user ID in the server-side HttpSession.
6. The browser receives an HttpOnly session cookie. The current service config sets a 30-day cookie/session lifetime.
7. PUT /api/auth/password verifies the current password before replacing its BCrypt hash. POST /api/auth/logout invalidates the session.

The auth API currently does not issue a JWT or bearer token. The client does not place a session token in the URL.

### Weekly planning and ingredient suggestions

1. In Ask your Chef, the user chooses the guided weekly planner or the fridge-ingredient flow.
2. The guided form captures household size, cuisine, diet, included ingredients, and allergies. The fridge flow captures ingredients, household size, diet preference, and allergies/avoidances, then requests breakfast, lunch, and dinner for seven days.
3. The browser sends the request and recent conversation history to POST /api/chat on py-ai-chat.
4. Flask sends the prompt and recent turns to the OpenAI Responses API. Completed conversation turns are saved in MongoDB.
5. For a structured weekly plan, Flask may generate an image for each unique recipe and upload the JPEG to the Node service. The image object key is stored with the meal when the plan is saved.

The grocery view consolidates measured ingredient quantities, filters by ingredient name, and uses unique row IDs so duplicate names remain independently checkable. Its clear-search button empties the query and restores all ingredients.

### Plan persistence and PDF export

1. The browser loads plans from GET /api/meal-plans using ownerId and optional weekStart.
2. Flask can call POST /api/meal-plans/save-and-export to save a plan and generate its PDF, or POST /api/meal-plans/:id/pdf for a saved plan.
3. The Node service stores plan and PDF archive records in DynamoDB, renders the PDF, then uploads it to S3.
4. The API returns a temporary presigned download URL. The browser uses that URL to open the PDF.
5. The PDF archive loads through GET /api/pdf-archive.

### PDF archive deletion

For new saved-plan PDFs, the archive record contains mealPlanId. DELETE /api/pdf-archive/:id?ownerId=... verifies the archive record and plan association, deletes the PDF and plan recipe-image objects from S3, then deletes the linked plan and selected archive record from DynamoDB. The S3 delete operations are safe to retry; DynamoDB records are retained if S3 cleanup fails.

Older PDF archive records may not contain mealPlanId. Deleting those removes only the PDF object and its archive record. Chef-response PDFs that do not represent a saved weekly plan likewise have no linked plan images to cascade.

## 4. Data model and ownership

### MySQL

The auth service stores user records in the mowm_db database. Account emails are normalized for lookup, and passwords are stored as BCrypt hashes rather than plaintext. Current auth responses contain public user fields and a message.

### MongoDB

The Flask service stores conversation documents in the mowm database and chat_conversations collection by default. The browser stores a conversationId in local storage using a key that includes the current owner ID, so a newly created account starts without the previous browser conversation.

The Flask service currently writes and loads conversations with ownerId=guest and does not validate conversation IDs against the auth session. Browser-side key namespacing improves separation in the client but does not provide server-enforced account isolation.

### DynamoDB

The default table name is mowm-meal-plans. Its partition key is id. The ownerId-weekStart-index global secondary index uses ownerId as the partition key and weekStart as the sort key.

Weekly plan items contain:

- id, ownerId, title, and weekStart.
- Seven days with breakfast, lunch, and dinner entries.
- Meal names, optional descriptions and prep times, ingredient lists, instructions, and optional imageKey values.
- groceryList, assistantResponse, source, createdAt, updatedAt, and version.

PDF archive items use recordType=pdf and contain an id, ownerId, weekStart, title, pdfKey, pdfFilename, and pdfCreatedAt. New saved-plan PDF items also contain mealPlanId.

### Amazon S3

The configured S3_BUCKET stores PDFs under S3_PREFIX, which defaults to meal-plan-pdfs. Generated JPEG images use recipe-images/<uuid>.jpg. Objects use server-side AES256 encryption in the current implementation. The bucket should remain private; the application creates temporary presigned URLs for downloads.

### Owner ID limitation

The client derives ownerId from the authenticated user's database ID or email and sends it to the meal-plan API. The Node service currently uses that value for queries but does not verify the auth session or independently authenticate the caller. Therefore ownerId is a data partition key, not a security boundary. The API should not be exposed as secure multi-tenant storage until authorization is enforced server-side.

## 5. HTTP API reference

### Authentication service — port 2222

| Method | Path | Behavior |
| --- | --- | --- |
| POST | /api/auth/register | Create an account without starting a session; returns 201. |
| POST | /api/auth/login | Verify credentials and begin a browser session. |
| GET | /api/auth/session | Return the current user when the session is valid; otherwise return 401. |
| PUT | /api/auth/password | Change the signed-in user's password after verifying the current password; returns 204. |
| POST | /api/auth/logout | Invalidate the current session; returns 204. |

Registration payload: name, email, password. Login payload: email, password. Password-change payload: currentPassword, newPassword. Registration requires a valid email, a name up to 100 characters, and a password from 8 to 72 characters. A new password must also be 8 to 72 characters.

### Chef chat service — port 5000

| Method | Path | Behavior |
| --- | --- | --- |
| GET | / | Serve the chat and meal-planning interface. |
| POST | /api/chat | Generate an assistant response; accepts message, history, and optional conversationId. |
| GET | /api/conversations/:conversationId | Load saved conversation turns. |
| POST | /api/export-pdf | Forward a plan or response PDF export to the Node service. |

The Flask app applies per-IP request limits configured by CHAT_RATE_LIMIT and CHAT_DAILY_RATE_LIMIT.

### Meal plan and PDF service — port 4102

| Method | Path | Behavior |
| --- | --- | --- |
| GET | /health | Service health indicator. |
| GET | /api/meal-plans?ownerId=...&weekStart=... | List plans for an owner and optional week. |
| POST | /api/meal-plans | Create a plan. |
| GET | /api/meal-plans/:id | Read a plan. |
| PUT | /api/meal-plans/:id | Update a plan. |
| DELETE | /api/meal-plans/:id | Delete the plan record. |
| POST | /api/meal-plans/save-and-export | Save a plan and render a PDF. |
| POST | /api/meal-plans/:id/pdf | Render a saved plan as a PDF. |
| POST | /api/pdfs | Render a textual chef response as a PDF. |
| GET | /api/pdf-archive?ownerId=... | List an owner's PDF archive. |
| DELETE | /api/pdf-archive/:id?ownerId=... | Delete the archive PDF and linked plan data when available. |
| POST | /api/recipe-images | Upload an internal JPEG; requires the shared bearer secret. |

Meal-plan writes expect a plan document with ownerId, weekStart, and seven days. See node-meal-plan-service/examples/meal-plan.json for an example.

## 6. Configuration reference

Configuration is read from each service's local environment file. Never commit populated `.env` or `.env.local` files. The Node CA helper is used by the Node service and its setup/migration scripts; the AWS CLI is a separate process and must be configured separately.

### React client — react-mowm-ui/.env.local

| Variable | Purpose |
| --- | --- |
| VITE_AUTH_API_URL | Auth API origin; local default is http://localhost:2222. |
| VITE_MEAL_API_URL | Flask chef-chat origin; local default is http://localhost:5000. |
| VITE_MEAL_PLAN_API_URL | Node meal-plan API origin; local default is http://127.0.0.1:4102. |

### Flask service — py-ai-chat/.env

| Variable | Purpose |
| --- | --- |
| OPENAI_API_KEY | Server-side OpenAI API key. |
| OPENAI_MODEL | Text model; defaults to gpt-4.1-mini. |
| OPENAI_MAX_OUTPUT_TOKENS | Maximum text response length; defaults to 6000 for weekly plans. |
| OPENAI_TEMPERATURE | Text response variation; defaults to 0.7. |
| OPENAI_IMAGE_MODEL | Image model for generated recipe photos. |
| OPENAI_IMAGE_QUALITY | Generated image quality; defaults to low. |
| MEAL_PLAN_SERVICE_URL | Node API origin. |
| MEAL_PLAN_INTERNAL_TOKEN | Shared secret for internal image uploads. Must match the Node service value. |
| MONGODB_URI, MONGO_DB_NAME, MONGO_CHAT_COLLECTION | MongoDB connection and collection settings. |
| CORS_ALLOWED_ORIGIN | Exact allowed browser origin. |
| CHAT_RATE_LIMIT, CHAT_DAILY_RATE_LIMIT | Per-IP request limits. |
| RATELIMIT_STORAGE_URI | Limiter storage; memory:// is intended for local development. |
| PORT | Flask port; defaults to 5000. |

### Node service — node-meal-plan-service/.env

| Variable | Purpose |
| --- | --- |
| AWS_REGION | AWS region for DynamoDB and S3. |
| DYNAMODB_TABLE | DynamoDB table; default is mowm-meal-plans. |
| S3_BUCKET | Private S3 bucket for PDFs and images. |
| S3_PREFIX | PDF object prefix; defaults to meal-plan-pdfs. |
| PRESIGNED_URL_TTL | Download URL lifetime in seconds. |
| PORT, HOST | Bind port (4102) and interface (0.0.0.0). |
| AWS_CA_BUNDLE | Optional path to a trusted PEM CA certificate/bundle for TLS-inspecting proxies. |
| AWS_USE_SYSTEM_CA | Set to `true` to include certificates from the operating system trust store. |
| MEAL_PLAN_INTERNAL_TOKEN | Shared secret required for recipe-image uploads. |
| CORS_ALLOWED_ORIGINS | Comma-separated exact browser origins. |
| LEGACY_MONGODB_URI, LEGACY_MONGO_DB_NAME, LEGACY_MONGO_COLLECTION | Optional source settings used only by the one-time MongoDB migration script. |

### Auth service

The default server port is 2222. Configure DB_URL, DB_USERNAME, DB_PASSWORD, and CORS_ALLOWED_ORIGIN. Session timeout and cookie max age are currently set to 30 days in application.properties. Credentialed browser CORS requests require the exact Vite origin; the service allows GET, POST, PUT, and OPTIONS.

## 7. AWS access requirements

The meal-plan service needs these DynamoDB actions on the table and its index:

- dynamodb:GetItem
- dynamodb:PutItem
- dynamodb:DeleteItem
- dynamodb:Query

Table setup additionally needs dynamodb:DescribeTable and dynamodb:CreateTable.

The runtime S3 identity needs s3:PutObject, s3:GetObject, and s3:DeleteObject on both the configured PDF prefix and recipe-images/*. Keep S3 Block Public Access enabled. The application does not need a public bucket policy or s3:ListBucket for its current runtime paths.

## 8. Local startup sequence

Start MongoDB, MySQL, and configure AWS access before launching dependent services. Use one terminal per service.

1. Start node-meal-plan-service. Configure its .env, install dependencies, run npm run setup:dynamodb once, then npm run dev.
2. Start py-ai-chat. Configure its .env and Python environment, then run python app.py.
3. Start sb-user-auth-service with its database configured using .\mvnw.cmd spring-boot:run.
4. Start react-mowm-ui. Configure .env.local, run npm install, then npm run dev.
5. Open http://localhost:5173.

Useful health/documentation URLs:

- Node API: http://127.0.0.1:4102/health
- Flask UI: http://127.0.0.1:5000
- Auth API docs: http://localhost:2222/swagger-ui/index.html
- React client: http://localhost:5173

## 9. Security and operational considerations

- Keep AWS credentials, OpenAI API keys, database passwords, and MEAL_PLAN_INTERNAL_TOKEN out of source control and chat logs. Rotate any credential that has been exposed.
- Keep the S3 bucket private and retain Block Public Access. Access files with short-lived presigned URLs.
- CORS origins must be exact origins. Credentialed auth requests require the auth server to allow credentials and cannot use a wildcard origin.
- The shared internal token protects the recipe-image upload endpoint; store the same strong random value in both services.
- Current plan endpoints rely on a caller-supplied ownerId and do not enforce the Spring session. Add server-side authentication and authorization before using the service for sensitive multi-user data.
- Flask's default in-memory rate-limit counters are per process and reset on restart. Configure a shared store such as Redis for multiple workers.
- Auth sessions are stored by the servlet container. A multi-instance deployment needs a shared session store or sticky sessions and a compatible session-cookie configuration.
- Generated images use the OpenAI image API and may incur additional usage charges.
- The Node CA helper requires Node.js 22.19 or newer when either CA option is enabled. Use a trusted administrator-provided PEM file; do not disable TLS verification.

## 10. Known implementation boundaries

- The auth session currently protects the client UI state, but is not propagated as a verified principal to the Flask or Node services.
- Chat conversation IDs are namespaced in browser local storage by owner ID, but the Flask service stores them under `guest` and does not enforce account ownership.
- Existing PDF records written before mealPlanId linking was added cannot cascade-delete their associated plan or images.
- The Node GET /api/meal-plans query currently uses a single DynamoDB Query request with a limit of 500; it is not fully paginated for owners with more than 500 matching plans.

## Future Enhancements

The following enhancements are planned for future releases of MOWM.

 1. Guest mode
Guests can use the app, but only the **Ask your chef** feature is accessible. AI chat responses are delivered as a downloadable PDF and are not stored in AWS.

 2. YouTube cooking links
Include a link whenever a YouTube video on how to cook the recipe is available.

 3. Calorie count
Show the calorie count for each recipe and meal plan.

 4. Multi-language support
Let users choose their preferred language for the app interface, recipes and AI chat responses.


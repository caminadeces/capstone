# MOWM service map

The active local application uses four services:

- `react-mowm-ui`: React/Vite client on port 5173.
- `sb-user-auth-service`: Spring Boot session-based auth API on port 2222.
- `py-ai-chat`: Flask/OpenAI chat and meal-planning UI/API on port 5000, with MongoDB chat history.
- `node-meal-plan-service`: Node API on port 4102, with DynamoDB meal plans and S3 PDFs/images.

`core-service` is a separate Spring Boot implementation retained in the workspace. It is not part of the standard startup flow described here; see its own README and architecture document before running it because it also defaults to port 2222.

## Local startup

Configure MySQL, MongoDB, AWS access, and each service's local `.env` file first. Never commit populated environment files.

1. In `node-meal-plan-service`, run `npm install`, create the DynamoDB table once with `npm run setup:dynamodb`, then run `npm run dev`.
2. In `py-ai-chat`, install `requirements.txt` in a Python environment and run `python app.py`.
3. In `sb-user-auth-service`, run `./mvnw.cmd spring-boot:run` (PowerShell: `.\mvnw.cmd spring-boot:run`) after configuring MySQL.
4. In `react-mowm-ui`, run `npm install` and `npm run dev`.

Use the example files as templates: `node-meal-plan-service/.env.example`, `py-ai-chat/.env.example`, and `react-mowm-ui/.env.example`. The frontend defaults are auth `http://localhost:2222`, chat `http://localhost:5000`, and meal-plan API `http://127.0.0.1:4102`. The auth service's `CORS_ALLOWED_ORIGIN` and Flask's `CORS_ALLOWED_ORIGIN` must match the browser origin. Node uses `CORS_ALLOWED_ORIGINS`.

The fridge flow requests a seven-day plan with breakfast, lunch, and dinner. The account registration endpoint does not start a session; users log in after registration. Password changes use `PUT /api/auth/password` and require the current password.

The Node service owns canonical meal-plan CRUD and PDF generation/upload. `POST /api/meal-plans/:id/pdf` renders a saved plan; `POST /api/pdfs` renders a chat response. For the complete API and configuration reference, see [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md).

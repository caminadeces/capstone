# MOWM — Mom's Organized Weekly Meals

A responsive React and Vite frontend for account access, weekly meal planning, recipe details, grocery shopping, the PDF archive, and the embedded AI chef. The brand uses a cooking-mom logo and the tagline “MOWM, ano ulam?”.

## Run locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the service URLs when your APIs are available. Authentication requires the Spring Boot auth service; without it the app shows the login screen and reports a connection error on submission. When no saved plan is available, the calendar can display sample meals.

## API configuration

- `VITE_AUTH_API_URL`: Spring Boot auth-service origin. Registration creates an account and returns to login; login establishes an HttpOnly session cookie. On load, the app calls `GET /api/auth/session`; logout calls `POST /api/auth/logout`. Requests include credentials. The cookie lasts up to 30 days. Password changes call `PUT /api/auth/password` and require the current password.
- `VITE_MEAL_API_URL`: Python chef-chat origin (for example, `http://localhost:5000`). Ask your Chef is embedded from this service. It offers guided weekly planning and a complete seven-day breakfast/lunch/dinner plan from fridge ingredients, with household size, diet, and allergy fields. Set `CORS_ALLOWED_ORIGIN` on `py-ai-chat` to the exact client origin.
- `VITE_MEAL_PLAN_API_URL`: Meal-plan API origin (for example, `http://127.0.0.1:4102`). It supplies weekly plans, grocery ingredients, and the PDF archive. PDFs and generated recipe images are stored in S3.

The client uses the account ID or email as `ownerId` when requesting plans and as part of the browser's chat conversation key. The meal-plan API does not validate that value against the auth session, and the Flask service does not bind conversations to authenticated users, so neither is a server-side authorization boundary. Grocery search filters ingredient names; clearing the search restores the full list. Deleting a newly linked plan PDF from the archive also deletes its saved DynamoDB plan and associated S3 recipe images. Older PDFs without a plan association only delete the PDF and archive entry. Configure each API's CORS policy to allow the frontend origin.

The shared logo asset is `src/assets/mowm-logo.png`.

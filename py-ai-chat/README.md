# MOWM — Mom's Organized Weekly Meals

A Python and Flask chef-chat app for guided weekly meal planning and seven-day plans based on ingredients on hand. It uses the OpenAI Responses API and stores chat history in MongoDB. The welcome screen offers a weekly planner form or a fridge-ingredient flow with household size, diet, and allergy fields. The app uses the shared MOWM cooking-mom logo at `static/mowm-logo.png`.

## Run from Jupyter Notebook

1. Open `Meal_Planner.ipynb` in Jupyter Notebook or VS Code.
2. Run the cells from top to bottom. The install cell uses the notebook's Python environment, so no standalone `pip` command is needed.
3. Enter your OpenAI API key when prompted, then open the displayed link.
4. Keep the server cell running while using the app. Stop it by running `meal_planner_server.stop()`.

The key is requested with a hidden prompt and kept only in the notebook's current process environment. Do not save it in a notebook cell or commit it.

## Run from a terminal

1. Create and activate a virtual environment.
2. Install dependencies with `python -m pip install -r requirements.txt` (or `py -m pip install -r requirements.txt` on Windows).
3. Set `OPENAI_API_KEY` in your shell, or create a project `.env` file containing `OPENAI_API_KEY=your_key_here`.
4. Start the server with `python app.py` and open <http://127.0.0.1:5000>.

PowerShell example for step 3:

```powershell
$env:OPENAI_API_KEY = "your_api_key_here"
python app.py
```

The app loads `.env` from the project folder. The API key stays on the server and is never sent to the browser. Set `OPENAI_MODEL` to override the default model. Do not commit real API keys.

The server uses a `MealPlannerChatbot` class with a system prompt and conversation history, following the class-based pattern in the reference notebook. History is restored from MongoDB for each request, the most recent turns are sent to the Responses API, and successful turns are saved back to MongoDB. It retries temporary API rate limits with exponential backoff, but does not retry quota or billing errors. Configure output length with `OPENAI_MAX_OUTPUT_TOKENS` (default `6000`, to accommodate full weekly recipes) and response variation with `OPENAI_TEMPERATURE` (default `0.7`).

When saving a weekly plan, the service generates one low-quality image per unique recipe using `OPENAI_IMAGE_MODEL` (default `gpt-image-1-mini`), uploads images to the configured private S3 bucket through the Node service, and stores their object keys with the DynamoDB meals. Image generation uses OpenAI API billing. Set the same `MEAL_PLAN_INTERNAL_TOKEN` in both service `.env` files; the Node service requires it for image uploads. AWS credentials need S3 `PutObject`, `GetObject`, and `DeleteObject` access to both the recipe-images and PDF object prefixes.

## Limit chat requests

The `/api/chat` endpoint is limited per client IP to 10 requests per minute and 100 per day by default. When a client reaches either limit, the API returns a JSON `429` response and rate-limit headers. Override the defaults in `.env` with `CHAT_RATE_LIMIT` and `CHAT_DAILY_RATE_LIMIT` (for example, `5 per minute` and `50 per day`).

The default `RATELIMIT_STORAGE_URI=memory://` is intended for local development. Its counters reset when the process restarts and are not shared between multiple workers. For a multi-worker or multi-instance deployment, set `RATELIMIT_STORAGE_URI` to a shared backend such as Redis. See the [Flask-Limiter storage configuration](https://flask-limiter.readthedocs.io/en/stable/configuration.html).

## Save chat history to MongoDB

Start MongoDB, then configure these values in `py-ai-chat/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/mowm
MONGO_DB_NAME=mowm
MONGO_CHAT_COLLECTION=chat_conversations
```

Install the updated dependencies with `python -m pip install -r requirements.txt`, then restart `python app.py`. The chat page saves completed exchanges and restores the current conversation after a refresh. The embedded client keys the stored conversation ID by owner ID, but this service stores conversations with the shared `guest` owner and does not validate IDs against the MOWM auth session. This is not server-enforced account isolation.

## Connect the client app

Set `VITE_MEAL_API_URL=http://localhost:5000` in `react-mowm-ui/.env.local`, then restart Vite. The `/api/chat` endpoint accepts `{ "message", "history", "conversationId" }` and returns its answer plus `conversationId`. The fridge flow requests a full Monday-to-Sunday plan with breakfast, lunch, and dinner for the selected household size, prioritizing listed ingredients and including a grocery list. `GET /api/conversations/<conversationId>` returns saved turns. For a hosted client, set `CORS_ALLOWED_ORIGIN` to the exact client origin (for example, `https://meals.example.com`). Local development allows `http://localhost:5173` by default.

## Export a chat response or saved plan to S3

Each assistant response has a **Save PDF to S3** button with an animated progress bar while the meal-plan service generates and stores the PDF. Configure `MEAL_PLAN_SERVICE_URL` (for example, `http://127.0.0.1:4102`) in `py-ai-chat/.env`.

When clicked, Python uses the supplied owner ID to look up the current week's saved plan from `node-meal-plan-service`. If it finds one, the meal-plan service renders that canonical DynamoDB plan and uploads the PDF to S3. If no plan is saved for the week, Python sends the chat response to the same service for PDF generation and upload. The browser receives an expiring download URL.

Configure S3 and DynamoDB in `node-meal-plan-service/.env` and provide AWS credentials through the standard AWS credential chain. The AWS identity needs DynamoDB table/index access and `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on both the configured PDF prefix and `recipe-images/*`. Keep the bucket private; downloads use temporary presigned URLs. Do not disable S3 Block Public Access or add a public bucket policy.

"""Weekly meal planner chatbot powered by the OpenAI Responses API."""

import os
import json
import re
import time
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from uuid import uuid4
from datetime import datetime, timezone, timedelta

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI, RateLimitError
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Load project-local settings before configuring extensions that read them.
# Existing process variables take precedence so notebook prompts still work.
load_dotenv(Path(__file__).with_name(".env"), override=False)

app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    headers_enabled=True,
)


@app.errorhandler(429)
def handle_rate_limit(_error):
    return jsonify(error="Too many chat requests. Please wait a moment before trying again."), 429


@app.after_request
def add_cors_headers(response):
    """Allow the configured browser client to call this API cross-origin."""
    origin = request.headers.get("Origin")
    allowed_origin = os.getenv("CORS_ALLOWED_ORIGIN", "http://localhost:5173")
    if origin == allowed_origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Vary"] = "Origin"
    return response

mongo_uri = os.getenv("MONGODB_URI")
mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2500) if mongo_uri else None
chat_collection = (
    mongo_client[os.getenv("MONGO_DB_NAME", "mowm")][os.getenv("MONGO_CHAT_COLLECTION", "chat_conversations")]
    if mongo_client else None
)

SYSTEM_PROMPT = """You are a practical, friendly weekly meal-planning assistant.
Help people plan meals that fit their household size, budget, schedule, tastes,
and dietary needs. Ask a brief follow-up question when essential details are
missing. Respect vegan and vegetarian diets strictly, including hidden animal
ingredients such as fish sauce, shrimp paste, gelatin, and animal-based stocks.
Treat reported allergies as strict exclusions and remind users to check labels
and cross-contact; never promise a dish is allergy-safe. Prefer balanced, varied meals and practical ingredient reuse. Clearly
label a seven-day plan by day and include breakfast, lunch, and dinner when
requested. Finish plans with a grouped grocery list and optional prep tips.
Never claim a meal is safe for an allergy without qualification; advise users
to check labels and prevent cross-contact. You are not a medical professional.
Keep answers readable and avoid assuming a particular cuisine or budget.
When a user requests a seven-day plan, use exactly these section headings: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Under every heading, include breakfast, lunch, and dinner. For every meal, write "Breakfast: meal name", then "Ingredients:" followed by 3-6 ingredient lines, then "Method:" followed by 2-5 numbered cooking steps. Repeat with the correct meal label. Keep each meal name on one line, give practical ingredient quantities, and make each method specific to that dish. Finish with the grocery list after all seven days.
"""


class MealPlannerChatbot:
    """A stateful chat interface; callers can restore and persist its history."""

    def __init__(self, system_prompt: str, history: list[dict[str, str]] | None = None):
        self.system_prompt = system_prompt
        self.conversation_history = [
            {"role": turn["role"], "content": turn["content"][:4000]}
            for turn in (history or [])
            if isinstance(turn, dict)
            and turn.get("role") in {"user", "assistant"}
            and isinstance(turn.get("content"), str)
            and turn["content"].strip()
        ]

    def chat(self, user_message: str) -> str:
        """Send a turn with recent context and retry transient rate limits."""
        self.conversation_history.append({"role": "user", "content": user_message[:4000]})
        client = OpenAI(max_retries=0)
        messages = self.conversation_history[-12:]
        max_output_tokens = int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "6000"))
        temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

        for attempt in range(3):
            try:
                response = client.responses.create(
                    model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                    instructions=self.system_prompt,
                    input=messages,
                    max_output_tokens=max_output_tokens,
                    temperature=temperature,
                )
                reply = response.output_text or ""
                self.conversation_history.append({"role": "assistant", "content": reply[:4000]})
                return reply
            except RateLimitError as exc:
                error_code = getattr(exc, "code", None)
                if not error_code and isinstance(getattr(exc, "body", None), dict):
                    error_data = exc.body.get("error", {})
                    if isinstance(error_data, dict):
                        error_code = error_data.get("code")
                error_message = str(exc).lower()
                is_quota_error = error_code in {
                    "insufficient_quota",
                    "credit_balance_exhausted",
                    "organization_spend_limit_exceeded",
                    "project_spend_limit_exceeded",
                } or any(term in error_message for term in ("quota", "billing", "credit balance", "spend limit"))
                if is_quota_error or attempt == 2:
                    self.conversation_history.pop()
                    raise

                retry_after = None
                response_headers = getattr(getattr(exc, "response", None), "headers", {})
                if response_headers:
                    try:
                        retry_after = float(response_headers.get("retry-after", ""))
                    except (TypeError, ValueError):
                        pass
                delay = max(0, min(retry_after, 8)) if retry_after is not None else 2 ** attempt
                time.sleep(delay)
            except Exception:
                self.conversation_history.pop()
                raise

        self.conversation_history.pop()
        raise RuntimeError("Could not get a response from the OpenAI API.")

    def get_history(self) -> list[dict[str, str]]:
        return self.conversation_history

    def reset(self) -> None:
        self.conversation_history.clear()


def extract_weekly_meal_plan(content: str) -> dict[str, Any] | None:
    """Extract meal names, ingredients, and methods from a complete AI plan."""
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    meal_types = ("breakfast", "lunch", "dinner")
    parsed: dict[str, dict[str, dict[str, Any]]] = {day: {} for day in day_names}
    active_day = None
    active_meal = None
    active_section = None

    for raw_line in content.splitlines():
        line = re.sub(r"[*_`]", "", raw_line).strip()
        line = re.sub(r"^(?:#{1,6}\s*|[-*]\s*)", "", line).strip()
        day_match = re.match(r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b", line, re.IGNORECASE)
        if day_match:
            active_day = day_match.group(1).title()
            active_meal = None
            active_section = None
            continue
        if not active_day:
            continue

        meal_match = re.match(r"^(Breakfast|Lunch|Dinner)\s*:\s*(.+)$", line, re.IGNORECASE)
        if meal_match:
            meal_type = meal_match.group(1).lower()
            details = meal_match.group(2).strip()
            name_and_description = re.split(r"\s+[-\u2013\u2014]\s+", details, maxsplit=1)
            name = name_and_description[0].strip(" -:;")[:160]
            if not name:
                active_meal = None
                active_section = None
                continue
            description = name_and_description[1].strip()[:2000] if len(name_and_description) > 1 else ""
            prep_match = re.search(r"\b(\d{1,3})\s*(?:minutes?|mins?)\b", details, re.IGNORECASE)
            active_meal = {
                "name": name,
                "description": description,
                **({"prepMinutes": int(prep_match.group(1))} if prep_match else {}),
                "ingredients": [],
                "instructions": [],
            }
            parsed[active_day][meal_type] = active_meal
            active_section = None
            continue

        section_match = re.match(r"^(Ingredients|Method|Instructions)\s*:?\s*(.*)$", line, re.IGNORECASE)
        if section_match:
            active_section = "ingredients" if section_match.group(1).lower() == "ingredients" else "instructions"
            inline_item = re.sub(r"^(?:[-*]\s*|\d+[.)]\s*)", "", section_match.group(2)).strip()
            if active_meal and inline_item:
                active_meal[active_section].append(inline_item[:500])
            continue
        if re.match(r"^(Grocery list|Prep tips|Notes)\b", line, re.IGNORECASE):
            active_meal = None
            active_section = None
            continue
        if active_meal and active_section and line:
            item = re.sub(r"^(?:[-*]\s*|\d+[.)]\s*)", "", line).strip()
            if item:
                details = active_meal[active_section]
                if len(details) < 30:
                    details.append(item[:500])

    if any(any(meal_type not in parsed[day] for meal_type in meal_types) for day in day_names):
        return None

    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday())
    days = []
    for index, day_name in enumerate(day_names):
        days.append({
            "date": (monday + timedelta(days=index)).isoformat(),
            **parsed[day_name],
        })

    return {
        "ownerId": "guest",
        "title": "Weekly meal plan",
        "weekStart": monday.isoformat(),
        "days": days,
        "groceryList": [],
        "assistantResponse": content[:50000],
        "source": "assistant",
    }


def generate_and_upload_recipe_image(meal: dict[str, Any], service_url: str, service_token: str) -> str:
    """Generate a recipe image and store it in S3 through the meal-plan service."""
    client = OpenAI(max_retries=0, timeout=120)
    ingredients = ", ".join(meal.get("ingredients", []))
    method = " ".join(meal.get("instructions", []))
    prompt = (
        f"Create a photorealistic editorial food photograph of {meal['name']}. "
        f"Ingredients: {ingredients}. Preparation: {method}. "
        "Show the finished dish only, naturally plated, appetizing soft daylight, "
        "clean composition, square crop, no people, no text, no labels, no watermark."
    )
    generated = client.images.generate(
        model=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini"),
        prompt=prompt[:4000],
        size="1024x1024",
        quality=os.getenv("OPENAI_IMAGE_QUALITY", "low"),
        output_format="jpeg",
    )
    if not generated.data or not generated.data[0].b64_json:
        raise ValueError("OpenAI returned no image data.")
    image_bytes = base64.b64decode(generated.data[0].b64_json, validate=True)
    upload = Request(
        f"{service_url}/api/recipe-images",
        data=image_bytes,
        headers={"Content-Type": "image/jpeg", "Authorization": f"Bearer {service_token}"},
        method="POST",
    )
    with urlopen(upload, timeout=60) as response:
        result = json.loads(response.read().decode("utf-8"))
    image_key = result.get("imageKey")
    if not isinstance(image_key, str) or not image_key:
        raise ValueError("The image storage service returned no image key.")
    return image_key


def attach_recipe_images(plan: dict[str, Any], service_url: str) -> int:
    """Generate at most one image per unique recipe; return the number that failed."""
    service_token = os.getenv("MEAL_PLAN_INTERNAL_TOKEN", "")
    query = urlencode({"ownerId": plan.get("ownerId", "guest"), "weekStart": plan["weekStart"]})
    lookup = Request(f"{service_url}/api/meal-plans?{query}", headers={"Accept": "application/json"})
    try:
        with urlopen(lookup, timeout=10) as response:
            existing_plans = json.loads(response.read().decode("utf-8"))
        if isinstance(existing_plans, list) and existing_plans:
            existing_days = {day.get("date"): day for day in existing_plans[0].get("days", []) if isinstance(day, dict)}
            for day in plan["days"]:
                old_day = existing_days.get(day["date"], {})
                for meal_type in ("breakfast", "lunch", "dinner"):
                    meal = day[meal_type]
                    old_meal = old_day.get(meal_type) or {}
                    if (old_meal.get("name") == meal["name"]
                            and old_meal.get("ingredients") == meal["ingredients"]
                            and old_meal.get("instructions") == meal["instructions"]
                            and old_meal.get("imageKey")):
                        meal["imageKey"] = old_meal["imageKey"]
    except Exception as exc:
        app.logger.info("Could not reuse existing recipe images (%s).", type(exc).__name__)

    recipes: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for day in plan["days"]:
        for meal_type in ("breakfast", "lunch", "dinner"):
            meal = day[meal_type]
            if meal.get("imageKey"):
                continue
            identity = (meal["name"].casefold(), tuple(meal["ingredients"]), tuple(meal["instructions"]))
            recipes.setdefault(identity, []).append(meal)

    if not service_token:
        app.logger.warning("Recipe images were skipped because MEAL_PLAN_INTERNAL_TOKEN is not configured.")
        return len(recipes)

    failures = 0
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(generate_and_upload_recipe_image, meals[0], service_url, service_token): meals
            for meals in recipes.values()
        }
        for future in as_completed(futures):
            try:
                image_key = future.result()
                for meal in futures[future]:
                    meal["imageKey"] = image_key
            except Exception as exc:
                failures += 1
                app.logger.warning("Recipe image generation or upload failed (%s).", type(exc).__name__)
    return failures

@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/chat")
@limiter.limit(os.getenv("CHAT_RATE_LIMIT", "10 per minute"))
@limiter.limit(os.getenv("CHAT_DAILY_RATE_LIMIT", "100 per day"))
def chat():
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify(error="Set OPENAI_API_KEY in your environment, then restart the app."), 503

    payload: dict[str, Any] = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    history = payload.get("history", [])
    conversation_id = payload.get("conversationId")
    if not message:
        return jsonify(error="Please enter a message."), 400
    if not isinstance(history, list):
        return jsonify(error="Chat history must be a list."), 400
    if conversation_id is not None and (
        not isinstance(conversation_id, str) or not re.fullmatch(r"[0-9a-fA-F-]{36}", conversation_id)
    ):
        return jsonify(error="conversationId must be a valid conversation ID."), 400
    if chat_collection is None:
        return jsonify(error="Set MONGODB_URI and restart the app to save chat history."), 503

    conversation_id = conversation_id or str(uuid4())
    try:
        mongo_client.admin.command("ping")
        existing = chat_collection.find_one({"conversationId": conversation_id, "ownerId": "guest"})
    except PyMongoError:
        app.logger.exception("MongoDB is unavailable while loading chat history")
        return jsonify(error="Could not connect to MongoDB. Start MongoDB and check MONGODB_URI."), 503
    if existing:
        history = existing.get("turns", [])

    chatbot = MealPlannerChatbot(SYSTEM_PROMPT, history)
    try:
        reply = chatbot.chat(message)
        meal_plan = extract_weekly_meal_plan(reply)
        turns = [
            {"role": turn["role"], "content": turn["content"][:4000]}
            for turn in chatbot.get_history()[-500:]
        ]
        if meal_plan and turns and turns[-1]["role"] == "assistant":
            turns[-1]["mealPlan"] = meal_plan
        now = datetime.now(timezone.utc)
        try:
            chat_collection.update_one(
                {"conversationId": conversation_id, "ownerId": "guest"},
                {"$set": {"turns": turns, "updatedAt": now},
                 "$setOnInsert": {"conversationId": conversation_id, "ownerId": "guest", "createdAt": now}},
                upsert=True,
            )
        except PyMongoError:
            app.logger.exception("Could not save chat history to MongoDB")
            return jsonify(error="The reply was generated, but chat history could not be saved to MongoDB."), 503
        return jsonify(reply=reply, conversationId=conversation_id, mealPlan=meal_plan)
    except Exception as exc:
        # The full traceback goes to the server console, never to the browser.
        app.logger.exception("OpenAI request failed (%s)", type(exc).__name__)
        if type(exc).__name__ == "AuthenticationError":
            detail = "OpenAI rejected the API key. Check OPENAI_API_KEY in your .env or notebook, then restart the app."
        elif type(exc).__name__ == "RateLimitError":
            error_code = getattr(exc, "code", None)
            if not error_code and isinstance(getattr(exc, "body", None), dict):
                error_data = exc.body.get("error", {})
                if isinstance(error_data, dict):
                    error_code = error_data.get("code")
            error_message = str(exc).lower()
            is_quota_error = error_code in {
                "insufficient_quota",
                "credit_balance_exhausted",
                "organization_spend_limit_exceeded",
                "project_spend_limit_exceeded",
            } or any(term in error_message for term in ("quota", "billing", "credit balance", "spend limit"))
            if is_quota_error:
                detail = (
                    "OpenAI API spending is unavailable for this project. Check its billing credits "
                    "and organization or project spending limits in the OpenAI Platform."
                )
            else:
                detail = (
                    "The OpenAI API request rate is temporarily limited. Wait a little and try again; "
                    "if it continues, check the rate limits for this API project."
                )
        elif type(exc).__name__ == "PermissionDeniedError":
            detail = "This API key does not have permission to use the selected model."
        elif type(exc).__name__ == "NotFoundError":
            detail = "The selected OpenAI model was not found or is unavailable to this API project."
        elif type(exc).__name__ in {"APIConnectionError", "APITimeoutError"}:
            cause = exc.__cause__ or exc.__context__
            if cause:
                # Include the transport-level reason (DNS, proxy, TLS, timeout)
                # so the browser message is actionable. Never echo credentials.
                cause_text = str(cause).replace(os.getenv("OPENAI_API_KEY", ""), "[redacted]")
                detail = f"OpenAI connection failed ({type(cause).__name__}): {cause_text[:240]}"
            else:
                detail = "OpenAI connection failed without a transport detail. Check the notebook console and network/proxy settings."
        else:
            # Surface enough context to diagnose configuration and SDK errors,
            # while ensuring the API key can never be returned to the browser.
            safe_message = str(exc).replace(os.getenv("OPENAI_API_KEY", ""), "[redacted]")
            detail = f"{type(exc).__name__}: {safe_message[:400]}" if safe_message else type(exc).__name__
        return jsonify(error=detail), 429 if type(exc).__name__ == "RateLimitError" else 502


@app.get("/api/conversations/<conversation_id>")
def get_conversation(conversation_id: str):
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", conversation_id):
        return jsonify(error="Invalid conversation ID."), 400
    if chat_collection is None:
        return jsonify(error="Set MONGODB_URI and restart the app to load chat history."), 503
    try:
        conversation = chat_collection.find_one(
            {"conversationId": conversation_id, "ownerId": "guest"},
            {"_id": 0, "conversationId": 1, "turns": 1},
        )
    except PyMongoError:
        app.logger.exception("MongoDB is unavailable while loading chat history")
        return jsonify(error="Could not connect to MongoDB. Start MongoDB and check MONGODB_URI."), 503
    if not conversation:
        return jsonify(error="Conversation not found."), 404
    return jsonify(conversation)


@app.post("/api/export-pdf")
def export_pdf():
    meal_plan_service_url = os.getenv("MEAL_PLAN_SERVICE_URL", "").rstrip("/")
    if not meal_plan_service_url:
        return jsonify(error="Set MEAL_PLAN_SERVICE_URL to use the meal plan and PDF service."), 503

    payload: dict[str, Any] = request.get_json(silent=True) or {}
    owner_id = payload.get("ownerId") or "guest"
    if not isinstance(owner_id, str) or not owner_id.strip() or len(owner_id) > 120:
        return jsonify(error="ownerId must be a valid user identifier."), 400
    owner_id = owner_id.strip()
    content = payload.get("content")
    if not isinstance(content, str) or not content.strip():
        return jsonify(error="There is no response to export."), 400
    if len(content) > 50000:
        return jsonify(error="The response is too long to export."), 413

    meal_plan = payload.get("mealPlan")
    if meal_plan is not None:
        if not isinstance(meal_plan, dict):
            return jsonify(error="mealPlan must be a structured weekly plan."), 400
        image_failures = attach_recipe_images(meal_plan, meal_plan_service_url)
        upload = Request(
            f"{meal_plan_service_url}/api/meal-plans/save-and-export",
            data=json.dumps({"plan": meal_plan}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(upload, timeout=60) as response:
                stored = json.loads(response.read().decode("utf-8"))
            return jsonify(
                id=stored.get("id"),
                mealPlanId=(stored.get("plan") or {}).get("id"),
                url=stored.get("downloadUrl") or stored.get("url"),
                filename=f"meal-plan-{stored.get('id', 'response')}.pdf",
                expiresIn=stored.get("expiresIn"),
                plan=stored.get("plan"),
                planSaved=True,
                archiveSaved=stored.get("archiveSaved", True),
                imageFailures=image_failures,
            )
        except HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8"))
            except Exception:
                detail = {}
            return jsonify(
                error=detail.get("error") or "The meal plan service could not save the plan PDF.",
                planSaved=bool(detail.get("planSaved")),
                plan=detail.get("plan"),
            ), exc.code if exc.code >= 400 else 502
        except (OSError, TimeoutError) as exc:
            app.logger.warning("Meal plan/PDF service connection failed (%s).", type(exc).__name__)
            return jsonify(error="The meal plan and PDF service closed the connection. Start or restart node-meal-plan-service, then try again."), 502

    meal_plan_id = payload.get("mealPlanId")
    if not meal_plan_id:
        today = datetime.now().date()
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        query = urlencode({"ownerId": owner_id, "weekStart": week_start})
        lookup = Request(f"{meal_plan_service_url}/api/meal-plans?{query}", headers={"Accept": "application/json"})
        try:
            with urlopen(lookup, timeout=10) as response:
                plans = json.loads(response.read().decode("utf-8"))
            if not isinstance(plans, list):
                app.logger.warning("Meal plan lookup returned an invalid response; exporting the chat response instead.")
                plans = []
            if plans and isinstance(plans[0], dict):
                meal_plan_id = plans[0].get("_id") or plans[0].get("id")
        except HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("error")
            except Exception:
                detail = None
            app.logger.warning(
                "Could not load a saved meal plan (HTTP %s): %s; exporting the chat response instead.",
                exc.code,
                detail or "no service error detail",
            )
        except (URLError, TimeoutError) as exc:
            app.logger.warning(
                "Could not reach the meal plan lookup service (%s); trying chat-response PDF export.",
                type(exc).__name__,
            )
        except (ValueError, TypeError) as exc:
            app.logger.warning(
                "Meal plan lookup returned invalid data (%s); exporting the chat response instead.",
                type(exc).__name__,
            )

    if meal_plan_id:
        if not isinstance(meal_plan_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,64}", meal_plan_id):
            return jsonify(error="mealPlanId must be a valid saved plan ID."), 400
        headers = {"Content-Type": "application/json"}
        upload = Request(
            f"{meal_plan_service_url}/api/meal-plans/{meal_plan_id}/pdf",
            data=b"{}",
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(upload, timeout=45) as response:
                stored = json.loads(response.read().decode("utf-8"))
            return jsonify(
                id=stored.get("id"),
                mealPlanId=stored.get("mealPlanId"),
                url=stored.get("downloadUrl") or stored.get("url"),
                filename=f"meal-plan-{stored.get('id', 'response')}.pdf",
                expiresIn=stored.get("expiresIn"),
                archiveSaved=stored.get("archiveSaved", True),
            )
        except HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("error")
            except Exception:
                detail = None
            return jsonify(error=detail or "The meal plan service could not create the saved plan PDF."), 502
        except (OSError, TimeoutError) as exc:
            app.logger.warning("PDF service connection failed (%s).", type(exc).__name__)
            return jsonify(error="The meal plan and PDF service closed the connection. Start or restart node-meal-plan-service, then try again."), 502

    try:
        headers = {"Content-Type": "application/json"}
        upload = Request(
            f"{meal_plan_service_url}/api/pdfs",
            data=json.dumps({"content": content, "ownerId": owner_id}).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urlopen(upload, timeout=30) as response:
            stored = json.loads(response.read().decode("utf-8"))
        return jsonify(
            id=stored.get("id"),
            url=stored.get("downloadUrl") or stored.get("url"),
            filename=f"meal-plan-{stored.get('id', 'response')}.pdf",
            expiresIn=stored.get("expiresIn"),
            archiveSaved=stored.get("archiveSaved", True),
        )
    except HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("error")
        except Exception:
            detail = None
        return jsonify(error=detail or "The meal plan service could not create the response PDF."), 502
    except (OSError, TimeoutError) as exc:
        app.logger.warning("PDF service connection failed (%s).", type(exc).__name__)
        return jsonify(error="The meal plan and PDF service closed the connection. Start or restart node-meal-plan-service, then try again."), 502
    except Exception as exc:
        app.logger.exception("PDF request to the meal plan service failed (%s)", type(exc).__name__)
        return jsonify(error="Could not store the PDF. Check the meal plan service."), 502


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG") == "1")

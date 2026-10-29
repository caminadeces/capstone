# MOWM Meal Plan and PDF Service

This single Node.js service stores canonical weekly meal plans in DynamoDB, performs meal-plan CRUD, generates PDFs, and uploads them to private S3 storage.

## Configure and run

1. Copy `.env.example` to `.env` and set `AWS_REGION`, `DYNAMODB_TABLE`, `S3_BUCKET`, `S3_PREFIX`, and `PRESIGNED_URL_TTL`. Create your own private S3 bucket and use its name for `S3_BUCKET`; the example value is a placeholder. Set `MEAL_PLAN_INTERNAL_TOKEN` to the same random secret used by `py-ai-chat` so only the chat service can upload generated recipe images.
2. Provide AWS credentials using the standard AWS credential chain, such as an AWS profile, environment variables, or an IAM role.
3. Run `npm install`.
4. Create the table with `npm run setup:dynamodb`.
5. Start the service with `npm run dev` (port `4102` by default).

The table uses `id` as its partition key and an `ownerId-weekStart-index` GSI for calendar and PDF archive queries. The setup command creates it in on-demand billing mode. For initial setup, the AWS identity needs `dynamodb:DescribeTable` and `dynamodb:CreateTable`; the runtime service needs `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, and `dynamodb:Query` on the table and its index. It also needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on both `arn:aws:s3:::YOUR_BUCKET/meal-plan-pdfs/*` (or the configured `S3_PREFIX`) and `arn:aws:s3:::YOUR_BUCKET/recipe-images/*`. No public bucket access or `s3:ListBucket` permission is required by the current code. Keep S3 Block Public Access enabled; downloads are provided by presigned URLs.

Keep `AWS_REGION` the same for DynamoDB and S3. The application, table setup script, and migration script default to `us-east-1`; set the variable explicitly if your resources are in another region. The Node AWS SDK uses its standard credential chain, such as an AWS CLI profile locally or an IAM role in deployment. Do not commit AWS access keys.

If an HTTPS-inspecting proxy causes `SELF_SIGNED_CERT_IN_CHAIN`, set `AWS_USE_SYSTEM_CA=true` if the corporate root certificate is installed in your Windows or macOS system trust store. Otherwise, obtain the trusted corporate CA certificate from your IT team in PEM format and set `AWS_CA_BUNDLE` in `.env` to its path. Relative paths resolve from the service working directory. The helper adds system or supplied certificates to Node's normal trusted certificates; it does not disable TLS verification. These settings require Node.js 22.19 or newer. Restart the service after changing them. The AWS CLI is a separate process and does not load this service's `.env`; configure its CA bundle separately if needed.

To retain existing MongoDB meal plans, set `LEGACY_MONGODB_URI` and `LEGACY_MONGO_DB_NAME` in `.env`, then run `npm run migrate:mongodb` after creating the table. The migration copies the old `mealplans` collection and preserves its MongoDB IDs as DynamoDB `id` values. It does not delete or modify the MongoDB source records.

## Canonical plan

Each document has `id`, `ownerId`, `title`, `weekStart`, seven `days`, `groceryList`, `assistantResponse`, `source`, timestamps, and a version. Meals include a name, optional description and prep time, ingredients, and instructions. The calendar and PDF renderer both use this DynamoDB document.

## API

- `GET /health`
- `GET /api/meal-plans?ownerId=user-id&weekStart=2026-10-19` lists plans; `weekStart` is optional.
- `POST /api/meal-plans` creates a plan using the canonical document shape.
- `GET /api/meal-plans/:id` reads a plan.
- `PUT /api/meal-plans/:id` updates a plan.
- `DELETE /api/meal-plans/:id` deletes a plan.
- `POST /api/meal-plans/:id/pdf` renders the saved plan and uploads its PDF to S3.
- `POST /api/pdfs` accepts `{ "content": "..." }`, renders the chat response, and uploads its PDF to S3.

The PDF routes return a time-limited `downloadUrl` and `url`. `PRESIGNED_URL_TTL` defaults to one hour. The meal-plan route renders the canonical week and grocery list; the response route stores a textual chef answer.

## PDF archive deletion

New archive records for saved-plan PDFs include the associated `mealPlanId`. Deleting one removes its S3 PDF, linked DynamoDB meal-plan record, recipe image objects referenced by that plan, and the selected archive record. Storage objects are deleted before the DynamoDB records so a failed S3 cleanup can be retried. Archive records created before the association was added have no `mealPlanId`; deleting those removes only their PDF object and archive record.

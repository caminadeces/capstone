import 'dotenv/config'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import express from 'express'
import helmet from 'helmet'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import PDFDocument from 'pdfkit'
import { configureAwsCaBundle } from '../config/aws-ca.js'

configureAwsCaBundle()

const app = express()
const port = Number(process.env.PORT || 4102)
const host = process.env.HOST || '0.0.0.0'
const awsRegion = process.env.AWS_REGION || 'us-east-1'
const tableName = process.env.DYNAMODB_TABLE || 'mowm-meal-plans'
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000').split(',').map(value => value.trim()).filter(Boolean))
const urlTtl = Math.max(60, Math.min(Number(process.env.PRESIGNED_URL_TTL || 3600), 604800))
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }), {
  marshallOptions: { removeUndefinedValues: true },
})
const s3 = new S3Client({ region: awsRegion })
const s3Bucket = process.env.S3_BUCKET
const s3Prefix = (process.env.S3_PREFIX || 'meal-plan-pdfs').replace(/^\/+|\/+$/g, '')

app.disable('x-powered-by')
app.use(helmet())
app.use((req, res, next) => {
  const origin = req.get('origin')
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '1mb' }))

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function dateKey(value, field) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) throw httpError(400, `${field} must be a valid date.`)
  return date.toISOString().slice(0, 10)
}

function boundedText(value, field, maxLength, { required = false, fallback = '' } = {}) {
  const text = value == null ? fallback : String(value).trim()
  if (required && !text) throw httpError(400, `${field} is required.`)
  if (text.length > maxLength) throw httpError(400, `${field} must be ${maxLength} characters or fewer.`)
  return text
}

function normalizeMeal(meal, field) {
  if (meal == null) return null
  if (typeof meal !== 'object' || Array.isArray(meal)) throw httpError(400, `${field} must be a meal object.`)
  const prepMinutes = meal.prepMinutes == null ? undefined : Number(meal.prepMinutes)
  if (prepMinutes !== undefined && (!Number.isFinite(prepMinutes) || prepMinutes < 0 || prepMinutes > 1440)) {
    throw httpError(400, `${field}.prepMinutes must be between 0 and 1440.`)
  }
  return {
    name: boundedText(meal.name, `${field}.name`, 160, { required: true }),
    description: boundedText(meal.description, `${field}.description`, 2000),
    ...(prepMinutes === undefined ? {} : { prepMinutes }),
    ingredients: stringList(meal.ingredients, `${field}.ingredients`),
    instructions: stringList(meal.instructions, `${field}.instructions`),
    ...(meal.imageKey ? { imageKey: validateImageKey(meal.imageKey, `${field}.imageKey`) } : {}),
  }
}

function validateImageKey(value, field) {
  const key = boundedText(value, field, 512, { required: true })
  if (!/^recipe-images\/[0-9a-f-]{36}\.jpg$/i.test(key)) throw httpError(400, `${field} is invalid.`)
  return key
}

function stringList(value, field) {
  if (value == null) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw httpError(400, `${field} must be a list of text values.`)
  }
  return value.map(item => item.trim()).filter(Boolean)
}

function normalizePlan(payload, { id = randomUUID(), existing } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw httpError(400, 'A meal plan object is required.')
  const ownerId = boundedText(payload.ownerId ?? existing?.ownerId, 'ownerId', 120, { required: true })
  const weekStart = dateKey(payload.weekStart ?? existing?.weekStart, 'weekStart')
  if (!Array.isArray(payload.days) || payload.days.length !== 7) throw httpError(400, 'A weekly plan must contain exactly seven days.')
  const days = payload.days.map((day, index) => {
    if (!day || typeof day !== 'object' || Array.isArray(day)) throw httpError(400, `days[${index}] must be an object.`)
    return {
      date: dateKey(day.date, `days[${index}].date`),
      breakfast: normalizeMeal(day.breakfast, `days[${index}].breakfast`),
      lunch: normalizeMeal(day.lunch, `days[${index}].lunch`),
      dinner: normalizeMeal(day.dinner, `days[${index}].dinner`),
    }
  })
  const groceryList = payload.groceryList ?? existing?.groceryList ?? []
  if (!Array.isArray(groceryList)) throw httpError(400, 'groceryList must be a list.')
  const normalizedGroceries = groceryList.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw httpError(400, `groceryList[${index}] must be an object.`)
    return {
      name: boundedText(item.name, `groceryList[${index}].name`, 160, { required: true }),
      quantity: boundedText(item.quantity, `groceryList[${index}].quantity`, 80),
      section: boundedText(item.section, `groceryList[${index}].section`, 80, { fallback: 'Other' }),
      checked: Boolean(item.checked),
    }
  })
  const source = payload.source ?? existing?.source ?? 'assistant'
  if (!['assistant', 'manual'].includes(source)) throw httpError(400, 'source must be assistant or manual.')
  const now = new Date().toISOString()
  return {
    id: existing?.id || id,
    ownerId,
    title: boundedText(payload.title ?? existing?.title, 'title', 160, { fallback: 'My meal plan' }),
    weekStart,
    days,
    groceryList: normalizedGroceries,
    assistantResponse: boundedText(payload.assistantResponse ?? existing?.assistantResponse, 'assistantResponse', 50000),
    source,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    version: (existing?.version || 0) + (existing ? 1 : 0),
  }
}

async function toApi(plan) {
  const days = await Promise.all(plan.days.map(async day => {
    const meals = await Promise.all(['breakfast', 'lunch', 'dinner'].map(async type => {
      const meal = day[type]
      if (!meal?.imageKey) return meal
      const imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Bucket, Key: meal.imageKey }), { expiresIn: urlTtl })
      return { ...meal, imageUrl }
    }))
    return { ...day, breakfast: meals[0], lunch: meals[1], dinner: meals[2] }
  }))
  return { ...plan, days, _id: plan.id }
}

async function getPlan(id) {
  const result = await dynamo.send(new GetCommand({
    TableName: tableName,
    Key: { id },
    ConsistentRead: true,
  }))
  return result.Item || null
}

async function queryPlans(ownerId, weekStart) {
  const names = { '#ownerId': 'ownerId', '#recordType': 'recordType' }
  const values = { ':ownerId': ownerId }
  let keyCondition = '#ownerId = :ownerId'
  if (weekStart) {
    names['#weekStart'] = 'weekStart'
    values[':weekStart'] = dateKey(weekStart, 'weekStart')
    keyCondition += ' AND #weekStart = :weekStart'
  }
  const result = await dynamo.send(new QueryCommand({
    TableName: tableName,
    IndexName: 'ownerId-weekStart-index',
    KeyConditionExpression: keyCondition,
    FilterExpression: 'attribute_not_exists(#recordType)',
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ScanIndexForward: false,
    Limit: 500,
  }))
  return result.Items || []
}

function makePdf(render) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 48, bottom: 48, left: 54, right: 54 } })
  const chunks = []
  const finished = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  render(doc)
  doc.end()
  return finished
}

function renderMealPlanPdf(plan) {
  return makePdf(doc => {
    doc.info.Title = plan.title || 'MOWM meal plan'
    doc.fontSize(22).fillColor('#26352e').text(plan.title || 'My meal plan')
    doc.moveDown(0.25).fontSize(10).fillColor('#53645a').text(`Week starting ${new Date(plan.weekStart).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`)
    doc.moveDown()
    for (const day of plan.days || []) {
      doc.fontSize(15).fillColor('#26352e').text(new Date(day.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }))
      for (const type of ['breakfast', 'lunch', 'dinner']) {
        const meal = day[type]
        if (!meal) continue
        doc.moveDown(0.25).fontSize(11).fillColor('#436b52').text(`${type[0].toUpperCase()}${type.slice(1)}: ${meal.name}`)
        if (meal.description) doc.fontSize(9).fillColor('#26352e').text(meal.description)
        if (meal.prepMinutes) doc.fontSize(9).fillColor('#53645a').text(`Prep: ${meal.prepMinutes} minutes`)
        if (meal.ingredients?.length) doc.fontSize(9).fillColor('#26352e').text(`Ingredients: ${meal.ingredients.join(', ')}`)
        if (meal.instructions?.length) doc.fontSize(9).fillColor('#26352e').text(`Method: ${meal.instructions.join(' ')}`)
      }
      doc.moveDown()
    }
    if (plan.groceryList?.length) {
      doc.addPage().fontSize(17).fillColor('#26352e').text('Grocery list')
      const sections = new Map()
      for (const item of plan.groceryList) sections.set(item.section || 'Other', [...(sections.get(item.section || 'Other') || []), item])
      for (const [section, items] of sections) {
        doc.moveDown(0.5).fontSize(12).fillColor('#436b52').text(section)
        for (const item of items) doc.fontSize(10).fillColor('#26352e').text(`• ${item.name}${item.quantity ? ` — ${item.quantity}` : ''}`)
      }
    }
    if (plan.assistantResponse) {
      doc.addPage().fontSize(17).fillColor('#26352e').text('Chef notes')
      doc.moveDown().fontSize(10).fillColor('#26352e').text(plan.assistantResponse)
    }
  })
}

function renderResponsePdf(content) {
  return makePdf(doc => {
    doc.info.Title = 'MOWM chef response'
    doc.fontSize(22).fillColor('#26352e').text('MOWM — Mom’s Organized Weekly Meals')
    doc.moveDown().fontSize(11).fillColor('#26352e').text(content, { lineGap: 4 })
  })
}

async function storePdf(buffer, filename) {
  if (!s3Bucket) throw httpError(503, 'S3_BUCKET is not configured in node-meal-plan-service.')
  const id = randomUUID()
  const key = `${s3Prefix}/${id}.pdf`
  await s3.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: `inline; filename="${filename}-${id}.pdf"`,
    ServerSideEncryption: 'AES256',
  }))
  const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Bucket, Key: key }), { expiresIn: urlTtl })
  return { id, key, downloadUrl, url: downloadUrl, expiresIn: urlTtl }
}

function currentWeekStart() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

async function archivePdf(ownerId, stored, title, filename, mealPlanId) {
  const now = new Date().toISOString()
  const item = {
    id: `pdf-${stored.id}`,
    ownerId: boundedText(ownerId, 'ownerId', 120, { required: true }),
    weekStart: currentWeekStart(),
    recordType: 'pdf',
    title: boundedText(title, 'title', 160, { fallback: 'Saved PDF' }),
    pdfKey: stored.key,
    ...(mealPlanId ? { mealPlanId: boundedText(mealPlanId, 'mealPlanId', 64, { required: true }) } : {}),
    pdfFilename: boundedText(filename, 'filename', 180, { fallback: `${stored.id}.pdf` }),
    pdfCreatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: tableName, Item: item }))
}

async function queryPdfArchive(ownerId) {
  const items = []
  let ExclusiveStartKey
  do {
    const result = await dynamo.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'ownerId-weekStart-index',
      KeyConditionExpression: '#ownerId = :ownerId',
      FilterExpression: '#recordType = :pdf',
      ExpressionAttributeNames: { '#ownerId': 'ownerId', '#recordType': 'recordType' },
      ExpressionAttributeValues: { ':ownerId': ownerId, ':pdf': 'pdf' },
      ScanIndexForward: false,
      Limit: 500,
      ...(ExclusiveStartKey ? { ExclusiveStartKey } : {}),
    }))
    items.push(...(result.Items || []))
    ExclusiveStartKey = result.LastEvaluatedKey
  } while (ExclusiveStartKey && items.length < 5000)
  return items.sort((a, b) => String(b.pdfCreatedAt).localeCompare(String(a.pdfCreatedAt))).slice(0, 100)
}

async function pdfArchiveToApi(item) {
  const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Bucket, Key: item.pdfKey }), { expiresIn: urlTtl })
  return {
    id: item.id,
    title: item.title,
    filename: item.pdfFilename,
    createdAt: item.pdfCreatedAt,
    weekStart: item.weekStart,
    ...(item.mealPlanId ? { mealPlanId: item.mealPlanId } : {}),
    downloadUrl,
  }
}

async function storeRecipeImage(buffer) {
  if (!s3Bucket) throw httpError(503, 'S3_BUCKET is not configured in node-meal-plan-service.')
  const key = `recipe-images/${randomUUID()}.jpg`
  await s3.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'private, max-age=3600',
    ServerSideEncryption: 'AES256',
  }))
  return key
}

function isInternalServiceRequest(req) {
  const expected = process.env.MEAL_PLAN_INTERNAL_TOKEN
  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!expected || !supplied) return false
  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'meal-plan-service', database: 'DynamoDB' }))

app.post('/api/recipe-images', express.raw({ type: 'image/jpeg', limit: '5mb' }), async (req, res, next) => {
  if (!isInternalServiceRequest(req)) return res.status(401).json({ error: 'Internal recipe-image upload is not authorized.' })
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'A JPEG image body is required.' })
  try {
    res.status(201).json({ imageKey: await storeRecipeImage(req.body) })
  } catch (error) { next(error) }
})

app.get('/api/meal-plans', async (req, res, next) => {
  try {
    const ownerId = String(req.query.ownerId || '').trim()
    if (!ownerId) return res.status(400).json({ error: 'ownerId query parameter is required.' })
    res.json(await Promise.all((await queryPlans(ownerId, req.query.weekStart)).map(toApi)))
  } catch (error) { next(error) }
})

app.get('/api/pdf-archive', async (req, res, next) => {
  try {
    const ownerId = boundedText(req.query.ownerId, 'ownerId', 120, { required: true })
    res.json(await Promise.all((await queryPdfArchive(ownerId)).map(pdfArchiveToApi)))
  } catch (error) { next(error) }
})

app.delete('/api/pdf-archive/:id', async (req, res, next) => {
  try {
    const ownerId = boundedText(req.query.ownerId, 'ownerId', 120, { required: true })
    const result = await dynamo.send(new GetCommand({
      TableName: tableName,
      Key: { id: req.params.id },
      ConsistentRead: true,
    }))
    const item = result.Item
    if (!item || item.recordType !== 'pdf' || item.ownerId !== ownerId) return res.status(404).json({ error: 'Archived PDF not found.' })
    if (!s3Bucket) throw httpError(503, 'S3_BUCKET is not configured in node-meal-plan-service.')
    if (typeof item.pdfKey !== 'string' || !item.pdfKey.startsWith(`${s3Prefix}/`)) throw httpError(500, 'The archived PDF has an invalid storage key.')

    let plan = null
    if (item.mealPlanId) {
      plan = await getPlan(item.mealPlanId)
      if (plan && plan.ownerId !== ownerId) throw httpError(500, 'The archived PDF has an invalid meal plan association.')
    }

    const imageKeys = new Set()
    for (const day of plan?.days || []) {
      for (const type of ['breakfast', 'lunch', 'dinner']) {
        const key = day?.[type]?.imageKey
        if (key) imageKeys.add(validateImageKey(key, 'meal image key'))
      }
    }

    // Delete storage first. If any delete fails, the DynamoDB records remain so
    // the same request can be retried; S3 DeleteObject is safe to repeat.
    await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: item.pdfKey }))
    await Promise.all([...imageKeys].map(Key => s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key }))))
    if (plan) {
      await dynamo.send(new DeleteCommand({
        TableName: tableName,
        Key: { id: plan.id },
        ConditionExpression: '#ownerId = :ownerId AND attribute_not_exists(#recordType) AND #version = :version',
        ExpressionAttributeNames: { '#ownerId': 'ownerId', '#recordType': 'recordType', '#version': 'version' },
        ExpressionAttributeValues: { ':ownerId': ownerId, ':version': plan.version },
      }))
    }
    await dynamo.send(new DeleteCommand({
      TableName: tableName,
      Key: { id: item.id },
      ConditionExpression: '#recordType = :pdf AND #ownerId = :ownerId',
      ExpressionAttributeNames: { '#recordType': 'recordType', '#ownerId': 'ownerId' },
      ExpressionAttributeValues: { ':pdf': 'pdf', ':ownerId': ownerId },
    }))
    res.status(204).end()
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') return res.status(404).json({ error: 'Archived PDF not found.' })
    next(error)
  }
})

app.post('/api/meal-plans', async (req, res, next) => {
  try {
    const item = normalizePlan(req.body)
    const current = await queryPlans(item.ownerId, item.weekStart)
    if (current.length) return res.status(409).json({ error: 'A meal plan already exists for this owner and week.' })
    await dynamo.send(new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)',
    }))
    res.status(201).json(await toApi(item))
  } catch (error) { next(error) }
})

app.post('/api/meal-plans/save-and-export', async (req, res, next) => {
  let savedPlan
  try {
    const proposedPlan = req.body?.plan
    const candidate = normalizePlan(proposedPlan)
    const current = await queryPlans(candidate.ownerId, candidate.weekStart)
    if (current.length > 1) throw httpError(409, 'More than one saved meal plan exists for this owner and week. Resolve the duplicates before saving again.')
    savedPlan = normalizePlan(proposedPlan, {
      id: current[0]?.id || candidate.id,
      existing: current[0],
    })
    await dynamo.send(new PutCommand({ TableName: tableName, Item: savedPlan }))
    const stored = await storePdf(await renderMealPlanPdf(savedPlan), 'meal-plan')
    let archiveSaved = true
    try { await archivePdf(savedPlan.ownerId, stored, savedPlan.title, `meal-plan-${stored.id}.pdf`, savedPlan.id) }
    catch (archiveError) { archiveSaved = false; console.error('PDF uploaded to S3 but its archive entry could not be saved:', archiveError) }
    res.status(201).json({ ...stored, archiveSaved, mealPlanId: savedPlan.id, plan: await toApi(savedPlan) })
  } catch (error) {
    if (savedPlan) {
      console.error('Meal plan saved to DynamoDB, but its PDF could not be uploaded to S3:', error)
      return res.status(502).json({
        error: 'The meal plan was saved, but its PDF could not be uploaded to S3. Check the AWS storage settings and try saving the PDF again.',
        planSaved: true,
        plan: await toApi(savedPlan),
      })
    }
    next(error)
  }
})

app.get('/api/meal-plans/:id', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.id)
    if (!plan) return res.status(404).json({ error: 'Meal plan not found.' })
    res.json(await toApi(plan))
  } catch (error) { next(error) }
})

app.put('/api/meal-plans/:id', async (req, res, next) => {
  try {
    const existing = await getPlan(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Meal plan not found.' })
    const item = normalizePlan({ ...existing, ...req.body, ownerId: existing.ownerId }, { id: existing.id, existing })
    const duplicate = (await queryPlans(item.ownerId, item.weekStart)).find(plan => plan.id !== item.id)
    if (duplicate) return res.status(409).json({ error: 'A meal plan already exists for this owner and week.' })
    await dynamo.send(new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_exists(id)',
    }))
    res.json(await toApi(item))
  } catch (error) { next(error) }
})

app.delete('/api/meal-plans/:id', async (req, res, next) => {
  try {
    const result = await dynamo.send(new DeleteCommand({
      TableName: tableName,
      Key: { id: req.params.id },
      ReturnValues: 'ALL_OLD',
    }))
    if (!result.Attributes) return res.status(404).json({ error: 'Meal plan not found.' })
    res.status(204).end()
  } catch (error) { next(error) }
})

app.post('/api/meal-plans/:id/pdf', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.id)
    if (!plan) return res.status(404).json({ error: 'Meal plan not found.' })
    const stored = await storePdf(await renderMealPlanPdf(plan), 'meal-plan')
    let archiveSaved = true
    try { await archivePdf(plan.ownerId, stored, plan.title, `meal-plan-${stored.id}.pdf`, plan.id) }
    catch (archiveError) { archiveSaved = false; console.error('PDF uploaded to S3 but its archive entry could not be saved:', archiveError) }
    res.status(201).json({ ...stored, archiveSaved, mealPlanId: plan.id })
  } catch (error) { next(error) }
})

app.post('/api/pdfs', async (req, res, next) => {
  try {
    const content = req.body?.content
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'There is no response to export.' })
    if (content.length > 50000) return res.status(413).json({ error: 'The response is too long to export.' })
    const stored = await storePdf(await renderResponsePdf(content), 'chef-response')
    const ownerId = boundedText(req.body?.ownerId || 'guest', 'ownerId', 120, { required: true })
    let archiveSaved = true
    try { await archivePdf(ownerId, stored, 'Chef response', `chef-response-${stored.id}.pdf`) }
    catch (archiveError) { archiveSaved = false; console.error('PDF uploaded to S3 but its archive entry could not be saved:', archiveError) }
    res.status(201).json({ ...stored, archiveSaved })
  } catch (error) { next(error) }
})

app.use((error, _req, res, _next) => {
  if (error?.status) return res.status(error.status).json({ error: error.message })
  if (error?.name === 'ConditionalCheckFailedException') return res.status(409).json({ error: 'The meal plan changed or already exists. Refresh and try again.' })
  if (error?.name === 'ResourceNotFoundException') return res.status(503).json({ error: `DynamoDB table ${tableName} was not found. Run npm run setup:dynamodb.` })
  console.error(error)
  if (['AccessDenied', 'AccessDeniedException'].includes(error?.name)) {
    return res.status(502).json({ error: 'AWS denied the request. Check DynamoDB query/put/delete access and s3:PutObject/s3:GetObject/s3:DeleteObject on the configured bucket prefix.' })
  }
  if (error?.name === 'NoSuchBucket') {
    return res.status(503).json({ error: 'The configured S3 bucket was not found. Check S3_BUCKET and AWS_REGION in node-meal-plan-service.' })
  }
  if (['CredentialsProviderError', 'InvalidAccessKeyId', 'SignatureDoesNotMatch', 'ExpiredToken', 'UnrecognizedClientException'].includes(error?.name)) {
    return res.status(503).json({ error: 'AWS credentials are missing, invalid, or expired. Check the AWS credential chain used by node-meal-plan-service.' })
  }
  if (['PermanentRedirect', 'AuthorizationHeaderMalformed'].includes(error?.name)) {
    return res.status(503).json({ error: 'The AWS region does not match the configured S3 bucket or DynamoDB table. Check AWS_REGION.' })
  }
  const causeCode = error?.cause?.code || error?.cause?.name
  const errorCode = error?.code || causeCode || (error?.name !== 'Error' ? error?.name : undefined)
  if (['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(errorCode)) {
    return res.status(502).json({ error: 'Node could not verify the AWS TLS certificate chain. Configure AWS_CA_BUNDLE with your network administrator’s trusted PEM CA certificate, then restart the service.' })
  }
  if (['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EAI_AGAIN', 'ECONNREFUSED'].includes(errorCode)) {
    return res.status(502).json({ error: `Could not reach AWS (${errorCode}). Check network, proxy, and firewall access from node-meal-plan-service.` })
  }
  const errorType = typeof errorCode === 'string' ? ` (${errorCode})` : ''
  res.status(502).json({ error: `AWS storage request failed${errorType}. Check service configuration and the Node service logs.` })
})

app.listen(port, host, () => console.log(`Meal plan and PDF service listening on http://${host}:${port}`))

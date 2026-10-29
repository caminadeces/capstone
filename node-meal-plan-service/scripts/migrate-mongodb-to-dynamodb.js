import 'dotenv/config'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { configureAwsCaBundle } from '../config/aws-ca.js'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { MongoClient } from 'mongodb'

configureAwsCaBundle()

const mongoUri = process.env.LEGACY_MONGODB_URI || process.env.MONGODB_URI
if (!mongoUri) throw new Error('Set LEGACY_MONGODB_URI to read the old meal-plan MongoDB database.')

const tableName = process.env.DYNAMODB_TABLE || 'mowm-meal-plans'
const databaseName = process.env.LEGACY_MONGO_DB_NAME || 'mowm'
const collectionName = process.env.LEGACY_MONGO_COLLECTION || 'mealplans'
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }), {
  marshallOptions: { removeUndefinedValues: true },
})
const mongo = new MongoClient(mongoUri)

function toPlain(value) {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value.toHexString === 'function') return value.toHexString()
  if (Array.isArray(value)) return value.map(toPlain)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, toPlain(child)]))
  return value
}

try {
  await mongo.connect()
  const plans = await mongo.db(databaseName).collection(collectionName).find({}).toArray()
  let copied = 0
  for (const source of plans) {
    const plan = toPlain(source)
    const id = plan.id || plan._id
    delete plan._id
    delete plan.__v
    plan.id = id
    plan.weekStart = String(plan.weekStart).slice(0, 10)
    plan.days = (plan.days || []).map(day => ({ ...day, date: String(day.date).slice(0, 10) }))
    if (!plan.createdAt) plan.createdAt = new Date().toISOString()
    if (!plan.updatedAt) plan.updatedAt = plan.createdAt
    if (!plan.version) plan.version = 0
    await dynamo.send(new PutCommand({
      TableName: tableName,
      Item: plan,
      ConditionExpression: 'attribute_not_exists(id)',
    }))
    copied += 1
  }
  console.log(`Copied ${copied} meal plan(s) from MongoDB to DynamoDB.`)
} finally {
  await mongo.close()
}

import 'dotenv/config'
import { CreateTableCommand, DescribeTableCommand, DynamoDBClient, ResourceNotFoundException, waitUntilTableExists } from '@aws-sdk/client-dynamodb'
import { configureAwsCaBundle } from '../config/aws-ca.js'

configureAwsCaBundle()

const tableName = process.env.DYNAMODB_TABLE || 'mowm-meal-plans'
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })

try {
  await client.send(new DescribeTableCommand({ TableName: tableName }))
  console.log(`DynamoDB table ${tableName} already exists.`)
} catch (error) {
  if (!(error instanceof ResourceNotFoundException)) throw error
  await client.send(new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'ownerId', AttributeType: 'S' },
      { AttributeName: 'weekStart', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [{
      IndexName: 'ownerId-weekStart-index',
      KeySchema: [
        { AttributeName: 'ownerId', KeyType: 'HASH' },
        { AttributeName: 'weekStart', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    }],
    BillingMode: 'PAY_PER_REQUEST',
  }))
  await waitUntilTableExists({ client }, { TableName: tableName })
  console.log(`Created DynamoDB table ${tableName}.`)
}

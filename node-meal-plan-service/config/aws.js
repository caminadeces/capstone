require('dotenv').config(); 
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); 
const { S3Client } = require('@aws-sdk/client-s3'); 
 
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION }); 
const s3Client = new S3Client({ region: process.env.AWS_REGION }); 
 
module.exports = { 
  dynamoDbClient, 
  s3Client, 
  tableName: process.env.DYNAMODB_TABLE, 
  bucketName: process.env.S3_BUCKET 
}; 
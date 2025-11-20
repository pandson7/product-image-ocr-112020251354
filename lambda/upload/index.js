const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const imageId = uuidv4();
    const body = JSON.parse(event.body);
    const imageData = Buffer.from(body.image, 'base64');
    
    const s3Key = `images/${imageId}.jpg`;
    
    await s3.send(new PutObjectCommand({
      Bucket: 'product-ocr-images-112020251354',
      Key: s3Key,
      Body: imageData,
      ContentType: 'image/jpeg'
    }));

    await dynamodb.send(new PutItemCommand({
      TableName: 'ProductOCRResults112020251354',
      Item: {
        imageId: { S: imageId },
        status: { S: 'pending' },
        timestamp: { S: new Date().toISOString() },
        imageUrl: { S: `s3://product-ocr-images-112020251354/${s3Key}` }
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageId, status: 'pending' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

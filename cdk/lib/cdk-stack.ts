import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class ProductOcrStack112020251354 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '112020251354';

    // S3 Bucket for image storage
    const imageBucket = new s3.Bucket(this, `ProductImageBucket${suffix}`, {
      bucketName: `product-ocr-images-${suffix}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['http://localhost:3000'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag']
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // DynamoDB Table for OCR results
    const ocrTable = new dynamodb.Table(this, `ProductOcrTable${suffix}`, {
      tableName: `ProductOCRResults${suffix}`,
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Enable auto scaling
    ocrTable.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });
    ocrTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, `LambdaExecutionRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject'],
              resources: [`${imageBucket.bucketArn}/*`]
            })
          ]
        }),
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:UpdateItem'],
              resources: [ocrTable.tableArn]
            })
          ]
        }),
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0']
            })
          ]
        })
      }
    });

    // Upload Handler Lambda
    const uploadHandler = new lambda.Function(this, `UploadHandler${suffix}`, {
      functionName: `product-ocr-upload-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
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
    
    const s3Key = \`images/\${imageId}.jpg\`;
    
    await s3.send(new PutObjectCommand({
      Bucket: '${imageBucket.bucketName}',
      Key: s3Key,
      Body: imageData,
      ContentType: 'image/jpeg'
    }));

    await dynamodb.send(new PutItemCommand({
      TableName: '${ocrTable.tableName}',
      Item: {
        imageId: { S: imageId },
        status: { S: 'pending' },
        timestamp: { S: new Date().toISOString() },
        imageUrl: { S: \`s3://${imageBucket.bucketName}/\${s3Key}\` }
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageId, status: 'pending' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET_NAME: imageBucket.bucketName,
        TABLE_NAME: ocrTable.tableName
      }
    });

    // OCR Processing Lambda
    const ocrProcessor = new lambda.Function(this, `OcrProcessor${suffix}`, {
      functionName: `product-ocr-processor-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});
const bedrock = new BedrockRuntimeClient({});

exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, ' '));
    const imageId = key.split('/')[1].split('.')[0];

    try {
      await dynamodb.send(new UpdateItemCommand({
        TableName: '${ocrTable.tableName}',
        Key: { imageId: { S: imageId } },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': { S: 'processing' } }
      }));

      const s3Object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const imageBytes = await s3Object.Body.transformToByteArray();
      const base64Image = Buffer.from(imageBytes).toString('base64');

      const prompt = \`Analyze this product image and extract the following information in JSON format:
{
  "productName": "string",
  "brand": "string", 
  "category": "string",
  "price": "string",
  "dimensions": "string",
  "weight": "string",
  "description": "string",
  "additionalSpecs": {}
}

Extract any visible product specifications, pricing, dimensions, weight, brand information, and other relevant details. If information is not visible, use "Not visible" as the value.\`;

      const response = await bedrock.send(new InvokeModelCommand({
        modelId: 'global.anthropic.claude-sonnet-4-20250514-v1:0',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [{
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            }, {
              type: 'text',
              text: prompt
            }]
          }]
        })
      }));

      const result = JSON.parse(new TextDecoder().decode(response.body));
      const extractedData = JSON.parse(result.content[0].text);

      await dynamodb.send(new UpdateItemCommand({
        TableName: '${ocrTable.tableName}',
        Key: { imageId: { S: imageId } },
        UpdateExpression: 'SET #status = :status, extractedData = :data, processingTime = :time',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':data': { S: JSON.stringify(extractedData) },
          ':time': { N: String(Date.now()) }
        }
      }));

    } catch (error) {
      await dynamodb.send(new UpdateItemCommand({
        TableName: '${ocrTable.tableName}',
        Key: { imageId: { S: imageId } },
        UpdateExpression: 'SET #status = :status, errorMessage = :error',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'failed' },
          ':error': { S: error.message }
        }
      }));
    }
  }
};
      `),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        TABLE_NAME: ocrTable.tableName
      }
    });

    // Status Check Lambda
    const statusChecker = new lambda.Function(this, `StatusChecker${suffix}`, {
      functionName: `product-ocr-status-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const imageId = event.pathParameters.imageId;
    
    const result = await dynamodb.send(new GetItemCommand({
      TableName: '${ocrTable.tableName}',
      Key: { imageId: { S: imageId } }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Image not found' })
      };
    }

    const response = {
      imageId,
      status: result.Item.status.S,
      timestamp: result.Item.timestamp.S
    };

    if (result.Item.extractedData) {
      response.extractedData = JSON.parse(result.Item.extractedData.S);
    }

    if (result.Item.processingTime) {
      response.processingTime = parseInt(result.Item.processingTime.N);
    }

    if (result.Item.errorMessage) {
      response.errorMessage = result.Item.errorMessage.S;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: ocrTable.tableName
      }
    });

    // S3 Event Notification
    imageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(ocrProcessor),
      { prefix: 'images/' }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, `ProductOcrApi${suffix}`, {
      restApiName: `product-ocr-api-${suffix}`,
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler);
    api.root.addResource('upload').addMethod('POST', uploadIntegration);

    const statusResource = api.root.addResource('status');
    const statusIntegration = new apigateway.LambdaIntegration(statusChecker);
    statusResource.addResource('{imageId}').addMethod('GET', statusIntegration);

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: imageBucket.bucketName,
      description: 'S3 Bucket Name'
    });
  }
}

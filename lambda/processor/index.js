const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});
const bedrock = new BedrockRuntimeClient({});

exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const imageId = key.split('/')[1].split('.')[0];

    try {
      console.log(`Processing image: ${imageId}`);
      
      await dynamodb.send(new UpdateItemCommand({
        TableName: 'ProductOCRResults112020251354',
        Key: { imageId: { S: imageId } },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': { S: 'processing' } }
      }));

      const s3Object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const imageBytes = await s3Object.Body.transformToByteArray();
      const base64Image = Buffer.from(imageBytes).toString('base64');

      const prompt = `Analyze this product image and extract the following information in JSON format:
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

Extract any visible product specifications, pricing, dimensions, weight, brand information, and other relevant details. If information is not visible, use "Not visible" as the value. Return only the JSON object, no markdown formatting.`;

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
      let responseText = result.content[0].text;
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const extractedData = JSON.parse(responseText);

      await dynamodb.send(new UpdateItemCommand({
        TableName: 'ProductOCRResults112020251354',
        Key: { imageId: { S: imageId } },
        UpdateExpression: 'SET #status = :status, extractedData = :data, processingTime = :time',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':data': { S: JSON.stringify(extractedData) },
          ':time': { N: String(Date.now()) }
        }
      }));

      console.log(`Successfully processed image: ${imageId}`);

    } catch (error) {
      console.error(`Error processing image ${imageId}:`, error);
      
      await dynamodb.send(new UpdateItemCommand({
        TableName: 'ProductOCRResults112020251354',
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

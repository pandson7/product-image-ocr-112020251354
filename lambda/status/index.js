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
      TableName: 'ProductOCRResults112020251354',
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

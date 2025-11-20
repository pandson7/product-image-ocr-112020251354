# Technical Design Document

## Architecture Overview

The Product Image OCR Processing System follows a serverless architecture pattern using AWS services. The system consists of a React frontend, S3 for storage, Lambda functions for processing, DynamoDB for data persistence, and Amazon Bedrock for AI-powered OCR analysis.

## System Components

### Frontend Layer
- **React Application**: Single-page application with drag-and-drop upload interface
- **Local Development Server**: Runs on localhost for development and testing
- **API Integration**: Direct communication with AWS API Gateway endpoints

### Storage Layer
- **Amazon S3**: Primary storage for uploaded product images
- **Bucket Configuration**: Public read access for processed images, versioning disabled
- **Event Triggers**: S3 event notifications trigger Lambda processing

### Processing Layer
- **API Gateway**: RESTful endpoints for frontend communication
- **Lambda Functions**: 
  - Upload handler for image processing initiation
  - OCR processor using Amazon Bedrock Claude model
  - Status checker for real-time updates
- **Amazon Bedrock**: Claude model for intelligent product data extraction

### Data Layer
- **DynamoDB**: NoSQL database for extracted product specifications
- **Table Structure**: Single table with image ID as partition key
- **Data Format**: JSON documents containing extracted product information

## Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │───▶│   API Gateway    │───▶│  Lambda Upload  │
│  (localhost)    │    │                  │    │    Handler      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DynamoDB      │◀───│  Lambda OCR      │◀───│      S3         │
│   Table         │    │   Processor      │    │    Bucket       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Amazon Bedrock │
                       │  Claude Model   │
                       └─────────────────┘
```

## Data Flow Sequence

1. **Image Upload**:
   - User drags/drops image in React frontend
   - Frontend calls API Gateway upload endpoint
   - Lambda upload handler stores image in S3
   - S3 event triggers OCR processing Lambda

2. **OCR Processing**:
   - Lambda retrieves image from S3
   - Image sent to Amazon Bedrock Claude model
   - Claude analyzes image and extracts product specifications
   - Extracted data formatted as JSON

3. **Data Storage**:
   - JSON data stored in DynamoDB with image metadata
   - Processing status updated to "completed"
   - Frontend polls for status updates

4. **Result Display**:
   - Frontend retrieves extracted data via API
   - Product specifications displayed in structured format

## Database Schema

### DynamoDB Table: ProductOCRResults
```json
{
  "imageId": "string (partition key)",
  "timestamp": "string (ISO 8601)",
  "status": "string (pending|processing|completed|failed)",
  "imageUrl": "string",
  "extractedData": {
    "productName": "string",
    "brand": "string",
    "category": "string",
    "price": "string",
    "dimensions": "string",
    "weight": "string",
    "description": "string",
    "additionalSpecs": {}
  },
  "processingTime": "number",
  "errorMessage": "string (optional)"
}
```

## API Endpoints

### POST /upload
- **Purpose**: Upload image and initiate processing
- **Request**: Multipart form data with image file
- **Response**: `{imageId, uploadUrl, status}`

### GET /status/{imageId}
- **Purpose**: Check processing status
- **Response**: `{imageId, status, processingTime}`

### GET /results/{imageId}
- **Purpose**: Retrieve extracted product data
- **Response**: `{imageId, extractedData, timestamp}`

## Security Configuration

### IAM Roles and Policies

#### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::product-ocr-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/ProductOCRResults"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    }
  ]
}
```

## Infrastructure as Code

### CDK Stack Components
- **S3 Bucket**: With event notifications and CORS configuration
- **DynamoDB Table**: With on-demand billing and point-in-time recovery
- **Lambda Functions**: Node.js runtime with appropriate memory and timeout settings
- **API Gateway**: REST API with CORS enabled for localhost development
- **IAM Roles**: Least-privilege access for all service interactions

## Performance Considerations

- **Lambda Memory**: 1024MB for OCR processing function
- **Timeout Settings**: 5 minutes for Bedrock model invocation
- **DynamoDB**: On-demand billing for variable workloads
- **S3**: Standard storage class for cost optimization

## Error Handling

- **Upload Failures**: Retry mechanism with exponential backoff
- **OCR Processing Errors**: Logged to CloudWatch with detailed error messages
- **Bedrock Throttling**: Automatic retry with jitter
- **Frontend Error Display**: User-friendly error messages for all failure scenarios

## Monitoring and Logging

- **CloudWatch Logs**: All Lambda function logs
- **CloudWatch Metrics**: Custom metrics for processing success/failure rates
- **X-Ray Tracing**: End-to-end request tracing for debugging

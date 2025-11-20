# Product Image OCR System

A serverless OCR (Optical Character Recognition) system built on AWS that processes product images and extracts text information.

## Architecture Overview

This system provides a complete serverless solution for processing product images and extracting text using AWS services including Lambda, S3, DynamoDB, and Amazon Textract.

## Project Structure

```
product-image-ocr-112020251354/
├── backend/                    # Backend API code
├── frontend/                   # React frontend application
├── cdk/                       # AWS CDK infrastructure code
├── lambda/                    # Lambda function implementations
│   ├── upload/               # Image upload handler
│   ├── processor/            # OCR processing logic
│   └── status/               # Status checking functionality
├── specs/                     # Project specifications and requirements
├── pricing/                   # Cost analysis and pricing documents
├── generated-diagrams/        # Architecture and flow diagrams
├── qr-code/                  # QR code for project access
└── PROJECT_SUMMARY.md        # Comprehensive project summary
```

## Features

- **Image Upload**: Secure image upload to S3 with presigned URLs
- **OCR Processing**: Automated text extraction using Amazon Textract
- **Status Tracking**: Real-time processing status updates
- **Web Interface**: React-based frontend for user interaction
- **Serverless Architecture**: Cost-effective, scalable AWS infrastructure

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Modern responsive design

### Backend
- AWS Lambda (Node.js)
- Amazon S3 for image storage
- Amazon DynamoDB for metadata
- Amazon Textract for OCR processing
- API Gateway for REST endpoints

### Infrastructure
- AWS CDK for Infrastructure as Code
- CloudFormation for deployment
- IAM roles and policies for security

## Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed

### Deployment

1. **Deploy Infrastructure**:
   ```bash
   cd cdk
   npm install
   cdk deploy
   ```

2. **Build Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Deploy Lambda Functions**:
   Lambda functions are automatically deployed with the CDK stack.

## Usage

1. Access the web application through the deployed CloudFront URL
2. Upload product images using the web interface
3. Monitor processing status in real-time
4. View extracted text results

## Cost Analysis

Detailed cost analysis and pricing information is available in the `pricing/` directory, including:
- AWS service cost breakdowns
- Usage-based pricing models
- Cost optimization recommendations

## Documentation

- **Architecture Diagrams**: See `generated-diagrams/` for visual representations
- **API Specifications**: Available in `specs/` directory
- **Project Requirements**: Detailed in `specs/requirements.md`
- **Design Documentation**: Available in `specs/design.md`

## Security

The system implements AWS security best practices:
- IAM roles with least privilege access
- Encrypted data storage
- Secure API endpoints
- VPC isolation where applicable

## Monitoring and Logging

- CloudWatch logs for all Lambda functions
- CloudWatch metrics for performance monitoring
- Error tracking and alerting

## Contributing

This project follows standard development practices:
- TypeScript for type safety
- ESLint for code quality
- Jest for testing
- CDK for infrastructure management

## License

This project is part of the Echo Architect system for automated AWS solution development.

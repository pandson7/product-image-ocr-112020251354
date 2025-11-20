# Product Image OCR Processing System - AWS Architecture Diagrams

This directory contains AWS architecture diagrams generated for the Product Image OCR Processing System based on the technical design specifications.

## Generated Diagrams

### 1. Main Architecture (`main_architecture.png`)
- **Purpose**: High-level system overview showing all major components and data flow
- **Components**: User → React App → API Gateway → Lambda Functions → S3/Bedrock/DynamoDB
- **Key Features**: 
  - Serverless architecture pattern
  - AI-powered OCR processing with Amazon Bedrock
  - Event-driven processing with S3 triggers

### 2. Data Flow Sequence (`data_flow_sequence.png`)
- **Purpose**: Detailed step-by-step data flow through the system
- **Process Flow**:
  1. Image upload through React frontend
  2. API Gateway routing to Lambda functions
  3. S3 storage and event triggering
  4. OCR processing with Bedrock Claude model
  5. Results storage in DynamoDB
  6. Status polling and result retrieval

### 3. Security & IAM Architecture (`security_iam.png`)
- **Purpose**: Security model and IAM permissions structure
- **Components**:
  - Lambda execution roles with least-privilege permissions
  - Service-specific IAM policies for S3, DynamoDB, and Bedrock
  - CloudWatch logging and X-Ray tracing integration
- **Security Features**:
  - Granular IAM permissions
  - Comprehensive logging and monitoring
  - Distributed tracing for debugging

### 4. Infrastructure Deployment (`infrastructure_deployment.png`)
- **Purpose**: Complete infrastructure deployment view with CDK
- **Components**:
  - Development environment (React localhost)
  - AWS cloud infrastructure with all services
  - Infrastructure as Code using CDK TypeScript
  - Monitoring and observability stack
- **Deployment Features**:
  - Automated infrastructure provisioning
  - Comprehensive monitoring setup
  - Scalable serverless architecture

## System Architecture Summary

The Product Image OCR Processing System implements a modern serverless architecture on AWS with the following key characteristics:

- **Frontend**: React application with drag-and-drop interface
- **API Layer**: AWS API Gateway for RESTful endpoints
- **Processing**: AWS Lambda functions for serverless compute
- **Storage**: Amazon S3 for image storage with event triggers
- **AI/ML**: Amazon Bedrock with Claude model for intelligent OCR
- **Database**: DynamoDB for extracted product data storage
- **Security**: IAM roles with least-privilege access
- **Monitoring**: CloudWatch Logs, Metrics, and X-Ray tracing
- **Infrastructure**: CDK for Infrastructure as Code

## Technical Specifications

- **Lambda Memory**: 1024MB for OCR processing, 512MB for status checking
- **Timeout Settings**: 5 minutes for Bedrock processing, 30 seconds for other functions
- **Database**: DynamoDB with on-demand billing
- **Storage**: S3 standard storage class with event notifications
- **AI Model**: Amazon Bedrock Claude for product specification extraction

## Generated Files

All diagrams are saved as PNG files in this directory:
- `main_architecture.png` - Main system architecture
- `data_flow_sequence.png` - Detailed data flow
- `security_iam.png` - Security and IAM structure  
- `infrastructure_deployment.png` - Complete deployment view

These diagrams provide comprehensive documentation for the Product Image OCR Processing System architecture and can be used for:
- System documentation
- Technical reviews
- Implementation guidance
- Stakeholder presentations

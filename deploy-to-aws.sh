#!/bin/bash

# Deploy Contest Manager to AWS S3 + CloudFront
# This script creates the infrastructure and deploys the React app

set -e

echo "🚀 Deploying Contest Manager to AWS..."

# Configuration
BUCKET_NAME="optivate-contest-manager-$(date +%s)"
REGION="us-east-1"
STACK_NAME="contest-manager-hosting"

echo "📦 Building React app..."
npm run build

echo "🏗️ Creating S3 bucket and CloudFront distribution..."

# Create CloudFormation template
cat > hosting-template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Contest Manager Static Website Hosting'

Parameters:
  BucketName:
    Type: String
    Description: Name for the S3 bucket

Resources:
  # S3 Bucket for hosting
  WebsiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: index.html
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false

  # Bucket Policy for public read access
  WebsiteBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref WebsiteBucket
      PolicyDocument:
        Statement:
          - Sid: PublicReadGetObject
            Effect: Allow
            Principal: '*'
            Action: 's3:GetObject'
            Resource: !Sub '${WebsiteBucket}/*'

  # CloudFront Distribution
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: !GetAtt WebsiteBucket.RegionalDomainName
            Id: S3Origin
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: http-only
        Enabled: true
        DefaultRootObject: index.html
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - DELETE
            - GET
            - HEAD
            - OPTIONS
            - PATCH
            - POST
            - PUT
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
        PriceClass: PriceClass_100

Outputs:
  WebsiteURL:
    Description: 'Website URL'
    Value: !Sub 'https://${CloudFrontDistribution.DomainName}'
    Export:
      Name: !Sub '${AWS::StackName}-WebsiteURL'
  
  BucketName:
    Description: 'S3 Bucket Name'
    Value: !Ref WebsiteBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'
  
  DistributionId:
    Description: 'CloudFront Distribution ID'
    Value: !Ref CloudFrontDistribution
    Export:
      Name: !Sub '${AWS::StackName}-DistributionId'
EOF

echo "🏗️ Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file hosting-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides BucketName=$BUCKET_NAME \
  --region $REGION \
  --capabilities CAPABILITY_IAM

echo "📤 Uploading files to S3..."
aws s3 sync build/ s3://$BUCKET_NAME --delete --region $REGION

echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text \
  --region $REGION)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --region $REGION

# Get the website URL
WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text \
  --region $REGION)

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your Contest Manager is now live at:"
echo "   $WEBSITE_URL"
echo ""
echo "📋 Next steps for Monday.com integration:"
echo "1. Go to your Monday.com board"
echo "2. Click '+' to add a new view"
echo "3. Select 'Custom Widget' or 'Embedded Content'"
echo "4. Enter this URL: $WEBSITE_URL"
echo "5. Configure iframe settings:"
echo "   - Width: 100%"
echo "   - Height: 800px"
echo "   - Allow: clipboard-read; clipboard-write"
echo ""
echo "🔧 Update your production.env with:"
echo "   REACT_APP_API_BASE_URL=https://your-api-gateway-url/prod"
echo "   REACT_APP_API_KEY=your-api-key"

# Clean up
rm hosting-template.yaml

echo "🎉 Contest Manager is ready for Monday.com embedding!"

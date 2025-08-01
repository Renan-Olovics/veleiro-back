# AWS S3 Configuration

This project uses AWS S3 for file storage. Follow these steps to configure AWS S3:

## 1. AWS Account Setup

1. Create an AWS account if you don't have one
2. Go to the AWS IAM Console
3. Create a new IAM user with programmatic access
4. Attach the `AmazonS3FullAccess` policy (or create a custom policy with minimal permissions)

## 2. S3 Bucket Setup

1. Go to the AWS S3 Console
2. Create a new bucket with a unique name
3. Configure bucket settings:
   - **Region**: Choose your preferred region
   - **Block Public Access**: Enable (recommended for security)
   - **Versioning**: Optional
   - **Encryption**: Enable server-side encryption

## 3. Environment Variables

Add the following variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
```

## 4. IAM Policy (Optional - for better security)

Instead of using `AmazonS3FullAccess`, create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

## 5. CORS Configuration (Optional)

If you need to upload files directly from the browser, configure CORS on your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 6. Testing the Configuration

Run the S3 service tests to verify your configuration:

```bash
npm test -- src/services/s3.service.spec.ts
```

## 7. File Structure

Files will be stored in S3 with the following structure:

```
your-bucket/
├── users/
│   ├── user-id-1/
│   │   ├── root/
│   │   │   ├── file1_1234567890_abc123.pdf
│   │   │   └── image_1234567890_def456.jpg
│   │   └── folders/
│   │       └── folder-id-1/
│   │           └── document_1234567890_ghi789.docx
│   └── user-id-2/
│       └── root/
│           └── ...
```

## 8. Security Considerations

- Never commit AWS credentials to version control
- Use IAM roles instead of access keys in production
- Enable CloudTrail for audit logging
- Consider using AWS KMS for additional encryption
- Regularly rotate access keys
- Monitor S3 usage and costs

## 9. Cost Optimization

- Use S3 Intelligent Tiering for automatic cost optimization
- Set up lifecycle policies for old files
- Monitor and optimize storage usage
- Consider using S3 Transfer Acceleration for better upload speeds

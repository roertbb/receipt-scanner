import { Textract, DynamoDB } from "aws-sdk";
import { S3CreateEvent } from "aws-lambda";

const TableName = process.env.TABLE_NAME!;
const textract = new Textract();
const db = new DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME || "";
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || "";
const SNS_ROLE_ARN = process.env.SNS_ROLE_ARN || "";

export const handler = async (event: S3CreateEvent) => {
  const id = event.Records[0].s3.object.key;

  const params: Textract.StartDocumentTextDetectionRequest = {
    DocumentLocation: {
      S3Object: {
        Bucket: BUCKET_NAME,
        Name: id,
      },
    },
    NotificationChannel: {
      RoleArn: SNS_ROLE_ARN,
      SNSTopicArn: SNS_TOPIC_ARN,
    },
  };

  const createdAt = new Date().valueOf();

  const Item = {
    id,
    createdAt,
    processedAt: undefined,
  };

  try {
    await Promise.all([
      db.put({ TableName, Item }).promise(),
      textract.startDocumentTextDetection(params).promise(),
    ]);
  } catch (error) {
    console.error({ error });
  }
};

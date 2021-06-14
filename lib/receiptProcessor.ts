import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import {
  S3EventSource,
  SnsEventSource,
} from "@aws-cdk/aws-lambda-event-sources";

type Props = {
  receiptBucket: s3.Bucket;
  receiptTable: ddb.Table;
};

export class ReceiptProcessor extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    { receiptBucket, receiptTable }: Props
  ) {
    super(scope, id);

    // textractServiceRole
    const textract = new iam.ServicePrincipal("textract.amazonaws.com");
    const textractServiceRole = new iam.Role(this, "textractServiceRole", {
      roleName: "textractServiceRole",
      assumedBy: textract,
    });

    // receiptProcessedTopic
    const snsReceiptProcessedTopic = new sns.Topic(
      this,
      "receiptProcessedTopic",
      { topicName: "receiptProcessedTopic" }
    );
    snsReceiptProcessedTopic.grantPublish(textractServiceRole);

    // sendReceiptToTextractLambda
    const sendReceiptToTextractLambda = new lambda.Function(
      this,
      "sendReceiptToTextractLambda",
      {
        functionName: "send-receipt-to-textract",
        code: lambda.Code.fromAsset("lambda/sendReceiptToTextract"),
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          BUCKET_NAME: receiptBucket.bucketName,
          TABLE_NAME: receiptTable.tableName,
          SNS_TOPIC_ARN: snsReceiptProcessedTopic.topicArn,
          SNS_ROLE_ARN: textractServiceRole.roleArn,
        },
        memorySize: 512,
        events: [
          new S3EventSource(receiptBucket, {
            events: [s3.EventType.OBJECT_CREATED],
          }),
        ],
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["textract:StartDocumentTextDetection"],
            resources: ["*"],
          }),
        ],
        tracing: lambda.Tracing.ACTIVE,
      }
    );
    receiptTable.grantWriteData(sendReceiptToTextractLambda);
    receiptBucket.grantRead(sendReceiptToTextractLambda);

    // sendTextractResultToDynamoLambda
    const sendTextractResultToDynamoLambda = new lambda.Function(
      this,
      "sendTextractResultToDynamoLambda",
      {
        functionName: "send-textract-result-to-dynamo",
        code: lambda.Code.fromAsset("lambda/sendTextractResultToDynamo"),
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: receiptTable.tableName,
          SNS_TOPIC_ARN: snsReceiptProcessedTopic.topicArn,
          SNS_ROLE_ARN: textractServiceRole.roleArn,
        },
        memorySize: 512,
        events: [new SnsEventSource(snsReceiptProcessedTopic)],
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["textract:GetDocumentTextDetection"],
            resources: ["*"],
          }),
        ],
        tracing: lambda.Tracing.ACTIVE,
      }
    );
    receiptTable.grantWriteData(sendTextractResultToDynamoLambda);
  }
}

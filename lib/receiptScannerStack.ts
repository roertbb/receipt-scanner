import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { ReceiptAPI } from "./api";
import { ReceiptProcessor } from "./receiptProcessor";

export class ReceiptScannerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const receiptBucket = new s3.Bucket(this, "receiptBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const receiptTable = new ddb.Table(this, "receiptTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new ReceiptAPI(this, "receiptAPI", {
      receiptBucket,
      receiptTable,
    });

    new ReceiptProcessor(this, "receiptProcessor", {
      receiptBucket,
      receiptTable,
    });
  }
}

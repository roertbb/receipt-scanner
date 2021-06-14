import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";

type Props = {
  receiptBucket: s3.Bucket;
  receiptTable: ddb.Table;
};

export class ReceiptAPI extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    { receiptBucket, receiptTable }: Props
  ) {
    super(scope, id);

    // getReceiptsLambda
    const getReceiptsLambda = new lambda.Function(this, "getReceiptsLambda", {
      functionName: "get-receipts",
      code: lambda.Code.fromAsset("lambda/getReceipts"),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: receiptTable.tableName,
      },
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });
    receiptTable.grantReadData(getReceiptsLambda);

    // getPresignedURLLambda
    const getPresignedURLLambda = new lambda.Function(
      this,
      "getPresignedURLLambda",
      {
        functionName: "get-presigned-url",
        code: lambda.Code.fromAsset("lambda/getPresignedURL"),
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          BUCKET_NAME: receiptBucket.bucketName,
        },
        memorySize: 512,
        tracing: lambda.Tracing.ACTIVE,
      }
    );
    receiptBucket.grantPut(getPresignedURLLambda);

    const api = new apigateway.RestApi(this, "books-api", { deploy: false });
    const receipts = api.root.addResource("receipts");
    receipts.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getReceiptsLambda)
    );
    receipts.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getPresignedURLLambda)
    );

    const deployment = new apigateway.Deployment(
      this,
      "restAPIStageDeployment",
      { api }
    );
    const stage = new apigateway.Stage(this, "restAPIStage", {
      stageName: "dev",
      deployment,
      tracingEnabled: true,
    });

    // output
    new cdk.CfnOutput(this, "recceiptURL", {
      value: stage.urlForPath("/receipts"),
    });
  }
}

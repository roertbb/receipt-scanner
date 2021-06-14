import { DynamoDB } from "aws-sdk";

const TableName = process.env.TABLE_NAME!;
const db = new DynamoDB.DocumentClient();

export const handler = async () => {
  try {
    const params = { TableName: TableName };
    const { Items: receipts } = await db.scan(params).promise();

    if (receipts) {
      return {
        body: JSON.stringify(receipts),
        statusCode: 200,
      };
    }
  } catch (error) {
    console.log({ error });
  }

  return {
    body: JSON.stringify([]),
    statusCode: 500,
  };
};

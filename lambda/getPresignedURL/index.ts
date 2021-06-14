import { S3 } from "aws-sdk";
import { uuid } from "uuidv4";

const BucketName = process.env.BUCKET_NAME!;
const s3 = new S3();
const URL_EXPIRATION_SECONDS = 300;

export const handler = async () => {
  const filename = uuid();

  const s3Params = {
    Bucket: BucketName,
    Key: filename,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: "image/jpeg",
  };

  const url = await s3.getSignedUrlPromise("putObject", s3Params);

  return {
    statusCode: 200,
    body: JSON.stringify({ url, filename }),
  };
};

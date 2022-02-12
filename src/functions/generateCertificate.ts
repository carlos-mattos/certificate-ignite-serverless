import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbCliente";
import handlebars from "handlebars";
import { join } from "path";
import { readFileSync } from "fs";
import chromium from "chrome-aws-lambda";
import { S3 } from "aws-sdk";

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface ITemplate {
  id: string;
  name: string;
  grade: string;
  medal: string;
  date: string;
}

const compile = async (data: ITemplate) => {
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs");

  const html = readFileSync(filePath, "utf8");

  return handlebars.compile(html)(data);
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;

  const response = await document
    .query({
      TableName: "users_certificate",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  const userAlreadyExists = response.Items[0];

  if (!userAlreadyExists) {
    await document
      .put({
        TableName: "users_certificate",
        Item: { id, name, grade, createdAt: new Date().toISOString() },
      })
      .promise();
  }

  const medalPath = join(process.cwd(), "src", "templates", "selo.png");
  const medal = readFileSync(medalPath, "base64");
  const content = await compile({
    date: new Date().toISOString(),
    grade,
    id,
    medal,
    name,
  });

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  });
  const page = await browser.newPage();
  await page.setContent(content);
  const pdf = await page.pdf({
    format: "a4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
  });

  await browser.close();

  const s3 = new S3();

  // await s3
  //   .createBucket({
  //     Bucket: "ignitecertificateserverless",
  //   })
  //   .promise();

  await s3
    .putObject({
      Bucket: "ignitecertificateserverless",
      Key: `${id}.pdf`,
      ACL: "public-read",
      Body: pdf,
      ContentType: "application/pdf",
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Certificado criado com sucesso",
      url: `https://ignitecertificateserverless.s3.amazonaws.com/${id}.pdf`,
    }),
  };
};

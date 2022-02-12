import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbCliente";
import * as handlebars from "handlebars";
import { join } from "path";
import { readFileSync } from "fs";

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

  await document
    .put({
      TableName: "users_certificate",
      Item: { id, name, grade, createdAt: new Date().toISOString() },
    })
    .promise();

  const response = await document
    .query({
      TableName: "users_certificate",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  const medalPath = join(process.cwd(), "src", "templates", "selo.png");
  const medal = readFileSync(medalPath, "base64");
  const content = await compile({ date: new Date().toISOString(), grade, id, medal, name });

  return {
    statusCode: 200,
    body: JSON.stringify(response.Items[0]),
  };
};

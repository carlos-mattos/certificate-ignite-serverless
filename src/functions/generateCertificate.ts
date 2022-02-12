import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbCliente";

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

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

  return {
    statusCode: 200,
    body: JSON.stringify(response.Items[0]),
  };
};

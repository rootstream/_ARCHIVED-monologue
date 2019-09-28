const _ = require("lodash");
const AWS = require("aws-sdk");

const region = _.get(process.env, "AWS_REGION", "us-west-2");
AWS.config.update({ region });

exports.handler = async function(event, _context) {
  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  try {
    const messageBody = JSON.parse(event.body);
    const payload = messageBody.payload;
    const from = event.requestContext.connectionId;
    const to = messageBody.id;

    await apiGatewayManagementApi
      .postToConnection({ ConnectionId: to, Data: { to, from, payload } })
      .promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "OK" };
};

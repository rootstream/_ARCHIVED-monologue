const AWS = require("aws-sdk");

exports.handler = async function(event, _context) {
  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  try {
    const messageBody = JSON.parse(event.body);
    const payload = messageBody.payload;
    const from = event.requestContext.connectionId;
    const to = from; // this route responds back to sender

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: to,
        Data: JSON.stringify({ to, from, payload })
      })
      .promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "OK" };
};

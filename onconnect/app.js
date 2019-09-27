const _ = require("lodash");
const AWS = require("aws-sdk");

const region = _.get(process.env, "AWS_REGION", "us-west-2");
AWS.config.update({ region });

exports.handler = async function(event, _context) {
  return {
    statusCode: 200,
    body: { id: event.requestContext.connectionId }
  };
};

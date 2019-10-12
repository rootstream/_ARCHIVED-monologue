const _ = require('lodash');
const AJV = require('ajv');
const AWS = require('aws-sdk');
const debug = require('debug')('monologue:router');
const assert = require('assert');

const messageSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  $id: 'monologue/root',
  type: 'object',
  properties: {
    to: {
      minLength: 1,
      type: 'string',
      $id: '#/properties/to',
      description: 'API Gateway websocket connection ID',
    },
    from: {
      minLength: 1,
      type: 'string',
      $id: '#/properties/from',
      description: 'API Gateway websocket connection ID',
    },
    payload: {
      type: 'object',
      $id: '#/properties/payload',
      additionalProperties: false,
      properties: {
        type: {
          minLength: 1,
          type: 'string',
          $id: '#/properties/payload/type',
          description: 'payload type string',
        },
        data: {
          type: 'object',
          $id: '#/properties/payload/data',
          description: 'payload data object',
        },
      },
      required: ['type'],
    },
  },
  required: ['to', 'from'],
};

AWS.config.update({ region: process.env.DEPLOY_REGION });
const agw = new AWS.ApiGatewayManagementApi({ endpoint: process.env.AGW_ENDPOINT });
const sqs = new AWS.SQS();

async function route(message) {
  debug('routing message %o to: %s', message, process.env.AGW_ENDPOINT);
  const ajv = new AJV();
  assert.ok(ajv.validate(messageSchema, message));
  await agw
    .postToConnection({
      ConnectionId: message.to,
      Data: JSON.stringify({ from: message.from, payload: message.payload }),
    })
    .promise();
}

exports.handler = async function(event, context) {
  debug('event: %o context: %o', event, context);
  if (event.Records) {
    // this message is a batch coming from SQS
    await Promise.all(event.Records.map(record => route(JSON.parse(record.body))));
  } else if (_.get(event, 'requestContext.routeKey') === '$connect') {
    // this message is triggered by the $connect route
    debug('connecting $connect message in queue: %s', process.env.CONNECT_QUEUE);
    await sqs
      .sendMessage({
        MessageBody: JSON.stringify({
          to: event.requestContext.connectionId,
          from: event.requestContext.connectionId,
          payload: {
            type: 'whoami',
            data: {
              connectionId: event.requestContext.connectionId,
            },
          },
        }),
        QueueUrl: process.env.CONNECT_QUEUE,
      })
      .promise();
  } else {
    // this message is coming from all other unregistered routes ($default)
    const message = JSON.parse(event.body);
    await route(message);
  }
};

'use strict';

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
  required: ['to', 'from', 'payload'],
};

AWS.config.update({ region: process.env.REGION });
const agw = new AWS.ApiGatewayManagementApi({ endpoint: process.env.ENDPOINT });

async function send(to, message) {
  assert.ok(_.isString(to));
  assert.ok(_.isString(message));
  await agw.postToConnection({ ConnectionId: to, Data: message }).promise();
}

async function route(message) {
  debug('routing message %o to: %s', message, process.env.ENDPOINT);
  const ajv = new AJV();
  assert.ok(ajv.validate(messageSchema, message));
  await send(message.to, JSON.stringify({ from: message.from, payload: message.payload }));
}

exports.lambdaHandler = async function(event, context) {
  debug('event: %o context: %o', event, context);
  if (_.get(event, 'body') === 'whoami') {
    const connId = event.requestContext.connectionId;
    debug('sending a whoami packet to: %s', connId);
    await send(connId, connId);
  } else {
    // this message is coming from all other unregistered routes ($default)
    const message = JSON.parse(event.body);
    _.set(message, 'from', event.requestContext.connectionId);
    await route(message);
  }

  return { statusCode: 200, body: 'OK' };
};

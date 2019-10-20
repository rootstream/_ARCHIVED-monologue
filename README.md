# monologue

[![CircleCI](https://circleci.com/gh/rootstream/monologue/tree/master.svg?style=svg)](https://circleci.com/gh/rootstream/monologue/tree/master)

Infinitely scalable serverless system-to-system messaging solution based on AWS Lambda, API Gateway and SQS.

This solution was originally designed to be used in rootstream peer engine to make the engine serverless by relaying
messages in between instances.

## usage

```bash
npm install --save @rootstream/monologue
```

Before you continue, you need to have a working deployment. See section below on how to deploy this to your AWS account.

The API is modeled after Socket.IO [ACKs](https://socket.io/docs/#Sending-and-getting-data-acknowledgements).

```JS
const Monologue = require('@rootstream/monologue);

const machine1 = new Monologue();
await machine1.connect();
machine1.on('sample-method', async (arg1, arg2) => {
  return `hello from ${arg1} ${arg2}!`;
})

const machine2 = new Monologue();
await machine2.connect();
await machine2.call(machine1.id, 'sample-method', 'from', 'machine1').then(ret => {
  console.log(ret); // prints: "hello from machine1!"
})
```

## deploy and test

You need both AWS and AWS SAM CLIs installed and configured.

To deploy to your AWS account:

```bash
# to deploy a production stack
npm run redploy:prod
# to deploy a test stack
npm run redploy:test
# to run tests
npm test
```

After a successful deployment, you'll get a `.monologuerc` file with your Monologue endpoint and API key used during web
socket connections to API Gateway.

To remove the deployment:

```bash
# to remove deployment of the production stack
npm run undploy:prod
# to remove deployment of the test stack
npm run undploy:test
```

## API

### `new Monologue(options)`

Constructor, creates a new instance of the RPC client.

#### options

- `endpoint`: Monologue endpoint to connect to
- `apiKey`: API key to be used to connect to the Monologue endpoint
- `timeout`: timeout for all network operations over websocket (before RPC calls are considered expired - default: 15s)
- `listeners`: maximum number of RPC methods you are trying to register over Monologue (default: 100)

### `connect()`

Attempts to connect to the endpoint passed in the constructor. This is an async method. You should `await` it. This is
not reentrant!

### `call(to, name, ...args)`

Calls into a method named `name` on registered client with id `to`.

- `to`: ID of the remote machine. Can be obtained via `.connectionId` property on a `Monologue` instance
- `name`: name of the remote RPC method
- `...args`: any number of arguments passed to the remote method

This is an async method. You should `await` it. Result of the `await` is remote method's return value.

### `close()`

Closes the connection. You should `await` it. This is not reentrant!

## limits

Apart from all limits of AWS Lambda and API Gateway, you should know that Monologue was not designed to be able to
handle RPC connections that need to last hours. The maximum connection time is 2 hours. After 2 hours the websocket is
closed and upon reconnection a new ID is generated.

## design

Monologue is extremely simple in design. Components in its design are as follows:

1. API Gateway websocket
1. AWS Lambda nodejs

Upon connection through `connect()`, API Gateway verifies the validity of the API key. After connection, client sends a
`whoami` packet. The response will be processed by the Lambda and it's the connection ID that Lambda sees.

Upon receive of the `whoami` response, the machine knows its connection ID and can call into other connected machines.

Calls are done over an asynchronous request/response pattern. Caller sends a request packet with function name and args.
Callee sends back a response packet with function's return value. Response and request calls are identified from each
other by randomly generated tokens.

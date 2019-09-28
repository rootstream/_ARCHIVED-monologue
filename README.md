# monologue

Infinitely scalable serverless system-to-system messaging solution based on AWS Lambda.

This solution was originally designed to be used in rootstream peer engine to make the
engine serverless by relaying messages in between instances.

## deploy

You need both AWS and AWS SAM CLIs installed and configured.

To deploy to your AWS account:

```bash
npm run package
npm run deploy
npm run describe
```

To remove the deployment:

```bash
npm run undeploy
```

## test drive

you can use `wscat` utility to test the deployment (`npm install -g wscat`)

bash window 1:

```bash
wscat -c wss://btfufl6oid.execute-api.us-west-2.amazonaws.com/latest
connected (press CTRL+C to quit)
> {"action":"loopback"}
< {"to":"AtuLLemUPHcCItg=","from":"AtuLLemUPHcCItg="}
> {"action":"sendmessage","payload":"hello!","to":"AtuMbe4FvHcCE0g="}
< {"to":"AtuLLemUPHcCItg=","from":"AtuMbe4FvHcCE0g=","payload":"hello!"}
> {"action":"sendmessage","payload":"hello hello!","to":"AtuMbe4FvHcCE0g="}
< {"to":"AtuLLemUPHcCItg=","from":"AtuMbe4FvHcCE0g=","payload":"hello!???"}
```

bash window 2:

```bash
wscat -c wss://btfufl6oid.execute-api.us-west-2.amazonaws.com/latest
connected (press CTRL+C to quit)
> {"action":"loopback"}
< {"to":"AtuMbe4FvHcCE0g=","from":"AtuMbe4FvHcCE0g="}
< {"to":"AtuMbe4FvHcCE0g=","from":"AtuLLemUPHcCItg=","payload":"hello!"}
> {"action":"sendmessage","payload":"hello!","to":"AtuLLemUPHcCItg="}
< {"to":"AtuMbe4FvHcCE0g=","from":"AtuLLemUPHcCItg=","payload":"hello hello!"}
> {"action":"sendmessage","payload":"hello!???","to":"AtuLLemUPHcCItg="}
```

## design

Monologue is extremely simple in design. Once deployed it creates exactly two routes
within an API Gateway websocket deployment. The two routes are:

1. `sendmessage`: accepts a `to` field and an optional `payload` field. `to` is an API Gateway connection ID, This route then sends the payload to the specified connection ID in API Gateway.
1. `loopback`: accepts an optional `payload` field. This route then sends the payload back to the sender with its connection ID in API Gateway. Used for connection identification.

The Monologue client uses these two routes to implement a peer to peer RPC solution very similar to [socket.io ACKs](https://socket.io/docs/#Sending-and-getting-data-acknowledgements).

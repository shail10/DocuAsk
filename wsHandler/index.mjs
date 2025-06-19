import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb'

const ddb = new DynamoDBClient({ region: 'us-east-1' })
const TABLE_NAME = 'WebSocketConnections'

export const handler = async (event) => {
  const routeKey = event.requestContext.routeKey
  const connectionId = event.requestContext.connectionId

  if (routeKey === '$connect') {
    // No action needed
    return { statusCode: 200 }
  }

  if (routeKey === '$disconnect') {
    // Find and delete entry with this connectionId (optional improvement)
    console.log(`Disconnected: ${connectionId}`)
    return { statusCode: 200 }
  }

  if (routeKey === 'register') {
    const body = JSON.parse(event.body || '{}')
    const fileId = body.fileId

    if (!fileId) {
      return { statusCode: 400, body: 'Missing fileId' }
    }

    const ttl = Math.floor(Date.now() / 1000) + 600 // optional: expire after 10 min

    const cmd = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        fileId: { S: fileId },
        connectionId: { S: connectionId },
        ttl: { N: ttl.toString() },
      },
    })

    await ddb.send(cmd)

    return { statusCode: 200, body: 'Registered' }
  }

  return { statusCode: 400, body: 'Unknown route' }
}

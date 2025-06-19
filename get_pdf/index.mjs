import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'

const dynamo = new DynamoDBClient({ region: 'us-east-1' })
const TABLE_NAME = 'doc-registry'

function sendResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    },
    body: JSON.stringify(body),
  }
}

export const handler = async () => {
  try {
    const scanParams = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'docid, docName',
    })

    const data = await dynamo.send(scanParams)

    const documents = (data.Items || []).map((item) => ({
      docid: item.docid.S,
      docName: item.docName.S,
    }))

    return sendResponse(200, { documents })
  } catch (err) {
    console.error('Error fetching documents:', err)
    return sendResponse(500, { error: 'Internal server error' })
  }
}

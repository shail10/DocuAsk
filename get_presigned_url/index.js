const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb')

const s3 = new S3Client({ region: 'us-east-1' })
const dynamo = new DynamoDBClient({ region: 'us-east-1' })

const BUCKET_NAME = 'research-paper-input'
const EXPIRES_IN_SECONDS = 100
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

exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body

    const docId = body.docId
    const docName = body.docName

    if (!docId || typeof docId !== 'string') {
      return sendResponse(400, { error: 'Missing or invalid docId' })
    }

    console.log(body)

    // 🗃 Store in DynamoDB
    const putParams = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        docid: { S: docId },
        docName: { S: docName || 'Untitled' },
      },
    })

    await dynamo.send(putParams)

    // 📦 Generate presigned S3 upload URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: docId,
      ContentType: 'application/pdf',
    })

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: EXPIRES_IN_SECONDS,
    })

    return sendResponse(200, {
      uploadUrl,
      key: docId,
    })
  } catch (err) {
    console.error('Error:', err)
    return sendResponse(500, { error: 'Internal server error' })
  }
}

const AWS = require('aws-sdk')
const pdf = require('pdf-parse')
const { Pinecone } = require('@pinecone-database/pinecone')
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb')
const { ApiGatewayManagementApi } = require('aws-sdk')

// AWS clients
const s3 = new AWS.S3()
const REGION = 'us-east-1'
const sagemakerRuntime = new AWS.SageMakerRuntime({ region: REGION })

// SageMaker endpoint
const ENDPOINT_NAME = 'embedding-model-endpoint'

// Pinecone setup
const pinecone = new Pinecone({
  apiKey:
    'pcsk_5mop8N_95HagCYFNGFTbcmcXGTF9oocmo53Eht6m7BAdNNA44RGcQioEwb6ZiQELxpEhar',
})

const pineconeIndex = pinecone.index(
  'csci-5411',
  'https://csci-5411-gyw2og3.svc.aped-4627-b74a.pinecone.io'
)
// const pineconeIndex = pinecone.Index('csci-5411')

// Call SageMaker endpoint for embeddings
function invokeSageMakerEndpoint(text) {
  const params = {
    EndpointName: ENDPOINT_NAME,
    ContentType: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  }

  return new Promise((resolve, reject) => {
    sagemakerRuntime.invokeEndpoint(params, (err, data) => {
      if (err) return reject(err)
      const body = JSON.parse(Buffer.from(data.Body).toString('utf8'))
      resolve(body)
    })
  })
}

// Mean pool token embeddings
function meanPool(embedding) {
  const tokenCount = embedding.length
  const dim = embedding[0].length
  const pooled = new Array(dim).fill(0)

  for (let i = 0; i < tokenCount; i++) {
    for (let j = 0; j < dim; j++) {
      pooled[j] += embedding[i][j]
    }
  }

  return pooled.map((x) => x / tokenCount)
}

// Lambda handler
exports.handler = async (event) => {
  const inputBucket = event.Records[0].s3.bucket.name
  const inputKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  )

  try {
    // 1. Get PDF from S3
    const s3Object = await s3
      .getObject({ Bucket: inputBucket, Key: inputKey })
      .promise()
    const dataBuffer = s3Object.Body

    // 2. Extract text from PDF
    const data = await pdf(dataBuffer)
    const rawText = data.text

    // 3. Split into sentences
    const sentences = rawText
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 10)

    const vectorData = []

    // 4. Embed each sentence and prepare vector
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const clipped = sentence.slice(0, 400) // Clip to safe input size
      const response = await invokeSageMakerEndpoint(clipped)

      // Defensive check for valid shape (should be 2D array of numbers)
      if (
        !Array.isArray(response) ||
        !Array.isArray(response[0]) ||
        !Array.isArray(response[0][0]) ||
        typeof response[0][0][0] !== 'number'
      ) {
        console.warn(`Skipping malformed embedding for: "${sentence}"`)
        continue
      }

      const tokenEmbeddings = response[0]
      const pooled = meanPool(tokenEmbeddings)

      vectorData.push({
        id: `${inputKey}-${i}`,
        values: pooled,
        metadata: {
          text: sentence,
          source: inputKey,
        },
      })
    }

    // 5. Upsert into Pinecone
    await pineconeIndex.upsert(vectorData)

    const dynamo = new DynamoDBClient({ region: REGION })
    const TABLE_NAME = 'WebSocketConnections'
    const fileId = inputKey

    const getCmd = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        fileId: { S: fileId },
      },
    })

    let connectionId

    try {
      const result = await dynamo.send(getCmd)
      if (!result.Item) throw new Error('No connectionId found for fileId')
      connectionId = result.Item.connectionId.S
    } catch (err) {
      console.error('DynamoDB lookup failed:', err)
      return {
        statusCode: 200,
        body: `Stored ${vectorData.length} vectors, no WebSocket push (DynamoDB miss)`,
      }
    }

    const apigw = new ApiGatewayManagementApi({
      endpoint: 'ip40txrdye.execute-api.us-east-1.amazonaws.com/production',
    })

    try {
      await apigw
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ status: 'ready', fileId }),
        })
        .promise()
    } catch (err) {
      console.error('WebSocket push failed:', err)
    }

    return {
      statusCode: 200,
      body: `Stored ${vectorData.length} vectors in Pinecone index "csci-5411"`,
    }
  } catch (err) {
    console.error(err)
    throw new Error('Processing failed: ' + err.message)
  }
}

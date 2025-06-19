const AWS = require('aws-sdk')
const { Pinecone } = require('@pinecone-database/pinecone')

// AWS Setup
const REGION = 'us-east-1'
const sagemakerRuntime = new AWS.SageMakerRuntime({ region: REGION })

const FLAN_ENDPOINT = 'flan-t5-model-endpoint-v1' // Set this
const EMBEDDING_ENDPOINT = 'embedding-model-endpoint'
const PINECONE_API_KEY =
  'pcsk_5mop8N_95HagCYFNGFTbcmcXGTF9oocmo53Eht6m7BAdNNA44RGcQioEwb6ZiQELxpEhar'
const PINECONE_HOST = 'https://csci-5411-gyw2og3.svc.aped-4627-b74a.pinecone.io'
const PINECONE_INDEX_NAME = 'csci-5411'
const SOURCE_PDF = '095bbe15-d27d-499d-91b9-d3f846d57d98'

// Init Pinecone client
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY })
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME, PINECONE_HOST)

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

// Embed text using SageMaker
async function getEmbedding(text) {
  const params = {
    EndpointName: EMBEDDING_ENDPOINT,
    ContentType: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  }

  const response = await sagemakerRuntime.invokeEndpoint(params).promise()
  const tokenEmbeddings = JSON.parse(
    Buffer.from(response.Body).toString('utf8')
  )[0]

  // Mean pool
  const dim = tokenEmbeddings[0].length
  const pooled = new Array(dim).fill(0)

  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) {
      pooled[i] += token[i]
    }
  }

  return pooled.map((x) => x / tokenEmbeddings.length)
}

exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body

    const userQuery = body.query
    const docId = body.docId

    if (
      !userQuery ||
      typeof userQuery !== 'string' ||
      !docId ||
      typeof docId !== 'string'
    ) {
      // return {
      //   statusCode: 400,
      //   body: JSON.stringify({
      //     error: 'Missing or invalid "query" or "docId" in request body',
      //   }),
      // }
      return sendResponse(400, {
        error: 'Missing or invalid "query" or "docId" in request body',
      })
    }

    // 1. Embed the query
    console.log(userQuery)
    const queryEmbedding = await getEmbedding(userQuery)

    // 2. Query Pinecone for top 3 context chunks from the same PDF
    const pineconeResults = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
      filter: {
        source: docId,
      },
    })

    // 3. Extract context
    const contextChunks = pineconeResults.matches
      .map((match) => match.metadata?.text)
      .filter(Boolean)

    const context = contextChunks.join('\n\n')

    // 4. Build final prompt
    const prompt = `You are a helpful assistant. Use the context below to answer the question.

Context:
${context}

Question:
${userQuery}

Answer:`

    // 5. Send to Flan-T5
    console.log(context)
    const flanParams = {
      EndpointName: FLAN_ENDPOINT,
      ContentType: 'application/json',
      Body: JSON.stringify({
        inputs: prompt,
        parameters: { max_length: 200 },
      }),
    }

    const result = await sagemakerRuntime.invokeEndpoint(flanParams).promise()
    const responsePayload = JSON.parse(
      Buffer.from(result.Body).toString('utf8')
    )

    // return {
    //   statusCode: 200,
    //   body: JSON.stringify({ answer: responsePayload[0].generated_text }),
    // }
    return sendResponse(200, { answer: responsePayload[0].generated_text })
  } catch (err) {
    console.error('Error during RAG processing:', err)
    // return {
    //   statusCode: 500,
    //   body: JSON.stringify({ error: 'Internal server error' }),
    // }
    return sendResponse(500, { error: 'Internal server error' })
  }
}

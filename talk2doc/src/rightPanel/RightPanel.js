import React from 'react'
import ChatPanel from '../chat/ChatPanel'

function RightPanel({ pdfFile, docId, isChatAvailable, documentName }) {
  console.log(docId)

  return (
    <div className='right-panel'>
      {!docId ? (
        <h1 className='chat-placeholder'>Upload a PDF to start chatting 🤖</h1>
      ) : !isChatAvailable ? (
        <div className='chat-placeholder'>
          <span className='loading-spinner' />
          <p>Processing your document... hang tight ⏳</p>
        </div>
      ) : (
        <div style={{ height: '100%' }}>
          <ChatPanel docId={docId} documentName={documentName} />
        </div>
      )}
    </div>
  )
}

export default RightPanel

import React, { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Document, Page } from 'react-pdf'
import { Modal, Input, Button } from 'antd'
import { v4 as uuidv4 } from 'uuid'

import axios from 'axios'
import LoadPdfModal from './LoadPdfModal'

import { toast } from 'react-toastify'

function LeftPanel({
  pdfFile,
  pdfUrl,
  setPdfFile,
  setPdfUrl,
  setDocId,
  setNumPages,
  numPages,
  pageNumber,
  setPageNumber,
  docId,
  setIsChatAvailable,
  setDocumentName,
}) {
  const WEBSOCKET_URL =
    'wss://7fzc577dk3.execute-api.us-east-1.amazonaws.com/prod/'

  const socketRef = useRef(null)

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isLoadPdfModal, setIsLoadPdfModal] = React.useState(false)
  const [docName, setDocName] = useState('')
  const [file, setFile] = React.useState(null)

  const handleOk = () => {
    const objectUrl = URL.createObjectURL(file)

    setPdfFile(file)
    setPdfUrl(objectUrl)

    const newDocId = uuidv4()
    setDocId(newDocId)
    uploadToS3(file, newDocId)
    setIsModalOpen(false)
    setDocumentName(docName)
  }
  const handleCancel = () => {
    setIsModalOpen(false)
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        setIsModalOpen(true)
        setFile(file)
      }
    },
  })

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const uploadToS3 = async (file, docId) => {
    try {
      const { data } = await axios.post(
        process.env.REACT_APP_UPLOAD_URL,
        { docId, docName },
        { headers: { 'Content-Type': 'application/json' } }
      )
      const { uploadUrl } = data
      // 2. Upload file to S3 using PUT
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': 'application/pdf' },
      })
    } catch (err) {
      console.error(' Upload failed:', err)
    }
  }

  useEffect(() => {
    if (!pdfFile) return

    const socket = new WebSocket(WEBSOCKET_URL)
    socketRef.current = socket

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          action: 'register',
          fileid: docId,
        })
      )
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.status === 'ready') {
        setIsChatAvailable(true)
      }
    }

    socket.onerror = (err) => {
      console.error('❌ WebSocket error:', err)
    }

    socket.onclose = () => {}

    return () => {
      socket.close()
    }
  }, [pdfFile])

  return (
    <div className='left-panel'>
      <div className='load-button-wrapper'>
        <Button type='primary' onClick={() => setIsLoadPdfModal(true)}>
          Load Document
        </Button>
      </div>
      {!pdfUrl ? (
        <div {...getRootProps()} className='upload-box'>
          <input {...getInputProps()} />
          <h1>📤 Drag & drop a PDF or click to upload</h1>
        </div>
      ) : (
        <>
          <div className='pdf-viewer-container'>
            <div className='pdf-scroll-area'>
              <Document
                key={pdfUrl}
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) =>
                  console.error('PDF load error:', error.message)
                }
                loading={<p className='loading-msg'>📄 Loading PDF...</p>}
              >
                <Page pageNumber={pageNumber} />
              </Document>
            </div>
            <div className='pdf-controls'>
              <button
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
              >
                ⬅ Prev
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() =>
                  setPageNumber((prev) => Math.min(prev + 1, numPages))
                }
                disabled={pageNumber >= numPages}
              >
                Next ➡
              </button>
            </div>
          </div>
        </>
      )}
      <Modal
        title='Add Document Name'
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Input
          placeholder='Enter Document Name'
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
        />
      </Modal>
      <LoadPdfModal
        isLoadPdfModal={isLoadPdfModal}
        setIsLoadPdfModal={setIsLoadPdfModal}
        setDocName={setDocName}
        setDocId={setDocId}
        setPdfFile={setPdfFile}
        setPdfUrl={setPdfUrl}
        setIsChatAvailable={setIsChatAvailable}
        setDocumentName={setDocumentName}
      />
    </div>
  )
}

export default LeftPanel

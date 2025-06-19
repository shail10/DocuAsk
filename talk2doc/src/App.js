import React, { useState, useEffect } from 'react'
import './App.css'
import { pdfjs } from 'react-pdf'
import RightPanel from './rightPanel/RightPanel'
import LeftPanel from './leftPanel/LeftPanel'
import { ToastContainer, toast } from 'react-toastify'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [docId, setDocId] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [numPages, setNumPages] = useState()
  const [pageNumber, setPageNumber] = useState(1)
  const [isChatAvailable, setIsChatAvailable] = useState(false)

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  return (
    <div className='app-wrapper'>
      <div className='app-header'>📄 Talk2Doc</div>
      <div className='app-container'>
        <LeftPanel
          pdfFile={pdfFile}
          pdfUrl={pdfUrl}
          setPdfFile={setPdfFile}
          setPdfUrl={setPdfUrl}
          setDocId={setDocId}
          setNumPages={setNumPages}
          pageNumber={pageNumber}
          numPages={numPages}
          setPageNumber={setPageNumber}
          docId={docId}
          setIsChatAvailable={setIsChatAvailable}
          setDocumentName={setDocumentName}
        />
        <RightPanel
          pdfFile={pdfFile}
          docId={docId}
          isChatAvailable={isChatAvailable}
          documentName={documentName}
        />
      </div>
      <ToastContainer
        position='top-right'
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        draggable
        theme='dark'
        toastClassName='custom-toast'
        bodyClassName='custom-toast-body'
      />
    </div>
  )
}

export default App

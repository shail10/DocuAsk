import React, { useState } from 'react'
import { Modal, Select } from 'antd'
import axios from 'axios'
import { toast } from 'react-toastify'

const LoadPdfModal = ({
  isLoadPdfModal,
  setIsLoadPdfModal,
  setDocId,
  setPdfUrl,
  setPdfFile,
  setIsChatAvailable,
  setDocumentName,
}) => {
  const [options, setOptions] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)

  const handleOk = async () => {
    setIsLoadPdfModal(false)
    setDocId(selectedDoc)

    try {
      const { data } = await axios.post(
        process.env.REACT_APP_GET_SINGLE_PDF_PRESIGNED_URL,
        { docId: selectedDoc },
        { headers: { 'Content-Type': 'application/json' } }
      )
      console.log(data)

      setPdfUrl(data.downloadUrl)
      setPdfFile(null) // optional: clear any uploaded file
      setIsChatAvailable(true)
      // toast.success('Document processed successfully', {
      //   icon: false,
      // })
    } catch (err) {
      console.error('❌ Failed to fetch PDF URL:', err)
    }
  }

  const handleCancel = () => {
    setIsLoadPdfModal(false)
  }

  const handleDropdownVisibleChange = async (open) => {
    if (open && options.length === 0) {
      const { data } = await axios.post(
        process.env.REACT_APP_GET_PDFS,
        {},
        { headers: { 'Content-Type': 'application/json' } }
      )
      const fetchedOptions = data.documents.map((doc) => ({
        label: doc.docName,
        value: doc.docid,
      }))

      setOptions(fetchedOptions)
    }
  }

  return (
    <div>
      <Modal
        title='Add Document Name'
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isLoadPdfModal}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Select
          placeholder='Select a document'
          style={{ width: '100%' }}
          options={options}
          onOpenChange={handleDropdownVisibleChange}
          onChange={(value, option) => {
            setSelectedDoc(value)
            setDocumentName(option.label)
          }}
        />
      </Modal>
    </div>
  )
}

export default LoadPdfModal

import React, { useState, useEffect, useRef } from 'react'

export default function App() {
  const [file, setFile] = useState(null)
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const pollIntervalRef = useRef(null)

  const fetchFiles = async () => {
    try {
      const res = await fetch('http://localhost:8000/files')
      const data = await res.json()
      console.log('Fetched files:', data)
      setFiles(data)
      if (selected) {
        const detail = data.find(d => d.id === selected.id)
        setSelected(detail)
      }
      
      // Check if there are any files still processing (no transcription yet)
      const hasProcessingFiles = data.some(f => !f.transcription && f.uploaded_at)
      if (hasProcessingFiles && !pollIntervalRef.current) {
        // Start polling if we have processing files and aren't already polling
        startPolling()
      } else if (!hasProcessingFiles && pollIntervalRef.current) {
        // Stop polling if no files are processing
        stopPolling()
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const startPolling = () => {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(fetchFiles, 2000) // Poll every 2 seconds
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: form,
      })
      setFile(null)
      await fetchFiles() // Refresh the file list
      startPolling() // Start polling for updates
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    fetchFiles()
    
    // Cleanup polling on unmount
    return () => {
      stopPolling()
    }
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>OratorV2 - Audio Analysis</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept="audio/*"
          onChange={e => setFile(e.target.files[0])} 
          disabled={isProcessing}
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || isProcessing}
          style={{ marginLeft: '10px' }}
        >
          {isProcessing ? 'Uploading...' : 'Upload Audio'}
        </button>
      </div>

      {pollIntervalRef.current && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e7f3ff', 
          border: '1px solid #bee5eb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          🔄 Processing files in background... Analytics will appear when ready.
        </div>
      )}

      <h2>Uploaded Files</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {files.map(f => (
          <li 
            key={f.id} 
            onClick={() => setSelected(f)} 
            style={{
              cursor: 'pointer',
              padding: '10px',
              margin: '5px 0',
              backgroundColor: selected?.id === f.id ? '#e3f2fd' : '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{f.filename}</span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {f.transcription ? '✅ Analyzed' : '⏳ Processing...'}
            </span>
          </li>
        ))}
      </ul>

      {selected && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#fafafa'
        }}>
          <h2>Analysis for: {selected.filename}</h2>
          
          {selected.transcription ? (
            <>
              <div style={{ marginBottom: '15px' }}>
                <h3>Transcription</h3>
                <p style={{ 
                  padding: '10px', 
                  backgroundColor: 'white', 
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {selected.transcription}
                </p>
                <small style={{ color: '#666' }}>
                  Word count: {selected.word_count || 0}
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h3>📊 Summary</h3>
                <p style={{ 
                  padding: '10px', 
                  backgroundColor: 'white', 
                  border: '1px solid #eee',
                  borderRadius: '4px'
                }}>
                  {selected.summary || 'No summary available'}
                </p>
              </div>

              <div>
                <h3>Generated Questions</h3>
                <p style={{ 
                  padding: '10px', 
                  backgroundColor: 'white', 
                  border: '1px solid #eee',
                  borderRadius: '4px'
                }}>
                  {selected.questions || 'No questions generated'}
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <p>Processing audio file... This may take a few moments.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Analytics will appear here automatically when ready.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

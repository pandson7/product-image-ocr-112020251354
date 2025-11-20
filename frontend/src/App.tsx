import React, { useState, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'https://fic4qvdlke.execute-api.us-east-1.amazonaws.com/prod';

interface ExtractedData {
  productName: string;
  brand: string;
  category: string;
  price: string;
  dimensions: string;
  weight: string;
  description: string;
  additionalSpecs: Record<string, any>;
}

interface ProcessingResult {
  imageId: string;
  status: string;
  timestamp: string;
  extractedData?: ExtractedData;
  processingTime?: number;
  errorMessage?: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an image file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an image file');
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Process in chunks to avoid call stack overflow
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const base64Image = await convertToBase64(selectedFile);
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadResult = await response.json();
      setUploading(false);
      setProcessing(true);
      
      // Poll for processing status
      pollStatus(uploadResult.imageId);
      
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const pollStatus = async (imageId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status/${imageId}`);
        
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const statusResult = await response.json();
        
        if (statusResult.status === 'completed') {
          setProcessing(false);
          setResult(statusResult);
        } else if (statusResult.status === 'failed') {
          setProcessing(false);
          setError(statusResult.errorMessage || 'Processing failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setProcessing(false);
          setError('Processing timeout');
        }
      } catch (err) {
        setProcessing(false);
        setError(err instanceof Error ? err.message : 'Status check failed');
      }
    };

    poll();
  };

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploading(false);
    setProcessing(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Product Image OCR System</h1>
        <p>Upload product images to automatically extract specifications</p>
      </header>

      <main className="main-content">
        {!result && (
          <div className="upload-section">
            <div
              className={`drop-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="file-selected">
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Selected" 
                    className="preview-image"
                  />
                  <p>{selectedFile.name}</p>
                </div>
              ) : (
                <div className="drop-zone-content">
                  <p>Drag and drop an image here, or</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="file-input"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="file-label">
                    Choose File
                  </label>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="action-buttons">
                <button 
                  onClick={uploadImage} 
                  disabled={uploading || processing}
                  className="upload-btn"
                >
                  {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Process'}
                </button>
                <button onClick={reset} className="reset-btn">
                  Reset
                </button>
              </div>
            )}

            {(uploading || processing) && (
              <div className="status-indicator">
                <div className="spinner"></div>
                <p>{uploading ? 'Uploading image...' : 'Processing with AI...'}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={reset} className="reset-btn">Try Again</button>
          </div>
        )}

        {result && (
          <div className="results-section">
            <h2>Extracted Product Information</h2>
            <div className="result-grid">
              <div className="result-item">
                <strong>Product Name:</strong>
                <span>{result.extractedData?.productName || 'Not detected'}</span>
              </div>
              <div className="result-item">
                <strong>Brand:</strong>
                <span>{result.extractedData?.brand || 'Not detected'}</span>
              </div>
              <div className="result-item">
                <strong>Category:</strong>
                <span>{result.extractedData?.category || 'Not detected'}</span>
              </div>
              <div className="result-item">
                <strong>Price:</strong>
                <span>{result.extractedData?.price || 'Not detected'}</span>
              </div>
              <div className="result-item">
                <strong>Dimensions:</strong>
                <span>{result.extractedData?.dimensions || 'Not detected'}</span>
              </div>
              <div className="result-item">
                <strong>Weight:</strong>
                <span>{result.extractedData?.weight || 'Not detected'}</span>
              </div>
              <div className="result-item full-width">
                <strong>Description:</strong>
                <span>{result.extractedData?.description || 'Not detected'}</span>
              </div>
              {result.extractedData?.additionalSpecs && Object.keys(result.extractedData.additionalSpecs).length > 0 && (
                <div className="result-item full-width">
                  <strong>Additional Specifications:</strong>
                  <pre>{JSON.stringify(result.extractedData.additionalSpecs, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="processing-info">
              <p>Processing completed in {result.processingTime ? Math.round((Date.now() - result.processingTime) / 1000) : 'N/A'} seconds</p>
              <p>Image ID: {result.imageId}</p>
            </div>
            <button onClick={reset} className="process-another-btn">
              Process Another Image
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { contestAPI } from '../utils/apiClient';
import './ReceiptValidation.css';

interface ReceiptValidationProps {
  selectedBucket: string;
  selectedProject: string;
}

interface ReceiptSummary {
  total_receipts: number;
  confirmed: number;
  unconfirmed: number;
  errors: number;
  confirmation_rate: string;
  processing_timestamp: string;
  keyword_used: string;
  csv_location?: string;
}

const ReceiptValidation: React.FC<ReceiptValidationProps> = ({ selectedBucket, selectedProject }) => {
  const [summary, setSummary] = useState<ReceiptSummary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBucket && selectedProject) {
      loadSummary();
      loadKeywordFromRules();
    }
  }, [selectedBucket, selectedProject]);

  const loadKeywordFromRules = async () => {
    try {
      const rules = await contestAPI.getContestRules(selectedBucket, selectedProject);
      if (rules.receipt_product_keyword) {
        setKeyword(rules.receipt_product_keyword);
      } else if (rules.required_products && rules.required_products.length > 0) {
        setKeyword(rules.required_products[0]);
      }
    } catch (err) {
      console.warn('Could not load keyword from rules');
    }
  };

  const loadSummary = async () => {
    try {
      // Load latest summary from S3
      const summaryKey = `${selectedProject}/receipts/results/summary_latest.json`;
      const summaryData = await contestAPI.getS3Object(selectedBucket, summaryKey);
      setSummary(summaryData);
    } catch (err) {
      // No summary yet - that's okay
      setSummary(null);
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get presigned URL for ZIP upload
      const presignResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/presign/partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_PARTNER_API_KEY || ''
        },
        body: JSON.stringify({
          filename: 'receipts.zip',
          content_type: 'application/zip',
          client_name: selectedBucket.replace('sweepstakes-', ''),
          project_id: selectedProject
        })
      });

      if (!presignResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { upload_url, fields } = await presignResponse.json();

      // Upload ZIP using presigned URL
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok && uploadResponse.status !== 204) {
        throw new Error('Upload failed');
      }

      // Start polling for results
      setProcessing(true);
      pollForResults();

    } catch (err) {
      setError(`Upload failed: ${err}`);
      setUploading(false);
    }
  };

  const pollForResults = async () => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes

    const poll = setInterval(async () => {
      attempts++;

      try {
        await loadSummary();
        
        if (summary || attempts >= maxAttempts) {
          clearInterval(poll);
          setUploading(false);
          setProcessing(false);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setUploading(false);
          setProcessing(false);
          setError('Processing timeout - check CloudWatch logs');
        }
      }
    }, 5000); // Check every 5 seconds
  };

  const handleDownloadCSV = async () => {
    if (!summary?.csv_location) return;

    try {
      // Get presigned URL for download
      const downloadUrl = await contestAPI.getDownloadUrl(
        selectedBucket,
        summary.csv_location
      );
      
      // Trigger download
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(`Download failed: ${err}`);
    }
  };

  const handleUpdateKeyword = async () => {
    if (!keyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    try {
      // Update contest rules with new keyword
      const rules = await contestAPI.getContestRules(selectedBucket, selectedProject);
      rules.receipt_product_keyword = keyword.trim();
      await contestAPI.saveContestRules(selectedBucket, selectedProject, rules);
      
      alert('Keyword updated successfully!');
    } catch (err) {
      setError(`Failed to update keyword: ${err}`);
    }
  };

  if (!selectedBucket || !selectedProject) {
    return (
      <div className="receipt-validation">
        <p>Please select a client and project first</p>
      </div>
    );
  }

  return (
    <div className="receipt-validation">
      <h2>📸 Receipt Validation</h2>

      <div className="keyword-section">
        <h3>Product Keyword</h3>
        <p className="help-text">
          Enter the product name to search for in receipts (e.g., "Modelo", "Bud Light")
        </p>
        <div className="keyword-input-group">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter product keyword..."
            className="keyword-input"
          />
          <button onClick={handleUpdateKeyword} className="btn-secondary">
            Save Keyword
          </button>
        </div>
      </div>

      <div className="upload-section">
        <h3>Upload Receipt ZIP</h3>
        <p className="help-text">
          Upload a ZIP file containing all receipt JPEGs for this project.
          Filenames should be: firstname_lastname_YYYYMMDD_HHMMSS.jpg
        </p>
        
        <div className="file-upload-container">
          <input
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            disabled={uploading || processing}
            className="file-input"
            id="receipt-zip-upload"
          />
          <label htmlFor="receipt-zip-upload" className="file-label">
            {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Choose ZIP File'}
          </label>
        </div>

        {uploading && <p className="status uploading">⏳ Uploading ZIP file...</p>}
        {processing && (
          <p className="status processing">
            🔄 Processing receipts... This may take 1-2 seconds per receipt.
          </p>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {summary && (
        <div className="results-section">
          <h3>Validation Results</h3>
          
          <div className="summary-stats">
            <div className="stat-card total">
              <div className="stat-label">Total Receipts</div>
              <div className="stat-value">{summary.total_receipts}</div>
            </div>

            <div className="stat-card confirmed">
              <div className="stat-label">✓ Confirmed</div>
              <div className="stat-value">{summary.confirmed}</div>
              <div className="stat-percent">{summary.confirmation_rate}</div>
            </div>

            <div className="stat-card unconfirmed">
              <div className="stat-label">⚠ Needs Review</div>
              <div className="stat-value">{summary.unconfirmed}</div>
            </div>

            {summary.errors > 0 && (
              <div className="stat-card errors">
                <div className="stat-label">✗ Errors</div>
                <div className="stat-value">{summary.errors}</div>
              </div>
            )}
          </div>

          <div className="summary-details">
            <p><strong>Keyword Used:</strong> {summary.keyword_used}</p>
            <p><strong>Processed:</strong> {new Date(summary.processing_timestamp).toLocaleString()}</p>
          </div>

          <div className="actions">
            <button onClick={handleDownloadCSV} className="btn-primary">
              📥 Download CSV Report
            </button>
            <button
              onClick={() => window.open(`https://s3.console.aws.amazon.com/s3/buckets/${selectedBucket}?prefix=${selectedProject}/receipts/confirmed/`, '_blank')}
              className="btn-secondary"
            >
              View Confirmed Receipts
            </button>
            <button
              onClick={() => window.open(`https://s3.console.aws.amazon.com/s3/buckets/${selectedBucket}?prefix=${selectedProject}/receipts/needs-review/`, '_blank')}
              className="btn-secondary"
            >
              View Receipts Needing Review
            </button>
          </div>
        </div>
      )}

      {!summary && !processing && !uploading && (
        <div className="no-results">
          <p>No receipts processed yet for this project.</p>
          <p>Upload a ZIP file to begin validation.</p>
        </div>
      )}
    </div>
  );
};

export default ReceiptValidation;


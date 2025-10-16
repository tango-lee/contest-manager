import React, { useState, useRef } from 'react';
import { contestAPI } from '../utils/apiClient';
import './FileUpload.css';

interface FileUploadProps {
  bucketName: string;
  projectName: string;
  onUploadComplete?: (fileKey: string) => void;
  onUploadError?: (error: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  uploadType?: 'client' | 'partner';
  disabled?: boolean;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  bucketName,
  projectName,
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = ['.json', '.csv', '.xlsx', '.zip'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  uploadType = 'client',
  disabled = false
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type ${fileExtension} not supported. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const uploadId = Date.now().toString();
    const initialProgress: UploadProgress = {
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    };

    setUploads(prev => [...prev, initialProgress]);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Get presigned URL
      const presignResponse = uploadType === 'partner' 
        ? await contestAPI.getPartnerPresignedUploadUrl(bucketName, projectName, file.name, file.type)
        : await contestAPI.getPresignedUploadUrl(bucketName, projectName, file.name, file.type);

      // Upload to S3 using presigned URL
      const uploadResponse = await fetch(presignResponse.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Update progress to completed
      setUploads(prev => prev.map(upload => 
        upload.fileName === file.name 
          ? { ...upload, progress: 100, status: 'completed' as const }
          : upload
      ));

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(presignResponse.file_key);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Update progress to error
      setUploads(prev => prev.map(upload => 
        upload.fileName === file.name 
          ? { ...upload, status: 'error' as const, error: errorMessage }
          : upload
      ));

      // Notify parent component
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      uploadFile(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const removeUpload = (fileName: string) => {
    setUploads(prev => prev.filter(upload => upload.fileName !== fileName));
  };

  return (
    <div className="file-upload-container">
      <div 
        className={`file-upload-dropzone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <div className="upload-text">
          <p><strong>Click to upload</strong> or drag and drop files here</p>
          <p className="upload-hint">
            Supported formats: {acceptedFileTypes.join(', ')} 
            (Max {Math.round(maxFileSize / (1024 * 1024))}MB)
          </p>
          <p className="upload-destination">
            Uploading to: <code>{bucketName}/{projectName}/{uploadType === 'partner' ? 'entries/raw/' : 'project_docs/'}</code>
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {uploads.length > 0 && (
        <div className="upload-progress-container">
          <div className="upload-progress-header">
            <h4>Upload Progress</h4>
            <button onClick={clearUploads} className="clear-uploads-btn">
              Clear All
            </button>
          </div>
          
          {uploads.map((upload, index) => (
            <div key={index} className={`upload-progress-item ${upload.status}`}>
              <div className="upload-info">
                <span className="file-name">{upload.fileName}</span>
                <button 
                  onClick={() => removeUpload(upload.fileName)}
                  className="remove-upload-btn"
                  title="Remove from list"
                >
                  ×
                </button>
              </div>
              
              <div className="progress-bar-container">
                <div 
                  className={`progress-bar ${upload.status}`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              
              <div className="upload-status">
                {upload.status === 'uploading' && (
                  <span className="status-text uploading">Uploading...</span>
                )}
                {upload.status === 'completed' && (
                  <span className="status-text completed">✓ Completed</span>
                )}
                {upload.status === 'error' && (
                  <span className="status-text error">✗ {upload.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

import React, { useState, useEffect } from 'react';
import { contestAPI, ContestRules } from '../utils/apiClient';
import './ProjectConfig.css';

interface ProjectConfigProps {
  bucket: string;
  project: string;
  initialFlightStartDate?: string;
  initialFlightEndDate?: string;
  onConfigUpdated?: () => void;
}

const ProjectConfig: React.FC<ProjectConfigProps> = ({
  bucket,
  project,
  initialFlightStartDate,
  initialFlightEndDate,
  onConfigUpdated,
}) => {
  const [micrositeUrl, setMicrositeUrl] = useState('');
  const [flightStartDate, setFlightStartDate] = useState(initialFlightStartDate || '');
  const [flightEndDate, setFlightEndDate] = useState(initialFlightEndDate || '');
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [success, setSuccess] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [editMode, setEditMode] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    loadConfig();
  }, [bucket, project]);

  const loadConfig = async () => {
    try {
      const config = await contestAPI.getContestConfig(bucket, project);
      if (config) {
        setMicrositeUrl(config.microsite_url || '');
        setFlightStartDate(config.flight_start_date || initialFlightStartDate || '');
        setFlightEndDate(config.flight_end_date || initialFlightEndDate || '');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSaveMicrositeUrl = async () => {
    if (!micrositeUrl.trim()) {
      setErrors({ ...errors, micrositeUrl: 'Microsite URL is required' });
      return;
    }

    try {
      setLoading({ ...loading, micrositeUrl: true });
      setErrors({ ...errors, micrositeUrl: '' });

      await contestAPI.updateContestConfig(bucket, project, {
        microsite_url: micrositeUrl,
      });

      setSuccess({ ...success, micrositeUrl: 'Microsite URL saved successfully!' });
      setTimeout(() => setSuccess({ ...success, micrositeUrl: '' }), 3000);

      if (onConfigUpdated) onConfigUpdated();
    } catch (error) {
      setErrors({ ...errors, micrositeUrl: `Failed to save: ${error}` });
    } finally {
      setLoading({ ...loading, micrositeUrl: false });
    }
  };

  const handleSaveFlightDates = async () => {
    if (!flightStartDate || !flightEndDate) {
      setErrors({ ...errors, flightDates: 'Both dates are required' });
      return;
    }

    try {
      setLoading({ ...loading, flightDates: true });
      setErrors({ ...errors, flightDates: '' });

      await contestAPI.updateContestConfig(bucket, project, {
        flight_start_date: flightStartDate,
        flight_end_date: flightEndDate,
      });

      setSuccess({ ...success, flightDates: 'Flight dates saved successfully!' });
      setTimeout(() => setSuccess({ ...success, flightDates: '' }), 3000);
      setEditMode(false);

      if (onConfigUpdated) onConfigUpdated();
    } catch (error) {
      setErrors({ ...errors, flightDates: `Failed to save: ${error}` });
    } finally {
      setLoading({ ...loading, flightDates: false });
    }
  };

  const handleDeleteFlightDates = async () => {
    if (!window.confirm('Are you sure you want to delete flight dates?')) {
      return;
    }

    try {
      setLoading({ ...loading, flightDates: true });
      await contestAPI.deleteFlightDates(bucket, project);

      setFlightStartDate('');
      setFlightEndDate('');
      setSuccess({ ...success, flightDates: 'Flight dates deleted!' });
      setTimeout(() => setSuccess({ ...success, flightDates: '' }), 3000);

      if (onConfigUpdated) onConfigUpdated();
    } catch (error) {
      setErrors({ ...errors, flightDates: `Failed to delete: ${error}` });
    } finally {
      setLoading({ ...loading, flightDates: false });
    }
  };

  const handleGenerateQRCode = async () => {
    if (!micrositeUrl.trim()) {
      setErrors({ ...errors, qrCode: 'Please save microsite URL first' });
      return;
    }

    try {
      setLoading({ ...loading, qrCode: true });
      setErrors({ ...errors, qrCode: '' });

      const result = await contestAPI.generateQRCode(
        bucket,
        project,
        micrositeUrl,
        emailAddress || undefined
      );

      setSuccess({
        ...success,
        qrCode: `QR Code generated! ${result.email_sent ? 'Email sent to ' + emailAddress : ''}`,
      });
      setTimeout(() => setSuccess({ ...success, qrCode: '' }), 5000);

      // Open QR code in new tab
      window.open(result.qr_url, '_blank');
    } catch (error) {
      setErrors({ ...errors, qrCode: `Failed to generate QR code: ${error}` });
    } finally {
      setLoading({ ...loading, qrCode: false });
    }
  };

  const handleEmailConfig = async () => {
    if (!emailAddress.trim()) {
      setErrors({ ...errors, email: 'Email address is required' });
      return;
    }

    try {
      setLoading({ ...loading, email: true });
      setErrors({ ...errors, email: '' });

      await contestAPI.emailContestConfig(bucket, project, emailAddress);

      setSuccess({ ...success, email: `Contest config sent to ${emailAddress}!` });
      setTimeout(() => setSuccess({ ...success, email: '' }), 3000);
    } catch (error) {
      setErrors({ ...errors, email: `Failed to send email: ${error}` });
    } finally {
      setLoading({ ...loading, email: false });
    }
  };

  return (
    <div className="project-config">
      {/* Microsite URL */}
      <div className="config-section">
        <h3>🌐 Microsite URL</h3>
        <p className="help-text">Enter the URL from your web team where users will land after scanning the QR code</p>
        <div className="input-group">
          <input
            type="url"
            value={micrositeUrl}
            onChange={(e) => setMicrositeUrl(e.target.value)}
            placeholder="https://your-sweepstakes-site.com/enter"
            className="url-input"
          />
          <button
            onClick={handleSaveMicrositeUrl}
            disabled={loading.micrositeUrl}
            className="btn-primary"
          >
            {loading.micrositeUrl ? 'Saving...' : 'Save URL'}
          </button>
        </div>
        {errors.micrositeUrl && <div className="error-message">{errors.micrositeUrl}</div>}
        {success.micrositeUrl && <div className="success-message">{success.micrositeUrl}</div>}
      </div>

      {/* Flight Dates */}
      <div className="config-section">
        <div className="section-header">
          <h3>📅 Campaign Flight Dates</h3>
          <div className="actions">
            {!editMode && (flightStartDate || flightEndDate) && (
              <>
                <button onClick={() => setEditMode(true)} className="btn-secondary">
                  Edit
                </button>
                <button onClick={handleDeleteFlightDates} className="btn-danger" disabled={loading.flightDates}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {editMode || !flightStartDate ? (
          <div className="date-inputs">
            <div className="input-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={flightStartDate}
                onChange={(e) => setFlightStartDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="input-group">
              <label>End Date:</label>
              <input
                type="date"
                value={flightEndDate}
                onChange={(e) => setFlightEndDate(e.target.value)}
                className="date-input"
              />
            </div>
            <button
              onClick={handleSaveFlightDates}
              disabled={loading.flightDates}
              className="btn-primary"
            >
              {loading.flightDates ? 'Saving...' : 'Save Dates'}
            </button>
            {editMode && (
              <button onClick={() => setEditMode(false)} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="date-display">
            <span className="date-badge">
              {new Date(flightStartDate).toLocaleDateString()} - {new Date(flightEndDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {errors.flightDates && <div className="error-message">{errors.flightDates}</div>}
        {success.flightDates && <div className="success-message">{success.flightDates}</div>}
      </div>

      {/* QR Code Generation */}
      <div className="config-section">
        <h3>📱 QR Code Generation</h3>
        <p className="help-text">Generate a QR code that points to your microsite URL</p>
        <div className="qr-controls">
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="your@email.com (optional)"
            className="email-input"
          />
          <button
            onClick={handleGenerateQRCode}
            disabled={loading.qrCode || !micrositeUrl}
            className="btn-primary btn-large"
          >
            {loading.qrCode ? 'Generating...' : '📱 Generate QR Code'}
          </button>
        </div>
        {errors.qrCode && <div className="error-message">{errors.qrCode}</div>}
        {success.qrCode && <div className="success-message">{success.qrCode}</div>}
      </div>

      {/* Email Contest Config */}
      <div className="config-section">
        <h3>📧 Email Contest Configuration</h3>
        <p className="help-text">Send the complete contest configuration JSON to an email address</p>
        <div className="input-group">
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="recipient@email.com"
            className="email-input"
          />
          <button
            onClick={handleEmailConfig}
            disabled={loading.email}
            className="btn-secondary"
          >
            {loading.email ? 'Sending...' : 'Email Config'}
          </button>
        </div>
        {errors.email && <div className="error-message">{errors.email}</div>}
        {success.email && <div className="success-message">{success.email}</div>}
      </div>
    </div>
  );
};

export default ProjectConfig;


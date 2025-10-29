import React, { useState, useEffect } from 'react';
import './LiveCampaignStats.css';

interface QRAnalytics {
  total_scans: number;
  unique_scans: number;
  scans_by_city: Record<string, number>;
  scans_by_time: Record<string, number>;
  last_updated: string;
  qr_code_url: string;
  campaign_name: string;
}

interface LiveCampaignStatsProps {
  bucket: string;
  project: string;
  autoRefresh?: boolean; // Auto-refresh every 30 seconds
}

const LiveCampaignStats: React.FC<LiveCampaignStatsProps> = ({
  bucket,
  project,
  autoRefresh = true,
}) => {
  const [analytics, setAnalytics] = useState<QRAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/analytics/${bucket}/${project}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalytics(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching QR analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    try {
      setLoading(true);
      // Use PUT to force fresh data from Uniqode
      const response = await fetch(
        `${API_BASE_URL}/analytics/${bucket}/${project}`,
        { method: 'PUT' }
      );

      if (!response.ok) {
        throw new Error(`Failed to refresh analytics: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalytics(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Error refreshing QR analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [bucket, project, autoRefresh]);

  if (loading && !analytics) {
    return <div className="live-stats-loading">Loading campaign stats...</div>;
  }

  if (error && !analytics) {
    return (
      <div className="live-stats-error">
        <p>Error: {error}</p>
        <button onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  if (!analytics) {
    return <div className="live-stats-empty">No analytics available</div>;
  }

  // Calculate top 10 cities/states
  const topLocations = Object.entries(analytics.scans_by_city)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const totalLocations = Object.keys(analytics.scans_by_city).length;

  const timeSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(lastRefresh).getTime()) / 1000
  );

  return (
    <div className="live-campaign-stats">
      <div className="stats-header">
        <h2>🔴 Live Campaign Stats</h2>
        <div className="stats-controls">
          <span className="last-update">
            Updated {timeSinceUpdate}s ago
          </span>
          <button
            onClick={forceRefresh}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? '↻ Refreshing...' : '↻ Refresh Now'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-card primary">
          <div className="metric-label">Total Scans</div>
          <div className="metric-value">{analytics.total_scans.toLocaleString()}</div>
        </div>

        <div className="metric-card primary">
          <div className="metric-label">Unique Scans</div>
          <div className="metric-value">{analytics.unique_scans.toLocaleString()}</div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-label">Locations</div>
          <div className="metric-value">{totalLocations}</div>
        </div>
      </div>

      {/* Top Locations */}
      <div className="locations-section">
        <h3>📍 Top 10 Locations</h3>
        <div className="locations-list">
          {topLocations.length > 0 ? (
            topLocations.map(([location, count], index) => (
              <div key={location} className="location-item">
                <span className="location-rank">#{index + 1}</span>
                <span className="location-name">{location}</span>
                <span className="location-count">{count.toLocaleString()}</span>
                <div
                  className="location-bar"
                  style={{
                    width: `${(count / topLocations[0][1]) * 100}%`,
                  }}
                />
              </div>
            ))
          ) : (
            <p className="no-data">No location data yet</p>
          )}
        </div>
      </div>

      {/* Campaign Info */}
      <div className="campaign-info">
        <div className="info-row">
          <span className="info-label">QR Code URL:</span>
          <a
            href={analytics.qr_code_url}
            target="_blank"
            rel="noopener noreferrer"
            className="info-link"
          >
            {analytics.qr_code_url}
          </a>
        </div>
        <div className="info-row">
          <span className="info-label">Last Synced:</span>
          <span className="info-value">
            {new Date(analytics.last_updated).toLocaleString()}
          </span>
        </div>
      </div>

      {error && (
        <div className="stats-error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}
    </div>
  );
};

export default LiveCampaignStats;


// Environment Configuration for Contest Manager Customer Service Interface

export const config = {
  // API Configuration - AWS Gateway endpoints
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'https://0gt6s4bqo5.execute-api.us-east-1.amazonaws.com/prod',
  apiKey: process.env.REACT_APP_API_KEY || '',
  
  // Environment
  environment: process.env.REACT_APP_ENVIRONMENT || 'dev',
  isDevelopment: process.env.REACT_APP_ENVIRONMENT === 'dev',
  isProduction: process.env.REACT_APP_ENVIRONMENT === 'prod',
  
  // Debug (enable for customer service troubleshooting)
  debug: process.env.REACT_APP_DEBUG === 'true',
  
  // AWS Configuration
  awsRegion: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  
  // Monday.com Integration (for iframe embedding)
  mondayBoardId: process.env.REACT_APP_MONDAY_BOARD_ID || '',
  enableMondayIntegration: process.env.REACT_APP_ENABLE_MONDAY === 'true',
  
  // Customer Service Feature Flags
  enableTestingPanel: process.env.REACT_APP_ENABLE_TESTING_PANEL !== 'false', // Default enabled
  enableSystemHealth: process.env.REACT_APP_ENABLE_SYSTEM_HEALTH !== 'false', // Default enabled
  enableS3Browser: process.env.REACT_APP_ENABLE_S3_BROWSER !== 'false', // Default enabled
  enablePythonScripts: process.env.REACT_APP_ENABLE_PYTHON_SCRIPTS !== 'false', // Default enabled
  
  // File Handling Configuration
  maxFileSize: 50 * 1024 * 1024, // 50MB for contest data files
  supportedFileTypes: ['.json', '.csv', '.xlsx', '.zip'],
  
  // Polling Intervals (in milliseconds)
  statusPollInterval: 3000, // Slower for customer service use
  healthCheckInterval: 60000, // 1 minute health checks
  s3RefreshInterval: 10000, // 10 second S3 refresh
  
  // Pagination for large datasets
  defaultPageSize: 25, // Smaller pages for better UX
  maxPageSize: 100,
  
  // Customer Service UI Configuration
  autoRefreshEnabled: true,
  showAdvancedOptions: process.env.REACT_APP_SHOW_ADVANCED === 'true',
  compactMode: process.env.REACT_APP_COMPACT_MODE === 'true', // For Monday.com iframe
};

export default config;

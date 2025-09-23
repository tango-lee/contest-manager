// Contest Manager API Client
// Centralized API calls to AWS Gateway endpoints

export interface ContestEntry {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string; // ISO string
  zip_code: string;
  referral_url?: string;
  device?: string;
  agree_privacy: boolean;
  agree_rules: boolean;
  points?: number;
  date_created?: string; // ISO string
}

export interface WinnerRule {
  id: string;
  count: number;
  period: 'state' | 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface ContestRules {
  age_min: number;
  age_max: number;
  eligible_states: string[];
  entry_start_date: string;
  entry_end_date: string;
  max_entries_per_person: number;
  total_winners: number;
  winner_rules: WinnerRule[];
  flight_start_date: string; // Project flight dates from modal
  flight_end_date: string;   // Project flight dates from modal
  prize_structure: {
    grand_prize: string;
    runner_up_prizes: string[];
  };
}

export interface S3Bucket {
  name: string;
  creation_date: string;
  region: string;
}

export interface S3Project {
  name: string;
  path: string;
  last_modified: string;
}

export interface S3File {
  key: string;
  size: number;
  last_modified: string;
  content?: any;
}

export interface Winner {
  rank: number;
  first_name: string;
  last_name: string;
  email: string;
  zip_code: string;
  selection_timestamp: string;
}

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  raw_entries: number;
  duplicates_removed: number;
  rules_violations: number;
  eligible_contestants: number;
  message?: string;
}

class ContestManagerAPI {
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';
    this.apiKey = process.env.REACT_APP_API_KEY;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Client & Campaign Management
  async createClient(clientName: string, contactEmail: string) {
    return this.request('/clients/create', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName, contact_email: contactEmail }),
    });
  }

  async getClientStatus(clientName: string) {
    return this.request(`/clients/${clientName}/status`);
  }

  async startCampaign(campaignData: {
    client_name: string;
    project_number: string;
    start_date: string;
    end_date: string;
    eligible_states: string;
    number_of_winners: number;
  }) {
    return this.request('/campaigns/start', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  async checkCampaignHealth(clientName: string, projectNumber: string) {
    return this.request(`/campaigns/${clientName}/${projectNumber}/health`);
  }

  // S3 Operations (Updated to match AWS Lambda endpoints)
  async listS3Buckets(): Promise<S3Bucket[]> {
    return this.request('/buckets/list');
  }

  async createS3Bucket(bucketName: string, projectData?: {
    projectHandle: string;
    projectName: string;
    clientName: string;
    flight_start_date?: string;
    flight_end_date?: string;
  }) {
    return this.request('/clients/create', {
      method: 'POST',
      body: JSON.stringify({ 
        bucket_name: bucketName,
        project_data: projectData
      }),
    });
  }

  async listProjects(bucketName: string): Promise<S3Project[]> {
    return this.request(`/buckets/${bucketName}/projects`);
  }

  // Raw Entries Management
  async getRawEntriesCount(bucketName: string, projectName: string): Promise<number> {
    try {
      const response = await this.request(`/data/raw-count/${bucketName}/${projectName}`);
      return response.count || 0;
    } catch (error) {
      console.warn('Failed to get raw entries count:', error);
      return 0;
    }
  }

  // Validated Entries Management
  async getValidatedEntries(bucketName: string, projectName: string): Promise<S3File[]> {
    try {
      return this.request(`/data/validated/${bucketName}/${projectName}`);
    } catch (error) {
      console.warn('Failed to get validated entries:', error);
      return [];
    }
  }

  // Raw entries from /{project-id}/entries/raw/
  async getRawEntries(bucketName: string, projectId: string): Promise<any[]> {
    return this.request<any[]>(`/data/raw/${bucketName}/${projectId}`);
  }

  // File Downloads (Updated for new AWS endpoints)
  async downloadFile(bucketName: string, projectName: string, fileName: string) {
    const response = await this.request<{ download_url: string }>(`/files/download/${bucketName}/${projectName}/${fileName}`);
    window.location.href = response.download_url;
  }

  async downloadValidatedZip(bucketName: string, projectName: string) {
    const response = await this.request<{ download_url: string }>(`/files/export/${bucketName}/${projectName}/validated`);
    window.location.href = response.download_url;
  }

  // Contest Rules (Updated to match AWS Lambda endpoints)
  async setContestRules(bucketName: string, projectId: string, rules: ContestRules) {
    return this.request(`/contest-rules/${bucketName}/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ rules }),
    });
  }

  async getContestRules(bucketName: string, projectId: string): Promise<ContestRules> {
    return this.request(`/contest-rules/${bucketName}/${projectId}`);
  }

  // Get existing contest rules from S3 (returns null if not found)
  async getExistingRules(bucketName: string, projectId: string): Promise<ContestRules | null> {
    try {
      return await this.request(`/contest-rules/${bucketName}/${projectId}`);
    } catch (error) {
      // Return null if no rules exist (404 error expected)
      return null;
    }
  }

  // Data Processing (Updated for new on-demand system)
  async processData(bucketName: string, projectName: string) {
    return this.request('/data/process', {
      method: 'POST',
      body: JSON.stringify({ 
        bucket_name: bucketName, 
        project_name: projectName,
        processing_type: 'final'
      }),
    });
  }

  async getProcessingStatus(bucketName: string, projectName: string): Promise<ProcessingStatus> {
    return this.request(`/data/status/${bucketName}/${projectName}`);
  }

  async downloadFilteredCSV(bucketName: string, projectName: string) {
    // Use new on-demand processing for CSV downloads
    const response = await this.request<{ download_url: string }>('/data/process', {
      method: 'POST',
      body: JSON.stringify({ 
        bucket_name: bucketName, 
        project_name: projectName,
        processing_type: 'temp'
      }),
    });
    
    if (response.download_url) {
      window.location.href = response.download_url;
    } else {
      throw new Error('No download URL received from processing');
    }
  }

  // Winner Management
  async selectWinners(bucketName: string, projectName: string, numberOfWinners: number) {
    return this.request('/winners/select', {
      method: 'POST',
      body: JSON.stringify({ 
        bucket_name: bucketName, 
        project_name: projectName, 
        number_of_winners: numberOfWinners 
      }),
    });
  }

  async getWinnerStatus(bucketName: string, projectName: string) {
    return this.request(`/winners/status/${bucketName}/${projectName}`);
  }

  async getWinners(bucketName: string, projectName: string): Promise<Winner[]> {
    return this.request(`/winners/${bucketName}/${projectName}`);
  }

  async exportWinners(bucketName: string, projectName: string) {
    const response = await this.request<{ download_url: string }>(`/winners/export/${bucketName}/${projectName}`);
    window.location.href = response.download_url;
  }

  // Reports & Integration
  async getCampaignReport(clientName: string, projectNumber?: string) {
    const endpoint = projectNumber 
      ? `/reports/${clientName}/${projectNumber}`
      : `/reports/${clientName}`;
    return this.request(endpoint);
  }

  async syncToMonday(clientName: string) {
    return this.request('/monday/sync', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName }),
    });
  }

  async emergencyStop(clientName: string, projectNumber: string, reason: string) {
    return this.request('/emergency/stop', {
      method: 'POST',
      body: JSON.stringify({ 
        client_name: clientName, 
        project_number: projectNumber, 
        reason 
      }),
    });
  }

  // Testing Functions
  async runAPITest(testType: 'single' | 'batch' | 'invalid') {
    return this.request('/test/api', {
      method: 'POST',
      body: JSON.stringify({ test_type: testType }),
    });
  }

  async triggerWinnerSelectionTest(clientName: string, projectNumber: string) {
    return this.request('/test/winner-selection', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName, project_number: projectNumber }),
    });
  }

  async triggerMondayWebhook(webhookType: 'create_client' | 'create_project') {
    return this.request('/test/monday-webhook', {
      method: 'POST',
      body: JSON.stringify({ webhook_type: webhookType }),
    });
  }

  async triggerDataPipeline(clientName: string) {
    return this.request('/test/data-pipeline', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName }),
    });
  }

  async testS3Communication() {
    return this.request('/test/s3-communication');
  }

  async loadTestData() {
    return this.request('/test/load-data', {
      method: 'POST',
    });
  }

  // System Health
  async getSystemHealth() {
    return this.request('/health');
  }

  async getLambdaLogs(functionName: string) {
    return this.request(`/logs/${functionName}`);
  }
}

export const contestAPI = new ContestManagerAPI();

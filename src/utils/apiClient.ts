// Contest Manager API Client
// Centralized API calls to AWS Gateway endpoints

import { config } from '../config/environment';

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

export interface ProjectBlacklist {
  emails: string[];
  names: string[];
  phones: string[];
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
  eligible_contestants: number;
  last_processed?: string;
  message?: string;
  filter_statistics?: {
    total_entries: number;
    blacklist_filtered: number;
    date_filtered: number;
    state_filtered: number;
    age_filtered: number;
    duplicate_filtered: number;
    valid_entries: number;
  };
}

export interface UniqodeAnalytics {
  total_scans: number;
  unique_scans: number;
  conversion_rate: number;
  last_updated: string;
  qr_code_url?: string;
  campaign_id?: string;
}

class ContestManagerAPI {
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = config.apiBaseUrl;
    this.apiKey = config.apiKey;
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

  // S3 Operations (Updated to match actual AWS Gateway endpoints)
  async listS3Buckets(): Promise<S3Bucket[]> {
    return this.request('/buckets/list');
  }

  async createS3Bucket(bucketName: string, projectData?: {
    projectHandle: string;
    projectName: string;
    clientName: string;
    flightStartDate?: string;
    flightEndDate?: string;
  }) {
    return this.request('/clients/create', {
      method: 'POST',
      body: JSON.stringify({ 
        bucket_name: bucketName,
        project_data: projectData
      }),
    });
  }

  async listProjects(bucketName?: string): Promise<S3Project[]> {
    // Use dedicated projects endpoint
    return this.request('/projects');
  }

  async listClients(): Promise<S3Bucket[]> {
    // Use dedicated clients endpoint
    return this.request('/clients');
  }

  // Presigned URL Operations for S3 Uploads
  async getPresignedUploadUrl(bucketName: string, projectName: string, fileName: string, fileType: string) {
    return this.request<{ upload_url: string; file_key: string }>('/presign', {
      method: 'POST',
      body: JSON.stringify({
        bucket_name: bucketName,
        project_name: projectName,
        file_name: fileName,
        file_type: fileType
      }),
    });
  }

  async getPartnerPresignedUploadUrl(bucketName: string, projectName: string, fileName: string, fileType: string) {
    return this.request<{ upload_url: string; file_key: string }>('/presign/partner', {
      method: 'POST',
      body: JSON.stringify({
        bucket_name: bucketName,
        project_name: projectName,
        file_name: fileName,
        file_type: fileType
      }),
    });
  }

  // Raw Entries Management
  async getRawEntriesCount(bucketName: string, projectName: string): Promise<number> {
    try {
      const response = await this.request<{ count: number }>(`/data/raw-count/${bucketName}/${projectName}`);
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

  // Contest Rules (Full CRUD operations matching AWS Gateway endpoints)
  async createContestRules(bucketName: string, projectId: string, rules: ContestRules) {
    return this.request(`/contest-rules/${bucketName}/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(rules),
    });
  }

  async getContestRules(bucketName: string, projectId: string): Promise<ContestRules> {
    return this.request(`/contest-rules/${bucketName}/${projectId}`);
  }

  async updateContestRules(bucketName: string, projectId: string, rules: ContestRules) {
    return this.request(`/contest-rules/${bucketName}/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(rules),
    });
  }

  async deleteContestRules(bucketName: string, projectId: string) {
    return this.request(`/contest-rules/${bucketName}/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Legacy method for backward compatibility
  async setContestRules(bucketName: string, projectId: string, rules: ContestRules) {
    // Try to get existing rules first to determine if we should POST or PUT
    try {
      await this.getContestRules(bucketName, projectId);
      // Rules exist, update them
      return this.updateContestRules(bucketName, projectId, rules);
    } catch (error) {
      // Rules don't exist, create them
      return this.createContestRules(bucketName, projectId, rules);
    }
  }

  // Get existing contest rules from S3 (returns null if not found)
  async getExistingRules(bucketName: string, projectId: string): Promise<ContestRules | null> {
    try {
      return await this.getContestRules(bucketName, projectId);
    } catch (error) {
      // Return null if no rules exist (404 error expected)
      return null;
    }
  }

  // Blacklist Management (Full CRUD operations matching AWS Gateway endpoints)
  async getProjectBlacklist(bucketName: string, projectId: string): Promise<ProjectBlacklist | null> {
    try {
      return await this.request(`/blacklist/${bucketName}/${projectId}`);
    } catch (error) {
      // Return null if no blacklist exists (404 error expected)
      return null;
    }
  }

  async createProjectBlacklist(bucketName: string, projectId: string, blacklist: ProjectBlacklist): Promise<void> {
    return this.request(`/blacklist/${bucketName}/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(blacklist),
    });
  }

  async updateProjectBlacklist(bucketName: string, projectId: string, blacklist: ProjectBlacklist): Promise<void> {
    return this.request(`/blacklist/${bucketName}/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(blacklist),
    });
  }

  async deleteProjectBlacklist(bucketName: string, projectId: string): Promise<void> {
    return this.request(`/blacklist/${bucketName}/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Legacy method for backward compatibility
  async setProjectBlacklist(bucketName: string, projectId: string, blacklist: ProjectBlacklist): Promise<void> {
    // Try to get existing blacklist first to determine if we should POST or PUT
    try {
      await this.getProjectBlacklist(bucketName, projectId);
      // Blacklist exists, update it
      return this.updateProjectBlacklist(bucketName, projectId, blacklist);
    } catch (error) {
      // Blacklist doesn't exist, create it
      return this.createProjectBlacklist(bucketName, projectId, blacklist);
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

  async downloadFilteredCSV(bucketName: string, projectName: string): Promise<string> {
    try {
      // Use new on-demand processing for CSV downloads
      const response = await this.request<{ download_url?: string; downloadUrl?: string; url?: string }>('/data/process', {
        method: 'POST',
        body: JSON.stringify({ 
          bucket_name: bucketName, 
          project_name: projectName,
          processing_type: 'temp'
        }),
      });
      
      // Check for download URL in various possible field names
      const downloadUrl = response.download_url || response.downloadUrl || response.url;
      
      if (downloadUrl) {
        return downloadUrl;
      } else {
        console.error('API Response:', response);
        throw new Error('No download URL received from processing. Response: ' + JSON.stringify(response));
      }
    } catch (error) {
      console.error('CSV download API error:', error);
      throw error;
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

  // Testing & Development (only available in development mode)
  async triggerDataPipeline(clientName: string) {
    if (config.isDevelopment) {
      return this.request('/test/data-pipeline', {
        method: 'POST',
        body: JSON.stringify({ client_name: clientName }),
      });
    }
    throw new Error('Test endpoints only available in development mode');
  }

  async testS3Communication() {
    if (config.isDevelopment) {
      return this.request('/test/s3-communication');
    }
    throw new Error('Test endpoints only available in development mode');
  }

  async loadTestData() {
    if (config.isDevelopment) {
      return this.request('/test/load-data', {
        method: 'POST',
      });
    }
    throw new Error('Test endpoints only available in development mode');
  }

  // System Health
  async getSystemHealth() {
    return this.request('/health');
  }

  async getLambdaLogs(functionName: string) {
    return this.request(`/logs/${functionName}`);
  }

  // Uniqode Analytics Integration
  async getUniqodeAnalytics(bucketName: string, projectName: string): Promise<UniqodeAnalytics | null> {
    try {
      return await this.request(`/analytics/${bucketName}/${projectName}`);
    } catch (error) {
      console.warn('Failed to get Uniqode analytics:', error);
      return null;
    }
  }

  async syncUniqodeAnalytics(bucketName: string, projectName: string): Promise<UniqodeAnalytics> {
    return this.request(`/analytics/${bucketName}/${projectName}`, {
      method: 'PUT',
    });
  }

  async refreshUniqodeData(bucketName: string, projectName: string): Promise<void> {
    // Trigger a manual sync of Uniqode data
    await this.syncUniqodeAnalytics(bucketName, projectName);
  }
}

export const contestAPI = new ContestManagerAPI();

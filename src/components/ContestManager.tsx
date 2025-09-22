import React, { useState, useEffect, useCallback } from 'react';
import { contestAPI, S3Bucket, S3Project, S3File, ContestRules, ProcessingStatus, Winner, WinnerRule } from '../utils/apiClient';
import './ContestManager.css';

const ContestManager: React.FC = () => {
  // State management
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [projects, setProjects] = useState<S3Project[]>([]);
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [validatedFiles, setValidatedFiles] = useState<S3File[]>([]);
  const [contestRules, setContestRules] = useState<ContestRules | null>(null);
  const [rulesEditMode, setRulesEditMode] = useState<boolean>(true);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [lastRawSync, setLastRawSync] = useState<string | null>(null);
  const [flightStartDate, setFlightStartDate] = useState('');
  const [flightEndDate, setFlightEndDate] = useState('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Development mode toggle
  // Production mode - no development helpers

  // API calls with development mode support
  const loadBuckets = async () => {
    try {
      setLoading(prev => ({ ...prev, buckets: true }));
      
      // Production mode: Call real AWS API
      const bucketList = await contestAPI.listS3Buckets();
      setBuckets(bucketList);
    } catch (error) {
      console.error('Failed to load buckets:', error);
      setErrors(prev => ({ ...prev, buckets: `Failed to load client buckets: ${error}` }));
      setBuckets([]);
    } finally {
      setLoading(prev => ({ ...prev, buckets: false }));
    }
  };

  const loadProjects = useCallback(async () => {
    if (!selectedBucket) return;
    
    try {
      setLoading(prev => ({ ...prev, projects: true }));
      
      // Production mode: Call real AWS API
      const projectList = await contestAPI.listProjects(selectedBucket);
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  }, [selectedBucket]);

  // Check for existing contest rules when client/project selected
  const checkExistingRules = useCallback(async () => {
    if (!selectedBucket || !selectedProject) return;
    
    try {
      // Production mode: Check for existing rules in S3
      const existingRules = await contestAPI.getExistingRules(selectedBucket, selectedProject);
      if (existingRules) {
        setContestRules(existingRules);
        setRulesEditMode(false); // Show saved state if rules exist
      } else {
        setContestRules(null);
        setRulesEditMode(true); // Show form if no rules exist
      }
    } catch (error) {
      console.error('Failed to check existing rules:', error);
      setContestRules(null);
      setRulesEditMode(true);
    }
  }, [selectedBucket, selectedProject, flightStartDate, flightEndDate]);

  const loadProjectData = useCallback(async () => {
    if (!selectedBucket || !selectedProject) return;
    
    try {
        // Production mode: Call real AWS APIs
        
        // Load raw entries count
        const rawCount = await contestAPI.getRawEntriesCount(selectedBucket, selectedProject);
        setRawEntries(Array(rawCount).fill({})); // Just for count display
        
        // Load processing status
        try {
          const status = await contestAPI.getProcessingStatus(selectedBucket, selectedProject);
          setProcessingStatus(status);
        } catch (error) {
          setProcessingStatus(null);
        }
        
        // Load validated files if processing is complete
        if (processingStatus?.status === 'completed') {
          const validated = await contestAPI.getValidatedEntries(selectedBucket, selectedProject);
          setValidatedFiles(validated);
        }
        
        // Load winners if they exist
        try {
          const winnerList = await contestAPI.getWinners(selectedBucket, selectedProject);
          setWinners(winnerList);
        } catch (error) {
          setWinners([]);
        }
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  }, [selectedBucket, selectedProject, processingStatus?.status]);

  // Load initial data
  useEffect(() => {
    loadBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      loadProjects();
    }
  }, [selectedBucket, loadProjects]);

  useEffect(() => {
    if (selectedBucket && selectedProject) {
      // Check for existing rules first, then load project data
      checkExistingRules();
      loadProjectData();
      // Update timestamp when project is selected (this is when sync fires)
      setLastRawSync(new Date().toISOString());
    }
  }, [selectedBucket, selectedProject, checkExistingRules, loadProjectData]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<'client' | 'project'>('client');
  const [clientName, setClientName] = useState('');
  const [projectHandle, setProjectHandle] = useState('');
  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [createdBucketName, setCreatedBucketName] = useState('');

  const getFullBucketName = () => `sweepstakes-${clientName}`;
  // const getFullProjectPath = () => `sweepstakes-${clientName}/project-${projectHandle}`;
  
  const isValidClientName = (name: string) => {
    return /^[a-z0-9-]+$/.test(name) && name.length > 0;
  };

  const isValidProjectHandle = (handle: string) => {
    return /^[0-9]+$/.test(handle) && handle.length > 0;
  };

  const isValidDateRange = () => {
    if (!flightStartDate || !flightEndDate) return false;
    return new Date(flightEndDate) > new Date(flightStartDate);
  };

  const createNewBucket = async () => {
    if (!clientName.trim() || !isValidClientName(clientName) || !projectHandle.trim() || !isValidProjectHandle(projectHandle)) return;
    
    const fullBucketName = getFullBucketName();
    const projectName = `project-${projectHandle.padStart(4, '0')}`;
    
    try {
      setCreateStatus('creating');
      
      // PRODUCTION MODE: Call real AWS API
      const projectData = {
        projectHandle: projectHandle,
        projectName: projectName,
        clientName: clientName,
        flightStartDate: flightStartDate + 'T00:00:00',
        flightEndDate: flightEndDate + 'T23:59:59'
      };
      
      const response = await contestAPI.createS3Bucket(fullBucketName, projectData);
      console.log('Bucket created successfully:', response);
      
      setCreatedBucketName(fullBucketName);
      setCreateStatus('success');
      
      // Wait 2 seconds to show success message, then auto-select and close
      setTimeout(async () => {
        // DEVELOPMENT MODE: Simulate bucket and project data
        // Add the new bucket to the existing buckets list
        setBuckets(prevBuckets => {
          const bucketExists = prevBuckets.some(bucket => bucket.name === fullBucketName);
          if (!bucketExists) {
            return [...prevBuckets, { 
              name: fullBucketName, 
              creation_date: new Date().toISOString(),
              region: 'us-east-1'
            }];
          }
          return prevBuckets;
        });
        
        // Auto-select the newly created client
        setSelectedBucket(fullBucketName);
        
        // Simulate project data for the new bucket
        const mockProjectData = [{ 
          name: projectName, 
          path: `${fullBucketName}/${projectName}`,
          last_modified: new Date().toISOString() 
        }];
        setProjects(mockProjectData);
        setSelectedProject(projectName);
        
        // Project data will be loaded automatically by useEffect when selectedBucket and selectedProject are set
        
        // Close modal and reset
        setShowCreateModal(false);
        setClientName('');
        setProjectHandle('');
        setCreateStatus('idle');
        setCreatedBucketName('');
        
        // Auto-scroll to Contest Rules section after a brief delay
        setTimeout(() => {
          const contestRulesSection = document.querySelector('.contest-rules');
          if (contestRulesSection) {
            contestRulesSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 500);
      }, 2000);
    } catch (error) {
      setCreateStatus('error');
      setTimeout(() => {
        setCreateStatus('idle');
      }, 3000);
    }
  };

  const openCreateModal = (type: 'client' | 'project' = 'client') => {
    setModalType(type);
    setShowCreateModal(true);
    setClientName('');
    setProjectHandle('');
    setFlightStartDate('');
    setFlightEndDate('');
    setCreateStatus('idle');
  };

  const closeCreateModal = () => {
    if (createStatus === 'creating') return; // Don't allow closing while creating
    setShowCreateModal(false);
    setClientName('');
    setProjectHandle('');
    setFlightStartDate('');
    setFlightEndDate('');
    setCreateStatus('idle');
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setClientName(value);
  };

  const handleProjectHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setProjectHandle(value);
  };

  const setRules = async (rules: ContestRules) => {
    try {
      setLoading(prev => ({ ...prev, setRules: true }));
      
      // Integrate flight dates from modal creation
      const rulesWithFlightDates = {
        ...rules,
        flight_start_date: flightStartDate || rules.flight_start_date,
        flight_end_date: flightEndDate || rules.flight_end_date
      };
      
      // Production mode: call real AWS API
      await contestAPI.setContestRules(selectedBucket, selectedProject, rulesWithFlightDates);
      
      setContestRules(rulesWithFlightDates);
      setRulesEditMode(false); // Switch to saved mode
    } catch (error) {
      console.error('Failed to set contest rules:', error);
      alert('Failed to set contest rules: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, setRules: false }));
    }
  };

  const processData = async () => {
    try {
      setLoading(prev => ({ ...prev, processData: true }));
      await contestAPI.processData(selectedBucket, selectedProject);
      
      // Poll for status updates
      const pollStatus = async () => {
        const status = await contestAPI.getProcessingStatus(selectedBucket, selectedProject);
        setProcessingStatus(status);
        
        if (status.status === 'processing') {
          setTimeout(pollStatus, 2000);
        } else if (status.status === 'completed') {
          await loadProjectData();
        }
      };
      
      pollStatus();
    } catch (error) {
      alert('Failed to process data: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, processData: false }));
    }
  };

  const selectWinners = async () => {
    const numberOfWinners = parseInt(prompt('Number of winners to select:') || '1');
    try {
      setLoading(prev => ({ ...prev, selectWinners: true }));
      await contestAPI.selectWinners(selectedBucket, selectedProject, numberOfWinners);
      await loadProjectData();
      alert('Winners selected successfully!');
    } catch (error) {
      alert('Failed to select winners: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, selectWinners: false }));
    }
  };

  // Workflow state checks - ALL require both client AND project selection
  const hasClientAndProject = selectedBucket && selectedProject;
  const canSetRules = hasClientAndProject;
  const canProcessData = hasClientAndProject && contestRules !== null;
  const canSelectWinners = hasClientAndProject && processingStatus?.status === 'completed' && processingStatus.eligible_contestants > 0;

  return (
    <div className="contest-manager">
      {/* Header */}
      <header className="header-section">
        <div className="header-content">
          <img src="/logo.png" alt="Optivate Agency" className="optivate-logo" />
          <h1>
            <span className="regular">sweepstakes</span> <span className="highlight">MANAGEMENT</span>
          </h1>
        </div>
      </header>

      {/* Client S3 Bucket */}
      <section className="section client-s3-bucket">
        <div className="section-header">
          <h2>🗂️ AWS Client Directory</h2>
        </div>
        
        <div className="s3-controls">
          {/* Client Selection Box */}
          <div className="control-box client-box">
            <div className="control-group inline">
              <div className="inline-controls">
                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  disabled={loading.buckets}
                >
                  <option value="">Select a client folder...</option>
                  {buckets.map(bucket => (
                    <option key={bucket.name} value={bucket.name}>{bucket.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => openCreateModal('client')} 
                  className="action-btn primary"
                >
                  + New Client
                </button>
              </div>
            </div>
          </div>

          {/* Project Selection Box */}
          <div className={`control-box project-box ${!selectedBucket ? 'disabled' : ''}`}>
            {selectedBucket && (
              <div className="selected-client-display">
                <span className="selected-client-text">aws/optivateagency/{selectedBucket}</span>
                <button 
                  className="remove-client-btn" 
                  onClick={() => {
                    setSelectedBucket('');
                    setSelectedProject('');
                  }}
                  title="Remove client selection"
                >
                  ×
                </button>
              </div>
            )}
            <div className="control-group inline project-selection">
              <div className="inline-controls">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={!selectedBucket || loading.projects}
                  className="project-dropdown"
                >
                  <option value="">Select a project...</option>
                  {selectedBucket && projects.map(project => (
                    <option key={project.name} value={project.name}>{project.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => openCreateModal('project')} 
                  className="action-btn primary"
                  disabled={!selectedBucket}
                >
                  + New Project
                </button>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Contest Rules & Eligibility */}
      <section className="section contest-rules">
        <div className="section-header">
          <h2>📋 Contest Rules & Eligibility</h2>
        </div>

        {hasClientAndProject && (
          <div className="selected-context-display">
            <div className="context-info">
              {/* First row: Client and Project */}
              <div className="context-row">
                <div className="context-item">
                  <span className="context-label">Client:</span>
                  <span className="context-value">{selectedBucket}</span>
                </div>
                <div className="context-item">
                  <span className="context-label">Project:</span>
                  <span className="context-value">{selectedProject}</span>
                </div>
            <div className="context-item">
              <span className="context-label">Project Flight Dates:</span>
              <span className="context-value">
                {flightStartDate && flightEndDate
                  ? `${new Date(flightStartDate).toLocaleDateString()} to ${new Date(flightEndDate).toLocaleDateString()}`
                  : 'Not set'
                }
              </span>
            </div>
              </div>
              
              {/* Second row: Raw Entries with timestamp */}
              <div className="context-row">
                <div className="context-item">
                  <span className="context-label">Raw Entries:</span>
                  <span className="context-value">
                    {rawEntries.length} entries
                  </span>
                  {lastRawSync && (
                    <span className="timestamp-text">
                      (synced {new Date(lastRawSync).toLocaleString('en-US', { timeZone: 'UTC' })} UTC)
                    </span>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        )}

        {canSetRules && (
          <>
            {rulesEditMode ? (
              <div className="rules-form">
                <ContestRulesForm 
                  rules={contestRules} 
                  onSave={setRules} 
                  loading={loading.setRules}
                />
              </div>
            ) : (
              <div className="rules-saved-display">
                <div className="saved-rules-header">
                  <h3>✅ Contest Rules Configured</h3>
                  <button
                    onClick={() => setRulesEditMode(true)}
                    className="edit-rules-btn"
                  >
                    Edit Rules
                  </button>
                </div>
                
                {contestRules && (
                  <div className="saved-rules-content">
                    <div className="rules-summary-grid">
                      <div className="rule-item">
                        <span className="rule-label">Max Entries Per Person:</span>
                        <span className="rule-value">{contestRules.max_entries_per_person}</span>
                      </div>
                      <div className="rule-item">
                        <span className="rule-label">Total Winners:</span>
                        <span className="rule-value">{contestRules.total_winners}</span>
                      </div>
                    </div>

                    <div className="winner-rules-summary">
                      <h4>Winner Selection Rules:</h4>
                      <div className="winner-rules-list-saved">
                        {contestRules.winner_rules.map((rule, index) => (
                          <div key={rule.id} className="winner-rule-saved">
                            <span className="rule-count">{rule.count}</span>
                            <span className="rule-text">WINNERS per</span>
                            <span className="rule-period">{rule.period.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="states-summary">
                      <h4>Eligible States ({contestRules.eligible_states.length} selected):</h4>
                      <div className="selected-states-display">
                        {contestRules.eligible_states.map(stateCode => (
                          <span key={stateCode} className="state-tag">
                            {stateCode}
                          </span>
                        ))}
                      </div>
                      
                      {/* Timezone Display */}
                      <div className="timezones-summary">
                        <h4>Contest Timezones:</h4>
                        <div className="timezone-tags">
                          {(() => {
                            const timezones = new Set<string>();
                            contestRules.eligible_states.forEach(state => {
                              const stateData = US_STATES_TIMEZONES[state as keyof typeof US_STATES_TIMEZONES];
                              if (stateData) {
                                timezones.add(stateData.timezone);
                              }
                            });
                            return Array.from(timezones).sort().map(tz => (
                              <span key={tz} className="timezone-tag">
                                {TIMEZONE_NAMES[tz as keyof typeof TIMEZONE_NAMES]}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>


      {/* Validated Data Viewer */}
      <section className="section validated-data">
        <div className="section-header">
          <h2>📊 Validated Data Viewer</h2>
        </div>

        {validatedFiles.length > 0 && (
          <div className="validated-files">
            <h3>📄 Eligible Contestants (/validated folder):</h3>
            <div className="file-list">
              {validatedFiles.map(file => (
                <div key={file.key} className="file-item">
                  <span className="file-name">{file.key}</span>
                  <div className="file-actions">
                    <button className="action-btn small">View</button>
                    <button 
                      onClick={() => contestAPI.downloadFile(selectedBucket, selectedProject, file.key)}
                      className="action-btn small"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bulk-actions">
              <button 
                onClick={() => contestAPI.downloadValidatedZip(selectedBucket, selectedProject)}
                className="action-btn primary"
              >
                Download All Eligible
              </button>
              <button className="action-btn">Export Validated ZIP</button>
            </div>
          </div>
        )}
      </section>

      {/* Winner Management */}
      <section className="section winner-management">
        <div className="section-header">
          <h2>🏆 Winner Management</h2>
          {!canSelectWinners && <span className="disabled-badge">Complete Data Processing First</span>}
        </div>

        {canSelectWinners && (
          <div className="winner-controls">
            <div className="winner-info">
              <span>Winner Selection ({processingStatus?.eligible_contestants} eligible contestants):</span>
            </div>
            
            <div className="button-grid">
              <button 
                onClick={selectWinners}
                className="action-btn primary"
                disabled={loading.selectWinners}
              >
                {loading.selectWinners ? 'Selecting...' : 'Select Winners'}
              </button>
              <button className="action-btn">Check Winner Status</button>
              <button className="action-btn">Winner Results Table</button>
            </div>

            {winners.length > 0 && (
              <div className="winners-table">
                <h3>Selected Winners:</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Location</th>
                      <th>Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map(winner => (
                      <tr key={winner.rank}>
                        <td>{winner.rank}</td>
                        <td>{winner.first_name} {winner.last_name}</td>
                        <td>{winner.email}</td>
                        <td>{winner.zip_code}</td>
                        <td>{winner.rank === 1 ? 'Grand Prize' : `Prize ${winner.rank}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="winner-actions">
                  <button 
                    onClick={() => contestAPI.exportWinners(selectedBucket, selectedProject)}
                    className="action-btn primary"
                  >
                    Export Winners CSV
                  </button>
                  <button className="action-btn">Download Certificates</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>


      {/* Create Bucket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {modalType === 'client' ? (
                <>Create New Client Folder<br />for AWS Data Lake</>
              ) : (
                <>Create New Project<br />for {selectedBucket}</>
              )}
            </h3>
            <button onClick={closeCreateModal} className="modal-close-btn" disabled={createStatus === 'creating'}>
              ×
            </button>
          </div>
            
            <div className="modal-body">
              {createStatus === 'idle' && (
                <>
                  {modalType === 'client' && (
                    <>
                      <div className="bucket-name-preview">
                        <span className="bucket-prefix">/sweepstakes-</span>
                        <span className="bucket-client-name">{clientName || '{client-name}'}</span>
                      </div>
                      <input
                        type="text"
                        value={clientName}
                        onChange={handleClientNameChange}
                        placeholder="client-name"
                        className={`modal-input ${!isValidClientName(clientName) && clientName ? 'invalid' : ''}`}
                        autoFocus
                      />

                      <div className="input-instructions">
                        <p>• Use lowercase letters, numbers, and hyphens only</p>
                        <p>• Example: dolly-parton-wines, swoon-riley-arnold</p>
                      </div>

                      <hr className="modal-divider" />
                    </>
                  )}

                  <div className="bucket-name-preview">
                    {modalType === 'client' ? (
                      <>
                        <span className="bucket-prefix">/sweepstakes-</span>
                        <span className="bucket-client-name">{clientName || '{client-name}'}</span>
                        <span className="bucket-prefix">/project-</span>
                        <span className="bucket-project-handle">{projectHandle || '{0000}'}</span>
                      </>
                    ) : (
                      <>
                        <span className="bucket-prefix">/{selectedBucket}/project-</span>
                        <span className="bucket-project-handle">{projectHandle || '{0000}'}</span>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    value={projectHandle}
                    onChange={handleProjectHandleChange}
                    placeholder="0000"
                    className={`modal-input ${!isValidProjectHandle(projectHandle) && projectHandle ? 'invalid' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && createNewBucket()}
                    autoFocus={modalType === 'project'}
                  />
                  
                  <div className="input-instructions">
                    <p>• Enter the "Project Number" for tracking.</p>
                  </div>

                  <hr className="modal-divider" />

                  <div className="flight-dates-section">
                    <h4 className="flight-dates-title">Sweepstakes Flight Dates</h4>
                    <div className="date-inputs">
                      <div className="date-input-group">
                        <label>Start Date:</label>
                        <input
                          type="date"
                          value={flightStartDate}
                          onChange={(e) => setFlightStartDate(e.target.value)}
                          className="modal-input date-input"
                        />
                        <small className="time-note">Time set to 12:00:00 AM</small>
                      </div>
                      <div className="date-input-group">
                        <label>End Date:</label>
                        <input
                          type="date"
                          value={flightEndDate}
                          onChange={(e) => setFlightEndDate(e.target.value)}
                          className={`modal-input date-input ${flightStartDate && flightEndDate && !isValidDateRange() ? 'invalid' : ''}`}
                        />
                        <small className="time-note">Time set to 11:59:59 PM</small>
                      </div>
                    </div>
                  <div className="input-instructions">
                    <p>• Enter the Start and End Dates for this project.</p>
                    {flightStartDate && flightEndDate && !isValidDateRange() && (
                      <p className="error-message">• End date must be after start date</p>
                    )}
                    
                  </div>
                  </div>
                </>
              )}
              
              {createStatus === 'creating' && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Provisioning Amazon Web Service S3 Bucket</p>
                </div>
              )}
              
              {createStatus === 'success' && (
                <div className="success-state">
                  <div className="success-icon">✓</div>
                  <p>Your new bucket "{createdBucketName}" created.</p>
                </div>
              )}
              
              {createStatus === 'error' && (
                <div className="error-state">
                  <div className="error-icon">✗</div>
                  <p>Failed to create bucket. Please try again.</p>
                </div>
              )}
            </div>
            
            {createStatus === 'idle' && (
              <div className="modal-actions">
                <button 
                  onClick={createNewBucket} 
                  className="modal-btn primary"
                  disabled={
                    modalType === 'client' 
                      ? (!clientName.trim() || !isValidClientName(clientName) || !projectHandle.trim() || !isValidProjectHandle(projectHandle) || !flightStartDate || !flightEndDate || !isValidDateRange())
                      : (!projectHandle.trim() || !isValidProjectHandle(projectHandle) || !flightStartDate || !flightEndDate || !isValidDateRange())
                  }
                >
                  {modalType === 'client' ? 'Add Client to AWS' : 'Add Project to Client'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// US States with their timezone mappings
const US_STATES_TIMEZONES = {
  'AL': { name: 'Alabama', timezone: 'CT' },
  'AK': { name: 'Alaska', timezone: 'AKT' },
  'AZ': { name: 'Arizona', timezone: 'MT' },
  'AR': { name: 'Arkansas', timezone: 'CT' },
  'CA': { name: 'California', timezone: 'PT' },
  'CO': { name: 'Colorado', timezone: 'MT' },
  'CT': { name: 'Connecticut', timezone: 'ET' },
  'DE': { name: 'Delaware', timezone: 'ET' },
  'FL': { name: 'Florida', timezone: 'ET' },
  'GA': { name: 'Georgia', timezone: 'ET' },
  'HI': { name: 'Hawaii', timezone: 'HT' },
  'ID': { name: 'Idaho', timezone: 'MT' },
  'IL': { name: 'Illinois', timezone: 'CT' },
  'IN': { name: 'Indiana', timezone: 'ET' },
  'IA': { name: 'Iowa', timezone: 'CT' },
  'KS': { name: 'Kansas', timezone: 'CT' },
  'KY': { name: 'Kentucky', timezone: 'ET' },
  'LA': { name: 'Louisiana', timezone: 'CT' },
  'ME': { name: 'Maine', timezone: 'ET' },
  'MD': { name: 'Maryland', timezone: 'ET' },
  'MA': { name: 'Massachusetts', timezone: 'ET' },
  'MI': { name: 'Michigan', timezone: 'ET' },
  'MN': { name: 'Minnesota', timezone: 'CT' },
  'MS': { name: 'Mississippi', timezone: 'CT' },
  'MO': { name: 'Missouri', timezone: 'CT' },
  'MT': { name: 'Montana', timezone: 'MT' },
  'NE': { name: 'Nebraska', timezone: 'CT' },
  'NV': { name: 'Nevada', timezone: 'PT' },
  'NH': { name: 'New Hampshire', timezone: 'ET' },
  'NJ': { name: 'New Jersey', timezone: 'ET' },
  'NM': { name: 'New Mexico', timezone: 'MT' },
  'NY': { name: 'New York', timezone: 'ET' },
  'NC': { name: 'North Carolina', timezone: 'ET' },
  'ND': { name: 'North Dakota', timezone: 'CT' },
  'OH': { name: 'Ohio', timezone: 'ET' },
  'OK': { name: 'Oklahoma', timezone: 'CT' },
  'OR': { name: 'Oregon', timezone: 'PT' },
  'PA': { name: 'Pennsylvania', timezone: 'ET' },
  'RI': { name: 'Rhode Island', timezone: 'ET' },
  'SC': { name: 'South Carolina', timezone: 'ET' },
  'SD': { name: 'South Dakota', timezone: 'CT' },
  'TN': { name: 'Tennessee', timezone: 'CT' },
  'TX': { name: 'Texas', timezone: 'CT' },
  'UT': { name: 'Utah', timezone: 'MT' },
  'VT': { name: 'Vermont', timezone: 'ET' },
  'VA': { name: 'Virginia', timezone: 'ET' },
  'WA': { name: 'Washington', timezone: 'PT' },
  'WV': { name: 'West Virginia', timezone: 'ET' },
  'WI': { name: 'Wisconsin', timezone: 'CT' },
  'WY': { name: 'Wyoming', timezone: 'MT' }
};

const TIMEZONE_NAMES = {
  'ET': 'Eastern Time',
  'CT': 'Central Time', 
  'MT': 'Mountain Time',
  'PT': 'Pacific Time',
  'AKT': 'Alaska Time',
  'HT': 'Hawaii Time'
};

// Contest Rules Form Component
interface ContestRulesFormProps {
  rules: ContestRules | null;
  onSave: (rules: ContestRules) => void;
  loading: boolean;
}

const ContestRulesForm: React.FC<ContestRulesFormProps> = ({ rules, onSave, loading }) => {
  const [formData, setFormData] = useState<ContestRules>(
    rules || {
      age_min: 18,
      age_max: 65,
      eligible_states: ['CA', 'NY', 'TX', 'FL'],
      entry_start_date: '2024-12-01',
      entry_end_date: '2024-12-31',
      max_entries_per_person: 1,
      total_winners: 10,
      winner_rules: [
        { id: '1', count: 1, period: 'day' }
      ],
      flight_start_date: '2024-12-01',
      flight_end_date: '2024-12-31',
      prize_structure: {
        grand_prize: 'Grand Prize',
        runner_up_prizes: ['1st Prize', '2nd Prize']
      }
    }
  );

  // Calculate unique timezones from selected states
  const getSelectedTimezones = () => {
    const timezones = new Set<string>();
    formData.eligible_states.forEach(state => {
      const stateData = US_STATES_TIMEZONES[state as keyof typeof US_STATES_TIMEZONES];
      if (stateData) {
        timezones.add(stateData.timezone);
      }
    });
    return Array.from(timezones).sort();
  };

  // Handle state selection
  const handleStateToggle = (stateCode: string) => {
    const currentStates = formData.eligible_states;
    const newStates = currentStates.includes(stateCode)
      ? currentStates.filter(s => s !== stateCode)
      : [...currentStates, stateCode];
    
    setFormData({...formData, eligible_states: newStates});
  };

  // Bulk state selection functions
  const selectAllStates = () => {
    const allStates = Object.keys(US_STATES_TIMEZONES);
    setFormData({...formData, eligible_states: allStates});
  };

  const deselectAllStates = () => {
    setFormData({...formData, eligible_states: []});
  };

  const selectStatesByTimezone = (timezone: string) => {
    const statesInTimezone = Object.entries(US_STATES_TIMEZONES)
      .filter(([, data]) => data.timezone === timezone)
      .map(([code]) => code);
    
    // Add these states to current selection (don't replace)
    const currentStates = formData.eligible_states;
    const combinedStates = [...currentStates, ...statesInTimezone];
    const newStates = Array.from(new Set(combinedStates));
    setFormData({...formData, eligible_states: newStates});
  };

  // Winner rule management
  const addWinnerRule = () => {
    const newRule: WinnerRule = {
      id: Date.now().toString(),
      count: 1,
      period: 'day'
    };
    setFormData({
      ...formData,
      winner_rules: [...formData.winner_rules, newRule]
    });
  };

  const updateWinnerRule = (id: string, field: keyof WinnerRule, value: any) => {
    const updatedRules = formData.winner_rules.map(rule =>
      rule.id === id ? { ...rule, [field]: value } : rule
    );
    setFormData({...formData, winner_rules: updatedRules});
  };

  const removeWinnerRule = (id: string) => {
    if (formData.winner_rules.length > 1) {
      const updatedRules = formData.winner_rules.filter(rule => rule.id !== id);
      setFormData({...formData, winner_rules: updatedRules});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="rules-form">
      <div className="form-grid">
        {/* Max Entries Per Person */}
        <div className="form-group">
          <label>Max Entries Per Person:</label>
          <input 
            type="number" 
            value={formData.max_entries_per_person} 
            onChange={(e) => setFormData({...formData, max_entries_per_person: parseInt(e.target.value)})}
            min="1" 
            max="10"
          />
        </div>

        {/* Total Winners */}
        <div className="form-group">
          <label>Total Winners:</label>
          <input 
            type="number" 
            value={formData.total_winners} 
            onChange={(e) => setFormData({...formData, total_winners: parseInt(e.target.value)})}
            min="1" 
            max="1000"
          />
        </div>
      </div>

      {/* Winner Rules Section */}
      <div className="winner-rules-section">
        <h3>Winner Selection Rules</h3>
        <div className="winner-rules-list">
          {formData.winner_rules.map((rule, index) => (
            <div key={rule.id} className="winner-rule-row">
              <div className="rule-input-group">
                <input
                  type="number"
                  value={rule.count}
                  onChange={(e) => updateWinnerRule(rule.id, 'count', parseInt(e.target.value) || 0)}
                  min="0"
                  max="1000"
                  className="rule-count-input"
                />
                <span className="rule-text">WINNERS per</span>
                <select
                  value={rule.period}
                  onChange={(e) => updateWinnerRule(rule.id, 'period', e.target.value as WinnerRule['period'])}
                  className="rule-period-select"
                >
                  <option value="state">STATE</option>
                  <option value="hour">HOUR</option>
                  <option value="day">DAY</option>
                  <option value="week">WEEK</option>
                  <option value="month">MONTH</option>
                  <option value="year">YEAR</option>
                </select>
              </div>
              {formData.winner_rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWinnerRule(rule.id)}
                  className="remove-rule-btn"
                  title="Remove this rule"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addWinnerRule}
          className="add-rule-btn"
        >
          + Add Another Rule
        </button>
      </div>

      {/* State Selection Section */}
      <div className="states-section">
        <h3>Eligible States</h3>
        
        {/* Bulk Selection Buttons */}
        <div className="state-selection-buttons">
          <div className="main-selection-buttons">
            <button
              type="button"
              onClick={selectAllStates}
              className="state-select-btn select-all"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAllStates}
              className="state-select-btn deselect-all"
            >
              Deselect All
            </button>
          </div>
          
          <div className="timezone-selection-buttons">
            <button
              type="button"
              onClick={() => selectStatesByTimezone('ET')}
              className="state-select-btn select-timezone"
            >
              Select EST
            </button>
            <button
              type="button"
              onClick={() => selectStatesByTimezone('CT')}
              className="state-select-btn select-timezone"
            >
              Select CST
            </button>
            <button
              type="button"
              onClick={() => selectStatesByTimezone('MT')}
              className="state-select-btn select-timezone"
            >
              Select MST
            </button>
            <button
              type="button"
              onClick={() => selectStatesByTimezone('PT')}
              className="state-select-btn select-timezone"
            >
              Select PST
            </button>
            <button
              type="button"
              onClick={() => selectStatesByTimezone('AKT')}
              className="state-select-btn select-timezone"
            >
              Select AKT
            </button>
            <button
              type="button"
              onClick={() => selectStatesByTimezone('HT')}
              className="state-select-btn select-timezone"
            >
              Select HT
            </button>
          </div>
        </div>

        <div className="states-grid">
          {Object.entries(US_STATES_TIMEZONES)
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .map(([code, data]) => (
            <label key={code} className="state-checkbox">
              <input
                type="checkbox"
                checked={formData.eligible_states.includes(code)}
                onChange={() => handleStateToggle(code)}
              />
              <span className="state-code">{code}</span>
              <span className="state-name">{data.name}</span>
            </label>
          ))}
        </div>

        {/* Timezone Display */}
        {formData.eligible_states.length > 0 && (
          <div className="timezones-display-form">
            <h4>Contest Timezones:</h4>
            <div className="timezone-tags">
              {getSelectedTimezones().map(tz => (
                <span key={tz} className="timezone-tag">
                  {TIMEZONE_NAMES[tz as keyof typeof TIMEZONE_NAMES]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button type="submit" className="action-btn primary" disabled={loading}>
        {loading ? 'Setting Rules...' : 'Set Contest Rules'}
      </button>
    </form>
  );
};

export default ContestManager;

# Contest Manager - Customer Service Interface

A **professional customer service interface** for managing sweepstakes contests and AWS operations. Designed for customer service teams to interact with S3 buckets, configure contest rules, and manage winner selection through a clean, intuitive UI.

## 🏗️ Architecture

```
Customer Service Team → Contest Manager UI → AWS API Gateway → S3 Buckets + Lambda Functions
```

## 🚀 Quick Start

```bash
npm install
npm start
```
Opens: http://localhost:3000

## 🎯 Core Features

### 1. **Client & Project Management**
- **S3 Bucket Integration**: Automatically populates client dropdown from S3 bucket names
- **Project Selection**: Dynamically loads project folders from selected client bucket
- **New Client Creation**: Create new S3 buckets with proper folder structure
- **New Project Creation**: Add projects to existing client buckets with flight dates

### 2. **Contest Rules & Eligibility**
- **Dynamic State Selection**: Choose eligible states with timezone auto-detection
- **Winner Selection Rules**: Flexible rule builder (X winners per day/state/week/etc.)
- **Entry Limits**: Configure max entries per person and total winners
- **Rule Persistence**: Automatically saves and loads existing contest configurations

### 3. **Smart Workflow Management**
- **Rule Detection**: Automatically detects if contest rules already exist for selected client/project
- **State Synchronization**: Seamlessly switches between edit and saved modes
- **Flight Date Integration**: Project flight dates integrated with contest rules
- **Visual Feedback**: Clear status indicators and loading states

### 4. **Professional UI/UX**
- **Optivate Branding**: Consistent with company website styling
- **Responsive Design**: Works on desktop and mobile devices
- **Monday.com Ready**: Optimized for iframe embedding
- **Dark Theme**: Professional dark interface with blue/pink accents

## 📊 Data Flow

### Client/Project Selection:
1. **Load Page** → Populate client dropdown from S3 buckets
2. **Select Client** → Load project folders, enable project selection
3. **Select Project** → Check for existing contest rules
4. **Rules Found** → Auto-populate and show saved state
5. **No Rules** → Show empty form for new configuration

### Contest Rules Workflow:
```
Configure Rules → Set Contest Rules → Saved State Display → Edit Rules (if needed)
```

### State Selection Logic:
- **Individual States**: Check/uncheck specific states
- **Bulk Selection**: Select All, Deselect All, or by timezone (EST, CST, MST, PST, AKT, HT)
- **Timezone Detection**: Automatically shows relevant timezones for selected states

## 🔧 API Integration

### Required Endpoints:
```typescript
GET  /s3/buckets/list                    // List all S3 buckets
GET  /s3/buckets/{bucket}/projects       // List project folders in bucket
GET  /rules/{bucket}/{project}           // Get existing contest rules
POST /rules/{bucket}/{project}           // Save contest rules
POST /s3/buckets/create                  // Create new S3 bucket
POST /s3/projects/create                 // Create new project folder
```

### Contest Rules Data Structure:
```json
{
  "max_entries_per_person": 1,
  "total_winners": 10,
  "winner_rules": [
    {"id": "1", "count": 1, "period": "day"},
    {"id": "2", "count": 2, "period": "state"}
  ],
  "eligible_states": ["CA", "NY", "TX", "FL"],
  "flight_start_date": "2024-12-01T00:00:00",
  "flight_end_date": "2024-12-31T23:59:59"
}
```

## 🎨 UI Components

### Header Section:
- **Optivate Logo**: Company branding
- **Title**: "sweepstakes MANAGEMENT" with styled typography

### Client Directory:
- **Client Selection**: Dropdown populated from S3 buckets
- **Project Selection**: Dropdown populated from selected bucket's projects
- **Create Buttons**: Modal-based creation for new clients and projects

### Contest Rules:
- **Context Display**: Shows selected client, project, flight dates, and raw entry count
- **Rules Form**: Dynamic form with state selection and winner rules builder
- **Saved State**: Professional summary display with edit capability

### State Selection:
- **Bulk Controls**: Select All, Deselect All, timezone-based selection
- **State Grid**: 5-column alphabetical grid of all US states
- **Timezone Display**: Auto-calculated timezone tags based on selected states

## 🛠️ Development Mode

The app includes development mode simulation for UI testing:
- **Mock API Calls**: Simulates AWS responses with realistic delays
- **Test Data**: Pre-populated with sample clients and projects
- **Console Logging**: Debug information for development

## 🚀 Production Deployment

### Environment Variables:
```bash
REACT_APP_API_BASE_URL=https://your-api-gateway-url
REACT_APP_API_KEY=your-api-key
REACT_APP_ENVIRONMENT=production
```

### Build Process:
```bash
npm run build
# Creates optimized build/ folder (~1.1MB)
```

## 🎯 Perfect For Customer Service Teams:

✅ **No AWS Console Access** - Manage contest data through clean UI  
✅ **Intuitive Workflow** - Guided process from client selection to rule configuration  
✅ **Visual Feedback** - Clear status indicators and loading states  
✅ **Error Prevention** - Smart validation and workflow dependencies  
✅ **Professional Design** - Optivate branding with modern UI/UX  

## 📱 Monday.com Integration

- **Iframe Optimized**: Responsive design works perfectly in Monday boards
- **Professional Branding**: Consistent with Optivate company styling
- **Single Page App**: No navigation, all functionality on one screen
- **Customer Service Friendly**: Designed for non-technical users

## 🔄 Future Enhancements

- **Winner Selection Interface**: Select and export contest winners
- **Data Processing Pipeline**: Raw entry validation and filtering
- **S3 File Browser**: Browse and download contest entry files
- **System Health Dashboard**: Monitor AWS service status
- **Reporting Tools**: Contest analytics and performance metrics

**Built by Optivate Agency - Professional Sweepstakes Management Platform**
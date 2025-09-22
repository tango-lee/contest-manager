# Monday.com Iframe Setup Guide

## Embedding Contest Manager UI in Monday.com
The Contest Manager is optimized for Monday.com iframe embedding.


### 1. Deploy to AWS (Recommended)
```bash
# Run the AWS deployment script
./deploy-aws.sh

# This will give you an HTTPS URL like:
# https://d1234567890.cloudfront.net
```

#### AWS Amplify
```bash
# Connect your GitHub repo to AWS Amplify
# Build settings:
# Build command: npm run build
# Publish directory: build
```

### 3. Configure Monday.com Board

#### Add Custom Widget
1. Go to your Monday.com board
2. Click "+" to add a new view
3. Select "Custom Widget" or "Embedded Content"
4. Enter your Contest Manager URL

#### Widget Configuration
```json
{
  "name": "Contest Manager",
  "url": "https://your-contest-manager-domain.com",
  "height": "800px",
  "width": "100%",
  "allowFullscreen": true,
  "sandbox": "allow-scripts allow-same-origin allow-forms"
}
```

#### Iframe HTML (if using HTML widget)
```html
<iframe 
  src="https://your-contest-manager-domain.com"
  width="100%" 
  height="800px"
  frameborder="0"
  allow="clipboard-read; clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
</iframe>
```

### 4. Environment Configuration for Monday.com

Create a `.env.production` file in your Contest Manager:

```env
# Enable compact mode for Monday.com
REACT_APP_COMPACT_MODE=true

# Enable Monday.com integration
REACT_APP_ENABLE_MONDAY=true
REACT_APP_MONDAY_BOARD_ID=your-board-id

# Your AWS API endpoints
REACT_APP_API_BASE_URL=https://your-api-gateway.amazonaws.com/prod
REACT_APP_API_KEY=your-api-key

# Feature flags for customer service
REACT_APP_ENABLE_TESTING_PANEL=true
REACT_APP_ENABLE_S3_BROWSER=true
REACT_APP_ENABLE_PYTHON_SCRIPTS=true
```

Then rebuild and redeploy:
```bash
npm run build
./deploy-aws.sh
```

## 🎨 Monday.com Optimization Features

The Contest Manager includes several Monday.com-specific optimizations:

### Compact Mode
- Smaller padding and margins
- Condensed button layouts
- Optimized for iframe constraints

### Responsive Design
- Works on desktop and mobile Monday.com
- Adapts to different iframe sizes
- Touch-friendly interface

### Security Features
- CORS headers configured for Monday.com
- CSP headers for iframe security
- Secure API communication

## 🔧 Troubleshooting

### Common Issues

#### 1. Iframe Not Loading
```javascript
// Check browser console for errors
// Common fixes:
// - Ensure HTTPS (Monday.com requires HTTPS)
// - Check CORS headers
// - Verify iframe sandbox permissions
```

#### 2. API Calls Failing
```javascript
// Update CORS settings in your AWS API Gateway:
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key"
}
```

#### 3. Monday.com Integration
```javascript
// Add Monday.com SDK if needed:
// <script src="https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/uploads/monday-sdk.js"></script>

// Initialize Monday.com context:
window.mondaySDK?.init({
  clientId: 'your-client-id'
});
```

## 📱 Mobile Optimization

The Contest Manager is optimized for mobile Monday.com apps:

- Touch-friendly buttons (44px minimum)
- Responsive grid layouts
- Optimized font sizes
- Swipe-friendly interfaces

## 🚀 Performance Tips

### Optimize for Monday.com
1. **Preload critical resources**
2. **Minimize initial bundle size** (already at 1.1MB)
3. **Use service workers** for offline functionality
4. **Implement lazy loading** for large datasets

### Monitoring
- Set up CloudWatch monitoring for your AWS endpoints
- Use Monday.com analytics to track widget usage
- Monitor API response times for customer service efficiency

## 🔐 Security Considerations

### For Customer Service Teams
- API keys are environment-based (not exposed to frontend)
- S3 access is through presigned URLs only
- No direct AWS credentials in the interface
- Monday.com iframe sandbox restrictions applied

### Production Checklist
- [ ] HTTPS enabled (required for Monday.com)
- [ ] API CORS configured for your domain
- [ ] Environment variables set for production
- [ ] AWS Lambda functions accept requests from your domain
- [ ] Monday.com widget permissions configured
- [ ] Customer service team training completed

## 📞 Support

For issues with the Contest Manager in Monday.com:

1. **Check browser console** for JavaScript errors
2. **Verify API endpoints** are responding
3. **Test outside iframe** to isolate Monday.com issues
4. **Check Monday.com widget logs** in their developer tools

The Contest Manager is designed to be a seamless customer service tool within Monday.com while maintaining full functionality and professional appearance.

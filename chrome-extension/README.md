# Bitzsol CRM - LinkedIn Lead Sync Extension

A production-ready Chrome extension (Manifest V3) that extracts LinkedIn profile data, enriches it using external services (Apify, Apollo, LeadMagic), and syncs leads directly to your Bitzsol CRM.

## Features

✅ **LinkedIn Profile Extraction**

- Automatically extract name, headline, company, location, and about section
- Find and extract email addresses and phone numbers from profile
- Copy LinkedIn profile URLs to clipboard
- One-click profile data extraction

✅ **Lead Enrichment**

- **Apify Integration**: Deep scrape LinkedIn profiles for comprehensive data
- **Apollo Integration**: Enrich with verified emails and phone numbers
- **LeadMagic Integration**: Alternative enrichment service for contact discovery
- Merge enriched data with extracted profile

✅ **CRM Sync**

- Post extracted/enriched leads directly to Bitzsol CRM
- Configure CRM API endpoint and authentication
- Automatic lead status and source tracking
- Email and phone number verification status management

✅ **Settings Management**

- Simple options page to configure all API keys
- Secure storage using Chrome's sync storage
- Test CRM connection before syncing
- No hardcoded credentials—all stored locally

✅ **Clean, Modern UI**

- Responsive popup interface with brand colors
- Real-time status messages and feedback
- Error handling and validation
- Professional design with smooth animations

## Installation

### For Users

1. **Download the Extension**
   - Clone or download the `chrome-extension/` folder

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `chrome-extension/` folder

3. **Configure Settings**
   - Click the extension icon in the Chrome toolbar
   - Click the ⚙️ settings icon (top-right of popup)
   - Enter your CRM API credentials and enrichment service keys
   - Click "Save Settings" and then "Test Connection"

4. **Start Syncing**
   - Visit any LinkedIn profile page
   - Click the extension icon
   - Click "Extract Profile Data"
   - Optionally enrich with Apify/Apollo/LeadMagic
   - Select a pipeline
   - Click "Sync to CRM"

### For Developers

1. **Prerequisites**
   - Chrome/Chromium browser with Developer mode enabled
   - Node.js (optional, for development)
   - Bitzsol CRM running locally or accessible via URL

2. **Setup**

   ```bash
   cd chrome-extension
   # No build step required—this is a static extension
   ```

3. **File Structure**

   ```
   chrome-extension/
   ├── manifest.json          # Extension configuration
   ├── background.js          # Service worker (Manifest V3)
   ├── content.js             # LinkedIn page content script
   ├── popup.html             # Main UI popup
   ├── popup.js               # Popup logic
   ├── popup.css              # Popup styles
   ├── options.html           # Settings page
   ├── options.js             # Settings logic
   ├── options.css            # Settings styles
   └── README.md              # This file
   ```

4. **Development Workflow**
   - Make changes to any `.js`, `.html`, or `.css` file
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card to reload
   - Test your changes

## Configuration

### Required Settings (CRM)

1. **CRM API URL**
   - Development: `http://localhost:3000`
   - Production: `https://your-crm-domain.com`

2. **CRM API Key**
   - Generate from Bitzsol CRM Dashboard
   - Settings → API Keys → Generate New Key
   - Paste the full key in the settings page

### Optional Settings (Enrichment Services)

#### Apify

- **API Token**: Get from [Apify Console](https://console.apify.com/account/integrations)
- **Actor ID**: LinkedIn profile scraper actor ID (e.g., `apify/linkedin-profile-scraper`)
- **Use Case**: Comprehensive LinkedIn profile scraping

#### Apollo

- **API URL**: `https://api.apollo.io/v1/enrich` (default)
- **API Key**: Get from [Apollo Settings](https://www.apollo.io/app/settings)
- **Use Case**: Email and phone number enrichment

#### LeadMagic

- **API URL**: `https://api.leadmagic.com/v1/enrich` (default)
- **API Key**: Get from [LeadMagic Settings](https://app.leadmagic.com/settings/integrations)
- **Use Case**: Alternative lead enrichment service

## Configuration Storage

The extension uses `chrome.storage.sync` for configuration. No `.env` file needed. Settings are stored locally in Chrome's storage and synced across signed-in Chrome profiles.

### Required Bitzsol CRM API Endpoints

Your CRM backend must provide these endpoints:

```
GET    /api/pipelines                    # Fetch available pipelines
POST   /api/leads                        # Create a new lead
```

Example endpoint implementation:

```typescript
// GET /api/pipelines
export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const pipelines = await prisma.pipeline.findMany();
  return Response.json({ data: pipelines });
}

// POST /api/leads
export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadData = await request.json();
  const lead = await prisma.lead.create({ data: leadData });
  return Response.json({ data: lead });
}
```

## Lead Sync Payload Format

When syncing a lead, the extension sends the following JSON payload:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "headline": "Product Manager at Tech Corp",
  "company": "Tech Corp",
  "location": "San Francisco, CA",
  "about": "Passionate about technology and innovation...",
  "pipelineId": "pipeline-uuid",
  "sourceLink": "https://linkedin.com/in/johndoe",
  "emails": [{ "email": "john@example.com", "status": "Not_Verified" }],
  "phones": [{ "phone": "+1-555-123-4567", "status": "Not_Verified" }]
}
```

## Enrichment Service Integration

### Apify

- **Method**: POST
- **URL**: `https://api.apify.com/v2/acts/{actorId}/runs`
- **Header**: `token={apiToken}`
- **Use**: Deep scraping of LinkedIn profiles

### Apollo

- **Method**: POST
- **URL**: Configurable (default: `https://api.apollo.io/v1/enrich`)
- **Header**: `Authorization: Bearer {apiKey}`
- **Body**: `{ "query": "https://linkedin.com/in/..." }`

### LeadMagic

- **Method**: POST
- **URL**: Configurable (default: `https://api.leadmagic.com/v1/enrich`)
- **Header**: `Authorization: Bearer {apiKey}`
- **Body**: `{ "linkedinUrl": "https://linkedin.com/in/..." }`

## Usage Guide

### Step 1: Extract Profile

1. Visit a LinkedIn profile page (e.g., `linkedin.com/in/someone`)
2. Click the extension icon in the Chrome toolbar
3. Click **"📋 Extract Profile Data"**
4. Wait for extraction to complete
5. Profile data appears in the summary section

### Step 2: Copy Profile URL (Optional)

- Click **"🔗 Copy Profile URL"** to copy to clipboard
- Useful for manual record-keeping

### Step 3: Enrich (Optional)

Choose one enrichment service:

- **Apify**: Deep profile scraping (slowest, most comprehensive)
- **Apollo**: Quick email/phone enrichment (recommended)
- **LeadMagic**: Alternative enrichment service

Click the button and wait for enrichment to complete.

### Step 4: Review & Sync

1. Review extracted/enriched data in the form
2. Edit fields as needed (all fields are editable)
3. Select a **Pipeline** from the dropdown
4. Click **"✓ Sync to CRM"**
5. Confirmation message appears upon success

## Troubleshooting

### Issue: "Open a LinkedIn profile page first"

**Solution**: Make sure you're on a LinkedIn profile page (`linkedin.com/in/someone`), not a search results or feed page.

### Issue: "Configure settings first" when loading pipelines

**Solution**: Go to the options page (⚙️ icon) and enter your CRM URL and API Key. Click "Test Connection" to verify.

### Issue: Enrichment times out or fails

**Solution**:

- Check your enrichment service API key is valid
- Ensure your network allows outbound requests to the API
- Try a different enrichment service

### Issue: Lead sync fails with "API Key is invalid"

**Solution**:

- Verify your CRM API key in the settings
- Click "Test Connection" in the options page
- Generate a new API key from your CRM dashboard if needed

### Issue: Some profile fields are empty after extraction

**Solution**:

- LinkedIn may not have all information visible on the profile
- Try enriching with Apify or Apollo to fill in missing data
- Edit fields manually in the form

### Issue: Extension doesn't load or shows errors

**Solution**:

- Go to `chrome://extensions/`
- Click the refresh icon on the extension
- Check the "Errors" section for details
- Try unloading and reloading the extension

## Data Privacy & Security

- ✅ All settings stored **locally** in Chrome browser (not sent to servers)
- ✅ Extension only sends data to services you explicitly configure
- ✅ API keys are stored securely in Chrome's encrypted storage
- ✅ No tracking or telemetry
- ✅ HTTPS required for all external API calls

## Development Notes

### Manifest V3 Considerations

- Uses service worker (`background.js`) instead of background scripts
- Content script injection limited to `linkedin.com/in/*` pages
- All external API calls go through service worker for CORS handling
- Message-based communication between popup, content script, and service worker

### Code Quality

- Clean, well-commented code with consistent formatting
- Comprehensive error handling with user-friendly messages
- Form validation before submission
- Responsive design (mobile-friendly)
- No dependencies or build tools required

### Browser Support

- Chrome 88+
- Edge 88+ (any Chromium-based browser)
- NOT compatible with Firefox (requires Manifest V2)

## API Documentation

### Service Worker Messages

#### Extract Profile

```javascript
// From popup
chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PROFILE' });

// Response
{
  ok: true,
  data: {
    name: "John Doe",
    headline: "Product Manager",
    company: "Tech Corp",
    location: "San Francisco, CA",
    about: "...",
    emails: ["john@example.com"],
    phones: ["+1-555-123-4567"],
    profileUrl: "https://linkedin.com/in/johndoe",
    extractedAt: "2024-01-15T10:30:00.000Z"
  }
}
```

#### Enrich Lead

```javascript
// From popup to service worker
chrome.runtime.sendMessage({
  type: 'ENRICH_LEAD',
  service: 'apify' | 'apollo' | 'leadmagic',
  profileUrl: 'https://linkedin.com/in/...',
  // For Apify:
  apiToken: 'token',
  actorId: 'actor-id',
  // For Apollo/LeadMagic:
  apiUrl: 'api-url',
  apiKey: 'api-key'
});

// Response
{
  success: true,
  data: {
    name: "John Doe",
    emails: ["john@example.com"],
    phones: ["+1-555-123-4567"]
  },
  source: 'apify' | 'apollo' | 'leadmagic'
}
```

#### Sync Lead

```javascript
// From popup to service worker
chrome.runtime.sendMessage({
  type: 'SYNC_LEAD',
  crmUrl: 'https://...',
  crmApiKey: 'api-key',
  leadData: {
    firstName: "John",
    lastName: "Doe",
    // ... other lead fields
  }
});

// Response
{
  success: true,
  data: {
    id: "lead-uuid",
    firstName: "John",
    // ... created lead object
  }
}
```

## Contributing

To contribute or report issues:

1. Fork or clone the repository
2. Make your changes in a feature branch
3. Test thoroughly in Chrome
4. Submit a pull request with a clear description

## License

© 2024 Bitzsol CRM. All rights reserved.

## Support

For issues or questions:

- 📧 Email: support@bitzsol.com
- 🌐 Website: https://bitzsol.com
- 📚 Documentation: https://docs.bitzsol.com

---

**Happy lead syncing! 🚀**

# Bitzsol CRM LinkedIn Extension

This Chrome extension extracts contact information from a LinkedIn profile page and syncs the lead to Bitzsol CRM.

## Install

1. In Chrome, visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chrome-extension` folder in this repository.

## Configure

1. Open the popup.
2. Set the **CRM Base URL** to your app URL, for example `http://localhost:3000`.
3. Visit `http://localhost:3000/api/extension/token` while logged into Bitzsol CRM.
4. Copy the returned token into the **Auth Token** field.
5. Click **Save Settings**.

## Usage

1. Open a LinkedIn profile page in your browser.
2. Click the extension icon.
3. Click **Extract Profile Data**.
4. Review results and optionally click **Enrich with Apify**.
5. Click **Sync to CRM** to create the lead.

## Environment Variables

The extension enrichment feature uses the CRM backend route `POST /api/extension/enrich`.
Set these values in your CRM project's root `.env` file (next to `package.json`):

- `APIFY_TOKEN` — your Apify user token
- `APIFY_LINKEDIN_ACTOR_ID` — your Apify LinkedIn actor ID, for example `my-user/linkedin-profile-scraper`

For Apollo enrichment:

- `APOLLO_API_URL` — the Apollo service endpoint that accepts `{ query: profileUrl }`
- `APOLLO_API_KEY` — the Bearer token for Apollo requests

For LeadMagic enrichment:

- `LEADMAGIC_API_URL` — the LeadMagic service endpoint that accepts `{ linkedinUrl: profileUrl }`
- `LEADMAGIC_API_KEY` — the Bearer token for LeadMagic requests

### Example `.env` entries

```env
APIFY_TOKEN=your_apify_token_here
APIFY_LINKEDIN_ACTOR_ID=your-actor-owner/linkedin-profile-scraper
APOLLO_API_URL=https://api.apollo.io/v1/enrich
APOLLO_API_KEY=your_apollo_api_key_here
LEADMAGIC_API_URL=https://api.leadmagic.com/v1/enrich
LEADMAGIC_API_KEY=your_leadmagic_api_key_here
```

### Demo API behavior

- Apify requests are sent to:
  `https://api.apify.com/v2/acts/${APIFY_LINKEDIN_ACTOR_ID}/runs?token=${APIFY_TOKEN}`
- Apollo requests are sent to `APOLLO_API_URL` with JSON body:
  `{ "query": "https://www.linkedin.com/in/example" }`
- LeadMagic requests are sent to `LEADMAGIC_API_URL` with JSON body:
  `{ "linkedinUrl": "https://www.linkedin.com/in/example" }`

If you do not want enrichment, you can still use the extension to extract profile data and sync leads without these variables configured.

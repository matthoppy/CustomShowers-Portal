# Gmail Auto-Sync Setup Guide

## Overview

This guide walks you through setting up automated Gmail email syncing for your CRM. Emails will be automatically pulled from Gmail, matched to contacts, and logged as activities in your CRM.

## Architecture

```
Gmail API
    ↓
Cloudflare Worker (handles OAuth + API calls)
    ↓
Supabase (stores activity_logs)
    ↓
React Frontend (displays activities)
```

## Part 1: Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Click **NEW PROJECT**
4. Enter name: `CustomShowers CRM`
5. Click **CREATE**
6. Wait for project to be created

### Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for `Gmail API`
3. Click the Gmail API result
4. Click **ENABLE**
5. You'll see "API is enabled" message

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS**
3. Select **OAuth 2.0 Client ID**
4. You'll see a warning: "To create an OAuth client ID, you must first set a consent screen"
5. Click **CONFIGURE CONSENT SCREEN**

### Step 4: Set Up Consent Screen

1. Select **External** (since this is for your business use)
2. Click **CREATE**
3. Fill in the form:
   - **App name**: `Custom Showers CRM`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **SAVE AND CONTINUE**
5. Skip **Scopes** section (click **SAVE AND CONTINUE**)
6. Skip **Test users** section (click **SAVE AND CONTINUE**)
7. Review and click **BACK TO DASHBOARD**

### Step 5: Create OAuth Client

1. Go back to **Credentials**
2. Click **+ CREATE CREDENTIALS** again
3. Select **OAuth 2.0 Client ID**
4. Choose **Web application**
5. Name: `Gmail Sync Service`
6. Add **Authorized redirect URIs**:
   ```
   https://<your-cloudflare-domain>/api/gmail/callback
   http://localhost:8787/api/gmail/callback
   ```
   (Replace `<your-cloudflare-domain>` with your actual domain)
7. Click **CREATE**
8. You'll see your **Client ID** and **Client Secret**
9. **IMPORTANT**: Copy both values - you'll need them next

## Part 2: Cloudflare Worker Setup

### Step 1: Store Your OAuth Credentials

1. In your Cloudflare Dashboard, go to **Workers**
2. Click **Settings**
3. Go to **Environment Variables**
4. Add these variables:
   ```
   GOOGLE_CLIENT_ID = [your Client ID from above]
   GOOGLE_CLIENT_SECRET = [your Client Secret from above]
   GOOGLE_REDIRECT_URI = https://<your-domain>/api/gmail/callback
   SUPABASE_URL = [your Supabase URL]
   SUPABASE_SERVICE_KEY = [your Supabase service role key]
   ```

5. For `SUPABASE_SERVICE_KEY`:
   - Go to Supabase Dashboard
   - Click **Settings** → **API**
   - Copy the `service_role` key (NOT the anon key)

### Step 2: Deploy Gmail Sync Worker

The Cloudflare Worker handles:
- OAuth flow to get Gmail access token
- Fetching emails from Gmail API
- Matching emails to contacts by address
- Creating activity logs in Supabase

(The worker code will be provided separately)

### Step 3: Test OAuth Flow

1. Navigate to: `https://<your-domain>/api/gmail/auth`
2. You'll be redirected to Google login
3. Sign in with your Gmail account
4. Grant permission when prompted
5. You should see a success message
6. Your access token is now stored securely

## Part 3: Frontend Integration

### Step 1: Add Sync Component

A new `GmailSync` component will be added to `ContactDetail.jsx`:
- Shows sync status
- "Sync Emails" button
- Loading state while syncing
- Shows recently synced emails

### Step 2: Trigger Sync

Click the "Sync Emails" button on any contact:
1. System fetches emails from Gmail API
2. Matches emails by to/from address
3. Creates activity_logs for each email
4. Activity timeline updates automatically

## Part 4: What Gets Synced

For each email found:
- **From/To addresses** - matched to contact email
- **Subject** - logged as activity subject
- **Preview text** - logged as description
- **Timestamp** - email date/time
- **Thread ID** - stored for threading
- **Gmail ID** - stored for reference

### Email Matching Logic

Emails are matched to contacts if:
- Email **from** matches contact email, OR
- Email **to** matches contact email, OR
- Email **cc** includes contact email

## Part 5: Periodic Sync (Optional)

To sync automatically on schedule:

1. Set up a Cloudflare Cron Trigger
2. Configure to run every hour
3. Fetches emails since last sync
4. Automatically updates all contacts

## Part 6: Security Considerations

✅ **What's Protected:**
- OAuth credentials stored in Cloudflare environment
- Access tokens never exposed to frontend
- API calls proxied through Cloudflare Worker
- Supabase RLS ensures data isolation

⚠️ **What to Remember:**
- Don't commit `.env` files to git
- Rotate OAuth credentials regularly
- Monitor Cloudflare Worker logs for errors
- Test with test Gmail account first

## Troubleshooting

### "Invalid OAuth credentials"
- Check that Client ID and Secret are correct in Cloudflare
- Verify redirect URI matches exactly (including https://)

### "Email not matching contact"
- Email must exactly match contact's email field
- Check for spaces or typos in contact email
- Activities will still log but may not link to contact

### "Permission denied"
- Re-authorize Gmail access
- Click "Sync Emails" button again
- You may need to re-approve access

### "Rate limit exceeded"
- Gmail API has rate limits (500 calls/second)
- Wait a few minutes before retrying
- Cloudflare Worker includes retry logic

## Email Syncing Frequency

- **Manual sync**: Click button anytime
- **Auto sync** (optional): Every hour
- **Incremental**: Only fetches new emails since last sync

## Data Flow Example

```
1. User clicks "Sync Emails" on Matt's contact page
2. Frontend calls: GET /api/gmail/sync?contact_id=xxx&email=matt@example.com
3. Cloudflare Worker:
   - Gets stored access token from Supabase
   - Calls Gmail API: list messages from:matt@example.com OR to:matt@example.com
   - Gets full email details for each message
   - Formats as activity_log entries
4. Worker inserts into Supabase activity_logs
5. Frontend polls for updates
6. Activity Timeline refreshes with new emails
```

## API Endpoints Created

```
GET /api/gmail/auth
  → Start OAuth flow

GET /api/gmail/callback
  → Handle OAuth redirect, store token

GET /api/gmail/sync
  → Sync emails for a contact
  → Params: contact_id, email, since (optional)
  → Returns: { synced: N, activities: [...] }

GET /api/gmail/status
  → Check if Gmail is connected
  → Returns: { connected: bool, last_sync: timestamp }
```

## Next Steps

1. Complete Google Cloud setup above
2. Deploy Cloudflare Worker code
3. Add environment variables to Cloudflare
4. Deploy updated React frontend
5. Test OAuth flow
6. Test email syncing on a contact
7. Set up periodic sync (optional)

---

**Questions?** Check:
- Google Cloud Console for API errors
- Cloudflare Worker logs for sync errors
- Browser console for frontend errors
- Supabase SQL logs for database issues

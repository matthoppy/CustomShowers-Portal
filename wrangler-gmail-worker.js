/**
 * Cloudflare Worker for Gmail API Integration
 * Handles OAuth flow and email syncing to Custom Showers CRM
 *
 * Deploy with: wrangler deploy
 * Set environment variables in wrangler.toml
 */

// Gmail API scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route handlers
    if (url.pathname === '/api/gmail/auth') {
      return handleAuthStart(request, env);
    }

    if (url.pathname === '/api/gmail/callback') {
      return handleAuthCallback(request, env);
    }

    if (url.pathname === '/api/gmail/sync') {
      return handleSync(request, env);
    }

    if (url.pathname === '/api/gmail/status') {
      return handleStatus(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },

  /**
   * Scheduled handler for periodic syncing (optional)
   * Add to wrangler.toml:
   * [[triggers.crons]]
   * cron = "0 * * * *"  // Every hour
   */
  async scheduled(event, env, ctx) {
    console.log('Running scheduled Gmail sync...');
    // Fetch all contacts and sync their emails
    // Implementation depends on your setup
  },
};

/**
 * Step 1: Start OAuth flow
 * Redirects user to Google login
 */
async function handleAuthStart(request, env) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', GMAIL_SCOPES.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return Response.redirect(authUrl.toString());
}

/**
 * Step 2: Handle OAuth callback
 * Exchange authorization code for access token
 */
async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    // Store tokens in Supabase
    const supabase = createSupabaseClient(env);
    const { error: storeError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: 'default', // You might want to link this to a specific user
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

    if (storeError) throw storeError;

    return new Response('✅ Gmail connected successfully! You can now close this window.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

/**
 * Step 3: Sync emails for a contact
 * GET /api/gmail/sync?contact_id=xxx&email=user@example.com
 */
async function handleSync(request, env) {
  const url = new URL(request.url);
  const contactId = url.searchParams.get('contact_id');
  const contactEmail = url.searchParams.get('email');

  if (!contactId || !contactEmail) {
    return new Response('Missing contact_id or email', { status: 400 });
  }

  try {
    // Get access token
    const supabase = createSupabaseClient(env);
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', 'default')
      .single();

    if (tokenError || !tokenData) {
      return new Response('Gmail not connected. Please authorize first.', { status: 401 });
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(tokenData.expires_at) < new Date()) {
      const newTokens = await refreshAccessToken(tokenData.refresh_token, env);
      accessToken = newTokens.access_token;

      // Update stored token
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', 'default');
    }

    // Fetch emails from Gmail
    const emails = await fetchGmailMessages(contactEmail, accessToken);

    // Create activity logs for each email
    const activities = [];
    for (const email of emails) {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          contact_id: contactId,
          activity_type: 'email',
          subject: email.subject,
          description: email.snippet || email.body,
          email_thread_id: email.threadId,
          metadata: {
            from: email.from,
            to: email.to,
            cc: email.cc,
            gmail_id: email.id,
            timestamp: email.internalDate,
          },
          created_by: 'Gmail Sync',
        })
        .select();

      if (!error) {
        activities.push(data[0]);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: activities.length,
        activities,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Check if Gmail is connected
 */
async function handleStatus(request, env) {
  try {
    const supabase = createSupabaseClient(env);
    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', 'default')
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        connected: true,
        last_sync: data.last_sync,
        expires_at: data.expires_at,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fetch messages from Gmail API
 */
async function fetchGmailMessages(email, accessToken) {
  try {
    // Search for emails from or to the contact
    const query = `from:${email} OR to:${email}`;
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    // Fetch full message details for each
    const fullMessages = [];
    for (const msg of messages) {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (msgResponse.ok) {
        const fullMsg = await msgResponse.json();
        const headers = fullMsg.payload.headers;

        fullMessages.push({
          id: msg.id,
          threadId: fullMsg.threadId,
          subject: getHeaderValue(headers, 'Subject') || '(no subject)',
          from: getHeaderValue(headers, 'From') || '',
          to: getHeaderValue(headers, 'To') || '',
          cc: getHeaderValue(headers, 'Cc') || '',
          snippet: fullMsg.snippet || '',
          internalDate: fullMsg.internalDate,
          body: extractBody(fullMsg.payload),
        });
      }
    }

    return fullMessages;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return [];
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken, env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return response.json();
}

/**
 * Helper: Get email header value
 */
function getHeaderValue(headers, name) {
  const header = headers.find((h) => h.name === name);
  return header ? header.value : null;
}

/**
 * Helper: Extract email body from payload
 */
function extractBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
  }

  return '';
}

/**
 * Create Supabase client for Worker
 */
function createSupabaseClient(env) {
  // Since this is a Worker, you can't use the JavaScript SDK directly
  // Instead, use direct HTTP calls or create a wrapper
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (col, val) => ({
          single: async () => {
            const response = await fetch(
              `${env.SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}&select=${columns}`,
              {
                headers: {
                  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            const data = await response.json();
            return { data: data[0], error: !response.ok ? new Error('Query failed') : null };
          },
        }),
      }),
      upsert: (data) => ({
        catch: async () => {
          const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=user_id`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          return { error: !response.ok ? new Error('Upsert failed') : null };
        },
      }),
      insert: (data) => ({
        select: async () => {
          const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=*`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          const result = await response.json();
          return { data: result, error: !response.ok ? new Error('Insert failed') : null };
        },
      }),
      update: (data) => ({
        eq: (col, val) => ({
          catch: async () => {
            const response = await fetch(
              `${env.SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }
            );
            return { error: !response.ok ? new Error('Update failed') : null };
          },
        }),
      }),
    }),
  };
}

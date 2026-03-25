/**
 * Cloudflare Worker: customshowers-contact
 *
 * Handles website contact form submissions from customshowers.uk.
 * On each submission it:
 *   1. Verifies the Cloudflare Turnstile token
 *   2. Creates/updates a contact in HubSpot
 *   3. Inserts a row into the Supabase `contacts` table so the lead
 *      appears in the CRM portal at crm.customshowers.uk
 *   4. Sends an email notification to sales@customshowers.uk via Resend
 *
 * Required environment variables (set in Cloudflare dashboard or wrangler.toml):
 *   HUBSPOT_API_KEY        — HubSpot private app token
 *   SUPABASE_URL           — https://qgfmsyxaccvwmmygtspf.supabase.co
 *   SUPABASE_SERVICE_KEY   — Service-role key (from Supabase project settings → API)
 *   ALLOWED_ORIGIN         — e.g. https://customshowers.uk (for CORS)
 *   TURNSTILE_SECRET_KEY   — Cloudflare Turnstile secret key
 *   RESEND_API_KEY         — Resend API key (for email notifications)
 */

interface Env {
  HUBSPOT_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  ALLOWED_ORIGIN?: string
  TURNSTILE_SECRET_KEY?: string
  RESEND_API_KEY?: string
}

interface ContactFormPayload {
  name: string
  email: string
  phone?: string
  address?: string
  service_type?: string   // snake_case (from Worker-direct calls)
  serviceType?: string    // camelCase (from website QuoteForm.tsx)
  message?: string
  turnstileToken?: string
  photo?: { name: string; type: string; data: string } | null
  // Google Ads / UTM tracking
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string
}

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://customshowers.uk'
    const cors = corsHeaders(allowedOrigin)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let body: ContactFormPayload
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Normalise field names — form sends camelCase, normalise to snake_case
    const { name, email, phone, address, message } = body
    const service_type = body.service_type || body.serviceType || null
    const utm_source   = body.utm_source   || null
    const utm_medium   = body.utm_medium   || null
    const utm_campaign = body.utm_campaign || null
    const utm_term     = body.utm_term     || null
    const utm_content  = body.utm_content  || null
    const gclid        = body.gclid        || null

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'name and email are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ---------------------------------------------------------------
    // Optional: Verify Turnstile token (skip if secret not configured)
    // ---------------------------------------------------------------
    if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
      try {
        const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY,
            response: body.turnstileToken,
          }),
        })
        const tsData = await tsRes.json() as { success: boolean }
        if (!tsData.success) {
          return new Response(JSON.stringify({ error: 'Security check failed' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      } catch {
        // If Turnstile verification fails due to network, continue anyway
        console.warn('Turnstile verification skipped due to error')
      }
    }

    const errors: string[] = []

    // ---------------------------------------------------------------
    // 1. HubSpot — create or update contact
    // ---------------------------------------------------------------
    try {
      const [firstName, ...rest] = name.trim().split(' ')
      const lastName = rest.join(' ') || ''

      const hsPayload = {
        properties: {
          email,
          firstname: firstName,
          lastname: lastName,
          phone: phone || '',
          address: address || '',
          hs_lead_status: 'NEW',
          lifecyclestage: 'lead',
          shower_service_type: service_type || '',
          message: message || '',
          hs_analytics_source: utm_source || '',
          hs_analytics_source_data_1: utm_medium || '',
          hs_analytics_source_data_2: utm_campaign || '',
          utm_source: utm_source || '',
          utm_medium: utm_medium || '',
          utm_campaign: utm_campaign || '',
          utm_term: utm_term || '',
          utm_content: utm_content || '',
          gclid: gclid || '',
        },
      }

      const hsRes = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hsPayload),
        }
      )

      if (!hsRes.ok) {
        const hsBody = await hsRes.text()
        if (hsRes.status === 409) {
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${env.HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: hsPayload.properties }),
            }
          )
        } else {
          errors.push(`HubSpot error: ${hsBody}`)
        }
      }
    } catch (err) {
      errors.push(`HubSpot exception: ${String(err)}`)
    }

    // ---------------------------------------------------------------
    // 2. Supabase — insert into contacts table
    // ---------------------------------------------------------------
    try {
      const supabaseRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/contacts`,
        {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            name,
            email,
            phone: phone || null,
            address: address || null,
            source: 'website',
            service_type: service_type || null,
            message: message || null,
            utm_source:   utm_source   || null,
            utm_medium:   utm_medium   || null,
            utm_campaign: utm_campaign || null,
            utm_term:     utm_term     || null,
            utm_content:  utm_content  || null,
            gclid:        gclid        || null,
          }),
        }
      )

      if (!supabaseRes.ok) {
        const sbBody = await supabaseRes.text()
        errors.push(`Supabase error: ${sbBody}`)
      }
    } catch (err) {
      errors.push(`Supabase exception: ${String(err)}`)
    }

    // ---------------------------------------------------------------
    // 3. Resend — email notification to sales@customshowers.uk
    // ---------------------------------------------------------------
    if (env.RESEND_API_KEY) {
      try {
        const adsSection = (utm_source || gclid) ? `
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
          <p style="color:#1a2942;font-weight:600">Ad Attribution</p>
          ${utm_source   ? `<p><strong>UTM Source:</strong> ${utm_source}</p>` : ''}
          ${utm_medium   ? `<p><strong>UTM Medium:</strong> ${utm_medium}</p>` : ''}
          ${utm_campaign ? `<p><strong>UTM Campaign:</strong> ${utm_campaign}</p>` : ''}
          ${utm_term     ? `<p><strong>UTM Term:</strong> ${utm_term}</p>` : ''}
          ${utm_content  ? `<p><strong>UTM Content:</strong> ${utm_content}</p>` : ''}
          ${gclid        ? `<p><strong>Google Click ID:</strong> ${gclid}</p>` : ''}
        ` : ''
        const htmlBody = `
          <h2>New Website Enquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> ${phone || '—'}</p>
          <p><strong>Address:</strong> ${address || '—'}</p>
          <p><strong>Service Type:</strong> ${service_type || '—'}</p>
          <p><strong>Message:</strong></p>
          <p>${message ? message.replace(/\n/g, '<br>') : '—'}</p>
          ${adsSection}
          <p style="color:#64748b;font-size:12px">✅ Also saved to CRM portal contacts.</p>
        `
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Custom Showers Website <noreply@customshowers.uk>',
            to: ['sales@customshowers.uk'],
            subject: `New Enquiry from ${name}`,
            html: htmlBody,
          }),
        })
        if (!resendRes.ok) {
          console.error('Resend error:', await resendRes.text())
        }
      } catch (err) {
        console.error('Resend exception:', String(err))
      }
    }

    // If both HubSpot and Supabase failed, return 500
    if (errors.length === 2) {
      console.error('Both integrations failed:', errors)
      return new Response(
        JSON.stringify({ success: false, message: 'Something went wrong, please try again.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    if (errors.length > 0) {
      console.warn('Partial failure:', errors)
    }

    return new Response(
      JSON.stringify({ success: true, message: "Thank you, we'll be in touch shortly." }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  },
}

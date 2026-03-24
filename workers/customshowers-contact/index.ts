/**
 * Cloudflare Worker: customshowers-contact
 *
 * Handles website contact form submissions from customshowers.uk.
 * On each submission it:
 *   1. Creates/updates a contact in HubSpot
 *   2. Inserts a row into the Supabase `contacts` table so the lead
 *      appears in the CRM portal at crm.customshowers.uk
 *
 * Required environment variables (set in Cloudflare dashboard or wrangler.toml):
 *   HUBSPOT_API_KEY        — HubSpot private app token
 *   SUPABASE_URL           — https://qgfmsyxaccvwmmygtspf.supabase.co
 *   SUPABASE_SERVICE_KEY   — Service-role key (from Supabase project settings → API)
 *   ALLOWED_ORIGIN         — e.g. https://customshowers.uk (for CORS)
 */

interface Env {
  HUBSPOT_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  ALLOWED_ORIGIN?: string
}

interface ContactFormPayload {
  name: string
  email: string
  phone?: string
  address?: string
  service_type?: string
  message?: string
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

    const { name, email, phone, address, service_type, message } = body

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'name and email are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
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
          // Custom HubSpot property — create in HubSpot if it doesn't exist
          shower_service_type: service_type || '',
          message: message || '',
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
        // If contact already exists (409) try to update via upsert
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

    // If both failed, return 500 so the website form can show an error
    if (errors.length === 2) {
      console.error('Both integrations failed:', errors)
      return new Response(
        JSON.stringify({ success: false, message: 'Something went wrong, please try again.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // At least one succeeded — log any partial failures
    if (errors.length > 0) {
      console.warn('Partial failure:', errors)
    }

    return new Response(
      JSON.stringify({ success: true, message: "Thank you, we'll be in touch shortly." }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  },
}

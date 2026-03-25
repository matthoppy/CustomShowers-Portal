/**
 * Cloudflare Worker: customshowers-calls
 *
 * Receives Twilio call status callbacks and logs them to Supabase.
 * On each call event it:
 *   1. Parses the Twilio form-encoded payload
 *   2. Upserts a call record in the Supabase `calls` table
 *   3. Attempts to match the caller to an existing contact or lead
 *
 * Twilio sends a POST with content-type application/x-www-form-urlencoded
 * containing: CallSid, CallStatus, From, To, Duration, etc.
 *
 * Secrets (set via Cloudflare dashboard):
 *   SUPABASE_SERVICE_KEY  — Supabase service-role key
 *
 * Vars (wrangler.toml):
 *   SUPABASE_URL          — https://qgfmsyxaccvwmmygtspf.supabase.co
 */

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// Normalise a phone number to E.164-ish for matching
// Strips spaces, dashes, parens. Converts 07xxx to +447xxx.
function normaliseNumber(num: string): string {
  if (!num) return num
  let n = num.replace(/[\s\-().]/g, '')
  if (n.startsWith('07')) n = '+44' + n.slice(1)
  return n
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Parse Twilio's form-encoded body
    const body = await request.formData()
    const callSid    = body.get('CallSid')    as string
    const callStatus = body.get('CallStatus') as string
    const from       = body.get('From')       as string
    const to         = body.get('To')         as string
    const duration   = parseInt(body.get('Duration') as string || '0', 10)

    if (!callSid) {
      return new Response('Missing CallSid', { status: 400 })
    }

    const supabaseHeaders = {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }

    // ---------------------------------------------------------------
    // 1. Try to match caller to an existing contact or lead
    // ---------------------------------------------------------------
    let contactId: string | null = null
    let leadId: string | null = null

    if (from) {
      const normFrom = normaliseNumber(from)

      // Search contacts by phone
      const contactRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/contacts?phone=eq.${encodeURIComponent(normFrom)}&select=id&limit=1`,
        { headers: supabaseHeaders }
      )
      if (contactRes.ok) {
        const contacts = await contactRes.json() as { id: string }[]
        if (contacts.length > 0) contactId = contacts[0].id
      }

      // If no contact, search leads by phone
      if (!contactId) {
        const leadRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/leads?phone=eq.${encodeURIComponent(normFrom)}&select=id&limit=1`,
          { headers: supabaseHeaders }
        )
        if (leadRes.ok) {
          const leads = await leadRes.json() as { id: string }[]
          if (leads.length > 0) leadId = leads[0].id
        }
      }

      // Also try without country code prefix if no match yet
      if (!contactId && !leadId) {
        const localNum = normFrom.replace(/^\+44/, '0')
        const contactRes2 = await fetch(
          `${env.SUPABASE_URL}/rest/v1/contacts?phone=eq.${encodeURIComponent(localNum)}&select=id&limit=1`,
          { headers: supabaseHeaders }
        )
        if (contactRes2.ok) {
          const contacts2 = await contactRes2.json() as { id: string }[]
          if (contacts2.length > 0) contactId = contacts2[0].id
        }
        if (!contactId) {
          const leadRes2 = await fetch(
            `${env.SUPABASE_URL}/rest/v1/leads?phone=eq.${encodeURIComponent(localNum)}&select=id&limit=1`,
            { headers: supabaseHeaders }
          )
          if (leadRes2.ok) {
            const leads2 = await leadRes2.json() as { id: string }[]
            if (leads2.length > 0) leadId = leads2[0].id
          }
        }
      }
    }

    // ---------------------------------------------------------------
    // 2. Upsert call record in Supabase
    // ---------------------------------------------------------------
    const now = new Date().toISOString()
    const isTerminal = ['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(callStatus)

    const record: Record<string, unknown> = {
      call_sid: callSid,
      caller_number: from || null,
      called_number: to || null,
      status: callStatus,
      direction: 'inbound',
      contact_id: contactId,
      lead_id: leadId,
    }

    // Set timestamps based on status
    if (callStatus === 'initiated' || callStatus === 'ringing') {
      record.started_at = now
    }
    if (isTerminal) {
      record.ended_at = now
      if (duration > 0) record.duration = duration
    }

    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/calls`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(record),
    })

    if (!upsertRes.ok) {
      const errText = await upsertRes.text()
      console.error('Supabase upsert failed:', errText)
    }

    // Return empty TwiML response (Twilio expects 200 with valid XML or empty body)
    return new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  },
}

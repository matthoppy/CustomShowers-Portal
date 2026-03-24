// Supabase Edge Function: form-webhook
// Receives website quote form submissions, creates a Lead + Deal in the CRM,
// and sends a notification email to sales@customshowers.uk
//
// Deploy: supabase functions deploy form-webhook
// URL: https://qgfmsyxaccvwmmygtspf.supabase.co/functions/v1/form-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')! // or use any SMTP service

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://customshowers.uk',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { name, email, phone, service_type, address, city, postcode, project_notes } = body

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const installRequired = service_type === 'supply_install' ? 'Yes' : 'No'
    const serviceLabel = service_type === 'supply_install' ? 'Supply + London Installation' : 'Supply Only'
    const addressFull = [address, city, postcode].filter(Boolean).join(', ')
    const leadNotes = [
      addressFull && `Address: ${addressFull}`,
      project_notes && `Project: ${project_notes}`,
    ].filter(Boolean).join('\n\n')

    // 1. Create Lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert([{
        name,
        email,
        phone: phone || null,
        source: 'Website',
        status: 'new',
        notes: leadNotes || null,
      }])
      .select()
      .single()

    if (leadError) throw new Error(`Lead creation failed: ${leadError.message}`)

    // 2. Insert into contacts table (powers the Contacts view in the CRM portal)
    await supabase.from('contacts').insert([{
      name,
      email,
      phone: phone || null,
      address: addressFull || null,
      source: 'website',
      service_type: serviceLabel,
      message: project_notes || null,
    }])

    // 3. Create Deal
    const { error: dealError } = await supabase
      .from('deals')
      .insert([{
        deal_name: `${name} - Website Enquiry`,
        deal_owner: 'Matt Hopkinson',
        stage: 'new_enquiry',
        deal_type: 'New Business',
        priority: 'Low',
        lead_source: 'Website',
        install_required: installRequired,
        lead_id: lead.id,
        stage_changed_at: new Date().toISOString(),
        notes: project_notes || null,
      }])

    if (dealError) throw new Error(`Deal creation failed: ${dealError.message}`)

    // 3. Send email via Resend (swap for your email provider if needed)
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CRM <noreply@customshowers.uk>',
          to: ['sales@customshowers.uk'],
          subject: `New Website Enquiry: ${name}`,
          html: `
            <h2 style="color:#1e293b">New Quote Request from customshowers.uk</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;font-size:14px">
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Name</td><td style="padding:10px 12px;border:1px solid #e2e8f0">${name}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Email</td><td style="padding:10px 12px;border:1px solid #e2e8f0"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Phone</td><td style="padding:10px 12px;border:1px solid #e2e8f0">${phone || '—'}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Service</td><td style="padding:10px 12px;border:1px solid #e2e8f0">${serviceLabel}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Address</td><td style="padding:10px 12px;border:1px solid #e2e8f0">${addressFull || '—'}</td></tr>
              <tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Project</td><td style="padding:10px 12px;border:1px solid #e2e8f0">${project_notes || '—'}</td></tr>
            </table>
            <p style="color:#64748b;font-size:13px;margin-top:16px">
              ✅ Lead and Deal automatically created in the CRM.
            </p>
          `,
        }),
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: "Thank you, we'll be in touch shortly." }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('form-webhook error:', err)
    return new Response(
      JSON.stringify({ success: false, message: 'Something went wrong, please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

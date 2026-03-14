# Website Form → CRM Integration Setup

Two options — pick one:

---

## Option A: Supabase Edge Function (simpler, no extra tools)

### 1. Set environment variables in Supabase dashboard

Go to **Project Settings → Edge Functions → Secrets** and add:
- `RESEND_API_KEY` — get a free key at resend.com (send from noreply@customshowers.uk)

### 2. Deploy the function

```bash
supabase functions deploy form-webhook --project-ref qgfmsyxaccvwmmygtspf
```

The webhook URL will be:
```
https://qgfmsyxaccvwmmygtspf.supabase.co/functions/v1/form-webhook
```

### 3. Update your website form

Add this to your website form's submit handler (replace the existing form action):

```javascript
async function submitQuoteForm(event) {
  event.preventDefault()
  const form = event.target

  const payload = {
    name:          form.querySelector('[name="name"]').value,
    email:         form.querySelector('[name="email"]').value,
    phone:         form.querySelector('[name="phone"]').value,
    service_type:  form.querySelector('[name="service_type"]:checked')?.value, // 'supply_only' or 'supply_install'
    address:       form.querySelector('[name="address"]').value,
    city:          form.querySelector('[name="city"]').value,
    postcode:      form.querySelector('[name="postcode"]').value,
    project_notes: form.querySelector('[name="project_notes"]').value,
  }

  const res = await fetch(
    'https://qgfmsyxaccvwmmygtspf.supabase.co/functions/v1/form-webhook',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  const data = await res.json()
  if (data.success) {
    // Show success message
    alert("Thank you! We'll be in touch shortly.")
    form.reset()
  } else {
    alert('Something went wrong, please try again.')
  }
}
```

Make sure your radio buttons have `value="supply_only"` and `value="supply_install"`.

---

## Option B: n8n Workflow

### 1. Import the workflow

In n8n: **Workflows → Import from file** → select `website-form-to-crm.json`

### 2. Configure credentials

Create a **Header Auth** credential named `Supabase API Key`:
- **Name:** `apikey`
- **Value:** your Supabase `anon` key (from Project Settings → API)

Set up your **SMTP / Gmail** credentials for the email node.

### 3. Activate the workflow

Toggle the workflow to **Active**. Your webhook URL will be:
```
https://YOUR-N8N-DOMAIN/webhook/customshowers-form
```

### 4. Update your website form

Same as Option A but use your n8n webhook URL instead.

---

## What happens on each form submission

1. Form POSTs JSON to the webhook URL
2. A **Lead** is created in the CRM (Leads section) — status: New, source: Website
3. A **Deal** is created in the CRM (Deals section) — stage: New Enquiry, linked to the lead
4. An email is sent to **sales@customshowers.uk** with all the form details

# Website Form → CRM Setup (n8n)

This workflow receives submissions from your website contact form and automatically:
1. Creates a new **Lead** in Supabase (visible in the CRM)
2. Sends you a **notification email**

---

## Step 1 — Import the workflow into n8n

1. Open your n8n instance
2. Go to **Workflows → Import from file**
3. Select `n8n/website-form-to-crm.json` from this repo
4. Click **Import**

---

## Step 2 — Add credentials in n8n

### Supabase (HTTP Request node)
The workflow calls the Supabase REST API directly. You need:

| Setting | Value |
|---|---|
| **Supabase URL** | `https://qgfmsyxaccvwmmygtspf.supabase.co` |
| **Service Role Key** | Get from Supabase → Project Settings → API → service_role key |

In the workflow, find the **"Insert Lead to Supabase"** node and update:
- URL: `https://qgfmsyxaccvwmmygtspf.supabase.co/rest/v1/leads`
- Header `apikey`: your service_role key
- Header `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`

### Email (Gmail / SMTP node)
Find the **"Send notification email"** node and connect your email credentials.

---

## Step 3 — Activate the workflow

1. Click the toggle to **Activate** the workflow
2. Copy the **Webhook URL** from the Webhook trigger node
   - It will look like: `https://your-n8n.com/webhook/custom-showers-form`

---

## Step 4 — Add the JS snippet to your website form

Add this script to your website, replacing `YOUR_WEBHOOK_URL` with the URL from Step 3:

```html
<script>
document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.querySelector('[name="name"]').value,
    email: form.querySelector('[name="email"]').value,
    phone: form.querySelector('[name="phone"]').value || '',
    service_type: form.querySelector('[name="service_type"]:checked')?.value || '',
    message: form.querySelector('[name="message"]')?.value || '',
    source: 'website'
  };

  try {
    await fetch('YOUR_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // Show success message
    form.innerHTML = '<p>Thanks! We will be in touch soon.</p>';
  } catch (err) {
    console.error('Form submission error:', err);
  }
});
</script>
```

---

## Step 5 — Update your website form radio buttons

Make sure your supply/install radio buttons have the correct `name` and `value` attributes:

```html
<input type="radio" name="service_type" value="supply_only"> Supply Only
<input type="radio" name="service_type" value="supply_install"> Supply & Install
```

---

## What appears in the CRM

Each form submission creates a new lead with:
- **Name** from the form
- **Email** and **Phone**
- **Source**: `website`
- **Status**: `new`
- **Notes**: service type + message

View new leads at: https://crm.customshowers.uk/#/leads

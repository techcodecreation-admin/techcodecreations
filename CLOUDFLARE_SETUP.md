# Cloudflare D1 Database Connection Guide

**Account:** `techcodecreations@gmail.com`  
**Database Name:** `techcodecreations-db`  
**API Service:** `techcodecreations-api`

---

## 🚀 How to Connect Cloudflare Database

### Step 1: Login to Cloudflare
Go to [dash.cloudflare.com](https://dash.cloudflare.com) and login with:
- **Email:** `techcodecreations@gmail.com`

---

### Step 2: Create the D1 Database in Cloudflare Dashboard
1. In Cloudflare Dashboard, go to **Storage & Databases** > **D1 SQL Database**.
2. Click **Create Database**.
3. Name it: `techcodecreations-db`.
4. Click **Create**.
5. Copy the generated **Database ID** (UUID).
6. Open `wrangler.toml` in your project folder and replace `database_id = "..."` with your actual Database ID.

---

### Step 3: Run the Schema Migration (Create Tables)
In Cloudflare Dashboard:
1. Click on your `techcodecreations-db` database.
2. Go to the **Console** tab.
3. Paste the contents of `schema.sql` and click **Execute**.
4. The `orders`, `bill_sequences`, and `inquiries` tables are now live!

---

### Step 4: Deploy the Cloudflare Worker API
In PowerShell or Terminal (once Node.js / Wrangler is installed):
```bash
npx wrangler login
# Select techcodecreations@gmail.com in the browser
npx wrangler deploy
```

Once deployed, Cloudflare gives you an API URL, for example:
`https://techcodecreations-api.<your-subdomain>.workers.dev`

---

### Step 5: Connect inside the Admin Portal
1. Open [http://localhost:8080/admin.html](http://localhost:8080/admin.html) or your live admin page.
2. Click the **Cloudflare DB** button in the header.
3. Enter your Cloudflare Worker URL or click **Test Connection**.
4. Click **Sync All Orders to Cloudflare DB**.
5. All client orders, bookings, and official invoices will now synchronize automatically across all devices!


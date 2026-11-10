# Cloudflare D1 Database Connection Guide

**Account:** `techcodecreations@gmail.com`  
**Database Name:** `techcodecreations-db`  
**Worker API Name:** `techcodecreations-api`

> 💡 **NO TERMINAL OR NODE.JS REQUIRED!**  
> You can complete this entire setup inside your web browser at [dash.cloudflare.com](https://dash.cloudflare.com) in **under 2 minutes**!

---

## 🚀 4 Simple Steps in Cloudflare Dashboard (Browser Only)

### Step 1: Create the D1 Database
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in with **`techcodecreations@gmail.com`**.
2. In the left sidebar, click **Storage & Databases** > **D1 SQL Database**.
3. Click **Create Database**.
4. Database name: **`techcodecreations-db`**.
5. Click **Create**.

---

### Step 2: Create the Database Tables (Run SQL Schema)
1. On your newly created `techcodecreations-db` page, click the **Console** tab at the top.
2. Open `schema.sql` (or click **Copy schema.sql Code** in your Admin Portal).
3. Paste the SQL code into the Cloudflare console box and click **Execute**.
4. ✅ All tables (`orders`, `bill_sequences`, `inquiries`) are now created!

---

### Step 3: Create the Cloudflare Worker API
1. In the left sidebar, click **Workers & Pages**.
2. Click **Create Application** (or **Create**) > select **Worker**.
3. Name it: **`techcodecreations-api`**.
4. Click **Deploy**.
5. On the success screen, click **Edit code** (this opens Cloudflare's online code editor in your browser).
6. Delete the starter code, copy & paste the contents of `worker.js` (or click **Copy worker.js Code** in Admin Portal).
7. Click the blue **Deploy** button in the top right.

---

### Step 4: Connect the Database to your Worker
1. Go back to your Worker dashboard page for `techcodecreations-api`.
2. Click the **Settings** tab.
3. Click **Bindings** (or **Variables and Secrets** > **Bindings**).
4. Click **Add** > select **D1 Database**.
5. Set:
   - **Variable name:** `DB` *(must be exactly uppercase `DB`)*
   - **D1 database:** select `techcodecreations-db`
6. Click **Save and Deploy**.
7. Copy your Worker URL from the top of the page (e.g. `https://techcodecreations-api.<your-subdomain>.workers.dev`).

---

## 🔗 Step 5: Connect in Tech Code Creations Admin Portal

1. Open your admin portal: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)
2. In the top header bar, click the **Cloudflare DB** button.
3. Paste your Worker URL in the box.
4. Click **Save & Connect**.
5. Click **Sync Local Orders to Cloudflare**.
6. ✅ **All your client bookings, orders, and official bills will now sync to the cloud automatically!**

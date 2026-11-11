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

### Step 3: Paste worker.js Code into your Worker
1. In the left sidebar, click **Workers & Pages**.
2. Click on your worker: **`techcodecreations-api`**.
3. Click the **Edit code** button (this opens Cloudflare's online code editor in your browser).
4. Delete all existing code in the editor.
5. Copy and paste all the code from **`worker.js`** (or click **📋 Copy worker.js Code** in your Admin Portal).
6. Click the blue **Deploy** button in the top right.

---

### Step 4: Link your D1 Database to the Worker (Binding)
1. Go back to your Worker page for **`techcodecreations-api`**.
2. Click the **Settings** tab at the top.
3. Click **Bindings** in the left sub-menu.
4. Click **Add** > select **D1 Database**.
5. Set:
   - **Variable name:** `DB` *(⚠️ MUST be uppercase `DB`)*
   - **D1 database:** select **`techcodecreations-db`**
6. Click **Save and Deploy**.

---

## 🔗 Step 5: Verification & Sync in Tech Code Creations Admin Portal

Your Worker URL is already pre-configured in your Admin Portal:
`https://techcodecreations-api.techcodecreations.workers.dev`

1. Open your admin portal: [admin.html](file:///c:/Users/Kubera/OneDrive/Desktop/TechCodeCreations/admin.html)
2. In the top header bar, click the **Database** button (or **Cloudflare DB**).
3. Click **🔍 Test Database Connection**:
   - ✅ It will verify your live D1 database with a green checkmark!
4. Click **🔄 Sync All Orders to Database**:
   - ✅ All your client bookings, orders, and official bills are now permanently stored in Cloudflare D1!

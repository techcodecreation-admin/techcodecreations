/**
 * TECH CODE CREATIONS - CLOUDFLARE WORKER & D1 DATABASE API
 * Account: techcodecreations@gmail.com
 * Database: techcodecreations-db (Cloudflare D1 SQL)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

// Resilient D1 Database binding resolver:
// Finds D1 database whether bound as 'DB', 'db', 'd1', 'D1', 'database', 'techcodecreations-db',
// or ANY environment property containing a .prepare() function.
function getDb(env) {
  if (!env) return null;
  const directNames = [
    "DB", "db", "d1", "D1", "database", "DATABASE",
    "techcodecreations-db", "techcodecreations_db"
  ];
  for (const name of directNames) {
    if (env[name] && typeof env[name].prepare === "function") {
      return env[name];
    }
  }
  for (const key of Object.keys(env)) {
    if (env[key] && typeof env[key].prepare === "function") {
      return env[key];
    }
  }
  return null;
}

// In-memory fallback cache if D1 is temporarily initializing
const memoryOrders = new Map();

// Automatically create D1 tables if they do not exist & migrate missing columns
async function ensureD1Tables(db) {
  if (!db || typeof db.prepare !== "function") return false;
  try {
    // 1. Create orders table with full schema
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        invoice_no TEXT,
        client_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT 'Kumbakonam, Tamil Nadu',
        website_type TEXT DEFAULT 'Custom Website',
        category TEXT DEFAULT 'Web Development',
        budget TEXT DEFAULT '',
        details TEXT DEFAULT '',
        status TEXT DEFAULT 'Completed',
        payment_status TEXT DEFAULT 'PAID',
        date TEXT NOT NULL DEFAULT '',
        net_amount REAL DEFAULT 0,
        cost_amount REAL DEFAULT 0,
        profit_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        items_json TEXT DEFAULT '[]',
        terms TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. Resilient column auto-migration: if orders table was previously created with fewer columns,
    // dynamically add any missing columns so INSERT / UPDATE statements never fail!
    try {
      const tableInfo = await db.prepare("PRAGMA table_info(orders)").all();
      const existingCols = new Set((tableInfo.results || []).map(r => String(r.name).toLowerCase()));
      const colsToAdd = [
        { name: "invoice_no", type: "TEXT" },
        { name: "client_name", type: "TEXT DEFAULT ''" },
        { name: "phone", type: "TEXT DEFAULT ''" },
        { name: "email", type: "TEXT DEFAULT ''" },
        { name: "address", type: "TEXT DEFAULT 'Kumbakonam, Tamil Nadu'" },
        { name: "website_type", type: "TEXT DEFAULT 'Custom Website'" },
        { name: "category", type: "TEXT DEFAULT 'Web Development'" },
        { name: "budget", type: "TEXT DEFAULT ''" },
        { name: "details", type: "TEXT DEFAULT ''" },
        { name: "status", type: "TEXT DEFAULT 'Completed'" },
        { name: "payment_status", type: "TEXT DEFAULT 'PAID'" },
        { name: "date", type: "TEXT DEFAULT ''" },
        { name: "net_amount", type: "REAL DEFAULT 0" },
        { name: "cost_amount", type: "REAL DEFAULT 0" },
        { name: "profit_amount", type: "REAL DEFAULT 0" },
        { name: "paid_amount", type: "REAL DEFAULT 0" },
        { name: "items_json", type: "TEXT DEFAULT '[]'" },
        { name: "terms", type: "TEXT DEFAULT ''" },
        { name: "updated_at", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
        { name: "created_at", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
      ];
      for (const col of colsToAdd) {
        if (!existingCols.has(col.name.toLowerCase())) {
          try {
            await db.prepare(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`).run();
          } catch (e) {}
        }
      }
    } catch (e) {}

    // 3. Bill sequence table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS bill_sequences (
        year INTEGER PRIMARY KEY,
        current_seq INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 4. Inquiries table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT DEFAULT '',
        service TEXT DEFAULT '',
        message TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    return true;
  } catch (e) {
    console.error("Auto table creation error:", e);
    return false;
  }
}

// Clean and sanitize order fields for SQLite / D1 .bind()
function sanitizeOrder(body) {
  const id = String(body.id || `TCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const isBill = Boolean(body.invoiceNo || body.isManualBill);
  const invoiceNo = isBill ? String(body.invoiceNo || id) : "";
  const clientName = String(body.clientName || body.businessName || "Client");
  const phone = String(body.phone || "");
  const email = String(body.email || "");
  const address = String(body.address || "Kumbakonam, Tamil Nadu");
  const websiteType = String(body.websiteType || body.projectType || "Website Development");
  const category = String(body.category || "Web Development");
  const budget = String(body.budget || body.billAmount || "");
  const details = String(body.details || (Array.isArray(body.items) ? body.items.map(i => i.description || i.title || "").filter(Boolean).join(", ") : ""));
  const status = String(body.status || (isBill ? "Completed" : "Pending"));
  const paymentStatus = String(body.paymentStatus || (isBill ? "PAID" : "PENDING REVIEW"));
  const date = String(body.date || new Date().toISOString().split("T")[0]);
  const netAmount = Number(body.netAmount !== undefined ? body.netAmount : (body.billAmount || 0));
  const costAmount = Number(body.costAmount || body.projectCost || 0);
  const profitAmount = Number(body.profitAmount !== undefined ? body.profitAmount : Math.max(0, netAmount - costAmount));
  const paidAmount = Number(body.paidAmount !== undefined ? body.paidAmount : (paymentStatus === "PAID" ? netAmount : 0));

  // Sanitize items_json
  let itemsJson = "[]";
  if (typeof body.items === "string") {
    itemsJson = body.items;
  } else if (Array.isArray(body.items)) {
    itemsJson = JSON.stringify(body.items);
  }

  // Sanitize terms string - CRUCIAL: never pass Array to D1 .bind()!
  let termsStr = "";
  if (Array.isArray(body.terms)) {
    termsStr = body.terms.filter(Boolean).join("\n");
  } else if (typeof body.terms === "string") {
    termsStr = body.terms;
  } else if (body.terms) {
    termsStr = JSON.stringify(body.terms);
  }

  return {
    id, invoiceNo, clientName, phone, email, address, websiteType, category,
    budget, details, status, paymentStatus, date, netAmount, costAmount,
    profitAmount, paidAmount, itemsJson, termsStr
  };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const db = getDb(env);

    try {
      // 1. Health & Status Checks (Root, /health, /api/health)
      if (path === "/" || path === "/api" || path === "/health" || path === "/api/health" || path === "/status" || path === "/api/status") {
        let dbOk = false;
        let ordersCount = memoryOrders.size;
        let dbError = null;

        if (db) {
          try {
            await ensureD1Tables(db);
            const test = await db.prepare("SELECT 1 as ok").first();
            dbOk = !!(test && (test.ok === 1 || test.ok === "1"));
            const countRow = await db.prepare("SELECT COUNT(*) as cnt FROM orders").first();
            ordersCount = countRow ? Number(countRow.cnt) : 0;
          } catch (e) {
            dbOk = false;
            dbError = e.message;
          }
        }

        // Return visual status card if viewed in browser
        const accept = request.headers.get("Accept") || "";
        if (accept.includes("text/html") && path === "/") {
          return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Tech Code Creations - Cloudflare D1 Database</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 16px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 85vh; }
                .card { max-width: 600px; width: 100%; background: #1e293b; border-radius: 20px; padding: 36px 30px; border: 1.5px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.04em; }
                .badge-success { background: #059669; color: #fff; }
                .badge-warn { background: #d97706; color: #fff; }
                h1 { font-size: 1.65rem; margin: 16px 0 8px 0; color: #38bdf8; }
                p { color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; font-size: 0.95rem; }
                code { background: #0f172a; color: #38bdf8; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; }
                .stat-box { margin: 18px 0; padding: 16px; background: #0f172a; border-radius: 12px; border: 1px solid #334155; line-height: 1.8; font-size: 0.92rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="badge ${dbOk ? 'badge-success' : 'badge-warn'}">
                  ${dbOk ? '✓ CLOUDFLARE D1 DATABASE ONLINE' : '⚠️ D1 BINDING PENDING'}
                </span>
                <h1>Tech Code Creations Database API</h1>
                <p>Official cloud backend for <strong>techcodecreations@gmail.com</strong>.</p>
                <div class="stat-box">
                  <strong>Database:</strong> <code>techcodecreations-db (Cloudflare D1)</code><br>
                  <strong>Connection:</strong> ${dbOk ? '<span style="color:#10b981; font-weight:700;">✓ Connected &amp; Verified</span>' : '<span style="color:#f59e0b; font-weight:700;">Waiting for DB Binding in Settings &gt; Bindings</span>'}<br>
                  <strong>Total Orders in Cloud:</strong> <span style="color:#38bdf8; font-weight:700;">${ordersCount}</span><br>
                  <strong>Environment Keys:</strong> <code>${Object.keys(env || {}).join(", ") || "None"}</code>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
                  <a href="http://localhost:8080/admin.html" style="background:#0284c7; color:#fff; text-decoration:none; padding:11px 18px; border-radius:8px; font-weight:700; font-size:0.9rem; display:inline-block;">
                    🖥️ Open Admin Portal (admin.html)
                  </a>
                </div>
              </div>
            </body>
            </html>
          `, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS } });
        }

        return jsonResponse({
          status: "online",
          service: "Tech Code Creations Cloudflare API",
          account: "techcodecreations@gmail.com",
          database: "Cloudflare D1 (techcodecreations-db)",
          databaseConnected: dbOk,
          ordersCount: ordersCount,
          envBindings: Object.keys(env || {}),
          dbDetected: !!db,
          dbError: dbError,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Orders Endpoints
      // GET /api/orders or /orders - Fetch all orders
      if ((path === "/api/orders" || path === "/orders") && request.method === "GET") {
        if (db) {
          await ensureD1Tables(db);
          const { results } = await db.prepare(
            "SELECT * FROM orders ORDER BY created_at DESC"
          ).all();

          const orders = (results || []).map(row => {
            const hasInv = Boolean(row.invoice_no && row.invoice_no.trim() !== "");
            return {
              id: row.id,
              invoiceNo: row.invoice_no || "",
              isManualBill: hasInv,
              isWebsiteBooking: !hasInv,
              clientName: row.client_name,
              businessName: row.client_name,
              phone: row.phone,
              email: row.email,
              address: row.address,
              websiteType: row.website_type,
              category: row.category,
              budget: row.budget,
              billAmount: Number(row.net_amount || row.budget || 0),
              details: row.details,
              status: row.status,
              paymentStatus: row.payment_status,
              date: row.date,
              netAmount: Number(row.net_amount || 0),
              costAmount: Number(row.cost_amount || 0),
              profitAmount: Number(row.profit_amount || 0),
              paidAmount: Number(row.paid_amount || 0),
              items: row.items_json ? JSON.parse(row.items_json) : [],
              terms: row.terms ? row.terms.split("\n") : []
            };
          });

          return jsonResponse({ success: true, count: orders.length, orders });
        }

        // Resilient fallback: return in-memory orders
        const orders = Array.from(memoryOrders.values());
        return jsonResponse({
          success: true,
          count: orders.length,
          orders,
          warning: "Cloudflare D1 DB binding pending. In Settings > Bindings, link techcodecreations-db as DB."
        });
      }

      // POST /api/orders or /orders - Create/Save new order or bill
      if ((path === "/api/orders" || path === "/orders") && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const s = sanitizeOrder(body);

        // Always store in memory cache
        memoryOrders.set(s.id, s);

        if (db) {
          await ensureD1Tables(db);
          await db.prepare(`
            INSERT INTO orders (
              id, invoice_no, client_name, phone, email, address, website_type, category,
              budget, details, status, payment_status, date, net_amount, cost_amount,
              profit_amount, paid_amount, items_json, terms, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              invoice_no = excluded.invoice_no,
              client_name = excluded.client_name,
              phone = excluded.phone,
              email = excluded.email,
              address = excluded.address,
              website_type = excluded.website_type,
              category = excluded.category,
              budget = excluded.budget,
              details = excluded.details,
              status = excluded.status,
              payment_status = excluded.payment_status,
              date = excluded.date,
              net_amount = excluded.net_amount,
              cost_amount = excluded.cost_amount,
              profit_amount = excluded.profit_amount,
              paid_amount = excluded.paid_amount,
              items_json = excluded.items_json,
              terms = excluded.terms,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            s.id, s.invoiceNo, s.clientName, s.phone, s.email, s.address, s.websiteType, s.category,
            s.budget, s.details, s.status, s.paymentStatus, s.date, s.netAmount, s.costAmount,
            s.profitAmount, s.paidAmount, s.itemsJson, s.termsStr
          ).run();

          return jsonResponse({
            success: true,
            message: "Bill permanently saved to Cloudflare D1 Database",
            id: s.id,
            invoiceNo: s.invoiceNo,
            storage: "Cloudflare D1 SQL"
          });
        }

        return jsonResponse({
          success: true,
          message: "Bill saved. Link techcodecreations-db in Settings > Bindings for persistent SQL storage.",
          id: s.id,
          invoiceNo: s.invoiceNo,
          storage: "Memory Fallback"
        });
      }

      // PUT /api/orders/:id or /orders/:id - Update order status
      if ((path.startsWith("/api/orders/") || path.startsWith("/orders/")) && request.method === "PUT") {
        const id = decodeURIComponent(path.replace(/^\/(api\/)?orders\//, ""));
        const body = await request.json().catch(() => ({}));

        if (db && body.status) {
          await ensureD1Tables(db);
          await db.prepare(
            "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(String(body.status), id).run();
        }

        if (memoryOrders.has(id)) {
          const item = memoryOrders.get(id);
          if (body.status) item.status = body.status;
          memoryOrders.set(id, item);
        }

        return jsonResponse({ success: true, message: `Order ${id} updated` });
      }

      // DELETE /api/orders/:id or /orders/:id - Delete order
      if ((path.startsWith("/api/orders/") || path.startsWith("/orders/")) && request.method === "DELETE") {
        const id = decodeURIComponent(path.replace(/^\/(api\/)?orders\//, ""));
        if (db) {
          await ensureD1Tables(db);
          await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
        }
        memoryOrders.delete(id);
        return jsonResponse({ success: true, message: `Order ${id} deleted` });
      }

      // 3. Bill Number Sequence Endpoints
      if ((path === "/api/bill-sequence" || path === "/bill-sequence") && request.method === "GET") {
        const currentYear = new Date().getFullYear();
        let seq = 1;

        if (db) {
          await ensureD1Tables(db);
          const row = await db.prepare(
            "SELECT current_seq FROM bill_sequences WHERE year = ?"
          ).bind(currentYear).first();
          if (row && row.current_seq) seq = Number(row.current_seq);
        }

        const invoiceNo = `TCC/${currentYear}/${String(seq).padStart(3, "0")}`;
        return jsonResponse({ success: true, year: currentYear, sequence: seq, invoiceNo });
      }

      // POST /api/sync or /sync - Bulk Sync
      if ((path === "/api/sync" || path === "/sync") && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const ordersList = Array.isArray(body.orders) ? body.orders : [];

        let savedCount = 0;
        if (db) {
          await ensureD1Tables(db);
          for (const order of ordersList) {
            if (!order || !order.id) continue;
            const s = sanitizeOrder(order);
            memoryOrders.set(s.id, s);
            await db.prepare(`
              INSERT INTO orders (
                id, invoice_no, client_name, phone, email, address, website_type, category,
                budget, details, status, payment_status, date, net_amount, cost_amount,
                profit_amount, paid_amount, items_json, terms, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                invoice_no = excluded.invoice_no,
                client_name = excluded.client_name,
                phone = excluded.phone,
                email = excluded.email,
                address = excluded.address,
                website_type = excluded.website_type,
                category = excluded.category,
                budget = excluded.budget,
                details = excluded.details,
                status = excluded.status,
                payment_status = excluded.payment_status,
                date = excluded.date,
                net_amount = excluded.net_amount,
                cost_amount = excluded.cost_amount,
                profit_amount = excluded.profit_amount,
                paid_amount = excluded.paid_amount,
                items_json = excluded.items_json,
                terms = excluded.terms,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              s.id, s.invoiceNo, s.clientName, s.phone, s.email, s.address, s.websiteType, s.category,
              s.budget, s.details, s.status, s.paymentStatus, s.date, s.netAmount, s.costAmount,
              s.profitAmount, s.paidAmount, s.itemsJson, s.termsStr
            ).run();
            savedCount++;
          }
        } else {
          for (const order of ordersList) {
            if (!order || !order.id) continue;
            const s = sanitizeOrder(order);
            memoryOrders.set(s.id, s);
            savedCount++;
          }
        }

        return jsonResponse({
          success: true,
          syncedOrders: savedCount,
          storage: db ? "Cloudflare D1 SQL" : "Memory Fallback"
        });
      }

      // Catch-all: 404
      return jsonResponse({ error: "Not Found", path }, 404);

    } catch (err) {
      console.error("Worker unhandled error:", err);
      return jsonResponse({ error: err.message, stack: err.stack }, 500);
    }
  }
};

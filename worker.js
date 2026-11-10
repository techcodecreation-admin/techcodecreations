/**
 * TECH CODE CREATIONS - CLOUDFLARE WORKER & D1 DATABASE API
 * Account: techcodecreations@gmail.com
 * Database Binding: env.DB (Cloudflare D1)
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

// Automatically create D1 tables if they do not exist
async function ensureD1Tables(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        invoice_no TEXT,
        client_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT DEFAULT 'Kumbakonam, Tamil Nadu',
        website_type TEXT,
        category TEXT DEFAULT 'Web Development',
        budget TEXT,
        details TEXT,
        status TEXT DEFAULT 'PENDING',
        payment_status TEXT DEFAULT 'PENDING REVIEW',
        date TEXT NOT NULL,
        net_amount REAL DEFAULT 0,
        cost_amount REAL DEFAULT 0,
        profit_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        items_json TEXT,
        terms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS bill_sequences (
        year INTEGER PRIMARY KEY,
        current_seq INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (e) {
    console.error("Auto table creation error:", e);
  }
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // 1. Health & Status Checks (Root, /health, /api/health)
      if (path === "/" || path === "/api" || path === "/health" || path === "/api/health" || path === "/status" || path === "/api/status") {
        let dbOk = false;
        let ordersCount = 0;
        try {
          if (env.DB) {
            await ensureD1Tables(env.DB);
            const test = await env.DB.prepare("SELECT 1 as ok").first();
            dbOk = test && test.ok === 1;
            const countRow = await env.DB.prepare("SELECT COUNT(*) as cnt FROM orders").first();
            ordersCount = countRow ? countRow.cnt : 0;
          }
        } catch (e) {
          dbOk = false;
        }

        // Return beautiful visual status card if viewed in browser
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
                .card { max-width: 580px; width: 100%; background: #1e293b; border-radius: 20px; padding: 36px 30px; border: 1.5px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.04em; }
                .badge-success { background: #059669; color: #fff; }
                .badge-warn { background: #d97706; color: #fff; }
                h1 { font-size: 1.65rem; margin: 16px 0 8px 0; color: #38bdf8; }
                p { color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; font-size: 0.95rem; }
                code { background: #0f172a; color: #38bdf8; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; }
                .stat-box { margin: 18px 0; padding: 16px; background: #0f172a; border-radius: 12px; border: 1px solid #334155; line-height: 1.8; font-size: 0.92rem; }
                .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; margin-top: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="badge ${dbOk ? 'badge-success' : 'badge-warn'}">
                  ${dbOk ? '✓ CLOUDFLARE D1 DATABASE ONLINE' : '⚠️ WAITING FOR D1 BINDING (DB)'}
                </span>
                <h1>Tech Code Creations Database API</h1>
                <p>Official cloud backend for <strong>techcodecreations@gmail.com</strong>.</p>
                <div class="stat-box">
                  <strong>Database:</strong> <code>techcodecreations-db (Cloudflare D1)</code><br>
                  <strong>Binding (DB):</strong> ${dbOk ? '<span style="color:#10b981; font-weight:700;">✓ Connected</span>' : '<span style="color:#f59e0b; font-weight:700;">Missing (Add DB binding in Settings &gt; Bindings)</span>'}<br>
                  <strong>Total Orders in Cloud:</strong> <span style="color:#38bdf8; font-weight:700;">${ordersCount}</span>
                </div>
                <p>Copy this URL and paste it into <a href="http://localhost:8080/admin.html" style="color:#38bdf8; font-weight:700;">admin.html</a> &gt; <strong>Cloudflare DB</strong> to sync all your orders automatically!</p>
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
          timestamp: new Date().toISOString()
        });
      }

      // 2. Orders Endpoints
      // GET /api/orders or /orders - Fetch all orders
      if ((path === "/api/orders" || path === "/orders") && request.method === "GET") {
        if (!env.DB) {
          return jsonResponse({ error: "Cloudflare D1 database binding (DB) not configured in Settings > Bindings" }, 500);
        }

        await ensureD1Tables(env.DB);
        const { results } = await env.DB.prepare(
          "SELECT * FROM orders ORDER BY created_at DESC"
        ).all();

        const orders = results.map(row => ({
          id: row.id,
          invoiceNo: row.invoice_no || row.id,
          clientName: row.client_name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          websiteType: row.website_type,
          category: row.category,
          budget: row.budget,
          details: row.details,
          status: row.status,
          paymentStatus: row.payment_status,
          date: row.date,
          netAmount: row.net_amount,
          costAmount: row.cost_amount,
          profitAmount: row.profit_amount,
          paidAmount: row.paid_amount,
          items: row.items_json ? JSON.parse(row.items_json) : [],
          terms: row.terms
        }));

        return jsonResponse({ success: true, count: orders.length, orders });
      }

      // POST /api/orders or /orders - Create/Save new order or bill
      if ((path === "/api/orders" || path === "/orders") && request.method === "POST") {
        if (!env.DB) {
          return jsonResponse({ error: "Cloudflare D1 database binding (DB) not configured" }, 500);
        }

        await ensureD1Tables(env.DB);
        const body = await request.json();
        const id = body.id || `TCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const invoiceNo = body.invoiceNo || id;
        const clientName = body.clientName || "Client";
        const phone = body.phone || "";
        const email = body.email || "";
        const address = body.address || "Kumbakonam, Tamil Nadu";
        const websiteType = body.websiteType || "Website Development";
        const category = body.category || "Web Development";
        const budget = body.budget || "";
        const details = body.details || "";
        const status = body.status || "PENDING";
        const paymentStatus = body.paymentStatus || "PENDING REVIEW";
        const date = body.date || new Date().toISOString().split("T")[0];
        const netAmount = Number(body.netAmount || body.billAmount || 0);
        const costAmount = Number(body.costAmount || body.projectCost || 0);
        const profitAmount = Number(body.profitAmount || Math.max(0, netAmount - costAmount));
        const paidAmount = Number(body.paidAmount || 0);
        const itemsJson = body.items ? JSON.stringify(body.items) : "[]";
        const terms = body.terms || "";

        await env.DB.prepare(`
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
          id, invoiceNo, clientName, phone, email, address, websiteType, category,
          budget, details, status, paymentStatus, date, netAmount, costAmount,
          profitAmount, paidAmount, itemsJson, terms
        ).run();

        return jsonResponse({ success: true, message: "Order saved to Cloudflare D1", id, invoiceNo });
      }

      // PUT /api/orders/:id or /orders/:id - Update order status
      if ((path.startsWith("/api/orders/") || path.startsWith("/orders/")) && request.method === "PUT") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const id = decodeURIComponent(path.replace(/^\/(api\/)?orders\//, ""));
        const body = await request.json();

        if (body.status) {
          await env.DB.prepare(
            "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(body.status, id).run();
        }

        return jsonResponse({ success: true, message: `Order ${id} updated` });
      }

      // DELETE /api/orders/:id or /orders/:id - Delete order
      if ((path.startsWith("/api/orders/") || path.startsWith("/orders/")) && request.method === "DELETE") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const id = decodeURIComponent(path.replace(/^\/(api\/)?orders\//, ""));
        await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();

        return jsonResponse({ success: true, message: `Order ${id} deleted` });
      }

      // 3. Bill Number Sequence Endpoints
      if ((path === "/api/bill-sequence" || path === "/bill-sequence") && request.method === "GET") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        await ensureD1Tables(env.DB);
        const currentYear = new Date().getFullYear();
        let row = await env.DB.prepare(
          "SELECT current_seq FROM bill_sequences WHERE year = ?"
        ).bind(currentYear).first();

        let seq = row ? row.current_seq : 1;
        const invoiceNo = `TCC/${currentYear}/${String(seq).padStart(3, "0")}`;

        return jsonResponse({ success: true, year: currentYear, sequence: seq, invoiceNo });
      }

      // POST /api/sync or /sync - Bulk Sync
      if ((path === "/api/sync" || path === "/sync") && request.method === "POST") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        await ensureD1Tables(env.DB);
        const body = await request.json();
        const ordersList = Array.isArray(body.orders) ? body.orders : [];

        let savedCount = 0;
        for (const order of ordersList) {
          if (!order.id) continue;
          await env.DB.prepare(`
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
              status = excluded.status,
              net_amount = excluded.net_amount,
              cost_amount = excluded.cost_amount,
              profit_amount = excluded.profit_amount,
              items_json = excluded.items_json,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            order.id,
            order.invoiceNo || order.id,
            order.clientName || "Client",
            order.phone || "",
            order.email || "",
            order.address || "Kumbakonam, Tamil Nadu",
            order.websiteType || "Website Development",
            order.category || "Web Development",
            order.budget || "",
            order.details || "",
            order.status || "PENDING",
            order.paymentStatus || "PENDING REVIEW",
            order.date || new Date().toISOString().split("T")[0],
            Number(order.netAmount || 0),
            Number(order.costAmount || 0),
            Number(order.profitAmount || 0),
            Number(order.paidAmount || 0),
            order.items ? JSON.stringify(order.items) : "[]",
            order.terms || ""
          ).run();
          savedCount++;
        }

        return jsonResponse({ success: true, syncedOrders: savedCount });
      }

      // Catch-all: 404
      return jsonResponse({ error: "Not Found", path }, 404);

    } catch (err) {
      return jsonResponse({ error: err.message, stack: err.stack }, 500);
    }
  }
};

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

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health & Connection Status Check
      if (path === "/api/health" || path === "/api/status") {
        let dbOk = false;
        try {
          if (env.DB) {
            const test = await env.DB.prepare("SELECT 1 as ok").first();
            dbOk = test && test.ok === 1;
          }
        } catch (e) {
          dbOk = false;
        }

        return jsonResponse({
          status: "online",
          service: "Tech Code Creations Cloudflare API",
          account: "techcodecreations@gmail.com",
          database: "Cloudflare D1 (techcodecreations-db)",
          databaseConnected: dbOk,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Orders Endpoints
      // GET /api/orders - Fetch all orders
      if (path === "/api/orders" && request.method === "GET") {
        if (!env.DB) {
          return jsonResponse({ error: "Cloudflare D1 database binding (DB) not configured" }, 500);
        }

        const { results } = await env.DB.prepare(
          "SELECT * FROM orders ORDER BY created_at DESC"
        ).all();

        // Map DB columns to frontend expected fields
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

      // POST /api/orders - Create new order or bill
      if (path === "/api/orders" && request.method === "POST") {
        if (!env.DB) {
          return jsonResponse({ error: "Cloudflare D1 database binding not configured" }, 500);
        }

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

      // PUT /api/orders/:id - Update order status
      if (path.startsWith("/api/orders/") && request.method === "PUT") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const id = decodeURIComponent(path.replace("/api/orders/", ""));
        const body = await request.json();

        if (body.status) {
          await env.DB.prepare(
            "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(body.status, id).run();
        }

        return jsonResponse({ success: true, message: `Order ${id} updated` });
      }

      // DELETE /api/orders/:id - Delete order
      if (path.startsWith("/api/orders/") && request.method === "DELETE") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const id = decodeURIComponent(path.replace("/api/orders/", ""));
        await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();

        return jsonResponse({ success: true, message: `Order ${id} deleted` });
      }

      // 3. Bill Number Sequence Endpoints
      // GET /api/bill-sequence - Get next bill number
      if (path === "/api/bill-sequence" && request.method === "GET") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const currentYear = new Date().getFullYear();
        let row = await env.DB.prepare(
          "SELECT current_seq FROM bill_sequences WHERE year = ?"
        ).bind(currentYear).first();

        let seq = row ? row.current_seq : 1;
        const invoiceNo = `TCC/${currentYear}/${String(seq).padStart(3, "0")}`;

        return jsonResponse({ success: true, year: currentYear, sequence: seq, invoiceNo });
      }

      // POST /api/bill-sequence/reset - Reset sequence
      if (path === "/api/bill-sequence/reset" && request.method === "POST") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

        const body = await request.json().catch(() => ({}));
        const currentYear = new Date().getFullYear();
        const startSeq = Number(body.startSeq || 1);

        await env.DB.prepare(`
          INSERT INTO bill_sequences (year, current_seq, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(year) DO UPDATE SET
            current_seq = excluded.current_seq,
            updated_at = CURRENT_TIMESTAMP
        `).bind(currentYear, startSeq).run();

        const invoiceNo = `TCC/${currentYear}/${String(startSeq).padStart(3, "0")}`;
        return jsonResponse({ success: true, message: `Bill sequence reset to ${invoiceNo}`, invoiceNo });
      }

      // 4. Bulk Sync: POST /api/sync
      if (path === "/api/sync" && request.method === "POST") {
        if (!env.DB) return jsonResponse({ error: "DB binding missing" }, 500);

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


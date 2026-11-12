-- ============================================================================
-- TECH CODE CREATIONS - CLOUDFLARE D1 DATABASE SCHEMA
-- Account: techcodecreations@gmail.com
-- Database Name: techcodecreations-db
-- ============================================================================

-- 1. Orders and Invoices Table
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
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_no ON orders(invoice_no);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 2. Bill Number Sequence Counter Table
CREATE TABLE IF NOT EXISTS bill_sequences (
  year INTEGER PRIMARY KEY,
  current_seq INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert starting sequence for current year 2026
INSERT OR IGNORE INTO bill_sequences (year, current_seq, updated_at)
VALUES (2026, 1, CURRENT_TIMESTAMP);

-- 3. Inquiries / Contact Messages Table
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  service TEXT DEFAULT '',
  message TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

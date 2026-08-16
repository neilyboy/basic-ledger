import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const DB_PATH = isBuild ? ':memory:' : (process.env.DB_PATH || path.resolve(process.cwd(), 'data/ledger.db'));
export const UPLOADS_DIR = isBuild ? path.resolve(process.cwd(), 'tmp/uploads') : (process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads'));
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

if (!isBuild) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      company_name TEXT DEFAULT '',
      reply_to TEXT DEFAULT '',
      currency TEXT DEFAULT 'USD',
      admin_pin TEXT DEFAULT '',
      app_name TEXT DEFAULT 'Basic Ledger',
      ocr_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      requires_mileage INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      "group" TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      vendor TEXT DEFAULT '',
      category_id INTEGER NOT NULL,
      notes TEXT DEFAULT '',
      odometer INTEGER,
      receipt_image TEXT,
      pdf_file TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  const seed = db.transaction(() => {
    const settingsRow = db!.prepare('SELECT COUNT(*) as n FROM settings').get() as { n: number } | undefined;
    if (!settingsRow || settingsRow.n === 0) {
      const hashed = bcrypt.hashSync(ADMIN_PIN, 10);
      db!.prepare(`
        INSERT INTO settings (company_name, reply_to, currency, admin_pin, app_name, ocr_enabled)
        VALUES ('', '', 'USD', ?, 'Basic Ledger', 0)
      `).run(hashed);
    }

    const categories = [
      { name: 'Fuel', requires_mileage: 1, sort_order: 10 },
      { name: 'Vehicle Maintenance', requires_mileage: 0, sort_order: 20 },
      { name: 'Tool Purchase', requires_mileage: 0, sort_order: 30 },
      { name: 'Job Expense', requires_mileage: 0, sort_order: 40 },
      { name: 'Office Supplies', requires_mileage: 0, sort_order: 50 },
      { name: 'Travel', requires_mileage: 0, sort_order: 60 },
    ];
    const insertCat = db!.prepare('INSERT OR IGNORE INTO categories (name, requires_mileage, sort_order) VALUES (?, ?, ?)');
    for (const c of categories) insertCat.run(c.name, c.requires_mileage, c.sort_order);
  });

  seed.exclusive();
  return db;
}

export type Category = {
  id: number;
  name: string;
  requires_mileage: number;
  sort_order: number;
  active: number;
};

export type Transaction = {
  id: number;
  amount: number;
  date: string;
  vendor: string;
  category_id: number;
  notes: string;
  odometer: number | null;
  receipt_image: string | null;
  pdf_file: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
};

export type Recipient = {
  id: number;
  name: string;
  email: string;
  group: string;
};

export function getSettings() {
  return getDb().prepare('SELECT * FROM settings LIMIT 1').get() as Record<string, string | number>;
}

export function getCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY sort_order, name').all() as Category[];
}

export function getActiveCategories() {
  return getDb().prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name').all() as Category[];
}

export function getCategoryById(id: number) {
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
}

export function getRecipients() {
  return getDb().prepare('SELECT * FROM recipients ORDER BY "group", name').all() as Recipient[];
}

export function getAllTransactions() {
  return getDb().prepare(`
    SELECT t.*, c.name as category_name
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    ORDER BY t.date DESC, t.id DESC
  `).all() as Transaction[];
}

export function getTransactionById(id: number) {
  return getDb().prepare(`
    SELECT t.*, c.name as category_name
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(id) as Transaction | undefined;
}

export function createTransaction(data: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category_name'>) {
  const stmt = getDb().prepare(`
    INSERT INTO transactions (amount, date, vendor, category_id, notes, odometer, receipt_image, pdf_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.amount,
    data.date,
    data.vendor,
    data.category_id,
    data.notes,
    data.odometer ?? null,
    data.receipt_image ?? null,
    data.pdf_file ?? null
  );
  return result.lastInsertRowid as number;
}

export function updateTransaction(id: number, data: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category_name'>>) {
  const existing = getTransactionById(id);
  if (!existing) return;
  const set = getDb().prepare(`
    UPDATE transactions
    SET amount = ?, date = ?, vendor = ?, category_id = ?, notes = ?, odometer = ?, receipt_image = ?, pdf_file = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  set.run(
    data.amount ?? existing.amount,
    data.date ?? existing.date,
    data.vendor ?? existing.vendor,
    data.category_id ?? existing.category_id,
    data.notes ?? existing.notes,
    data.odometer ?? existing.odometer,
    data.receipt_image ?? existing.receipt_image,
    data.pdf_file ?? existing.pdf_file,
    id
  );
}

export function deleteTransaction(id: number) {
  const tx = getTransactionById(id);
  if (!tx) return;
  if (tx.receipt_image) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, tx.receipt_image)); } catch {}
  }
  if (tx.pdf_file) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, tx.pdf_file)); } catch {}
  }
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function getMonthlyTotals() {
  return getDb().prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
    FROM transactions
    GROUP BY month
    ORDER BY month DESC
  `).all() as { month: string; total: number }[];
}

export function getCategoryBreakdown() {
  return getDb().prepare(`
    SELECT c.name, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    GROUP BY c.name
    ORDER BY total DESC
  `).all() as { name: string; total: number }[];
}

export function verifyPin(pin: string) {
  const settings = getSettings();
  const adminPin = settings.admin_pin as string;
  if (adminPin && bcrypt.compareSync(pin, adminPin)) return true;
  return pin === ADMIN_PIN;
}

export function updateSettings(values: { company_name: string; reply_to: string; currency: string; ocr_enabled: number }) {
  getDb().prepare(`
    UPDATE settings
    SET company_name = ?, reply_to = ?, currency = ?, ocr_enabled = ?
  `).run(values.company_name, values.reply_to, values.currency, values.ocr_enabled);
}

export function updatePin(newPin: string) {
  const hashed = bcrypt.hashSync(newPin, 10);
  getDb().prepare('UPDATE settings SET admin_pin = ?').run(hashed);
}

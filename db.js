const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'fdms.db');

let db;

// Wrapper to make sql.js API compatible with better-sqlite3 style
class DBWrapper {
  constructor(database) {
    this._db = database;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        self._save();
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const obj = {};
          cols.forEach((c, i) => obj[c] = vals[i]);
          return obj;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        if (params.length) stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const obj = {};
          cols.forEach((c, i) => obj[c] = vals[i]);
          results.push(obj);
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  pragma(p) {
    try { this._db.exec(`PRAGMA ${p}`); } catch (e) { /* ignore */ }
  }

  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  let database;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  db = new DBWrapper(database);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      phone TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      nic_number TEXT UNIQUE,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      status TEXT DEFAULT 'active',
      agent_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      imei TEXT UNIQUE NOT NULL,
      serial_number TEXT,
      hardware_id TEXT,
      hardware_fingerprint TEXT,
      brand TEXT,
      model TEXT,
      os_version TEXT,
      customer_id TEXT,
      status TEXT DEFAULT 'registered',
      is_online INTEGER DEFAULT 0,
      last_heartbeat TEXT,
      enrolled_at TEXT,
      sim_iccid TEXT,
      sim_operator TEXT,
      battery_level INTEGER,
      is_rooted INTEGER DEFAULT 0,
      bootloader_unlocked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS payment_plans (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      installment_amount REAL NOT NULL,
      total_installments INTEGER NOT NULL,
      paid_installments INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      installment_number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      paid_date TEXT,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES payment_plans(id)
    );

    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      issued_by TEXT,
      issued_at TEXT DEFAULT (datetime('now')),
      acknowledged_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (issued_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'high',
      message TEXT,
      is_resolved INTEGER DEFAULT 0,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS device_locations (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );
  `);

  // Seed data
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    seedDatabase();
  }

  return db;
}

function seedDatabase() {
  const adminId = uuidv4();
  const agentId = uuidv4();
  const hash = bcrypt.hashSync('Admin@MDM2024', 10);
  const agentHash = bcrypt.hashSync('Agent@2024', 10);

  db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(adminId, 'admin', hash, 'System Administrator', 'admin', '+94771234567', 'admin@fdms.com');
  db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(agentId, 'agent1', agentHash, 'John Silva', 'agent', '+94779876543', 'john@fdms.com');

  const customers = [
    { name: 'Kamal Perera', nic: '199512345678', phone: '+94771112233', city: 'Colombo' },
    { name: 'Nimal Fernando', nic: '198823456789', phone: '+94772223344', city: 'Kandy' },
    { name: 'Saman Wickrama', nic: '199034567890', phone: '+94773334455', city: 'Galle' },
    { name: 'Dilani Jayasuriya', nic: '199545678901', phone: '+94774445566', city: 'Matara' },
    { name: 'Ruwan De Silva', nic: '199156789012', phone: '+94775556677', city: 'Negombo' },
  ];
  const custIds = [];
  for (const c of customers) {
    const cid = uuidv4();
    custIds.push(cid);
    db.prepare('INSERT INTO customers (id, full_name, nic_number, phone, city, agent_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(cid, c.name, c.nic, c.phone, c.city, agentId);
  }

  const devices = [
    { imei: '356938035643809', brand: 'Samsung', model: 'Galaxy A14', os: 'Android 13' },
    { imei: '352094081234567', brand: 'Samsung', model: 'Galaxy A05', os: 'Android 14' },
    { imei: '861234567890123', brand: 'Xiaomi', model: 'Redmi 12', os: 'Android 13' },
    { imei: '490154203237518', brand: 'Oppo', model: 'A17', os: 'Android 12' },
    { imei: '353456789012345', brand: 'Samsung', model: 'Galaxy A25', os: 'Android 14' },
  ];
  const devIds = [];
  const baseLat = 6.9271, baseLng = 79.8612;
  for (let i = 0; i < devices.length; i++) {
    const did = uuidv4();
    devIds.push(did);
    const d = devices[i];
    const lat = baseLat + (Math.random() - 0.5) * 0.1;
    const lng = baseLng + (Math.random() - 0.5) * 0.1;
    db.prepare('INSERT INTO devices (id, imei, brand, model, os_version, customer_id, status, is_online, battery_level, serial_number, hardware_fingerprint, last_heartbeat, enrolled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
      .run(did, d.imei, d.brand, d.model, d.os, custIds[i], 'active', i < 3 ? 1 : 0, 40 + Math.floor(Math.random() * 55), 'SN' + d.imei.slice(0, 8), 'FP-' + uuidv4().slice(0, 12));
    db.prepare('INSERT INTO device_locations (id, device_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), did, lat, lng, 10 + Math.random() * 30);
  }

  for (let i = 0; i < custIds.length; i++) {
    const planId = uuidv4();
    const total = 50000 + Math.floor(Math.random() * 100000);
    const installments = 12;
    const instAmt = Math.round(total / installments);
    const paidCount = Math.floor(Math.random() * 8);
    db.prepare('INSERT INTO payment_plans (id, customer_id, device_id, total_amount, installment_amount, total_installments, paid_installments, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(planId, custIds[i], devIds[i], total, instAmt, installments, paidCount, '2024-06-01');

    for (let j = 1; j <= installments; j++) {
      const pid = uuidv4();
      const dueDate = new Date(2024, 5 + j, 1).toISOString().split('T')[0];
      const isPaid = j <= paidCount;
      const isOverdue = !isPaid && new Date(dueDate) < new Date();
      db.prepare('INSERT INTO payments (id, plan_id, installment_number, amount, due_date, status, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(pid, planId, j, instAmt, dueDate, isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'), isPaid ? dueDate : null);
    }
  }

  const alertTypes = ['root_detected', 'sim_changed', 'bootloader_unlocked', 'imei_mismatch'];
  for (let i = 0; i < 3; i++) {
    db.prepare('INSERT INTO security_alerts (id, device_id, alert_type, severity, message) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), devIds[i], alertTypes[i % alertTypes.length], i === 0 ? 'critical' : 'high',
        'Security alert detected on ' + devices[i].brand + ' ' + devices[i].model);
  }

  console.log('✅ Database seeded with sample data');
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };

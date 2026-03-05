const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { search, status, agent_id, page = 1, limit = 50 } = req.query;
        let query = `SELECT c.*, u.full_name as agent_name FROM customers c LEFT JOIN users u ON c.agent_id = u.id WHERE 1=1`;
        const params = [];
        if (search) { query += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.nic_number LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (status) { query += ` AND c.status = ?`; params.push(status); }
        if (agent_id) { query += ` AND c.agent_id = ?`; params.push(agent_id); }
        if (req.user.role === 'agent') { query += ` AND c.agent_id = ?`; params.push(req.user.id); }
        query += ` ORDER BY c.created_at DESC`;
        const customers = db.prepare(query).all(...params);
        // Enrich with device and plan counts
        for (const c of customers) {
            c.device_count = db.prepare('SELECT COUNT(*) as count FROM devices WHERE customer_id = ?').get(c.id).count;
            c.active_plans = db.prepare("SELECT COUNT(*) as count FROM payment_plans WHERE customer_id = ? AND status = 'active'").get(c.id).count;
        }
        const total = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
        res.json({ customers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const customer = db.prepare('SELECT c.*, u.full_name as agent_name FROM customers c LEFT JOIN users u ON c.agent_id = u.id WHERE c.id = ?').get(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        customer.devices = db.prepare('SELECT * FROM devices WHERE customer_id = ?').all(req.params.id);
        customer.documents = db.prepare('SELECT * FROM documents WHERE customer_id = ?').all(req.params.id);
        customer.payment_plans = db.prepare('SELECT * FROM payment_plans WHERE customer_id = ?').all(req.params.id);
        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { full_name, nic_number, phone, email, address, city, notes } = req.body;
        if (!full_name || !phone) return res.status(400).json({ error: 'Name and phone required' });
        const id = uuidv4();
        const agent_id = req.user.role === 'agent' ? req.user.id : (req.body.agent_id || null);
        db.prepare('INSERT INTO customers (id, full_name, nic_number, phone, email, address, city, agent_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, full_name, nic_number || null, phone, email || null, address || null, city || null, agent_id, notes || null);
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        res.status(201).json(customer);
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'NIC number already registered' });
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { full_name, phone, email, address, city, status, notes } = req.body;
        const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Customer not found' });
        db.prepare('UPDATE customers SET full_name=?, phone=?, email=?, address=?, city=?, status=?, notes=?, updated_at=datetime("now") WHERE id=?')
            .run(full_name || existing.full_name, phone || existing.phone, email !== undefined ? email : existing.email, address !== undefined ? address : existing.address, city !== undefined ? city : existing.city, status || existing.status, notes !== undefined ? notes : existing.notes, req.params.id);
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/documents', authenticateToken, upload.single('file'), (req, res) => {
    try {
        const db = getDB();
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { doc_type } = req.body;
        const id = uuidv4();
        db.prepare('INSERT INTO documents (id, customer_id, doc_type, filename, original_name, mime_type) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, req.params.id, doc_type || 'other', req.file.filename, req.file.originalname, req.file.mimetype);
        res.status(201).json({ id, filename: req.file.filename, original_name: req.file.originalname, doc_type });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/payments', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const plans = db.prepare('SELECT * FROM payment_plans WHERE customer_id = ?').all(req.params.id);
        for (const plan of plans) {
            plan.payments = db.prepare('SELECT * FROM payments WHERE plan_id = ? ORDER BY installment_number').all(plan.id);
        }
        res.json(plans);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

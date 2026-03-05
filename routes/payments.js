const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/stats', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const totalPlans = db.prepare('SELECT COUNT(*) as count FROM payment_plans').get().count;
        const activePlans = db.prepare("SELECT COUNT(*) as count FROM payment_plans WHERE status = 'active'").get().count;
        const totalReceived = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'paid'").get().total;
        const totalOverdue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'overdue'").get().total;
        const overdueCount = db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'overdue'").get().count;
        res.json({ total_plans: totalPlans, active_plans: activePlans, total_received: totalReceived, total_overdue: totalOverdue, overdue_count: overdueCount });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/overdue', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const overdue = db.prepare(`SELECT p.*, pp.customer_id, pp.device_id, c.full_name as customer_name, c.phone as customer_phone, d.imei, d.brand, d.model FROM payments p JOIN payment_plans pp ON p.plan_id = pp.id JOIN customers c ON pp.customer_id = c.id JOIN devices d ON pp.device_id = d.id WHERE p.status = 'overdue' ORDER BY p.due_date ASC`).all();
        res.json(overdue);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/plans', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { customer_id, status } = req.query;
        let query = 'SELECT pp.*, c.full_name as customer_name, d.imei, d.brand, d.model FROM payment_plans pp JOIN customers c ON pp.customer_id = c.id JOIN devices d ON pp.device_id = d.id WHERE 1=1';
        const params = [];
        if (customer_id) { query += ' AND pp.customer_id = ?'; params.push(customer_id); }
        if (status) { query += ' AND pp.status = ?'; params.push(status); }
        query += ' ORDER BY pp.created_at DESC';
        const plans = db.prepare(query).all(...params);
        res.json(plans);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/plans/:id', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const plan = db.prepare('SELECT pp.*, c.full_name as customer_name, d.imei, d.brand, d.model FROM payment_plans pp JOIN customers c ON pp.customer_id = c.id JOIN devices d ON pp.device_id = d.id WHERE pp.id = ?').get(req.params.id);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        plan.payments = db.prepare('SELECT * FROM payments WHERE plan_id = ? ORDER BY installment_number').all(plan.id);
        res.json(plan);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/plans', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { customer_id, device_id, total_amount, installment_amount, total_installments, frequency, start_date } = req.body;
        if (!customer_id || !device_id || !total_amount || !total_installments) return res.status(400).json({ error: 'Missing required fields' });
        const planId = uuidv4();
        const instAmt = installment_amount || Math.round(total_amount / total_installments);
        db.prepare('INSERT INTO payment_plans (id, customer_id, device_id, total_amount, installment_amount, total_installments, frequency, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(planId, customer_id, device_id, total_amount, instAmt, total_installments, frequency || 'monthly', start_date || new Date().toISOString().split('T')[0]);
        const startD = new Date(start_date || Date.now());
        for (let i = 1; i <= total_installments; i++) {
            const due = new Date(startD);
            if (frequency === 'weekly') due.setDate(due.getDate() + 7 * i);
            else if (frequency === 'biweekly') due.setDate(due.getDate() + 14 * i);
            else due.setMonth(due.getMonth() + i);
            db.prepare('INSERT INTO payments (id, plan_id, installment_number, amount, due_date) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), planId, i, instAmt, due.toISOString().split('T')[0]);
        }
        const plan = db.prepare('SELECT * FROM payment_plans WHERE id = ?').get(planId);
        plan.payments = db.prepare('SELECT * FROM payments WHERE plan_id = ? ORDER BY installment_number').all(planId);
        res.status(201).json(plan);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/pay', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { payment_method, reference_number, notes } = req.body;
        const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        db.prepare('UPDATE payments SET status = "paid", paid_date = date("now"), payment_method = ?, reference_number = ?, notes = ? WHERE id = ?')
            .run(payment_method || 'cash', reference_number || null, notes || null, req.params.id);
        const paidCount = db.prepare("SELECT COUNT(*) as count FROM payments WHERE plan_id = ? AND status = 'paid'").get(payment.plan_id).count;
        db.prepare('UPDATE payment_plans SET paid_installments = ? WHERE id = ?').run(paidCount, payment.plan_id);
        const plan = db.prepare('SELECT * FROM payment_plans WHERE id = ?').get(payment.plan_id);
        if (paidCount >= plan.total_installments) {
            db.prepare('UPDATE payment_plans SET status = "completed" WHERE id = ?').run(payment.plan_id);
        }
        const overdueCount = db.prepare("SELECT COUNT(*) as count FROM payments WHERE plan_id = ? AND status = 'overdue'").get(payment.plan_id).count;
        if (overdueCount === 0) {
            const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(plan.device_id);
            if (device && device.status === 'payment_locked') {
                db.prepare('UPDATE devices SET status = "active" WHERE id = ?').run(plan.device_id);
                db.prepare('INSERT INTO commands (id, device_id, type, payload, issued_by) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), plan.device_id, 'unlock', JSON.stringify({ reason: 'payment_cleared' }), req.user.id);
            }
        }
        res.json({ message: 'Payment recorded', payment_id: req.params.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

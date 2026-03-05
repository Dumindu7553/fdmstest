import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Payments() {
    const nav = useNavigate();
    const [stats, setStats] = useState(null);
    const [plans, setPlans] = useState([]);
    const [overdue, setOverdue] = useState([]);
    const [tab, setTab] = useState('plans');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [form, setForm] = useState({ customer_id: '', device_id: '', total_amount: '', total_installments: 12, frequency: 'monthly', start_date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);
    const [payModal, setPayModal] = useState(null);
    const [payForm, setPayForm] = useState({ payment_method: 'cash', reference_number: '' });

    const load = async () => {
        try {
            const [sr, pr, or] = await Promise.all([api.get('/payments/stats'), api.get('/payments/plans'), api.get('/payments/overdue')]);
            setStats(sr.data); setPlans(pr.data || []); setOverdue(or.data || []);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => {
        load();
        api.get('/customers').then(r => setCustomers(r.data.customers || [])).catch(() => { });
        api.get('/devices').then(r => setDevices(r.data || [])).catch(() => { });
    }, []);

    const handleAddPlan = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await api.post('/payments/plans', { ...form, total_amount: parseFloat(form.total_amount), total_installments: parseInt(form.total_installments) });
            setShowModal(false); load();
        } catch (err) { alert(err.response?.data?.error || 'Failed'); }
        setSaving(false);
    };

    const handlePay = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await api.post(`/payments/${payModal.id}/pay`, payForm);
            setPayModal(null); load();
        } catch (err) { alert('Failed'); }
        setSaving(false);
    };

    const customerDevices = devices.filter(d => d.customer_id === form.customer_id);

    return (
        <div className="page-content">
            <div className="page-header">
                <div><h1 className="page-title">Payments</h1><p className="page-subtitle">Installment plans and payment tracking</p></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Plan</button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--teal-dim)' }}>💰</div><div className="stat-value" style={{ color: 'var(--teal)' }}>Rs {Math.round((stats.total_received || 0) / 1000)}K</div><div className="stat-label">Revenue Collected</div><div className="stat-glow" style={{ background: 'var(--teal)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--blue-dim)' }}>📋</div><div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.active_plans}</div><div className="stat-label">Active Plans</div><div className="stat-glow" style={{ background: 'var(--blue)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--red-dim)' }}>⚠️</div><div className="stat-value" style={{ color: 'var(--red)' }}>{stats.overdue_count}</div><div className="stat-label">Overdue Payments</div><div className="stat-glow" style={{ background: 'var(--red)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--amber-dim)' }}>💸</div><div className="stat-value" style={{ color: 'var(--amber)' }}>Rs {Math.round((stats.total_overdue || 0) / 1000)}K</div><div className="stat-label">Overdue Amount</div><div className="stat-glow" style={{ background: 'var(--amber)' }} /></div>
                </div>
            )}

            <div className="tabs">
                <button className={`tab-btn ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>All Plans ({plans.length})</button>
                <button className={`tab-btn ${tab === 'overdue' ? 'active' : ''}`} onClick={() => setTab('overdue')}>Overdue ({overdue.length})</button>
            </div>

            {tab === 'plans' && (
                <div className="card">
                    {loading ? <div className="loading-center"><div className="spinner" /></div> : plans.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-text">No payment plans yet</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Customer</th><th>Device</th><th>Total</th><th>Installment</th><th>Progress</th><th>Status</th><th>Frequency</th></tr></thead>
                                <tbody>
                                    {plans.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                                            <td style={{ fontSize: 12 }}>{p.brand} {p.model}</td>
                                            <td>Rs {p.total_amount?.toLocaleString()}</td>
                                            <td>Rs {p.installment_amount?.toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                                                    <div className="progress-bar" style={{ flex: 1 }}>
                                                        <div className="progress-fill" style={{ width: `${(p.paid_installments / p.total_installments) * 100}%`, background: 'var(--teal)' }} />
                                                    </div>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.paid_installments}/{p.total_installments}</span>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${p.status === 'active' ? 'badge-teal' : p.status === 'completed' ? 'badge-green' : 'badge-red'}`}>{p.status}</span></td>
                                            <td><span className="badge badge-gray">{p.frequency}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'overdue' && (
                <div className="card">
                    {overdue.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">No overdue payments!</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Customer</th><th>Device</th><th>Amount</th><th>Due Date</th><th>Days Overdue</th><th></th></tr></thead>
                                <tbody>
                                    {overdue.map(p => {
                                        const days = Math.floor((new Date() - new Date(p.due_date)) / 86400000);
                                        return (
                                            <tr key={p.id}>
                                                <td><div style={{ fontWeight: 600 }}>{p.customer_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.customer_phone}</div></td>
                                                <td style={{ fontSize: 12 }}>{p.brand} {p.model}<br /><span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.imei}</span></td>
                                                <td style={{ fontWeight: 700, color: 'var(--red)' }}>Rs {p.amount?.toLocaleString()}</td>
                                                <td>{p.due_date}</td>
                                                <td><span className={`badge ${days > 30 ? 'badge-red' : 'badge-amber'}`}>{days} days</span></td>
                                                <td><button className="btn btn-sm btn-success" onClick={() => setPayModal(p)}>💳 Record Payment</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* New Plan Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header"><h2 className="modal-title">Create Payment Plan</h2><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleAddPlan}>
                            <div className="form-group">
                                <label className="form-label">Customer *</label>
                                <select className="form-control" required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value, device_id: '' })}>
                                    <option value="">— Select Customer —</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Device *</label>
                                <select className="form-control" required value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}>
                                    <option value="">— Select Device —</option>
                                    {customerDevices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.imei})</option>)}
                                    {!form.customer_id && devices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.imei})</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Total Amount (Rs) *</label><input className="form-control" type="number" required min="1000" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} placeholder="150000" /></div>
                                <div className="form-group"><label className="form-label">Installments *</label><input className="form-control" type="number" required min="1" max="60" value={form.total_installments} onChange={e => setForm({ ...form, total_installments: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Frequency</label><select className="form-control" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}><option value="monthly">Monthly</option><option value="biweekly">Bi-weekly</option><option value="weekly">Weekly</option></select></div>
                                <div className="form-group"><label className="form-label">Start Date</label><input className="form-control" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                            </div>
                            {form.total_amount && form.total_installments && (
                                <div style={{ padding: '12px', background: 'var(--teal-dim)', borderRadius: 8, fontSize: 13, color: 'var(--teal)', marginBottom: 16 }}>
                                    Monthly installment: <strong>Rs {Math.round(parseFloat(form.total_amount) / parseInt(form.total_installments)).toLocaleString()}</strong>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Plan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {payModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
                    <div className="modal">
                        <div className="modal-header"><h2 className="modal-title">Record Payment</h2><button className="modal-close" onClick={() => setPayModal(null)}>×</button></div>
                        <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{payModal.customer_name} — Rs {payModal.amount?.toLocaleString()}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Due: {payModal.due_date} · {payModal.brand} {payModal.model}</div>
                        </div>
                        <form onSubmit={handlePay}>
                            <div className="form-group"><label className="form-label">Payment Method</label><select className="form-control" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="mobile_payment">Mobile Payment</option><option value="cheque">Cheque</option></select></div>
                            <div className="form-group"><label className="form-label">Reference Number</label><input className="form-control" value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="Transaction/Receipt #" /></div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Saving...' : '✓ Mark as Paid'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

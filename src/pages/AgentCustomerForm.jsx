import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AgentCustomerForm() {
    const nav = useNavigate();
    const [form, setForm] = useState({ full_name: '', nic_number: '', phone: '', email: '', address: '', city: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            await api.post('/customers', form);
            nav('/agent');
        } catch (err) { setError(err.response?.data?.error || 'Failed to register customer'); }
        setSaving(false);
    };

    return (
        <div className="agent-layout">
            <div className="agent-topbar">
                <button onClick={() => nav('/agent')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer' }}>←</button>
                <span style={{ fontWeight: 700 }}>Register Customer</span>
                <div style={{ width: 40 }} />
            </div>
            <div className="agent-content" style={{ paddingTop: 20 }}>
                <div className="card">
                    {error && <div className="alert alert-critical" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Customer full name" /></div>
                        <div className="form-group"><label className="form-label">NIC Number</label><input className="form-control" value={form.nic_number} onChange={e => setForm({ ...form, nic_number: e.target.value })} placeholder="National ID" /></div>
                        <div className="form-group"><label className="form-label">Phone *</label><input className="form-control" required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+94771234567" /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
                        <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" /></div>
                        <div className="form-group"><label className="form-label">Address</label><textarea className="form-control" rows="2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={saving}>{saving ? 'Registering...' : '✓ Register Customer'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

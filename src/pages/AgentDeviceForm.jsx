import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AgentDeviceForm() {
    const nav = useNavigate();
    const [form, setForm] = useState({ imei: '', serial_number: '', brand: '', model: '', os_version: '', customer_id: '' });
    const [customers, setCustomers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/customers').then(r => setCustomers(r.data.customers || [])).catch(() => { });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            await api.post('/devices', form);
            nav('/agent');
        } catch (err) { setError(err.response?.data?.error || 'Failed to register device'); }
        setSaving(false);
    };

    return (
        <div className="agent-layout">
            <div className="agent-topbar">
                <button onClick={() => nav('/agent')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer' }}>←</button>
                <span style={{ fontWeight: 700 }}>Enroll Device</span>
                <div style={{ width: 40 }} />
            </div>
            <div className="agent-content" style={{ paddingTop: 20 }}>
                <div className="card">
                    {error && <div className="alert alert-critical" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
                    <div style={{ padding: '12px', background: 'var(--teal-dim)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: 'var(--teal)' }}>
                        📱 Tip: You can find the IMEI by dialing *#06# on the device
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label className="form-label">IMEI Number *</label><input className="form-control" required value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} placeholder="15-digit IMEI" maxLength={15} style={{ fontFamily: 'monospace', letterSpacing: 2 }} /></div>
                        <div className="form-group"><label className="form-label">Serial Number</label><input className="form-control" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial Number" /></div>
                        <div className="form-group"><label className="form-label">Brand</label><select className="form-control" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}>
                            <option value="">— Select Brand —</option>
                            {['Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Nokia', 'Motorola', 'Other'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select></div>
                        <div className="form-group"><label className="form-label">Model</label><input className="form-control" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g. Galaxy A14" /></div>
                        <div className="form-group"><label className="form-label">Android Version</label><select className="form-control" value={form.os_version} onChange={e => setForm({ ...form, os_version: e.target.value })}>
                            <option value="">— Select Version —</option>
                            {['Android 10', 'Android 11', 'Android 12', 'Android 13', 'Android 14', 'Android 15'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select></div>
                        <div className="form-group"><label className="form-label">Assign to Customer</label><select className="form-control" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                            <option value="">— Select Customer —</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                        </select></div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={saving}>{saving ? 'Enrolling...' : '📱 Enroll Device'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

function statusBadge(s) {
    const map = { active: 'badge-green', enrolled: 'badge-teal', registered: 'badge-blue', locked: 'badge-red', payment_locked: 'badge-amber', compromised: 'badge-red', suspended: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}><span className="badge-dot" />{s?.replace('_', ' ')}</span>;
}

export default function CustomerDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [docType, setDocType] = useState('nic_front');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        api.get(`/customers/${id}`).then(r => setCustomer(r.data)).catch(() => nav('/customers')).finally(() => setLoading(false));
    }, [id]);

    const uploadDoc = async () => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('doc_type', docType);
        try {
            await api.post(`/customers/${id}/documents`, fd);
            const r = await api.get(`/customers/${id}`);
            setCustomer(r.data);
            setFile(null);
        } catch (e) { alert('Upload failed'); }
        setUploading(false);
    };

    if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
    if (!customer) return null;

    const plans = customer.payment_plans || [];
    const allPayments = plans.flatMap(p => (p.payments || []).map(pay => ({ ...pay, plan: p })));

    return (
        <div className="page-content">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button className="btn-icon" onClick={() => nav('/customers')}>←</button>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#000' }}>
                        {customer.full_name[0]}
                    </div>
                    <div>
                        <h1 className="page-title">{customer.full_name}</h1>
                        <p className="page-subtitle">Customer ID: {customer.id.slice(0, 8)}</p>
                    </div>
                </div>
                <span className={`badge ${customer.status === 'active' ? 'badge-green' : 'badge-amber'}`}><span className="badge-dot" />{customer.status}</span>
            </div>

            <div className="tabs">
                {['overview', 'devices', 'payments', 'documents'].map(t => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: 16 }}>Personal Information</div>
                        <div className="info-list">
                            <div className="info-row"><span className="info-key">Full Name</span><span className="info-val">{customer.full_name}</span></div>
                            <div className="info-row"><span className="info-key">NIC Number</span><span className="info-val" style={{ fontFamily: 'monospace' }}>{customer.nic_number || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Phone</span><span className="info-val">{customer.phone}</span></div>
                            <div className="info-row"><span className="info-key">Email</span><span className="info-val">{customer.email || '—'}</span></div>
                            <div className="info-row"><span className="info-key">City</span><span className="info-val">{customer.city || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Address</span><span className="info-val">{customer.address || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Agent</span><span className="info-val">{customer.agent_name || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Registered</span><span className="info-val">{new Date(customer.created_at).toLocaleDateString()}</span></div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: 12 }}>Summary</div>
                            <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal)' }}>{customer.devices?.length || 0}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Devices</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>{plans.length}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Payment Plans</div>
                                </div>
                            </div>
                        </div>
                        {customer.notes && (
                            <div className="card">
                                <div className="card-title" style={{ marginBottom: 8 }}>Notes</div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{customer.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'devices' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Assigned Devices</div>
                        <button className="btn btn-primary btn-sm" onClick={() => nav('/devices')}>+ Assign Device</button>
                    </div>
                    {customer.devices?.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">📱</div><div className="empty-state-text">No devices assigned</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Brand/Model</th><th>IMEI</th><th>Status</th><th>Battery</th><th>Online</th><th></th></tr></thead>
                                <tbody>
                                    {customer.devices.map(d => (
                                        <tr key={d.id}>
                                            <td><div style={{ fontWeight: 600 }}>{d.brand} {d.model}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.os_version}</div></td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.imei}</td>
                                            <td>{statusBadge(d.status)}</td>
                                            <td>{d.battery_level != null ? `${d.battery_level}%` : '—'}</td>
                                            <td><span className={`badge ${d.is_online ? 'badge-green' : 'badge-gray'}`}>{d.is_online ? 'Online' : 'Offline'}</span></td>
                                            <td><button className="btn btn-sm btn-secondary" onClick={() => nav(`/devices/${d.id}`)}>View →</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'payments' && (
                <div>
                    {plans.map(plan => (
                        <div key={plan.id} className="card" style={{ marginBottom: 16 }}>
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Payment Plan</div>
                                    <div className="card-subtitle">Rs {plan.installment_amount?.toLocaleString()} × {plan.total_installments} installments ({plan.frequency})</div>
                                </div>
                                <span className={`badge ${plan.status === 'active' ? 'badge-teal' : plan.status === 'completed' ? 'badge-green' : 'badge-red'}`}>{plan.status}</span>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                                    <span>{plan.paid_installments}/{plan.total_installments} paid</span>
                                    <span>Rs {plan.total_amount?.toLocaleString()} total</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${(plan.paid_installments / plan.total_installments) * 100}%`, background: 'var(--teal)' }} />
                                </div>
                            </div>
                            <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead><tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Paid On</th></tr></thead>
                                    <tbody>
                                        {(plan.payments || []).map(p => (
                                            <tr key={p.id}>
                                                <td>{p.installment_number}</td>
                                                <td>{p.due_date}</td>
                                                <td>Rs {p.amount?.toLocaleString()}</td>
                                                <td><span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-amber'}`}>{p.status}</span></td>
                                                <td>{p.paid_date || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && <div className="card"><div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-text">No payment plans</div></div></div>}
                </div>
            )}

            {tab === 'documents' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Documents</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        {(customer.documents || []).length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-text">No documents uploaded</div></div>
                        ) : (
                            customer.documents.map(d => (
                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 22 }}>📄</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.original_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.doc_type} · {new Date(d.uploaded_at).toLocaleDateString()}</div>
                                    </div>
                                    <a href={`http://localhost:3001/uploads/${d.filename}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">Download</a>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">Document Type</label>
                            <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
                                <option value="nic_front">NIC Front</option>
                                <option value="nic_back">NIC Back</option>
                                <option value="agreement">Agreement</option>
                                <option value="photo">Photo</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                            <label className="form-label">Select File</label>
                            <input className="form-control" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
                        </div>
                        <button className="btn btn-primary" onClick={uploadDoc} disabled={!file || uploading}>{uploading ? 'Uploading...' : '⬆ Upload'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

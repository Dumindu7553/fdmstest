import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AgentDashboard() {
    const nav = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/customers').then(r => setCustomers(r.data.customers || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const logout = () => { localStorage.clear(); nav('/login'); };

    return (
        <div className="agent-layout">
            <div className="agent-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="logo-icon" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 16 }}>F</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>FDMS Agent</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user.full_name}</div>
                    </div>
                </div>
                <button onClick={logout} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
            </div>
            <div className="agent-content">
                <div style={{ marginBottom: 20, marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Quick Actions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button className="control-btn info" onClick={() => nav('/agent/new-customer')}>
                            <span className="ctrl-icon">👤</span>Register Customer
                        </button>
                        <button className="control-btn success" onClick={() => nav('/agent/new-device')}>
                            <span className="ctrl-icon">📱</span>Enroll Device
                        </button>
                    </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>My Customers ({customers.length})</div>
                {loading ? <div className="loading-center"><div className="spinner" /></div> :
                    customers.length === 0 ? <div className="card"><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">No customers yet</div></div></div> :
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {customers.map(c => (
                                <div key={c.id} className="card" style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: '#000', flexShrink: 0 }}>{c.full_name[0]}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.phone}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <span className="badge badge-blue" style={{ fontSize: 10 }}>{c.device_count || 0} devices</span>
                                                <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10 }}>{c.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                }
            </div>
        </div>
    );
}

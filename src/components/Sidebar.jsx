import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';

export default function Sidebar() {
    const nav = useNavigate();
    const loc = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [alertCount, setAlertCount] = useState(0);
    const [overdueCount, setOverdueCount] = useState(0);

    useEffect(() => {
        api.get('/alerts/stats').then(r => setAlertCount(r.data.unresolved)).catch(() => { });
        api.get('/payments/stats').then(r => setOverdueCount(r.data.overdue_count)).catch(() => { });
    }, []);

    const logout = () => {
        localStorage.clear();
        nav('/login');
    };

    const navItems = [
        {
            group: 'Main', items: [
                { path: '/dashboard', icon: '📊', label: 'Dashboard' },
                { path: '/map', icon: '🗺️', label: 'Live Map' },
            ]
        },
        {
            group: 'Management', items: [
                { path: '/customers', icon: '👥', label: 'Customers' },
                { path: '/devices', icon: '📱', label: 'Devices' },
                { path: '/payments', icon: '💰', label: 'Payments', badge: overdueCount > 0 ? overdueCount : null },
            ]
        },
        {
            group: 'Security', items: [
                { path: '/alerts', icon: '🚨', label: 'Security Alerts', badge: alertCount > 0 ? alertCount : null },
            ]
        },
    ];

    const isActive = (path) => loc.pathname === path || loc.pathname.startsWith(path + '/');

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <div className="logo-icon">F</div>
                    <div className="logo-text">
                        <div className="brand">FDMS</div>
                        <div className="tagline">MDM Platform</div>
                    </div>
                </div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(section => (
                    <div key={section.group}>
                        <div className="nav-section-label">{section.group}</div>
                        {section.items.map(item => (
                            <button key={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => nav(item.path)}>
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                                {item.badge && <span className="nav-badge">{item.badge}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar">{user.full_name?.[0] || 'A'}</div>
                    <div>
                        <div className="user-name">{user.full_name || 'Admin'}</div>
                        <div className="user-role">{user.role}</div>
                    </div>
                    <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
                </div>
            </div>
        </div>
    );
}

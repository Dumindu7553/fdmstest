import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Payments from './pages/Payments';
import SecurityAlerts from './pages/SecurityAlerts';
import MapView from './pages/MapView';
import AgentDashboard from './pages/AgentDashboard';
import AgentCustomerForm from './pages/AgentCustomerForm';
import AgentDeviceForm from './pages/AgentDeviceForm';

function PrivateRoute({ children, role }) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to={user.role === 'agent' ? '/agent' : '/dashboard'} replace />;
    return children;
}

function AdminLayout({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">{children}</div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Admin Routes */}
                <Route path="/dashboard" element={<PrivateRoute role="admin"><AdminLayout><Dashboard /></AdminLayout></PrivateRoute>} />
                <Route path="/customers" element={<PrivateRoute role="admin"><AdminLayout><Customers /></AdminLayout></PrivateRoute>} />
                <Route path="/customers/:id" element={<PrivateRoute role="admin"><AdminLayout><CustomerDetail /></AdminLayout></PrivateRoute>} />
                <Route path="/devices" element={<PrivateRoute role="admin"><AdminLayout><Devices /></AdminLayout></PrivateRoute>} />
                <Route path="/devices/:id" element={<PrivateRoute role="admin"><AdminLayout><DeviceDetail /></AdminLayout></PrivateRoute>} />
                <Route path="/payments" element={<PrivateRoute role="admin"><AdminLayout><Payments /></AdminLayout></PrivateRoute>} />
                <Route path="/alerts" element={<PrivateRoute role="admin"><AdminLayout><SecurityAlerts /></AdminLayout></PrivateRoute>} />
                <Route path="/map" element={<PrivateRoute role="admin"><AdminLayout><MapView /></AdminLayout></PrivateRoute>} />

                {/* Agent Routes */}
                <Route path="/agent" element={<PrivateRoute role="agent"><AgentDashboard /></PrivateRoute>} />
                <Route path="/agent/new-customer" element={<PrivateRoute role="agent"><AgentCustomerForm /></PrivateRoute>} />
                <Route path="/agent/new-device" element={<PrivateRoute role="agent"><AgentDeviceForm /></PrivateRoute>} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

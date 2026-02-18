'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import AuthViews from '@/components/AuthViews';
import DashboardView from '@/components/DashboardView';
import ClientsView from '@/components/ClientsView';
import ServicesView from '@/components/ServicesView';
import CampaignsView from '@/components/CampaignsView';
import CampaignCreate from '@/components/CampaignCreate';
import CampaignDetail from '@/components/CampaignDetail';
import TeamView from '@/components/TeamView';
import AuditLogView from '@/components/AuditLogView';
import OrganizationsView from '@/components/OrganizationsView';
import OrgSelector from '@/components/OrgSelector';
import { setApiContext } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setApiContext(parsedUser.organizationId, parsedUser.role);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Load organizations for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin' && token) {
      loadOrganizations();
    }
  }, [user, token]);

  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const orgs = data.organizations || [];
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        const defaultOrg = orgs[0].id;
        setSelectedOrgId(defaultOrg);
        setApiContext(defaultOrg, 'super_admin');
      }
    } catch (err) { console.error('Failed to load orgs:', err); }
  };

  const handleOrgChange = (orgId) => {
    setSelectedOrgId(orgId);
    setApiContext(orgId, 'super_admin');
    // Force re-render of current view by navigating
    const current = window.location.hash.slice(1) || 'dashboard';
    setCurrentView('');
    setTimeout(() => {
      const parts = current.split('/');
      setCurrentView(parts[0]);
      setViewParams({ id: parts[1], sub: parts[2] });
    }, 50);
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      const parts = hash.split('/');
      setCurrentView(parts[0]);
      setViewParams({ id: parts[1], sub: parts[2] });
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (path) => { window.location.hash = path; };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setApiContext(data.user.organizationId, data.user.role);
    navigate('dashboard');
  };

  const register = async (formData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setApiContext(data.user.organizationId, data.user.role);
    navigate('dashboard');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setSelectedOrgId(null);
    setApiContext(null, null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!user) return <AuthViews onLogin={login} onRegister={register} currentView={currentView} navigate={navigate} />;

  const isSuperAdmin = user.role === 'super_admin';
  const selectedOrgName = organizations.find(o => o.id === selectedOrgId)?.name;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView user={user} navigate={navigate} />;
      case 'organizations': return <OrganizationsView user={user} />;
      case 'clients': return <ClientsView user={user} />;
      case 'services': return <ServicesView user={user} />;
      case 'campaigns': return <CampaignsView user={user} navigate={navigate} />;
      case 'campaign-create': return <CampaignCreate user={user} navigate={navigate} />;
      case 'campaign-detail': return <CampaignDetail campaignId={viewParams.id} user={user} navigate={navigate} />;
      case 'team': return <TeamView user={user} />;
      case 'audit-log': return <AuditLogView user={user} />;
      default: return <DashboardView user={user} navigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} toggle={() => setSidebarCollapsed(!sidebarCollapsed)} navigate={navigate} currentView={currentView} onLogout={logout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with org selector for super admin */}
        {isSuperAdmin && (
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Viewing:</span>
              <OrgSelector organizations={organizations} selectedOrgId={selectedOrgId} onSelect={handleOrgChange} />
            </div>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">Super Admin Mode</span>
          </div>
        )}
        <main className="flex-1 overflow-auto bg-gray-50/50 p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

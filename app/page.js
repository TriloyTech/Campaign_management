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
import AgenciesView from '@/components/AgenciesView';
import AgencyDetail from '@/components/AgencyDetail';
import OrgSelector from '@/components/OrgSelector';
import ProfileView from '@/components/ProfileView';
import ReportsView from '@/components/ReportsView';
import { setApiContext } from '@/lib/api';
import { Loader2, Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Load organizations for super_admin or multi-org users
  useEffect(() => {
    if (token && user) {
      if (user.role === 'super_admin') {
        loadOrganizations();
      } else if (user.organizations && user.organizations.length > 1) {
        setOrganizations(user.organizations);
        if (!selectedOrgId) {
          const defaultOrg = user.organizationId || user.organizations[0].id;
          setSelectedOrgId(defaultOrg);
          setApiContext(defaultOrg, user.role, true);
        }
      } else if (user.organizationId) {
        setSelectedOrgId(user.organizationId);
        setApiContext(user.organizationId, user.role, false);
      }
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
        // Prioritize "Triloy Tech" or "TriloyTech" as default, otherwise use first org
        const triloyTech = orgs.find(o => o.name?.toLowerCase().includes('triloy'));
        const defaultOrg = triloyTech ? triloyTech.id : orgs[0].id;
        setSelectedOrgId(defaultOrg);
        setApiContext(defaultOrg, 'super_admin', true);
      }
    } catch (err) { console.error('Failed to load orgs:', err); }
  };

  const handleOrgChange = (orgId) => {
    setSelectedOrgId(orgId);
    const isMultiOrg = organizations.length > 1;
    setApiContext(orgId, user.role, isMultiOrg);
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

  const navigate = (path) => { 
    window.location.hash = path; 
    setMobileMenuOpen(false); // Close mobile menu on navigation
  };

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

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!user) return <AuthViews onLogin={login} onRegister={register} currentView={currentView} navigate={navigate} />;

  const isSuperAdmin = user.role === 'super_admin';
  const hasMultipleOrgs = organizations.length > 1;
  const showOrgSelector = isSuperAdmin || hasMultipleOrgs;
  const viewKey = `${currentView}-${selectedOrgId || 'default'}`;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView key={viewKey} user={user} navigate={navigate} />;
      case 'organizations': return <OrganizationsView key={viewKey} user={user} />;
      case 'clients': return <ClientsView key={viewKey} user={user} />;
      case 'services': return <ServicesView key={viewKey} user={user} />;
      case 'campaigns': return <CampaignsView key={viewKey} user={user} navigate={navigate} />;
      case 'campaign-create': return <CampaignCreate key={viewKey} user={user} navigate={navigate} />;
      case 'campaign-detail': return <CampaignDetail key={viewKey} campaignId={viewParams.id} user={user} navigate={navigate} />;
      case 'agencies': return <AgenciesView key={viewKey} user={user} navigate={navigate} />;
      case 'agency-detail': return <AgencyDetail key={viewKey} agencyId={viewParams.id} user={user} navigate={navigate} />;
      case 'team': return <TeamView key={viewKey} user={user} />;
      case 'audit-log': return <AuditLogView key={viewKey} user={user} />;
      case 'profile': return <ProfileView key={viewKey} user={user} onUserUpdate={handleUserUpdate} />;
      case 'reports': return <ReportsView key={viewKey} user={user} />;
      default: return <DashboardView key={viewKey} user={user} navigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar 
          user={user} 
          collapsed={sidebarCollapsed} 
          toggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          navigate={navigate} 
          currentView={currentView} 
          onLogout={logout} 
        />
      </div>

      {/* Sidebar - Mobile (Drawer) */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          user={user} 
          collapsed={false} 
          toggle={() => setMobileMenuOpen(false)} 
          navigate={navigate} 
          currentView={currentView} 
          onLogout={logout}
          isMobile={true}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <div className="bg-white border-b px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>

          {/* Org Selector */}
          {showOrgSelector ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-muted-foreground hidden sm:inline">Viewing:</span>
              <div className="flex-1 min-w-0 max-w-xs">
                <OrgSelector organizations={organizations} selectedOrgId={selectedOrgId} onSelect={handleOrgChange} />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Role Badge */}
          <div className="flex-shrink-0">
            {isSuperAdmin && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium whitespace-nowrap">Super Admin</span>}
            {!isSuperAdmin && hasMultipleOrgs && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium whitespace-nowrap">Multi-Org</span>}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

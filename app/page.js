'use client';
import { useState, useEffect, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Hash-based routing
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
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('dashboard');
  };

  const register = async (formData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('dashboard');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('login');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Auth screens
  if (!user) {
    return <AuthViews onLogin={login} onRegister={register} currentView={currentView} navigate={navigate} />;
  }

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView user={user} navigate={navigate} />;
      case 'clients': return <ClientsView user={user} />;
      case 'services': return <ServicesView user={user} />;
      case 'campaigns': return <CampaignsView user={user} navigate={navigate} />;
      case 'campaign-create': return <CampaignCreate user={user} navigate={navigate} />;
      case 'campaign-detail': return <CampaignDetail campaignId={viewParams.id} user={user} navigate={navigate} />;
      case 'team': return <TeamView user={user} />;
      default: return <DashboardView user={user} navigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        toggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        navigate={navigate}
        currentView={currentView}
        onLogout={logout}
      />
      <main className="flex-1 overflow-auto bg-gray-50/50 p-6">
        {renderView()}
      </main>
    </div>
  );
}

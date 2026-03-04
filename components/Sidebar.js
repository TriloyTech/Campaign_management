'use client';
import { LayoutDashboard, Users, Megaphone, Package, UserPlus, ChevronLeft, ChevronRight, LogOut, Briefcase, ScrollText, Building, UserCircle, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Sidebar({ user, collapsed, toggle, navigate, currentView, onLogout }) {
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const superAdminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizations', label: 'Organizations', icon: Building },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'team', label: 'Team', icon: UserPlus },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'audit-log', label: 'Audit Log', icon: ScrollText },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'team', label: 'Team', icon: UserPlus },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'audit-log', label: 'Audit Log', icon: ScrollText },
  ];

  const teamNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'campaigns', label: 'My Campaigns', icon: Briefcase },
    { id: 'services', label: 'Services', icon: Package },
  ];

  const navItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : teamNav);
  const roleLabel = isSuperAdmin ? 'Super Admin' : (user?.role === 'admin' ? 'Admin' : 'Custom Access');

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col transition-all duration-300 min-h-screen`}>
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">CP</div>
            <span className="font-semibold text-sm">CampaignPulse</span>
          </div>
        )}
        <button onClick={toggle} className="p-1 rounded hover:bg-slate-800 transition-colors">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <Separator className="bg-slate-700" />
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'campaigns' && ['campaign-detail', 'campaign-create'].includes(currentView));
          return (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700 space-y-2">
        {/* Profile button */}
        <button 
          onClick={() => navigate('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
            ${currentView === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
            ${collapsed ? 'justify-center' : ''}`}>
          <UserCircle size={18} />
          {!collapsed && <span>My Profile</span>}
        </button>
        
        {/* User info */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} pt-2`}>
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer ${isSuperAdmin ? 'bg-amber-500' : 'bg-blue-500'}`}
            onClick={() => navigate('profile')}
            title="View Profile"
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} className="p-1.5 rounded hover:bg-slate-800 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

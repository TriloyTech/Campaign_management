'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ScrollText, User, Plus, Pencil, Trash2, ArrowUpDown, RefreshCw } from 'lucide-react';
import DateFilter from '@/components/DateFilter';

const ACTION_ICONS = {
  created: { icon: Plus, color: 'text-emerald-600 bg-emerald-100' },
  modified: { icon: Pencil, color: 'text-blue-600 bg-blue-100' },
  updated: { icon: ArrowUpDown, color: 'text-amber-600 bg-amber-100' },
  deleted: { icon: Trash2, color: 'text-red-600 bg-red-100' },
  status_change: { icon: RefreshCw, color: 'text-purple-600 bg-purple-100' },
};

export default function AuditLogView({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [users, setUsers] = useState([]);

  useEffect(() => { loadLogs(); }, [entityFilter, actionFilter, dateRange, userFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = 'activity-logs?limit=200';
      if (entityFilter !== 'all') query += `&entityType=${entityFilter}`;
      if (actionFilter !== 'all') query += `&action=${actionFilter}`;
      if (dateRange !== 'all') query += `&dateRange=${dateRange}`;
      if (userFilter !== 'all') query += `&userId=${userFilter}`;
      const res = await apiFetch('GET', query);
      setLogs(res.logs || []);
      
      // Extract unique users from logs for filter dropdown
      const uniqueUsers = {};
      (res.logs || []).forEach(log => {
        if (log.userId && log.userName) {
          uniqueUsers[log.userId] = log.userName;
        }
      });
      setUsers(Object.entries(uniqueUsers).map(([id, name]) => ({ id, name })));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const getEntityBadge = (entityType) => {
    const colors = { 
      client: 'bg-purple-100 text-purple-800', 
      campaign: 'bg-blue-100 text-blue-800', 
      service: 'bg-indigo-100 text-indigo-800', 
      deliverable: 'bg-amber-100 text-amber-800', 
      team_member: 'bg-emerald-100 text-emerald-800', 
      organization: 'bg-pink-100 text-pink-800',
      agency: 'bg-cyan-100 text-cyan-800',
      invoice: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={`${colors[entityType] || 'bg-gray-100 text-gray-800'} text-xs capitalize border-0`}>{entityType?.replace('_', ' ')}</Badge>;
  };

  const getActionBadge = (action) => {
    const config = ACTION_ICONS[action] || ACTION_ICONS.updated;
    return <Badge className={`${config.color} text-xs capitalize border-0`}>{action?.replace('_', ' ')}</Badge>;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate delivery stats
  const deliveryStats = logs.filter(l => l.action === 'status_change' && l.entityType === 'deliverable');
  const deliveryByUser = {};
  deliveryStats.forEach(log => {
    if (!deliveryByUser[log.userName]) deliveryByUser[log.userName] = { total: 0, toDelivered: 0 };
    deliveryByUser[log.userName].total += 1;
    if (log.newStatus === 'delivered') deliveryByUser[log.userName].toDelivered += 1;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Track all changes across your organization</p>
      </div>
      
      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="campaign">Campaigns</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="deliverable">Deliverables</SelectItem>
            <SelectItem value="team_member">Team Members</SelectItem>
            <SelectItem value="organization">Organizations</SelectItem>
            <SelectItem value="agency">Agencies</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="modified">Modified</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        
        {users.length > 0 && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Delivery Stats Summary */}
      {deliveryStats.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <RefreshCw size={14} className="text-purple-600" /> Delivery Status Changes Summary
            </h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(deliveryByUser).map(([userName, stats]) => (
                <div key={userName} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">{userName}</p>
                    <p className="text-muted-foreground">
                      {stats.total} changes • <span className="text-emerald-600">{stats.toDelivered} delivered</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <ScrollText className="mx-auto mb-3" size={40} />
          <p>No activity logs found</p>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log, i) => {
                const config = ACTION_ICONS[log.action] || ACTION_ICONS.updated;
                const Icon = config.icon;
                return (
                  <div key={log.id || i} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.details}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User size={11} /> {log.userName}
                        </span>
                        {getEntityBadge(log.entityType)}
                        {getActionBadge(log.action)}
                        {log.oldStatus && log.newStatus && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {log.oldStatus} → <span className={log.newStatus === 'delivered' ? 'text-emerald-600 font-medium' : ''}>{log.newStatus}</span>
                          </span>
                        )}
                      </div>
                      {log.campaignName && (
                        <p className="text-xs text-muted-foreground mt-1">{log.campaignName} • {log.clientName}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(log.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

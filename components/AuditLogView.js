'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ScrollText, User, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';

const ACTION_ICONS = {
  created: { icon: Plus, color: 'text-emerald-600 bg-emerald-100' },
  modified: { icon: Pencil, color: 'text-blue-600 bg-blue-100' },
  updated: { icon: ArrowUpDown, color: 'text-amber-600 bg-amber-100' },
  deleted: { icon: Trash2, color: 'text-red-600 bg-red-100' },
};

export default function AuditLogView({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { loadLogs(); }, [entityFilter, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = 'activity-logs?limit=200';
      if (entityFilter !== 'all') query += `&entityType=${entityFilter}`;
      if (actionFilter !== 'all') query += `&action=${actionFilter}`;
      const res = await apiFetch('GET', query);
      setLogs(res.logs || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const getActionBadge = (action) => {
    const config = ACTION_ICONS[action] || ACTION_ICONS.updated;
    return (
      <Badge className={`${config.color} text-xs capitalize border-0`}>
        {action}
      </Badge>
    );
  };

  const getEntityBadge = (entityType) => {
    const colors = {
      client: 'bg-purple-100 text-purple-800',
      campaign: 'bg-blue-100 text-blue-800',
      service: 'bg-indigo-100 text-indigo-800',
      deliverable: 'bg-amber-100 text-amber-800',
      team_member: 'bg-emerald-100 text-emerald-800',
    };
    return (
      <Badge className={`${colors[entityType] || 'bg-gray-100 text-gray-800'} text-xs capitalize border-0`}>
        {entityType?.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Track all changes across your organization</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Entity Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="campaign">Campaigns</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="deliverable">Deliverables</SelectItem>
            <SelectItem value="team_member">Team Members</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="modified">Modified</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
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
                  <div key={log.id || i} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.details}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User size={11} /> {log.userName}
                        </span>
                        {getEntityBadge(log.entityType)}
                        {getActionBadge(log.action)}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDate(log.createdAt)}
                    </span>
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

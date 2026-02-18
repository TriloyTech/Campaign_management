'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Building, Pencil, Trash2, Users, Megaphone } from 'lucide-react';

export default function OrganizationsView({ user }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', industry: '', address: '', phone: '' });
  const [stats, setStats] = useState({});

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    try {
      const res = await apiFetch('GET', 'organizations');
      setOrgs(res.organizations || []);
      // Load basic stats for each org
      const statsMap = {};
      for (const org of (res.organizations || [])) {
        try {
          const [usersRes, campaignsRes] = await Promise.all([
            apiFetch('GET', `team?organizationId=${org.id}`),
            apiFetch('GET', `campaigns?organizationId=${org.id}`)
          ]);
          statsMap[org.id] = { users: usersRes.members?.length || 0, campaigns: campaignsRes.campaigns?.length || 0 };
        } catch { statsMap[org.id] = { users: 0, campaigns: 0 }; }
      }
      setStats(statsMap);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Organization name is required'); return; }
    try {
      if (editing) {
        await apiFetch('PUT', `organizations/${editing.id}`, form);
        toast.success('Organization updated');
      } else {
        await apiFetch('POST', 'organizations', form);
        toast.success('Organization created');
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: '', industry: '', address: '', phone: '' });
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (org) => {
    setEditing(org);
    setForm({ name: org.name, industry: org.industry || '', address: org.address || '', phone: org.phone || '' });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this organization? This will NOT delete associated data.')) return;
    try {
      await apiFetch('DELETE', `organizations/${id}`);
      toast.success('Organization deleted');
      loadOrgs();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Organizations</h1><p className="text-muted-foreground">Manage agencies and their teams</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditing(null); setForm({ name: '', industry: '', address: '', phone: '' }); } }}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> New Organization</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Organization' : 'New Organization'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Organization Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agency name" /></div>
              <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g., Digital Marketing" /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Office address" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+880 ..." /></div>
              <Button onClick={handleSave} className="w-full">{editing ? 'Update' : 'Create'} Organization</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Building className="mx-auto mb-3" size={40} /><p>No organizations yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map(org => (
            <Card key={org.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Building className="text-white" size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      {org.industry && <Badge variant="secondary" className="text-xs mt-1">{org.industry}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(org)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(org.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users size={14} /> {stats[org.id]?.users || 0} members</span>
                  <span className="flex items-center gap-1.5"><Megaphone size={14} /> {stats[org.id]?.campaigns || 0} campaigns</span>
                </div>
                {org.address && <p className="text-xs text-muted-foreground mt-2">{org.address}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

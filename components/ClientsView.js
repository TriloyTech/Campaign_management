'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Building2, Mail, Phone, User } from 'lucide-react';

export default function ClientsView({ user }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', industry: '' });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const res = await apiFetch('GET', 'clients');
      setClients(res.clients || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editingClient) {
        await apiFetch('PUT', `clients/${editingClient.id}`, form);
        toast.success('Client updated');
      } else {
        await apiFetch('POST', 'clients', form);
        toast.success('Client created');
      }
      setShowDialog(false);
      setEditingClient(null);
      setForm({ name: '', contactPerson: '', email: '', phone: '', industry: '' });
      loadClients();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setForm({ name: client.name, contactPerson: client.contactPerson, email: client.email, phone: client.phone, industry: client.industry });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try {
      await apiFetch('DELETE', `clients/${id}`);
      toast.success('Client deleted');
      loadClients();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const canManageClients = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your client companies</p>
        </div>
        {canManageClients && (
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingClient(null); setForm({ name: '', contactPerson: '', email: '', phone: '', industry: '' }); } }}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> Add Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'New Client'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company name" /></div>
                <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Primary contact" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+880 ..." /></div>
                <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g., Technology, Fashion" /></div>
                <Button onClick={handleSave} className="w-full">{editingClient ? 'Update' : 'Create'} Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input className="pl-10" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="mx-auto mb-3" size={40} />
          <p>No clients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card key={client.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="text-blue-600" size={20} />
                  </div>
                  {user.role === 'admin' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(client)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{client.name}</h3>
                {client.industry && <Badge variant="secondary" className="mb-3 text-xs">{client.industry}</Badge>}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {client.contactPerson && <div className="flex items-center gap-2"><User size={12} /> {client.contactPerson}</div>}
                  {client.email && <div className="flex items-center gap-2"><Mail size={12} /> {client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone size={12} /> {client.phone}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

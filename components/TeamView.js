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
import { UserPlus, Users, Shield, User } from 'lucide-react';

export default function TeamView({ user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      const res = await apiFetch('GET', 'team');
      setMembers(res.members || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleInvite = async () => {
    try {
      await apiFetch('POST', 'team/invite', form);
      toast.success('Team member added!');
      setShowDialog(false);
      setForm({ name: '', email: '', password: '' });
      loadTeam();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your agency team members</p>
        </div>
        {user.role === 'admin' && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button><UserPlus size={16} className="mr-2" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Member name" /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="member@agency.com" /></div>
                <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Initial password" /></div>
                <Button onClick={handleInvite} className="w-full">Add Team Member</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="mx-auto mb-3" size={40} />
          <p>No team members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <Card key={m.id} className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{m.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{m.name}</h3>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                    {m.role === 'admin' ? <><Shield size={12} className="mr-1" /> Admin</> : <><User size={12} className="mr-1" /> Team</>}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

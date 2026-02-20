'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { UserPlus, Users, Shield, User, Briefcase, Building2, Crown, Check } from 'lucide-react';

export default function TeamView({ user }) {
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', role: 'team_member', 
    designation: '', department: '', organizationIds: [] 
  });

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    loadTeam();
    if (isSuperAdmin) loadOrgs();
  }, []);

  const loadTeam = async () => {
    try { const res = await apiFetch('GET', 'team'); setMembers(res.members || []); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadOrgs = async () => {
    try { const res = await apiFetch('GET', 'organizations'); setOrganizations(res.organizations || []); }
    catch (err) { console.error(err); }
  };

  const toggleOrg = (orgId) => {
    setForm(prev => {
      const current = prev.organizationIds || [];
      if (current.includes(orgId)) {
        return { ...prev, organizationIds: current.filter(id => id !== orgId) };
      } else {
        return { ...prev, organizationIds: [...current, orgId] };
      }
    });
  };

  const handleInvite = async () => {
    if (!form.name || !form.email || !form.password) { 
      toast.error('Name, email, and password are required'); 
      return; 
    }
    
    // For Super Admin, require at least one organization
    if (isSuperAdmin && (!form.organizationIds || form.organizationIds.length === 0)) {
      toast.error('Please select at least one organization');
      return;
    }

    try {
      // If super admin selected multiple orgs, create user in first org
      // For now, backend supports single org, so we use the first selected
      const payload = { 
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        designation: form.designation,
        department: form.department
      };
      
      if (isSuperAdmin && form.organizationIds.length > 0) {
        payload.organizationId = form.organizationIds[0];
      }
      
      await apiFetch('POST', 'team/invite', payload);
      
      // If multiple orgs selected, show info message
      if (isSuperAdmin && form.organizationIds.length > 1) {
        toast.success(`Team member added to ${organizations.find(o => o.id === form.organizationIds[0])?.name}! Note: Multi-org assignment creates user in the first selected organization.`);
      } else {
        toast.success('Team member added!');
      }
      
      setShowDialog(false);
      setForm({ name: '', email: '', password: '', role: 'team_member', designation: '', department: '', organizationIds: [] });
      loadTeam();
    } catch (err) { toast.error(err.message); }
  };

  const getRoleBadge = (role) => {
    if (role === 'super_admin') return <Badge className="bg-amber-100 text-amber-800 text-xs"><Crown size={12} className="mr-1" /> Super Admin</Badge>;
    if (role === 'admin') return <Badge className="bg-blue-100 text-blue-800 text-xs"><Shield size={12} className="mr-1" /> Admin</Badge>;
    return <Badge className="bg-gray-100 text-gray-700 text-xs"><User size={12} className="mr-1" /> Custom Access</Badge>;
  };

  const getOrgName = (orgId) => organizations.find(o => o.id === orgId)?.name || '';

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'team_member', designation: '', department: '', organizationIds: [] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Team</h1><p className="text-muted-foreground">Manage your agency team members</p></div>
        {user.role !== 'team_member' && (
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button><UserPlus size={16} className="mr-2" /> Add Member</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Member name" /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="member@agency.com" /></div>
                <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Initial password" /></div>
                
                {/* Organization Selection for Super Admin */}
                {isSuperAdmin && organizations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 size={14} /> Assign to Organization(s) *
                    </Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-muted/30">
                      {organizations.map(org => (
                        <div 
                          key={org.id} 
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            form.organizationIds?.includes(org.id) 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleOrg(org.id)}
                        >
                          <Checkbox 
                            checked={form.organizationIds?.includes(org.id)} 
                            onCheckedChange={() => toggleOrg(org.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{org.name}</p>
                            {org.industry && <p className="text-xs text-muted-foreground">{org.industry}</p>}
                          </div>
                          {form.organizationIds?.includes(org.id) && (
                            <Check size={16} className="text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                    {form.organizationIds?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {form.organizationIds.length} organization(s) selected
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Access Level *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && <SelectItem value="super_admin"><div className="flex items-center gap-2"><Crown size={14} className="text-amber-600" /> Super Admin</div></SelectItem>}
                      <SelectItem value="admin"><div className="flex items-center gap-2"><Shield size={14} className="text-blue-600" /> Admin (Full Access)</div></SelectItem>
                      <SelectItem value="team_member"><div className="flex items-center gap-2"><User size={14} className="text-gray-600" /> Custom Access</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Designation <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Designer" /></div>
                  <div><Label>Department <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g., Creative" /></div>
                </div>
                <Button onClick={handleInvite} className="w-full">Add Team Member</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (<div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Users className="mx-auto mb-3" size={40} /><p>No team members yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <Card key={m.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'super_admin' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
                    <span className="text-sm font-semibold text-white">{m.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{m.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{getRoleBadge(m.role)}</div>
                    {(m.designation || m.department) && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {m.designation && <span className="flex items-center gap-1"><Briefcase size={11} /> {m.designation}</span>}
                        {m.department && <span className="flex items-center gap-1"><Building2 size={11} /> {m.department}</span>}
                      </div>
                    )}
                    {isSuperAdmin && m.organizationId && <p className="text-xs text-muted-foreground mt-1"><Building2 size={11} className="inline mr-1" />{getOrgName(m.organizationId)}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

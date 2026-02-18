'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

export default function OrgSelector({ organizations, selectedOrgId, onSelect }) {
  if (!organizations || organizations.length === 0) return null;
  return (
    <Select value={selectedOrgId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-64 bg-white">
        <Building size={14} className="mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select Organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map(org => (
          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

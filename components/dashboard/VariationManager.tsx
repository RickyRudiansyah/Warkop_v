'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { MenuVariation } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface VariationManagerProps {
  menuItemId: string;
  menuName: string;
  onClose: () => void;
}

export function VariationManager({ menuItemId, menuName, onClose }: VariationManagerProps) {
  const [variations, setVariations] = useState<MenuVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ group_name: '', label: '', extra_price: '0' });
  const [saving, setSaving] = useState(false);

  const fetchVariations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/menu/variations?menu_item_id=' + menuItemId);
    if (res.ok) setVariations(await res.json());
    setLoading(false);
  }, [menuItemId]);

  useEffect(() => {
    fetchVariations();
  }, [fetchVariations]);

  const resetForm = () => {
    setForm({ group_name: '', label: '', extra_price: '0' });
    setAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.group_name || !form.label) return;
    setSaving(true);

    const payload = {
      menu_item_id: menuItemId,
      group_name: form.group_name,
      label: form.label,
      extra_price: parseInt(form.extra_price) || 0,
    };

    if (editingId) {
      const res = await fetch('/api/menu/variations/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setVariations(prev => prev.map(v => v.id === editingId ? updated : v));
        toast.success('Variasi diperbarui');
        resetForm();
      }
    } else {
      const res = await fetch('/api/menu/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setVariations(prev => [...prev, created]);
        toast.success('Variasi ditambahkan');
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/menu/variations/' + id, { method: 'DELETE' });
    if (res.ok) {
      setVariations(prev => prev.filter(v => v.id !== id));
      toast.success('Variasi dihapus');
    }
  };

  const handleEdit = (v: MenuVariation) => {
    setEditingId(v.id);
    setForm({ group_name: v.group_name, label: v.label, extra_price: String(v.extra_price) });
    setAdding(true);
  };

  const grouped = variations.reduce<Record<string, MenuVariation[]>>((acc, v) => {
    if (!acc[v.group_name]) acc[v.group_name] = [];
    acc[v.group_name].push(v);
    return acc;
  }, {});

  return (
    <div className="bg-surface-2 border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Variasi: {menuName}</h4>
        <button onClick={onClose} className="p-1 hover:bg-surface-3 rounded" aria-label="Tutup"><X className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {Object.keys(grouped).length === 0 && !adding && (
            <p className="text-sm text-text-secondary mb-3">Belum ada variasi untuk menu ini.</p>
          )}

          {Object.entries(grouped).map(([group, vars]) => (
            <div key={group} className="mb-3">
              <h5 className="text-sm font-medium text-text-secondary mb-1">{group}</h5>
              <div className="space-y-1">
                {vars.map(v => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-surface rounded-lg">
                    <span className="text-sm">{v.label}</span>
                    <div className="flex items-center gap-2">
                      {v.extra_price > 0 && <span className="text-xs text-primary">+Rp{v.extra_price.toLocaleString('id')}</span>}
                      <button onClick={() => handleEdit(v)} className="p-1 hover:bg-surface-2 rounded" aria-label="Edit variasi"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1 hover:bg-danger/10 rounded text-danger" aria-label="Hapus variasi"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {adding ? (
            <div className="border-t pt-3 space-y-2">
              <input placeholder="Grup (contoh: Level Pedas)" value={form.group_name} onChange={e => setForm(p => ({ ...p, group_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-surface" />
              <div className="flex gap-2">
                <input placeholder="Label (contoh: Pedas Level 3)" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-surface" />
                <input placeholder="+Harga" type="number" value={form.extra_price} onChange={e => setForm(p => ({ ...p, extra_price: e.target.value }))} className="w-28 px-3 py-2 border rounded-lg text-sm bg-surface" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}{editingId ? 'Update' : 'Simpan'}</Button>
                <Button size="sm" variant="ghost" onClick={resetForm}><X className="w-3.5 h-3.5 mr-1" />Batal</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)} className="mt-2"><Plus className="w-3.5 h-3.5 mr-1" />Tambah Variasi</Button>
          )}
        </>
      )}
    </div>
  );
}

import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// stock_qty SENGAJA tidak ada di daftar ini. Mengubah stok wajib lewat
// POST /api/ingredients/[id]/movements supaya perubahannya tercatat dan dua
// perangkat yang menyesuaikan bersamaan tidak saling menimpa.
const ALLOWED_FIELDS = ['name', 'unit', 'alert_threshold', 'is_active'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if ('stock_qty' in body) {
    return NextResponse.json(
      { error: 'Ubah stok lewat POST /api/ingredients/{id}/movements, bukan PATCH' },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) if (key in body) patch[key] = body[key];
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang bisa diubah' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('ingredients').update(patch).eq('id', id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Bahan tidak ditemukan' }, { status: 404 });
  return NextResponse.json(data);
}

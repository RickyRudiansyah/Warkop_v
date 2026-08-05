import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Koreksi salah input. Menghapus baris juga membebaskan slot 1x/hari karyawan
// itu, jadi jatahnya bisa dicatat ulang pada hari yang sama.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('staff_meals').delete().eq('id', id).select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ success: true });
}

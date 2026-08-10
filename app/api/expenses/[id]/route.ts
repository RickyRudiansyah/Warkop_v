import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Koreksi salah input. Pengeluaran tidak punya jejak lain di sistem (tidak ada
// struk, tidak ada order), jadi menghapus barisnya memang cara membatalkannya.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('expenses').delete().eq('id', id).select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ success: true });
}

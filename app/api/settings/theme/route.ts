import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Preset tema event. Daftar ini HARUS identik dengan yang ada di aplikasi kasir
// (shared/app_theme_preset.dart). Preset tak dikenal dianggap NORMAL, bukan error.
export const THEME_PRESETS = ['NORMAL', 'NATAL', 'RAMADAN', 'KEMERDEKAAN', 'IMLEK'] as const;
const DEFAULT_PRESET = 'NORMAL';

// GET publik — web pengunjung perlu membacanya tanpa login.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_settings').select('value').eq('key', 'theme').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const preset = (data?.value as { preset?: string } | null)?.preset;
  return NextResponse.json({
    preset: THEME_PRESETS.includes(preset as typeof THEME_PRESETS[number]) ? preset : DEFAULT_PRESET,
  });
}

// PATCH khusus owner — mengubah tampilan untuk SEMUA orang, bukan preferensi pribadi.
export async function PATCH(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (staff.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang bisa mengubah tema' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const preset = body.preset;
  if (!THEME_PRESETS.includes(preset)) {
    return NextResponse.json(
      { error: 'Preset tidak dikenal. Pilihan: ' + THEME_PRESETS.join(', ') },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ key: 'theme', value: { preset }, updated_at: new Date().toISOString(), updated_by: staff.name })
    .select('value')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preset: (data.value as { preset: string }).preset });
}

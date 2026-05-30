import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const { data: staff } = await supabase.from('staff_users').select('role').eq('id', session.user.id).single();
    if (!staff) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (staff.role === 'cashier' && pathname.startsWith('/dashboard/owner')) {
      return NextResponse.redirect(new URL('/dashboard/cashier', request.url));
    }
  }

  if (pathname === '/login' && session) {
    const { data: staff } = await supabase.from('staff_users').select('role').eq('id', session.user.id).single();
    if (staff?.role === 'owner') return NextResponse.redirect(new URL('/dashboard/owner', request.url));
    return NextResponse.redirect(new URL('/dashboard/cashier', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

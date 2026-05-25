'use client';

import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('cashier' | 'koki' | 'owner')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, staffProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && staffProfile && allowedRoles && !allowedRoles.includes(staffProfile.role)) {
      if (staffProfile.role === 'cashier') router.push('/dashboard/cashier');
      else if (staffProfile.role === 'koki') router.push('/dashboard/kitchen');
      else router.push('/dashboard/owner');
    }
  }, [user, staffProfile, loading, router, allowedRoles]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (staffProfile && allowedRoles && !allowedRoles.includes(staffProfile.role)) return null;

  return <>{children}</>;
}

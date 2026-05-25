import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>{children}</Suspense>;
}

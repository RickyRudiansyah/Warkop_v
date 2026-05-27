'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LogOut, LayoutDashboard, ChefHat, ShoppingCart, QrCode, BarChart3, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

const navItems = {
  cashier: [
    { href: '/dashboard/cashier', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/cashier/new-order', label: 'New Order', icon: LayoutDashboard },
    { href: '/dashboard/qr', label: 'QR Code', icon: QrCode },
    { href: '/dashboard/history', label: 'History', icon: History },
  ],
  koki: [
    { href: '/dashboard/kitchen', label: 'Kitchen', icon: ChefHat },
  ],
  owner: [
    { href: '/dashboard/owner', label: 'Dashboard', icon: BarChart3 },
    { href: '/dashboard/cashier', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/qr', label: 'QR Code', icon: QrCode },
    { href: '/dashboard/history', label: 'History', icon: History },
  ],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { staffProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const role = staffProfile?.role || 'cashier';
  const items = navItems[role as keyof typeof navItems] || navItems.cashier;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch {
      toast.error('Gagal logout');
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary">Warkop QR</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-text-secondary">{staffProfile?.name} ({role})</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut} loading={loggingOut} aria-label="Logout"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>
      <nav className="glass border-b px-4 py-2 flex gap-2 overflow-x-auto" aria-label="Navigasi dashboard">
        {items.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2', pathname === item.href ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-3')}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <item.icon className="w-4 h-4" />{item.label}
          </Link>
        ))}
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}

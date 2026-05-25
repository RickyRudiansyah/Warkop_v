'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { LogOut, LayoutDashboard, ChefHat, ShoppingCart, QrCode, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = {
  cashier: [
    { href: '/dashboard/cashier', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/cashier/new-order', label: 'New Order', icon: LayoutDashboard },
    { href: '/dashboard/qr', label: 'QR Code', icon: QrCode },
  ],
  koki: [
    { href: '/dashboard/kitchen', label: 'Kitchen', icon: ChefHat },
  ],
  owner: [
    { href: '/dashboard/owner', label: 'Dashboard', icon: BarChart3 },
    { href: '/dashboard/cashier', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/qr', label: 'QR Code', icon: QrCode },
  ],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { staffProfile, signOut } = useAuth();
  const pathname = usePathname();
  const role = staffProfile?.role || 'cashier';
  const items = navItems[role as keyof typeof navItems] || navItems.cashier;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold">Warkop QR</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{staffProfile?.name} ({role})</span>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>
      <nav className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
        {items.map(item => (
          <Link key={item.href} href={item.href} className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2', pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100')}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

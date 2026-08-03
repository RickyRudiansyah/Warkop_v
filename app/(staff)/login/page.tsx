'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Coffee } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, staffProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && staffProfile) {
      if (staffProfile.role === 'owner') router.push('/dashboard/owner');
      else router.push('/dashboard/cashier');
    }
  }, [staffProfile, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/25 mb-4">
            <Coffee className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Rumipang</h1>
          <p className="text-text-secondary">Selamat datang! Silakan login untuk melanjutkan.</p>
        </div>
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-6 text-center">Staff Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none" placeholder="staff@warkop.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none" required />
            </div>
            {error && <p className="text-danger text-sm bg-danger/5 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

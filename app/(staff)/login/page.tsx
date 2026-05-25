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
      if (staffProfile.role === 'koki') router.push('/dashboard/kitchen');
      else if (staffProfile.role === 'owner') router.push('/dashboard/owner');
      else router.push('/dashboard/cashier');
    }
  }, [staffProfile, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <Coffee className="w-12 h-12 mx-auto text-primary mb-2" />
          <h1 className="text-2xl font-bold">Warkop QR</h1>
          <p className="text-text-secondary">Staff Login</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-surface" placeholder="staff@warkop.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-surface" required />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}

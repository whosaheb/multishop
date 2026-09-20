import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(mobileNumber, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Multi-Shop Sales</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your mobile number</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
        >
          <label className="block text-sm font-medium text-slate-300">Mobile number</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="mt-1 mb-4 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-indigo-500 focus:outline-none"
            placeholder="9999900001"
          />

          <label className="block text-sm font-medium text-slate-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 mb-4 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-indigo-500 focus:outline-none"
            placeholder="••••••••"
          />

          {error && (
            <p className="mb-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Accounts are created by an Admin. There is no self-registration.
        </p>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 font-extrabold text-white text-xl shadow-lg shadow-indigo-600/30">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">MultiShop POS</h1>
          <p className="mt-1 text-xs text-slate-400">Mobile-First Retail Billing &amp; Audit Suite</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Registered Mobile Number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              required
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="9999900001"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-60 transition active:scale-98"
          >
            {submitting ? 'Signing in…' : 'Sign in to Terminal'}
          </button>

          {/* Quick-fill one-tap role pills for mobile */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-400 text-center mb-2.5">
              Quick test roles (1-tap fill):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileNumber('9999900001');
                  setPassword('AdminPass123!');
                }}
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300 hover:border-indigo-500 hover:text-white active:scale-95 transition"
              >
                <span className="text-xs font-bold text-indigo-400">Admin</span>
                <span className="text-[9px] text-slate-400">HQ Owner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileNumber('9999900002');
                  setPassword('ManagerPass123!');
                }}
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300 hover:border-indigo-500 hover:text-white active:scale-95 transition"
              >
                <span className="text-xs font-bold text-indigo-400">Manager</span>
                <span className="text-[9px] text-slate-400">Reviewer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileNumber('9999900003');
                  setPassword('EmployeePass123!');
                }}
                className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300 hover:border-indigo-500 hover:text-white active:scale-95 transition"
              >
                <span className="text-xs font-bold text-indigo-400">Cashier</span>
                <span className="text-[9px] text-slate-400">Counter</span>
              </button>
            </div>
          </div>
        </form>

        <p className="text-center text-[11px] text-slate-400">
          Role-governed multi-branch point of sale. Protected with tamper-evident audit trails.
        </p>
      </div>
    </div>
  );
}

'use client'

import React, { useEffect, useState } from "react"

interface LoginFormProps {
  onLoginSuccess: () => void;
}
export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  async function signInWithEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again later.");
      } else {
        setSuccess(true)
        setTimeout(() => { onLoginSuccess() }, 500)
      }
    } catch (error: any) {
      setError(error?.message || "Something went wrong. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex min-h-full flex-col justify-center px-6 lg:px-8 py-10">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-serif tracking-tight text-white uppercase letter-spacing-[0.1em]">Institutional Access</h2>
          <p className="mt-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Authorize your credentials</p>
        </div>

        <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={signInWithEmail} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-start text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Official Identifier
              </label>
              <div className="mt-2.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@institutional.legal"
                  className="block w-full rounded-xl bg-[#0B0B0C] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Security Passphrase
                </label>
                <div className="text-[10px]">
                  <a href="/auth/forgot-password" className="font-bold text-[#e9c176] hover:text-white uppercase tracking-widest transition-colors">
                    Reset Access
                  </a>
                </div>
              </div>
              <div className="mt-2.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full rounded-xl bg-[#0B0B0C] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="flex w-full justify-center items-center gap-3 rounded-xl bg-[#722f37] hover:bg-[#8b3a44] px-6 py-4 text-[11px] font-bold text-white uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#722f37]/20 active:scale-95 disabled:opacity-50"
              >
                {(loading || success) ? (
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Authorizing...</span>
                  </div>
                ) : "Authenticate Access"}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest text-center">Ratification Successful. Redirecting...</p>
                </div>
              )}
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest inline-block mr-2">No institutional record?</p>
              <a href="/auth/sign-up" className="text-[10px] font-bold text-[#e9c176] hover:text-white uppercase tracking-[0.2em] transition-colors">Enlist Now</a>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

'use client'

import { createClient } from "@/lib/supabase/client" 
import React, { useState } from "react"
import { Toast } from "@/components/ui/toast"

interface LoginFormProps {
  onLoginSuccess: () => void;
}
export default function LoginForm({onLoginSuccess} : LoginFormProps) {

    const [email, setEmail ] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess ] = useState(false)
    const [loading, setLoading] = useState(false);

    const supabase = createClient()
    async function signInWithEmail(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        setError('')
        setLoading(true)
        setSuccess(false)
        try {
            const { data : { session }, error } = await supabase.auth.signInWithPassword({
            email, password
        })

        if(error){
            setError(error?.message || "Something went wrong. Please try again later.")
        }

        if(session){
            setSuccess(true)
            setTimeout(() => {
                onLoginSuccess()
            }, 500)
        }
            
        } catch (error: any) {
            setError(error?.message || "Something went wrong. Please try again later.")
        } finally {
            setLoading(false)
        }
    }

    function handleEmailChange(email: string){
        setEmail(email)
    }

  return (
    <>
      <div className="flex min-h-full flex-col justify-center px-6  lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-xl font-bold tracking-tight text-white">Sign in via email</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={signInWithEmail} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-start text-sm/6 font-medium text-gray-100">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-100">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || success}
                
                className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                 
                {(loading || success) ? (<div className="flex items-center gap-3"><span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span> <span>Signing in..</span> </div>)  : "Sign in" }

              </button>
              { error && (<p className="text-red-500 text-xs mt-2">{error}</p>)}
              { success && (<p className="text-green-500 text-xs mt-2">Login successful. Redirecting...</p>)}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
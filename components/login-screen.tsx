'use client'

import React from 'react';
import LoginForm from './auth/login-form';
import { useRouter } from 'next/navigation';
import BackButton from './back-button';


const LoginScreen = () => {

  const router = useRouter()

  const [isLoading, setIsLoading] = React.useState(false);

  const onBack = () => {
    router.push('/')
  }

  const onLoginSuccess = () => {
    router.push('/consultation')
  }

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate authentication delay
    setTimeout(() => {
      setIsLoading(false);
      // onLoginSuccess();
    }, 1200);
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-[#0a0e17] relative overflow-hidden px-4 py-5">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="w-full  z-10 animate-in fade-in zoom-in-95 duration-500">
        <BackButton
               label="Return to LexPH"
               className="absolute top-5 left-5"
               fallbackHref="/"
             />

        <div className="">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-20 h-20 rounded-[28px] bg-primary flex items-center justify-center text-white mb-8 shadow-[0_20px_40px_-10px_rgba(19,91,236,0.4)]">
              <span className="material-symbols-outlined text-5xl">balance</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-4">Secure Sign In</h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-70">
              Access your encrypted legal consultations and case history.
            </p>

            <div className="w-100">
                <LoginForm onLoginSuccess={onLoginSuccess} />

              <div className="space-y-6 mt-7">
                {/* <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-50 text-slate-900 font-black py-2 rounded-md shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 group"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span>
                      <span className="text-sm">Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                      <span className="text-[13px] font-semibold">Continue with Google</span>
                    </>
                  )}
                </button> */}
                
                <div className="pt-8 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-4">Privacy Standards</p>
                  <div className="flex justify-center gap-6 grayscale opacity-50">
                      <span className="material-symbols-outlined text-2xl" title="Privacy Act Compliant">verified_user</span>
                      <span className="material-symbols-outlined text-2xl" title="256-bit Encryption">lock</span>
                      <span className="material-symbols-outlined text-2xl" title="Integrated Bar Standard">gavel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        

          <p className="text-[11px] text-center text-slate-500 px-6 leading-relaxed mt-10">
            By signing in, you agree to our <button className="underline hover:text-slate-300 transition-colors">Legal Terms</button> & <button className="underline hover:text-slate-300 transition-colors">Data Privacy Policy</button>.
          </p>
        </div>
        
        <div className="mt-8 text-center text-slate-600 text-[10px] font-bold tracking-widest uppercase">
          © 2024 LexPH • Public Digital Legal Service
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

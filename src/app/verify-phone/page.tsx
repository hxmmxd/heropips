'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhoneVerificationModal } from '@/components/PhoneVerificationModal';
import { ShieldCheck, Lock, Cpu } from 'lucide-react';

export default function VerifyPhonePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check if phone verification is enabled in admin config
      const { data: configData } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'phone_verification_required')
        .maybeSingle();

      const isRequired = configData?.value !== false && configData?.value !== 'false';

      if (!isRequired) {
        window.location.href = '/';
        return;
      }

      const isCookieVerified = typeof window !== 'undefined' && (localStorage.getItem('tgpt_phone_verified') === 'true' || document.cookie.includes('phone_verified=true'));

      if (isCookieVerified) {
        window.location.href = '/';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profile?.phone_verified) {
        window.location.href = '/';
      } else {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-800 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#ff3c00] border-t-transparent rounded-full animate-spin shadow-md" />
          <p className="text-xs text-slate-500 tracking-widest uppercase font-semibold">Initialising Security Protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f8fafc] flex flex-col items-center justify-between p-4 overflow-hidden select-none">
      
      {/* Soft Ambient Light Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-b from-[#ff3c00]/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-[150px] pointer-events-none" />

      {/* Top Light Enterprise Brand Bar */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between py-6 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff3c00] to-amber-500 flex items-center justify-center shadow-md shadow-[#ff3c00]/20">
            <Cpu size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wider uppercase font-mono">
              XYRO<span className="text-[#ff3c00]">TRADE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono font-semibold">INSTITUTIONAL AI TERMINAL</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-mono text-slate-600 font-medium">
          <Lock size={13} className="text-emerald-500" />
          <span>256-BIT SECURE GATEWAY</span>
        </div>
      </header>

      {/* Main Light Verification Modal Window */}
      <main className="relative z-10 my-auto w-full flex items-center justify-center">
        <PhoneVerificationModal
          isOpen={true}
          isMandatory={true}
          onSuccess={() => {
            window.location.href = '/';
          }}
        />
      </main>

      {/* Bottom Light Footer */}
      <footer className="relative z-10 w-full max-w-6xl flex items-center justify-between py-6 px-4 text-[11px] font-mono text-slate-400">
        <div>© 2026 XyroTrade Inc. All Rights Reserved.</div>
        <div className="flex gap-6">
          <span className="hover:text-slate-600 transition-colors cursor-pointer">Privacy Policy</span>
          <span className="font-semibold text-slate-400">Security Node #85742</span>
        </div>
      </footer>
    </div>
  );
}

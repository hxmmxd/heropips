'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase/client';
import { createClient } from '@/lib/supabase/client';
import { ConfirmationResult } from 'firebase/auth';
import { 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Lock, 
  ChevronDown, 
  Sparkles,
  X
} from 'lucide-react';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  isMandatory?: boolean;
}

const COUNTRY_CODES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
];

export function PhoneVerificationModal({
  isOpen,
  onSuccess,
  onCancel,
  isMandatory = false,
}: PhoneVerificationModalProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Click outside to close country dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe reCAPTCHA initialization
  const initRecaptcha = () => {
    if (typeof window === 'undefined') return null;
    const container = document.getElementById('recaptcha-container');
    if (!container) return null;

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            setError('Security session expired. Please resend code.');
          },
        });
      }
      return recaptchaVerifierRef.current;
    } catch (err: any) {
      console.warn('reCAPTCHA reset notice:', err);
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        return recaptchaVerifierRef.current;
      } catch {
        return null;
      }
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    const cleanNumber = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 6) {
      setError('Please enter a valid mobile number.');
      return;
    }

    const fullPhoneNumber = `${countryCode}${cleanNumber}`;
    setLoading(true);

    try {
      const appVerifier = initRecaptcha();
      if (!appVerifier) {
        throw new Error('Failed to initialize security verification. Please refresh.');
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      console.error('Send OTP Error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('The phone number format is invalid.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Security rate limit exceeded. Please wait a few minutes.');
      } else if (err.code === 'auth/captcha-check-failed') {
        setError('Security validation failed. Please reload the page.');
      } else {
        setError(err.message || 'Failed to dispatch security SMS. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto focus next box
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const digits = pastedData.slice(0, 6).split('');
      setOtpCode(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codeString = otpCode.join('');
    if (codeString.length < 6) {
      setError('Please enter the 6-digit security code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmationResult.confirm(codeString);

      // Store verification cookie & localStorage for instant gatekeeper clearance
      if (typeof window !== 'undefined') {
        document.cookie = "phone_verified=true; path=/; max-age=31536000; SameSite=Lax";
        localStorage.setItem('tgpt_phone_verified', 'true');
      }

      // Save phone verification status to Supabase profile (non-blocking)
      try {
        const fullPhoneNumber = `${countryCode}${phoneNumber.trim().replace(/\D/g, '')}`;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              phone_number: fullPhoneNumber,
              phone_verified: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        }
      } catch (dbErr) {
        console.warn('Database profile sync notice:', dbErr);
      }

      setStep('success');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect security code. Please check your SMS and try again.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-fadeIn">
      
      {/* Permanent Invisible reCAPTCHA Container */}
      <div id="recaptcha-container"></div>

      {/* Main Light Theme Window */}
      <div className="relative w-full max-w-[440px] bg-white border border-slate-200/90 rounded-3xl p-7 md:p-9 shadow-[0_25px_60px_rgba(15,23,42,0.12)] text-slate-900 overflow-hidden transition-all duration-300">
        
        {/* Top Vibrant Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#ff3c00] to-transparent" />

        {/* Close Button if optional */}
        {!isMandatory && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        )}

        {/* Enterprise Security Tag */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold tracking-wider text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SECURE AUTHENTICATION GATEWAY
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {step === 'input' ? 'STEP 1/2' : step === 'otp' ? 'STEP 2/2' : 'VERIFIED'}
          </span>
        </div>

        {/* Header Section */}
        <div className="flex items-start gap-4 mb-7">
          <div className="p-3.5 bg-gradient-to-br from-[#ff3c00]/15 to-[#ff3c00]/5 border border-[#ff3c00]/25 rounded-2xl text-[#ff3c00] shadow-[0_4px_20px_rgba(255,60,0,0.15)] shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Identity Security
              <Sparkles size={16} className="text-[#ff3c00]" />
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              {step === 'input' && 'Verify your mobile number to enforce 2-Factor protection.'}
              {step === 'otp' && `Enter the 6-digit code sent to ${countryCode} ${phoneNumber}`}
              {step === 'success' && 'Multi-factor authentication enabled successfully.'}
            </p>
          </div>
        </div>

        {/* Alert Error Box */}
        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200/80 rounded-2xl text-red-600 text-xs leading-relaxed animate-shake">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* STEP 1: Light Phone Input */}
        {step === 'input' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>Mobile Phone Number</span>
                <span className="text-[10px] text-slate-400 font-normal">Global SMS Delivery</span>
              </label>

              <div className="flex gap-2.5">
                {/* Custom Light Country Selector */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="h-12 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-sm font-semibold rounded-2xl flex items-center gap-2 transition-all cursor-pointer focus:outline-none focus:border-[#ff3c00]"
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="font-mono text-xs">{selectedCountry.code}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute left-0 top-14 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 z-50 max-h-60 overflow-y-auto no-scrollbar">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(c.code);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            c.code === countryCode
                              ? 'bg-[#ff3c00]/10 text-[#ff3c00] font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base">{c.flag}</span>
                            <span>{c.name}</span>
                          </span>
                          <span className="font-mono text-slate-400">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Input Box */}
                <div className="relative flex-1">
                  <Phone size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="98765 43210"
                    required
                    className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#ff3c00] focus:ring-2 focus:ring-[#ff3c00]/15 text-slate-900 font-mono text-sm rounded-2xl pl-10 pr-4 py-3 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff3c00] via-[#ff5500] to-[#e03500] hover:shadow-[0_6px_25px_rgba(255,60,0,0.3)] text-white font-bold text-sm rounded-2xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw size={19} className="animate-spin" />
              ) : (
                <>
                  <span>Dispatch Security Code</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Light 6-Digit OTP Entry */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block text-center mb-3">
                Security Token (OTP)
              </label>

              {/* 6 Individual Digit Input Boxes */}
              <div className="flex justify-center gap-2.5 my-2">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 text-center font-mono text-2xl font-bold bg-slate-50 border border-slate-200 focus:border-[#ff3c00] focus:ring-2 focus:ring-[#ff3c00]/20 rounded-2xl text-slate-900 focus:bg-white focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Tip: You can paste the full 6-digit code directly.
              </p>
            </div>

            {/* Verify CTA */}
            <button
              type="submit"
              disabled={loading || otpCode.join('').length < 6}
              className="w-full h-12 bg-gradient-to-r from-[#ff3c00] via-[#ff5500] to-[#e03500] hover:shadow-[0_6px_25px_rgba(255,60,0,0.3)] text-white font-bold text-sm rounded-2xl transition-all duration-300 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw size={19} className="animate-spin" />
              ) : (
                <>
                  <Lock size={16} />
                  <span>Authorize & Complete Verification</span>
                </>
              )}
            </button>

            {/* Resend & Change Number Bar */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium"
              >
                ← Change Number
              </button>
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={() => handleSendOtp()}
                className="text-[#ff3c00] hover:underline font-semibold disabled:text-slate-400 disabled:no-underline"
              >
                {canResend ? 'Resend SMS' : `Resend code in ${resendTimer}s`}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Light Success State */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Identity Authorized</h3>
              <p className="text-xs text-slate-500 mt-1">2-Factor mobile security is active. Redirecting to Terminal...</p>
            </div>
          </div>
        )}

        {/* Security Footer Note */}
        <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Lock size={11} className="text-slate-400" /> 256-Bit Encrypted
          </span>
          <span>HeroPips Security Engine</span>
        </div>
      </div>
    </div>
  );
}

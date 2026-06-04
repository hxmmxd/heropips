'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Programmatic synthesizer for physical switch toggle sounds using Web Audio API
const playSwitchSound = (isLight: boolean) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    if (isLight) {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.05);
    } else {
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.05);
    }
    oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    noise.start();
    osc.start();
    noise.stop(ctx.currentTime + 0.04);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleToggleTheme = () => {
    playSwitchSound(theme === 'dark');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Auto login directly
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        window.location.href = '/';
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className={`auth-page ${theme === 'light' ? 'auth-light' : ''}`}>
      {/* Theme toggle */}
      <button className="auth-theme-toggle" onClick={handleToggleTheme} aria-label="Toggle Theme">
        <Lightbulb
          className={`auth-bulb ${theme === 'dark' ? 'auth-bulb-on' : ''}`}
        />
      </button>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 7H21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="auth-heading">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>

        {/* Error / Message */}
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="auth-form">
          {isSignUp && (
            <div className="auth-input-group">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required={isSignUp}
              />
            </div>
          )}
          <div className="auth-input-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>
          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <div className="auth-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : 'Continue'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}>
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>

        {/* Divider */}
        <div className="auth-divider"><span>OR</span></div>

        {/* Social */}
        <div className="auth-social">
          <button onClick={handleGoogleAuth} className="auth-btn auth-btn-social" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="auth-btn auth-btn-social" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.18 0-.36-.02-.53-.06.01-.18.04-.36.04-.55 0-1.08.47-2.23 1.2-3.04.37-.4.84-.74 1.37-1 .53-.26 1.03-.4 1.5-.42.02.15.03.3.03.42zm3.03 6.39c-.17.1-2.97 1.72-2.97 5.3 0 4.16 3.66 5.64 3.76 5.67-.01.1-.59 2.02-1.94 3.98-1.2 1.73-2.44 3.45-4.39 3.45-1.92 0-2.53-1.11-4.87-1.11-2.26 0-3.06 1.14-4.84 1.14-1.78 0-3.03-1.6-4.39-3.54C-.5 19.62.26 14.55 2.9 11.72c1.32-1.42 2.92-2.36 4.63-2.36 1.83 0 2.96 1.15 4.46 1.15 1.46 0 2.35-1.15 4.45-1.15 1.26 0 2.64.52 3.94 1.56z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className="auth-terms">
          By continuing, you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

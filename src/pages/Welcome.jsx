import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";

export default function WelcomePage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (authError) {
        setError('שגיאה בהתחברות עם Google');
        setIsLoading(false);
      }
    } catch (err) {
      setError('שגיאת חיבור. בדוק את החיבור לאינטרנט ונסה שוב.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : authError.message);
      } else {
        window.location.href = '/';
        return;
      }
    } catch (err) {
      setError('שגיאת חיבור. בדוק את החיבור לאינטרנט ונסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccessMsg('נשלח אימייל אימות לכתובת שלך. אנא אמת את החשבון לפני הכניסה.');
      }
    } catch (err) {
      setError('שגיאת חיבור. בדוק את החיבור לאינטרנט ונסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/Welcome`,
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccessMsg('נשלח אימייל לאיפוס סיסמה לכתובת שלך.');
      }
    } catch (err) {
      setError('שגיאת חיבור. בדוק את החיבור לאינטרנט ונסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const fontStyle = { fontFamily: "'Heebo', 'Rubik', sans-serif" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-2xl flex items-center justify-center shadow-2xl">
              <TrendingUp className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-[#fc9f67] to-[#fc8a68] bg-clip-text text-transparent" style={fontStyle}>
              Plusto
            </h1>
          </div>
          <p className="text-gray-400 text-base" style={fontStyle}>פלטפורמת ניהול עסקי חכמה</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#fc9f67]" />
            <h2 className="text-xl font-bold text-white" style={fontStyle}>
              {mode === 'login' && 'כניסה למערכת'}
              {mode === 'signup' && 'יצירת חשבון חדש'}
              {mode === 'forgot' && 'איפוס סיסמה'}
            </h2>
            <Sparkles className="w-5 h-5 text-[#fc9f67]" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm text-center" style={fontStyle}>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl px-4 py-3 mb-4 text-sm text-center" style={fontStyle}>
              {successMsg}
            </div>
          )}

          {/* Google Login — תמיד מוצג במצב login ו-signup */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-gray-100 border border-white/20 rounded-xl text-gray-800 font-bold transition-all duration-300 shadow-lg disabled:opacity-50 mb-5"
                style={fontStyle}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {mode === 'login' ? 'התחבר עם Google' : 'הרשמה עם Google'}
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-gray-400 text-sm" style={fontStyle}>או</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
            </>
          )}

          {/* Email/Password Form */}
          <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1" style={fontStyle}>שם מלא</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl h-12"
                  style={fontStyle}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-300 mb-1" style={fontStyle}>אימייל</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                dir="ltr"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl h-12"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1" style={fontStyle}>סיסמה</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    dir="ltr"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl h-12 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-[#fc9f67] to-[#fc8a68] hover:from-[#fc8a68] hover:to-[#fc9f67] text-white rounded-xl shadow-lg transition-all duration-300"
              style={fontStyle}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {mode === 'login' && 'כניסה'}
                  {mode === 'signup' && 'הרשמה'}
                  {mode === 'forgot' && 'שלח קישור איפוס'}
                </>
              )}
            </Button>
          </form>

          {/* Mode switchers */}
          <div className="mt-5 flex flex-col items-center gap-2 text-sm" style={fontStyle}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }} className="text-gray-400 hover:text-[#fc9f67] transition-colors">
                  שכחתי סיסמה
                </button>
                <button onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }} className="text-[#32acc1] hover:text-[#83ddec] transition-colors font-medium">
                  אין לי חשבון — הרשמה
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }} className="text-gray-400 hover:text-white transition-colors">
                חזרה לכניסה
              </button>
            )}
          </div>

          <p className="text-gray-500 text-center text-xs mt-4" style={fontStyle}>
            משתמש חדש? לאחר ההרשמה חשבונך יועבר לאישור מנהל המערכת
          </p>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6" style={fontStyle}>© 2025 Plusto. All rights reserved.</p>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&family=Rubik:wght@400;500;700&display=swap');`}</style>
    </div>
  );
}

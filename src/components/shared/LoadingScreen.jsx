import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';

export default function LoadingScreen({ message = "טוען את לוח הבקרה..." }) {
  // בדיקת הנושא מה-localStorage
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('horizon-theme');
    setIsDark(savedTheme === 'dark');
  }, []);

  return (
    <div 
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]' 
          : 'bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]'
      }`} 
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-8 animate-fadeIn">
        {/* Logo/Brand Area with elegant design */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#32acc1] to-[#fc9f67] rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
          <div className={`relative flex items-center gap-4 backdrop-blur-sm px-8 py-6 rounded-3xl border-2 shadow-2xl ${
            isDark 
              ? 'bg-[#112240]/80 border-white/10' 
              : 'bg-white border-[#e1e8ed]'
          }`}>
            <div className="w-14 h-14 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold bg-gradient-to-l from-[#32acc1] via-[#32acc1] to-[#fc9f67] bg-clip-text text-transparent">
                Plusto
              </h1>
              <p className={`text-sm font-medium tracking-wide ${isDark ? 'text-[#cbd5e0]' : 'text-[#5a6c7d]'}`}>
                מערכת ניהול עסקי מתקדמת
              </p>
            </div>
          </div>
        </div>

        {/* Elegant Loading Animation */}
        <div className="relative w-16 h-16">
          <Loader2 className="w-16 h-16 text-[#32acc1] animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-[#fc9f67]/20 rounded-full animate-ping" />
        </div>

        {/* Loading Message with fade effect */}
        <div className="text-center space-y-2">
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#121725]'}`}>{message}</p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-[#32acc1] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#fc9f67] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#32acc1] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* Elegant Progress Bar */}
        <div className={`w-80 h-1.5 rounded-full overflow-hidden shadow-inner ${isDark ? 'bg-white/10' : 'bg-[#e1e8ed]'}`}>
          <div className="h-full bg-gradient-to-r from-[#32acc1] via-[#fc9f67] to-[#32acc1] rounded-full animate-[loading_2s_ease-in-out_infinite] shadow-lg shadow-[#32acc1]/30" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0%, 100% {
            width: 0%;
            margin-right: 0;
          }
          50% {
            width: 100%;
            margin-right: 0;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
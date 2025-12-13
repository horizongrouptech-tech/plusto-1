import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { TrendingUp, Sparkles, Zap } from "lucide-react";

export default function WelcomePage() {
  const handleLogin = async () => {
    await base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-5xl w-full">
        {/* לוגו וכותרת ראשית */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-5 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-3xl flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-all duration-300">
              <TrendingUp className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-7xl font-black bg-gradient-to-l from-[#fc9f67] to-[#fc8a68] bg-clip-text text-transparent tracking-wide" style={{ fontFamily: "'Heebo', 'Rubik', sans-serif" }}>
              Plusto
            </h1>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Heebo', 'Rubik', sans-serif" }}>
            העזרה החכמה לעסק שלך
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed" style={{ fontFamily: "'Rubik', 'Heebo', sans-serif" }}>
            פלטפורמת ניהול עסקי מתקדמת עם ניתוח מבוסס נתונים לשיפור הרווחיות והיעילות
          </p>
        </div>

        {/* כרטיס ראשי */}
        <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-12 shadow-2xl mb-10">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-8 h-8 text-[#fc9f67]" />
              <h3 className="text-3xl font-bold text-white" style={{ fontFamily: "'Heebo', 'Rubik', sans-serif" }}>
                ברוכים הבאים לפלטפורמת הניהול החכמה
              </h3>
              <Sparkles className="w-8 h-8 text-[#fc9f67]" />
            </div>
            <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto" style={{ fontFamily: "'Rubik', 'Heebo', sans-serif" }}>
              Plusto עוזר לעסקים להגדיל רווחים, לייעל תהליכים ולקבל החלטות מבוססות נתונים.
              <br />
              <span className="text-[#fc9f67] font-semibold">התחבר כעת</span> כדי לגלות את הפוטנציאל המלא של העסק שלך.
            </p>
          </div>

          {/* כפתור התחבר */}
          <div className="flex justify-center">
            <Button
              onClick={handleLogin}
              className="h-20 px-16 text-2xl font-bold bg-gradient-to-r from-[#fc9f67] to-[#fc8a68] hover:from-[#fc8a68] hover:to-[#fc9f67] text-white shadow-2xl hover:shadow-[0_0_50px_rgba(252,159,103,0.6)] transform hover:scale-110 transition-all duration-300 rounded-2xl"
              style={{ fontFamily: "'Heebo', 'Rubik', sans-serif" }}
            >
              <Zap className="w-7 h-7 ml-3" />
              <span>התחבר למערכת</span>
            </Button>
          </div>
        </div>

        {/* טקסט תחתון */}
        <div className="text-center text-gray-400 text-base space-y-2" style={{ fontFamily: "'Rubik', 'Heebo', sans-serif" }}>
          <p>פיתוח והפעלה של מערכת ניהול עסקית מתקדמת</p>
          <p>© 2025 Plusto. All rights reserved.</p>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&family=Rubik:wght@400;500;700&display=swap');
      `}</style>
    </div>
  );
}
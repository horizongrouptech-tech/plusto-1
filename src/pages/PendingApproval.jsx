import React, { useEffect, useRef } from "react";
import { Loader2, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function PendingApprovalPage() {
  const { user, isLoadingAuth, userRole, refreshUser } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  // Auto-refresh כל 30 שניות לבדוק אם אושר
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refreshUser();
    }, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refreshUser]);

  // Redirect אם כבר אושר
  useEffect(() => {
    if (!user || isLoadingAuth) return;

    if (user.is_approved_by_admin) {
      // אושר — redirect לפי role
      const target = userRole === 'supplier_user' ? '/MyLeads' : '/Dashboard';
      setTimeout(() => navigate(target, { replace: true }), 1500);
    }
  }, [user, userRole, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#32acc1] animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-white">בודק את סטטוס האישור...</h1>
          <p className="text-[#83ddec]">רק רגע, אנחנו בודקים את פרטי החשבון שלך.</p>
        </div>
      </div>
    );
  }

  // ממתין לאישור — כל משתמש שלא אושר
  const isPending = !user?.is_approved_by_admin;
  // אושר (מראים הודעת הצלחה לפני redirect)
  const isApproved = user?.is_approved_by_admin === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-lg w-full p-8 text-center space-y-6 shadow-2xl">
        {isPending ? (
          <>
            <Clock className="w-16 h-16 text-[#fc9f67] mx-auto" />
            <h1 className="text-3xl font-bold text-white">
              החשבון שלך ממתין לאישור
            </h1>
            <p className="text-[#83ddec] text-lg">
              מנהל המערכת יבדוק את בקשתך. תהליך זה יכול לקחת עד 24 שעות.
              ברגע שהחשבון יאושר, תקבל גישה מלאה למערכת.
            </p>
            <p className="text-gray-500 text-sm">
              הדף מתרענן אוטומטית כל 30 שניות
            </p>
            <Button
              onClick={refreshUser}
              className="bg-[#32acc1] hover:bg-[#2a95a8] text-white"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              בדוק סטטוס שוב
            </Button>
          </>
        ) : isApproved ? (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <h1 className="text-3xl font-bold text-white">
              האישור התקבל בהצלחה!
            </h1>
            <p className="text-[#83ddec] text-lg">
              החשבון שלך אושר. אתה מופנה כעת לדשבורד...
            </p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <h1 className="text-3xl font-bold text-white">
              החשבון שלך פעיל
            </h1>
            <p className="text-[#83ddec] text-lg">
              מופנה לדשבורד...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

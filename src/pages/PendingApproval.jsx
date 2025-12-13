import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Loader2, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";

export default function PendingApprovalPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("בודק את סטטוס האישור...");
  const navigate = useNavigate();

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      if (currentUser) {
        if (currentUser.user_type === 'financial_manager') {
          if (currentUser.is_approved_by_admin) {
            setStatusMessage("האישור התקבל! מופנה לממשק הניהול...");
            setTimeout(() => {
              navigate(createPageUrl("Admin"));
            }, 1500);
          } else {
            setStatusMessage("החשבון שלך ממתין לאישור מנהל המערכת.");
          }
        } else {
          setStatusMessage("החשבון שלך כבר פעיל.");
          setTimeout(() => {
            navigate(createPageUrl("Dashboard"));
          }, 1500);
        }
      } else {
        navigate(createPageUrl("Welcome"));
      }
    } catch (error) {
      console.error("Error checking user status:", error);
      setStatusMessage("אירעה שגיאה בבדיקת הסטטוס. נסה שוב מאוחר יותר.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center" dir="rtl">
        <style>
        {`
          :root {
            --horizon-primary: #32acc1;
            --horizon-secondary: #fc9f67;
            --horizon-dark: #121725;
            --horizon-text: #ffffff;
            --horizon-accent: #83ddec;
            --horizon-secondary-alt: #fc8a68;
            --horizon-card-bg: rgba(255, 255, 255, 0.05);
            --horizon-border: rgba(131, 221, 236, 0.2);
            --shadow-horizon: 0 4px 20px rgba(50, 172, 193, 0.15);
            --shadow-horizon-strong: 0 8px 40px rgba(50, 172, 193, 0.25);
          }

          .bg-horizon-primary { background-color: var(--horizon-primary); }
          .bg-horizon-secondary { background-color: var(--horizon-secondary); }
          .bg-horizon-dark { background-color: var(--horizon-dark); }
          .bg-horizon-text { background-color: var(--horizon-text); }
          .bg-horizon-accent { background-color: var(--horizon-accent); }
          .bg-horizon-card { background-color: var(--horizon-card-bg); }

          .text-horizon-primary { color: var(--horizon-primary); }
          .text-horizon-secondary { color: var(--horizon-secondary); }
          .text-horizon-dark { color: var(--horizon-dark); }
          .text-horizon-text { color: var(--horizon-text); }
          .text-horizon-accent { color: var(--horizon-accent); }

          .border-horizon { border-color: var(--horizon-border); }
          .border-horizon-primary { border-color: var(--horizon-primary); }

          .card-horizon {
            background: var(--horizon-card-bg);
            border: 1px solid var(--horizon-border);
            border-radius: 16px;
            box-shadow: var(--shadow-horizon);
            transition: all 0.3s ease;
            color: var(--horizon-text);
          }

          .btn-horizon-primary {
            background-color: var(--horizon-primary);
            color: var(--horizon-text);
            border: none;
            transition: all 0.2s ease;
          }

          .btn-horizon-primary:hover {
            background-color: #2a95a8;
            transform: translateY(-1px);
            box-shadow: var(--shadow-horizon);
          }
        `}
        </style>
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-horizon-primary animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-horizon-text">{statusMessage}</h1>
          <p className="text-horizon-accent">רק רגע, אנחנו בודקים את פרטי החשבון שלך.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark flex items-center justify-center p-6" dir="rtl">
      <style>
      {`
        :root {
          --horizon-primary: #32acc1;
          --horizon-secondary: #fc9f67;
          --horizon-dark: #121725;
          --horizon-text: #ffffff;
          --horizon-accent: #83ddec;
          --horizon-secondary-alt: #fc8a68;
          --horizon-card-bg: rgba(255, 255, 255, 0.05);
          --horizon-border: rgba(131, 221, 236, 0.2);
          --shadow-horizon: 0 4px 20px rgba(50, 172, 193, 0.15);
          --shadow-horizon-strong: 0 8px 40px rgba(50, 172, 193, 0.25);
        }

        .bg-horizon-primary { background-color: var(--horizon-primary); }
        .bg-horizon-secondary { background-color: var(--horizon-secondary); }
        .bg-horizon-dark { background-color: var(--horizon-dark); }
        .bg-horizon-text { background-color: var(--horizon-text); }
        .bg-horizon-accent { background-color: var(--horizon-accent); }
        .bg-horizon-card { background-color: var(--horizon-card-bg); }

        .text-horizon-primary { color: var(--horizon-primary); }
        .text-horizon-secondary { color: var(--horizon-secondary); }
        .text-horizon-dark { color: var(--horizon-dark); }
        .text-horizon-text { color: var(--horizon-text); }
        .text-horizon-accent { color: var(--horizon-accent); }

        .border-horizon { border-color: var(--horizon-border); }
        .border-horizon-primary { border-color: var(--horizon-primary); }

        .card-horizon {
          background: var(--horizon-card-bg);
          border: 1px solid var(--horizon-border);
          border-radius: 16px;
          box-shadow: var(--shadow-horizon);
          transition: all 0.3s ease;
          color: var(--horizon-text);
        }

        .btn-horizon-primary {
          background-color: var(--horizon-primary);
          color: var(--horizon-text);
          border: none;
          transition: all 0.2s ease;
        }

        .btn-horizon-primary:hover {
          background-color: #2a95a8;
          transform: translateY(-1px);
          box-shadow: var(--shadow-horizon);
        }
      `}
      </style>
      <div className="card-horizon max-w-lg w-full p-8 text-center space-y-6">
        {user?.user_type === 'financial_manager' && !user?.is_approved_by_admin ? (
          <>
            <Clock className="w-16 h-16 text-yellow-400 mx-auto" />
            <h1 className="text-3xl font-bold text-horizon-text">
              החשבון שלך ממתין לאישור
            </h1>
            <p className="text-horizon-accent text-lg">
              מנהל הכספים שלך יבדוק את בקשתך. תהליך זה יכול לקחת עד 24 שעות.
              ברגע שהחשבון יאושר, תקבל גישה מלאה למערכת.
            </p>
            <Button onClick={checkApprovalStatus} className="btn-horizon-primary">
              <RefreshCw className="w-4 h-4 ml-2" />
              בדוק סטטוס שוב
            </Button>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h1 className="text-3xl font-bold text-horizon-text">
              האישור התקבל בהצלחה!
            </h1>
            <p className="text-horizon-accent text-lg">
              החשבון שלך אושר. אתה מופנה כעת לממשק המשתמש המתאים.
            </p>
            <Button asChild className="btn-horizon-primary">
              <Link to={user?.role === 'admin' || user?.user_type === 'financial_manager' ? createPageUrl("Admin") : createPageUrl("Dashboard")}>
                המשך למערכת
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Building2, Calendar, LogOut, Link2, Unlink, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { User as UserEntity } from '@/api/entities';

export default function Settings() {
  const { user, isLoadingAuth, refreshUser } = useAuth();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/Welcome';
  };

  // התחלת חיבור Google Calendar
  const handleConnectGoogle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/google/auth', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[Settings] Google connect error:', err);
      toast.error('שגיאה בהתחלת חיבור Google');
    }
  };

  // ניתוק Google Calendar
  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      await UserEntity.update(user.id, {
        google_calendar_access_token: null,
        google_calendar_refresh_token: null,
        google_calendar_token_expires_at: null,
        google_calendar_email: null,
      });
      await refreshUser();
      toast.success('Google Calendar נותק בהצלחה');
    } catch (err) {
      console.error('[Settings] Google disconnect error:', err);
      toast.error('שגיאה בניתוק Google');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (!user) return null;

  // תרגום סוג עסק
  const businessTypeLabel = {
    retail: 'קמעונאות',
    wholesale: 'סיטונאות',
    manufacturing: 'ייצור',
    import: 'יבוא',
    export: 'יצוא',
    services: 'שירותים',
  }[user.business_type] || user.business_type || 'לא צוין';

  // תרגום role
  const roleLabel = {
    admin: 'מנהל מערכת',
    financial_manager: 'מנהל כספים',
    user: 'לקוח',
  }[user.role] || user.user_type || user.role || 'משתמש';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-horizon-text">הגדרות</h1>

      {/* כרטיס פרופיל */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-horizon-primary" />
            פרופיל משתמש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* שם */}
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-horizon-accent mt-1 shrink-0" />
              <div>
                <p className="text-xs text-horizon-accent">שם מלא</p>
                <p className="text-sm font-medium text-horizon-text">
                  {user.full_name || 'לא צוין'}
                </p>
              </div>
            </div>

            {/* אימייל */}
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-horizon-accent mt-1 shrink-0" />
              <div>
                <p className="text-xs text-horizon-accent">אימייל</p>
                <p className="text-sm font-medium text-horizon-text" dir="ltr">
                  {user.email}
                </p>
              </div>
            </div>

            {/* שם עסק */}
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-horizon-accent mt-1 shrink-0" />
              <div>
                <p className="text-xs text-horizon-accent">שם העסק</p>
                <p className="text-sm font-medium text-horizon-text">
                  {user.business_name || 'לא צוין'}
                </p>
              </div>
            </div>

            {/* סוג עסק */}
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-horizon-accent mt-1 shrink-0" />
              <div>
                <p className="text-xs text-horizon-accent">סוג עסק</p>
                <p className="text-sm font-medium text-horizon-text">{businessTypeLabel}</p>
              </div>
            </div>
          </div>

          {/* תגיות */}
          <div className="flex items-center gap-2 pt-2 border-t border-horizon">
            <Badge variant="outline" className="text-horizon-primary border-horizon-primary">
              {roleLabel}
            </Badge>
            {user.customer_group && (
              <Badge variant="outline" className="text-horizon-accent border-horizon">
                קבוצה {user.customer_group}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* חיבור Google Calendar */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-horizon-primary" />
            חיבור Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.google_calendar_email ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-horizon-text">מחובר</p>
                  <p className="text-xs text-horizon-accent" dir="ltr">
                    {user.google_calendar_email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-rose-300 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                onClick={handleDisconnectGoogle}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 ml-2" />
                )}
                נתק
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-horizon-text">לא מחובר</p>
                <p className="text-xs text-horizon-accent">
                  חבר את חשבון Google שלך לצפייה בלוח השנה
                </p>
              </div>
              <Button
                className="bg-horizon-primary hover:bg-horizon-primary/90 text-white"
                onClick={handleConnectGoogle}
              >
                <Link2 className="w-4 h-4 ml-2" />
                חבר Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* התנתקות */}
      <Card className="card-horizon">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-horizon-text">התנתקות מהמערכת</p>
              <p className="text-xs text-horizon-accent">תועבר לדף הכניסה</p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 ml-2" />
              התנתק
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

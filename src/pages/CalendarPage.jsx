import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar as CalendarIcon, ExternalLink, Link2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Helper: fetch with auth token from Supabase session
async function authFetch(url) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function CalendarPage() {
  const { user, isLoadingAuth } = useAuth();
  const [viewMode, setViewMode] = useState('custom'); // 'embed' | 'custom'

  const isConnected = !!user?.google_calendar_email;

  // Fetch events for custom view
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['googleCalendarEvents'],
    queryFn: async () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const threeMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      const params = new URLSearchParams({
        timeMin: threeMonthsAgo.toISOString(),
        timeMax: threeMonthsAhead.toISOString(),
      });
      return authFetch(`/api/google/calendar-events?${params}`);
    },
    enabled: isConnected && viewMode === 'custom',
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const events = eventsData?.events || [];

  // Start Google OAuth
  const handleConnect = async () => {
    try {
      const data = await authFetch('/api/google/auth');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[CalendarPage] OAuth start error:', err);
      toast.error('שגיאה בהתחלת חיבור Google');
    }
  };

  // FullCalendar event click — open in Google Calendar
  const handleEventClick = useCallback((info) => {
    const htmlLink = info.event.extendedProps?.htmlLink;
    if (htmlLink) {
      window.open(htmlLink, '_blank');
    }
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-horizon-text flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-horizon-primary" />
            לוח שנה
          </h1>
          {isConnected && (
            <p className="text-sm text-horizon-accent mt-1">
              מחובר ל-{user.google_calendar_email}
            </p>
          )}
        </div>

        {/* Toggle בין תצוגות — רק אם מחובר */}
        {isConnected && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'custom' ? 'default' : 'ghost'}
              className={viewMode === 'custom'
                ? 'bg-horizon-primary text-white hover:bg-horizon-primary/90'
                : 'text-horizon-accent hover:text-horizon-text'}
              onClick={() => setViewMode('custom')}
            >
              <CalendarIcon className="w-4 h-4 ml-1" />
              מותאם אישית
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'embed' ? 'default' : 'ghost'}
              className={viewMode === 'embed'
                ? 'bg-horizon-primary text-white hover:bg-horizon-primary/90'
                : 'text-horizon-accent hover:text-horizon-text'}
              onClick={() => setViewMode('embed')}
            >
              <ExternalLink className="w-4 h-4 ml-1" />
              Google Calendar
            </Button>
          </div>
        )}
      </div>

      {/* לא מחובר — הצג כפתור חיבור */}
      {!isConnected && (
        <Card className="card-horizon">
          <CardContent className="py-16 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-teal-100 to-sky-100 flex items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-horizon-text mb-2">
                חבר את Google Calendar שלך
              </h2>
              <p className="text-horizon-accent max-w-md mx-auto">
                חבר את חשבון Google שלך כדי לצפות בלוח השנה שלך ישירות מתוך המערכת.
                נציג את כל הפגישות והאירועים שלך.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              className="bg-horizon-primary hover:bg-horizon-primary/90 text-white px-8 py-3 text-base"
            >
              <Link2 className="w-5 h-5 ml-2" />
              חבר Google Calendar
            </Button>
            <p className="text-xs text-horizon-accent/60">
              נבקש הרשאת קריאה בלבד — לא נשנה דבר בלוח השנה שלך
            </p>
          </CardContent>
        </Card>
      )}

      {/* מחובר — תצוגת Embed */}
      {isConnected && viewMode === 'embed' && (
        <Card className="card-horizon overflow-hidden">
          <CardContent className="p-0">
            <iframe
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(user.google_calendar_email)}&ctz=Asia/Jerusalem&hl=he`}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
              title="Google Calendar"
            />
          </CardContent>
        </Card>
      )}

      {/* מחובר — תצוגת FullCalendar מותאמת */}
      {isConnected && viewMode === 'custom' && (
        <Card className="card-horizon">
          <CardContent className="p-4">
            {eventsLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
                <span className="mr-3 text-horizon-accent">טוען אירועים...</span>
              </div>
            ) : (
              <div className="fullcalendar-horizon" dir="ltr">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  direction="rtl"
                  locale="he"
                  headerToolbar={{
                    start: 'dayGridMonth,timeGridWeek,timeGridDay',
                    center: 'title',
                    end: 'prev,next today',
                  }}
                  buttonText={{
                    today: 'היום',
                    month: 'חודש',
                    week: 'שבוע',
                    day: 'יום',
                  }}
                  events={events.map(event => ({
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    backgroundColor: event.color || '#0d9488',
                    borderColor: event.color || '#0d9488',
                    extendedProps: {
                      description: event.description,
                      location: event.location,
                      htmlLink: event.htmlLink,
                    },
                  }))}
                  eventClick={handleEventClick}
                  height="calc(100vh - 280px)"
                  dayMaxEvents={4}
                  nowIndicator
                  firstDay={0} // יום ראשון
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

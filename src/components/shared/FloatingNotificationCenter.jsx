
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Notification } from '@/entities/Notification';

export default function FloatingNotificationCenter({ userEmail, onChatNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      const userNotifications = await Notification.filter(
        { recipient_email: userEmail },
        '-created_date',
        20
      );
      
      setNotifications(userNotifications);
      const unread = userNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]); // userEmail is a dependency for this useCallback

  useEffect(() => {
    if (userEmail) {
      loadNotifications();
      // רענון כל 30 שניות
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, loadNotifications]); // loadNotifications is now a stable dependency due to useCallback

  const handleNotificationClick = async (notification) => {
    try {
      // סמן כנקרא
      if (!notification.is_read) {
        await Notification.update(notification.id, { is_read: true });
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // בדוק אם זו התראה של צ'אט (תיקון ושיפור)
      if (
        (notification.type === 'mention' || notification.type === 'new_message') &&
        notification.related_entity_type === 'chat_thread'
      ) {
        console.log('Notification clicked - chat thread:', notification.related_entity_id);
        // קרא לפונקציה שתפתח את הצ'אט עם השיחה הספציפית
        if (onChatNotificationClick && notification.related_entity_id) {
          onChatNotificationClick(notification.related_entity_id);
          setIsOpen(false); // סגור את מרכז ההתראות
          return;
        }
      }

      // עבור התראות אחרות - נווט לפי הקישור הרגיל
      if (notification.link) {
        if (notification.link.startsWith('#')) {
          // קישור פנימי באפליקציה
          const element = document.querySelector(notification.link);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          // קישור חיצוני
          window.open(notification.link, '_blank');
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          Notification.update(n.id, { is_read: true })
        )
      );
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'mention':
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'admin_update':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'כעת';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    if (diffInMinutes < 1440) return `לפני ${Math.floor(diffInMinutes / 60)} שעות`;
    return `לפני ${Math.floor(diffInMinutes / 1440)} ימים`;
  };

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      {/* כפתור התראות צף */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full bg-horizon-primary hover:bg-horizon-primary/90 shadow-lg"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* פאנל התראות */}
      {isOpen && (
        <Card className="absolute bottom-16 left-0 w-80 max-h-96 bg-horizon-dark border-horizon shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-horizon-text text-sm">התראות</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-horizon-accent hover:text-horizon-text"
                  >
                    סמן הכל כנקרא
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-horizon-accent hover:text-horizon-text"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-horizon-accent">
                טוען התראות...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-horizon-accent">
                אין התראות חדשות
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-horizon-card/50 border-b border-horizon/30 ${
                      !notification.is_read ? 'bg-horizon-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-horizon-text truncate">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-horizon-accent mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-horizon-accent/70 mt-1">
                          {formatTimeAgo(notification.created_date)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

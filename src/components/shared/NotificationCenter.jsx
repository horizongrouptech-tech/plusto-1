
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Check, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function NotificationCenter({ user }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications } = useQuery({
        queryKey: ['notifications', user?.email], // שימוש ב-optional chaining
        queryFn: () => base44.entities.Notification.filter({ recipient_email: user.email }, '-created_date', 20),
        enabled: isOpen && !!user?.email, // הוספת בדיקה כפולה למניעת שגיאה
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const markAsReadMutation = useMutation({
        mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications', user?.email]);
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => {
            const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) || [];
            if (unreadIds.length === 0) return Promise.resolve();
            // This assumes a bulk update capability. If not available, loop through markAsReadMutation.
            // For now, let's simulate it with multiple promises.
            return Promise.all(unreadIds.map(id => base44.entities.Notification.update(id, { is_read: true })));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications', user?.email]);
        }
    });

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5 text-horizon-accent" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-horizon-card border-horizon text-horizon-text p-0" align="end">
                <div className="p-4 border-b border-horizon flex justify-between items-center">
                    <h4 className="font-medium">התראות</h4>
                    {unreadCount > 0 && (
                         <Button variant="link" className="text-horizon-primary p-0 h-auto text-xs" onClick={() => markAllAsReadMutation.mutate()}>
                            סמן הכל כנקרא
                        </Button>
                    )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`p-4 border-b border-horizon flex items-start gap-3 ${!notification.is_read ? 'bg-horizon-primary/10' : ''}`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {!notification.is_read ? (
                                        <Circle className="h-2 w-2 text-horizon-primary fill-current" />
                                    ) : (
                                        <div className="h-2 w-2" />
                                    )}
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-sm font-medium">{notification.title}</p>
                                    <p className="text-xs text-horizon-accent">{notification.message}</p>
                                    <p className="text-xs text-horizon-accent/70 mt-1">
                                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: he })}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-horizon-accent hover:text-horizon-primary"
                                        onClick={() => markAsReadMutation.mutate(notification.id)}
                                        title="סמן כנקרא"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-horizon-accent">
                            <Bell className="mx-auto h-8 w-8 mb-2" />
                            <p>אין התראות חדשות</p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

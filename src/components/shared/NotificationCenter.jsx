
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, BellOff, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Notification } from '@/api/entities';

// אייקון לפי סוג ההתראה
function NotificationIcon({ type }) {
    switch (type) {
        case 'success':
            return <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>;
        case 'warning':
            return <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4 text-amber-500" /></div>;
        case 'error':
            return <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4 text-red-500" /></div>;
        default:
            return <div className="w-8 h-8 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0"><Info className="w-4 h-4 text-sky-500" /></div>;
    }
}

export default function NotificationCenter({ user }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications } = useQuery({
        queryKey: ['notifications', user?.email],
        queryFn: () => Notification.filter({ recipient_email: user.email }, '-created_date', 20),
        enabled: isOpen && !!user?.email,
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const markAsReadMutation = useMutation({
        mutationFn: (notificationId) => Notification.update(notificationId, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications', user?.email]);
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => {
            const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) || [];
            if (unreadIds.length === 0) return Promise.resolve();
            return Promise.all(unreadIds.map(id => Notification.update(id, { is_read: true })));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications', user?.email]);
        }
    });

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="h-[18px] w-[18px] text-horizon-accent" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] px-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-horizon-primary opacity-40"></span>
                            <span className="relative inline-flex rounded-full h-[18px] min-w-[18px] px-1 bg-horizon-primary text-white text-[10px] font-bold items-center justify-center shadow-lg shadow-horizon-primary/30">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] bg-horizon-card border-horizon text-horizon-text p-0 shadow-xl shadow-black/20 rounded-xl overflow-hidden" align="end" sideOffset={8}>
                {/* Header */}
                <div className="px-4 py-3 flex justify-between items-center bg-gradient-to-l from-horizon-primary/10 to-transparent">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">התראות</h4>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-horizon-primary text-white rounded-full px-1.5 py-0.5 leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsReadMutation.mutate()}
                            className="text-xs text-horizon-primary hover:text-horizon-primary/80 flex items-center gap-1 transition-colors"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            סמן הכל כנקרא
                        </button>
                    )}
                </div>

                {/* Notifications list */}
                <div className="max-h-[400px] overflow-y-auto divide-y divide-horizon/50">
                    {notifications && notifications.length > 0 ? (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-horizon-primary/5 cursor-default
                                    ${!notification.is_read ? 'bg-horizon-primary/[0.07]' : ''}`}
                            >
                                <NotificationIcon type={notification.type} />
                                <div className="flex-1 min-w-0 text-right">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm leading-snug ${!notification.is_read ? 'font-semibold' : 'font-medium text-horizon-accent'}`}>
                                            {notification.title}
                                        </p>
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                                className="shrink-0 w-6 h-6 rounded-full hover:bg-horizon-primary/15 flex items-center justify-center transition-colors group"
                                                title="סמן כנקרא"
                                            >
                                                <Check className="w-3.5 h-3.5 text-horizon-accent group-hover:text-horizon-primary" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-horizon-accent/80 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <p className="text-[11px] text-horizon-accent/50 mt-1">
                                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: he })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 px-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-horizon-primary/10 flex items-center justify-center">
                                <BellOff className="w-6 h-6 text-horizon-accent/50" />
                            </div>
                            <p className="text-sm font-medium text-horizon-accent/70">אין התראות חדשות</p>
                            <p className="text-xs text-horizon-accent/40 mt-1">כשתהיינה התראות, הן יופיעו כאן</p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

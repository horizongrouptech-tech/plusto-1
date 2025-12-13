import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NotificationCenter from './NotificationCenter';
import { useTheme } from './ThemeContext';

export default function TopBarActions({ user }) {
    // Safe theme hook usage
    let theme = 'light';
    let toggleTheme = () => {};
    let isDark = false;
    try {
        const themeContext = useTheme();
        theme = themeContext.theme;
        toggleTheme = themeContext.toggleTheme;
        isDark = themeContext.isDark;
    } catch (e) {
        // Theme context not available
    }
    
    const { data: delayedTasks } = useQuery({
        queryKey: ['delayedTasksCount', user?.email],
        queryFn: () => base44.entities.CustomerGoal.filter({
            assignee_email: user.email,
            status: 'delayed',
            is_active: true
        }),
        select: (data) => data.length,
        enabled: !!user?.email, // הוספת בדיקה למניעת שגיאה
    });

    const handleLogout = async () => {
        await base44.auth.logout();
        window.location.reload();
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const nameParts = name.split(' ');
        if (nameParts.length > 1) {
            return nameParts[0][0] + nameParts[nameParts.length - 1][0];
        }
        return name.substring(0, 2);
    };

    return (
        <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="theme-toggle-btn h-9 w-9 rounded-full transition-all duration-300"
                title={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
            >
                {isDark ? (
                    <Sun className="w-5 h-5 text-yellow-400 transition-transform duration-300" />
                ) : (
                    <Moon className="w-5 h-5 text-horizon-accent transition-transform duration-300" />
                )}
            </Button>

            {/* Delayed Tasks Indicator */}
            {delayedTasks > 0 && (
                <Link to={createPageUrl('TaskManagement') + '?filter=delayed'}>
                    <Button variant="ghost" className="text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-2 px-3 h-9">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{delayedTasks}</span>
                        <span className="hidden sm:inline">באיחור</span>
                    </Button>
                </Link>
            )}

            {/* Notification Center */}
            <NotificationCenter user={user} />

            {/* User Profile Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-8 w-8 border-2 border-horizon-primary/50">
                            <AvatarImage src={user.avatar_url} alt={user.full_name} />
                            <AvatarFallback className="bg-horizon-primary text-white font-bold">
                                {getInitials(user.full_name)}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-horizon-card border-horizon text-horizon-text" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1 text-right">
                            <p className="text-sm font-medium leading-none">{user.full_name}</p>
                            <p className="text-xs leading-none text-horizon-accent">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-horizon" />
                    <DropdownMenuItem className="text-right cursor-pointer hover:bg-horizon-primary/10">
                        <UserIcon className="ml-2 h-4 w-4" />
                        <span>פרופיל</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-horizon" />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 text-right cursor-pointer hover:bg-red-500/10">
                        <LogOut className="ml-2 h-4 w-4" />
                        <span>התנתקות</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
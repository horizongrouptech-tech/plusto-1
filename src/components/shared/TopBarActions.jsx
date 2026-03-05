import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CustomerGoal } from '@/api/entities';

export default function TopBarActions({ user }) {
    const { data: delayedTasks } = useQuery({
        queryKey: ['delayedTasksCount', user?.email],
        queryFn: () => CustomerGoal.filter({
            assignee_email: user.email,
            status: 'delayed',
            is_active: true
        }),
        select: (data) => data.length,
        enabled: !!user?.email,
    });

    // אם אין משימות באיחור — לא מציג כלום
    if (!delayedTasks || delayedTasks <= 0) return null;

    return (
        <div className="flex items-center gap-2">
            <Link to={createPageUrl('TaskManagement') + '?filter=delayed'}>
                <Button variant="ghost" className="text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-2 px-3 h-9">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{delayedTasks}</span>
                    <span className="hidden sm:inline">באיחור</span>
                </Button>
            </Link>
        </div>
    );
}
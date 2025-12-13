import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function PeriodRangePicker({ value, onChange, className }) {
    const { startDate, endDate } = value || {};

    const handleSelect = (range) => {
        onChange({ startDate: range?.from, endDate: range?.to });
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal bg-horizon-dark border-horizon text-horizon-text hover:bg-horizon-card h-9",
                            !startDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {startDate && endDate ? (
                            <>
                                {format(new Date(startDate), "dd/MM/yy", { locale: he })} - {format(new Date(endDate), "dd/MM/yy", { locale: he })}
                            </>
                        ) : startDate ? (
                             format(new Date(startDate), "dd/MM/yy", { locale: he })
                        ) : (
                            <span>בחר טווח תאריכים</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-dark border-horizon" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={startDate ? new Date(startDate) : new Date()}
                        selected={{ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined }}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        locale={he}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
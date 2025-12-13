import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatLargeNumber } from "@/components/utils/currencyFormatter";
import CountUp from 'react-countup';
import anime from 'animejs';

export default function StatsCards({ title, value, icon: Icon, bgColor, trend, isLargeNumber = false }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      anime({
        targets: cardRef.current,
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutExpo'
      });
    }
  }, []);

  const getNumericValue = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[₪,]/g, '');
      const numVal = parseFloat(cleaned);
      return !isNaN(numVal) ? numVal : 0;
    }
    return 0;
  };

  const formatValue = (val) => {
    if (typeof val === 'string' && val.includes('₪')) {
      return val;
    }
    
    if (typeof val === 'number') {
      return isLargeNumber ? formatLargeNumber(val) : formatCurrency(val);
    }
    
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      return isLargeNumber ? formatLargeNumber(numVal) : formatCurrency(numVal);
    }
    
    return val;
  };

  const numericValue = getNumericValue(value);
  const shouldAnimate = typeof value === 'number' || (!isNaN(parseFloat(value)) && !value.toString().includes('₪'));

  return (
    <Card ref={cardRef} className="card-horizon border-0 shadow-lg overflow-hidden" style={{ opacity: 0 }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-horizon-accent mb-2">{title}</p>
            <div className="text-2xl font-bold text-horizon-text mb-1">
              {shouldAnimate && numericValue > 0 ? (
                <CountUp
                  end={numericValue}
                  duration={2.5}
                  separator=","
                  decimals={isLargeNumber ? 0 : 0}
                  prefix={!isLargeNumber && typeof value === 'number' ? '₪' : ''}
                  formattingFn={(val) => {
                    if (isLargeNumber) {
                      return formatLargeNumber(val);
                    }
                    return val.toLocaleString('he-IL');
                  }}
                />
              ) : (
                formatValue(value)
              )}
            </div>
            {trend && <p className="text-xs text-horizon-accent">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl ${bgColor || 'bg-horizon-primary'} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
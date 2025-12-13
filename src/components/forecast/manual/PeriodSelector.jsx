import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle } from 'lucide-react';

const MONTH_NAMES_HEBREW = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function PeriodSelector({ 
  currentViewMode = 'yearly',
  currentStartMonth = 1, 
  currentEndMonth = 12,
  forecastYear,
  onPeriodChange 
}) {
  const [selectingType, setSelectingType] = useState(null); // 'start' or 'end'

  const handleViewModeChange = (newMode) => {
    if (newMode === 'yearly') {
      onPeriodChange('yearly', 1, 12);
      setSelectingType(null);
    } else {
      onPeriodChange('custom', currentStartMonth, currentEndMonth);
    }
  };

  const handleMonthClick = (monthNum) => {
    if (currentViewMode !== 'custom') return;

    if (selectingType === 'start') {
      const newEnd = Math.max(monthNum, currentEndMonth);
      onPeriodChange('custom', monthNum, newEnd);
      setSelectingType(null);
    } else if (selectingType === 'end') {
      const newStart = Math.min(currentStartMonth, monthNum);
      onPeriodChange('custom', newStart, monthNum);
      setSelectingType(null);
    }
  };

  const getPeriodLabel = () => {
    if (currentViewMode === 'yearly') {
      return `שנתי ${forecastYear}`;
    }
    if (currentStartMonth === currentEndMonth) {
      return `${MONTH_NAMES_HEBREW[currentStartMonth - 1]} ${forecastYear}`;
    }
    return `${MONTH_NAMES_HEBREW[currentStartMonth - 1]} - ${MONTH_NAMES_HEBREW[currentEndMonth - 1]} ${forecastYear}`;
  };

  const isMonthInRange = (monthNum) => {
    return monthNum >= currentStartMonth && monthNum <= currentEndMonth;
  };

  return (
    <Card className="card-horizon border-blue-500/30 mb-6">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          בחירת תקופת תצוגה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Toggle View Mode */}
          <div className="flex gap-3">
            <button
              onClick={() => handleViewModeChange('yearly')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                currentViewMode === 'yearly' 
                  ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg' 
                  : 'bg-slate-100 border-2 border-[#32acc1]/40 text-[#121725] hover:border-[#32acc1] hover:bg-slate-200'
              }`}
            >
              תצוגה שנתית מלאה
            </button>
            <button
              onClick={() => handleViewModeChange('custom')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                currentViewMode === 'custom' 
                  ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg' 
                  : 'bg-slate-100 border-2 border-[#32acc1]/40 text-[#121725] hover:border-[#32acc1] hover:bg-slate-200'
              }`}
            >
              טווח מותאם אישית
            </button>
          </div>

          {/* Custom Range Selection - Grid of 12 Month Buttons */}
          {currentViewMode === 'custom' && (
            <div className="pt-4 border-t border-horizon space-y-4">
              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                <p className="text-sm text-horizon-text font-semibold mb-1">
                  {selectingType === 'start' && '👆 בחר חודש התחלה'}
                  {selectingType === 'end' && '👆 בחר חודש סיום'}
                  {!selectingType && '✅ לחץ על הכפתורים למטה לבחירת חודש התחלה או סיום'}
                </p>
              </div>

              {/* Selection Type Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectingType('start')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    selectingType === 'start'
                      ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg'
                      : 'bg-white border-2 border-[#e1e8ed] text-[#5a6c7d] hover:border-[#32acc1]'
                  }`}
                >
                  {selectingType === 'start' && <CheckCircle className="w-4 h-4 inline ml-1" />}
                  בחר חודש התחלה ({MONTH_NAMES_HEBREW[currentStartMonth - 1]})
                </button>
                <button
                  onClick={() => setSelectingType('end')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    selectingType === 'end'
                      ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg'
                      : 'bg-white border-2 border-[#e1e8ed] text-[#5a6c7d] hover:border-[#32acc1]'
                  }`}
                >
                  {selectingType === 'end' && <CheckCircle className="w-4 h-4 inline ml-1" />}
                  בחר חודש סיום ({MONTH_NAMES_HEBREW[currentEndMonth - 1]})
                </button>
              </div>

              {/* 12 Month Grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {MONTH_NAMES_HEBREW.map((month, idx) => {
                  const monthNum = idx + 1;
                  const inRange = isMonthInRange(monthNum);
                  const isStart = monthNum === currentStartMonth;
                  const isEnd = monthNum === currentEndMonth;
                  const isClickable = selectingType !== null;
                  
                  return (
                    <button
                      key={monthNum}
                      onClick={() => handleMonthClick(monthNum)}
                      disabled={!isClickable}
                      className={`px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                        inRange
                          ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-md'
                          : 'bg-slate-100 border-2 border-[#e1e8ed] text-[#5a6c7d]'
                      } ${
                        isClickable
                          ? 'hover:scale-105 cursor-pointer hover:shadow-lg'
                          : 'opacity-60 cursor-not-allowed'
                      } ${
                        (isStart || isEnd) && inRange
                          ? 'ring-2 ring-[#fc9f67] ring-offset-2'
                          : ''
                      }`}
                      title={month}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Timeline */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-horizon-accent">תקופה נבחרת:</span>
              <span className="text-sm font-bold text-horizon-text">{getPeriodLabel()}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                const monthNum = i + 1;
                const inRange = isMonthInRange(monthNum);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-3 rounded-full transition-all duration-300 ${
                      inRange
                        ? 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] shadow-md'
                        : 'bg-[#e1e8ed]'
                    }`}
                    title={MONTH_NAMES_HEBREW[i]}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-horizon-accent">ינואר</span>
              <span className="text-xs text-horizon-accent">דצמבר</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
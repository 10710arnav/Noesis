
import React from 'react';
import { Sentiment } from './types';
import { MOOD_COLORS, MOOD_TEXT_COLORS, MOOD_EMOJIS } from './constants';
import { Button, AnimatedDiv } from './uiComponents';

interface DashboardMoodCalendarProps {
  moodCalendarData: Record<string, { sentiment?: Sentiment; emoji?: string }>;
  currentDisplayMonth: Date;
  onChangeDisplayMonth: (offset: number) => void;
  localDateFormatter: (date: Date) => string; // Added prop
}

const DashboardMoodCalendar: React.FC<DashboardMoodCalendarProps> = ({ moodCalendarData, currentDisplayMonth, onChangeDisplayMonth, localDateFormatter }) => {
  const year = currentDisplayMonth.getFullYear();
  const month = currentDisplayMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const calendarDays: ({ date: Date; moodData?: { sentiment?: Sentiment; emoji?: string } } | null)[] = Array(firstDayOfMonth).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(year, month, i);
    const dateKey = localDateFormatter(dayDate);
    calendarDays.push({ date: dayDate, moodData: moodCalendarData[dateKey] });
  }

  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={50}>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => onChangeDisplayMonth(-1)} variant="ghost" size="sm" aria-label="Prev month dashboard"><i className="fas fa-chevron-left"></i></Button>
        <h3 className="text-xl font-semibold text-blue-600">{currentDisplayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <Button onClick={() => onChangeDisplayMonth(1)} variant="ghost" size="sm" aria-label="Next month dashboard"><i className="fas fa-chevron-right"></i></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-purple-700 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayObj, index) => {
          if (!dayObj) return <div key={`blank-${index}`} className="p-1 h-16 bg-slate-100 opacity-50 rounded-md"></div>;
          const { date, moodData } = dayObj;
          const moodColor = moodData?.sentiment ? MOOD_COLORS[moodData.sentiment] : (moodData ? MOOD_COLORS.Default : 'bg-slate-50');
          const textColor = moodData?.sentiment ? MOOD_TEXT_COLORS[moodData.sentiment] : (moodData ? MOOD_TEXT_COLORS.Default : 'text-slate-400');
          const isToday = date.toDateString() === new Date().toDateString();
          const hasEntryButNoAnalysis = moodData && !moodData.sentiment;

          return (
            <div key={date.toISOString()}
                 className={`p-1 h-16 ${moodColor} ${textColor} rounded-md flex flex-col items-center justify-center text-sm shadow transform transition-all duration-150 hover:scale-110 hover:shadow-md ${isToday ? 'ring-2 ring-purple-500' : ''} ${!moodData ? 'opacity-60' : ''}`}
                 title={moodData?.sentiment ? `Mood: ${moodData.sentiment}` : (hasEntryButNoAnalysis ? "Entry present, no analysis" : "No entry")}>
              <span>{date.getDate()}</span>
              {moodData?.emoji && <span className="text-lg mt-0.5" aria-hidden="true">{moodData.emoji}</span>}
              {hasEntryButNoAnalysis && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400" title="Entry present, no analysis"></span>}
            </div>
          );
        })}
      </div>
    </AnimatedDiv>
  );
};

export default DashboardMoodCalendar;

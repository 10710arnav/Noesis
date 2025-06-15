
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JournalEntry, DoctorShareSettings, Sentiment, Badge, MoodGraphDataPoint } from './types';
import { MOOD_EMOJIS, MOOD_COLORS, MOOD_TEXT_COLORS, THERAPEUTIC_THEME_CATEGORIES, BADGE_DEFINITIONS } from './constants';
import { AnimatedDiv, Button } from './uiComponents';
import DashboardMoodCalendar from './DashboardMoodCalendar';
import DashboardThemesDisplay from './DashboardThemesDisplay';
import BadgesDisplay from './BadgesDisplay';
import DashboardEmotionalTrends from './DashboardEmotionalTrends';
import MoodGraph from './MoodGraph'; 

interface ProviderDashboardPageProps {
  entries: JournalEntry[];
  earnedBadges: string[]; 
  doctorSettings: DoctorShareSettings;
  localDateFormatter: (date: Date) => string; // Added prop
}

const ProviderDashboardPage: React.FC<ProviderDashboardPageProps> = ({ entries, earnedBadges, doctorSettings, localDateFormatter }) => {
  const navigate = useNavigate();
  const [moodCalendarData, setMoodCalendarData] = useState<Record<string, {sentiment?: Sentiment, emoji?: string}>>({});
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [therapeuticThemeCounts, setTherapeuticThemeCounts] = useState<Record<string, number>>({});
  const [moodGraphData, setMoodGraphData] = useState<MoodGraphDataPoint[]>([]);
  const [isLoadingMoodGraph, setIsLoadingMoodGraph] = useState(true);

  const prepareMoodGraphData = useCallback((journalEntries: JournalEntry[], formatter: (date: Date) => string): MoodGraphDataPoint[] => {
    const moodMap = new Map<string, { sentiment: Sentiment; moodValue: number }>();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); 

    const entriesByLocalDay: Record<string, JournalEntry[]> = {};
    journalEntries.forEach(entry => {
        const localDate = new Date(entry.date);
        const dayKey = formatter(localDate);
        if (!entriesByLocalDay[dayKey]) {
            entriesByLocalDay[dayKey] = [];
        }
        entriesByLocalDay[dayKey].push(entry);
    });

    for (const dayKey in entriesByLocalDay) {
        const entriesForTheDay = entriesByLocalDay[dayKey];
        const latestAnalyzedEntry = entriesForTheDay
            .filter(e => e.analysis?.sentiment)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (latestAnalyzedEntry?.analysis) {
            const sentiment = latestAnalyzedEntry.analysis.sentiment;
            moodMap.set(dayKey, {
                sentiment,
                moodValue: sentiment === Sentiment.Positive ? 1 : sentiment === Sentiment.Negative ? -1 : 0,
            });
        }
    }
    
    const graphDataPoints: MoodGraphDataPoint[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = formatter(new Date(d));
        const dayMood = moodMap.get(dateKey);
        if (dayMood) {
            graphDataPoints.push({
                date: dateKey,
                moodValue: dayMood.moodValue,
                sentiment: dayMood.sentiment,
            });
        }
    }
    return graphDataPoints;
  }, []);

  useEffect(() => {
    setIsLoadingMoodGraph(true);
    const data: Record<string, {sentiment?: Sentiment, emoji?: string}> = {};
    const themeCounts: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entriesByLocalDay: Record<string, JournalEntry[]> = {};
    entries.forEach(entry => {
        const localDate = new Date(entry.date);
        const dayKey = localDateFormatter(localDate);
        if (!entriesByLocalDay[dayKey]) {
            entriesByLocalDay[dayKey] = [];
        }
        entriesByLocalDay[dayKey].push(entry);

        if (localDate >= thirtyDaysAgo && entry.analysis) {
          const matchedCategoriesForEntry = new Set<string>();
          const allThemesAndEmotions = [
            ...(entry.analysis.themes || []),
            ...(entry.analysis.emotions?.filter(em => em.score > 0.4).map(em => em.emotion) || [])
          ];
          allThemesAndEmotions.forEach(item => {
            const lowerItem = item.toLowerCase();
            THERAPEUTIC_THEME_CATEGORIES.forEach(category => {
              if (!matchedCategoriesForEntry.has(category.id) && category.keywords.some(kw => lowerItem.includes(kw))) {
                themeCounts[category.id] = (themeCounts[category.id] || 0) + 1;
                matchedCategoriesForEntry.add(category.id);
              }
            });
          });
        }
    });

    for (const dateKey in entriesByLocalDay) {
        const entriesForTheDay = entriesByLocalDay[dateKey];
        const latestAnalyzedEntry = entriesForTheDay
            .filter(e => e.analysis?.sentiment)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (latestAnalyzedEntry?.analysis?.sentiment) {
            const sentiment = latestAnalyzedEntry.analysis.sentiment;
            data[dateKey] = { sentiment: sentiment, emoji: MOOD_EMOJIS[sentiment] };
        } else if (entriesForTheDay.length > 0 && !data[dateKey]) { // Has entries but none analyzed
            data[dateKey] = { sentiment: undefined, emoji: undefined }; 
        }
    }
    
    setMoodCalendarData(data);
    setTherapeuticThemeCounts(themeCounts);
    setMoodGraphData(prepareMoodGraphData(entries, localDateFormatter));
    setIsLoadingMoodGraph(false);
  }, [entries, prepareMoodGraphData, localDateFormatter]);

  const sortedTherapeuticThemes = Object.entries(therapeuticThemeCounts)
    .map(([id, count]) => {
      const categoryInfo = THERAPEUTIC_THEME_CATEGORIES.find(cat => cat.id === id);
      return {
        id,
        displayName: categoryInfo?.displayName || 'Unknown Theme',
        icon: categoryInfo?.icon,
        count
      };
    })
    .sort((a,b) => b.count - a.count)
    .slice(0, 10);

  const changeDisplayMonth = (offset: number) => setCurrentDisplayMonth(prev => {
    const newDate = new Date(prev); newDate.setMonth(newDate.getMonth() + offset); return newDate;
  });

  return (
    <div className="space-y-8">
      <AnimatedDiv className="bg-purple-100 p-4 rounded-lg shadow-md border border-purple-300" delay={0}>
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-purple-700">Provider View Simulation</h2>
                <p className="text-sm text-purple-600">
                Viewing dashboard for user (as per shared data). Email: {doctorSettings.providerEmail || 'N/A'}
                </p>
            </div>
            <Button onClick={() => navigate('/settings')} variant="secondary" size="sm">
                <i className="fas fa-times mr-2"></i>Exit Provider View
            </Button>
        </div>
      </AnimatedDiv>

      <BadgesDisplay earnedBadgeIds={earnedBadges} allBadges={BADGE_DEFINITIONS} isProviderView={true} />
      
      {doctorSettings.shareMoodTrends ? (
        <MoodGraph data={moodGraphData} isLoading={isLoadingMoodGraph} />
      ) : (
         <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg text-slate-500 italic">
          Mood graph / trend data is not shared by the user.
        </AnimatedDiv>
      )}

      {doctorSettings.shareMoodTrends && (
        <DashboardMoodCalendar 
          moodCalendarData={moodCalendarData}
          currentDisplayMonth={currentDisplayMonth}
          onChangeDisplayMonth={changeDisplayMonth}
          localDateFormatter={localDateFormatter}
        />
      )}
      {!doctorSettings.shareMoodTrends && !isLoadingMoodGraph && moodGraphData.length > 0 && ( 
        <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg text-slate-500 italic">
          Mood calendar view is not shared by the user.
        </AnimatedDiv>
      )}

      {doctorSettings.shareThemes && (
        <DashboardThemesDisplay sortedTherapeuticThemes={sortedTherapeuticThemes} />
      )}
       {!doctorSettings.shareThemes && (
        <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg text-slate-500 italic">
          Key therapeutic themes are not shared by the user.
        </AnimatedDiv>
      )}
      
      {(doctorSettings.shareSummary || doctorSettings.shareMoodTrends) && (
         <DashboardEmotionalTrends entries={entries} />
      )}
      {!(doctorSettings.shareSummary || doctorSettings.shareMoodTrends) && (
         <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg text-slate-500 italic">
          Detailed emotional trends are not shared by the user.
        </AnimatedDiv>
      )}

      <AnimatedDiv className="mt-6 p-4 bg-slate-100 rounded-lg text-center">
        <p className="text-xs text-slate-600">
          This is a simulated view. In a real application, data access would be managed by secure backend systems and user consent.
          Full journal entry texts are never shared in this model.
        </p>
      </AnimatedDiv>
    </div>
  );
};

export default ProviderDashboardPage;

import React from 'react';
import { JournalEntry } from './types';
import { CORE_DAILY_EMOTIONS, EMOTION_COLORS } from './constants';
import { AnimatedDiv } from './uiComponents';

interface DashboardEmotionalTrendsProps {
  entries: JournalEntry[];
}

const DashboardEmotionalTrends: React.FC<DashboardEmotionalTrendsProps> = ({ entries }) => {
  const allDisplayableEmotions = CORE_DAILY_EMOTIONS;

  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={150}>
      <h3 className="text-xl font-semibold mb-4 text-blue-600">Emotional Trends (Overall Averages)</h3>
      <p className="text-slate-600 text-xs mb-2">Simple average of detected emotion scores (intensity &gt; 5%) across all individual entries.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {allDisplayableEmotions.map(emotion => {
          const relevantEntries = entries.filter(entry => entry.analysis?.emotions.some(em => em.emotion === emotion && em.score > 0.05));
          if(relevantEntries.length === 0) return null;
          const totalScore = relevantEntries.reduce((sum, entry) => (sum + (entry.analysis?.emotions.find(em => em.emotion === emotion)?.score || 0)), 0);
          const averageScore = totalScore / relevantEntries.length;
          return averageScore > 0.05 ? (
            <div key={emotion} className={`p-2 rounded-md shadow-sm flex flex-col items-center justify-center transform transition-transform duration-150 hover:scale-105 ${EMOTION_COLORS[emotion]?.replace('text-', 'bg-').replace('-500', '-100')} ${EMOTION_COLORS[emotion] || EMOTION_COLORS.Default}`}>
              <span className="font-semibold text-sm">{emotion}</span>
              <span className="text-xs">Avg. {(averageScore * 100).toFixed(0)}%</span>
            </div>
          ) : null;
        }).filter(Boolean).length === 0 && <p className="text-slate-600 col-span-full italic">Not enough data for emotional trends. Analyze more entries to see averages.</p>}
      </div>
    </AnimatedDiv>
  );
};

export default DashboardEmotionalTrends;

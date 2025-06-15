import React from 'react';
import { AnimatedDiv } from './uiComponents';

interface DashboardThemesDisplayProps {
  sortedTherapeuticThemes: Array<{
    id: string;
    displayName: string;
    icon?: string;
    count: number;
  }>;
}

const DashboardThemesDisplay: React.FC<DashboardThemesDisplayProps> = ({ sortedTherapeuticThemes }) => {
  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={100}>
      <h3 className="text-xl font-semibold mb-4 text-emerald-600">Key Therapeutic Themes (Last 30 days)</h3>
      {sortedTherapeuticThemes.length > 0 ? (
        <div className="space-y-3">
          {sortedTherapeuticThemes.map(theme => (
            <div key={theme.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] transform">
              <span className="text-slate-700 flex items-center">
                {theme.icon && <i className={`${theme.icon} mr-3 text-lg w-5 text-center text-blue-500`}></i>}
                {theme.displayName}
              </span>
              <span className="text-sm text-blue-600 font-semibold bg-blue-100 px-2.5 py-1 rounded-full">{theme.count} {theme.count === 1 ? 'mention' : 'mentions'}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-slate-600 italic">No prominent therapeutic themes identified in your entries from the last 30 days. Keep journaling to see trends emerge!</p>}
    </AnimatedDiv>
  );
};

export default DashboardThemesDisplay;

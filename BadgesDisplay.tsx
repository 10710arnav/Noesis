
import React from 'react';
import { Badge } from './types';
import { BADGE_DEFINITIONS } from './constants';
import { AnimatedDiv } from './uiComponents';

interface BadgesDisplayProps {
  earnedBadgeIds: string[];
  allBadges?: Badge[]; // For provider view to show all, earned or not. Defaults to BADGE_DEFINITIONS.
  isProviderView?: boolean;
}

const BadgesDisplay: React.FC<BadgesDisplayProps> = ({ earnedBadgeIds, allBadges = BADGE_DEFINITIONS, isProviderView = false }) => {
  // badgesToRender will be allBadges, which defaults to BADGE_DEFINITIONS (our 6 constant badges)
  const badgesToRender = allBadges;

  // This specific message is for provider view if the user has 0 earned badges from the entire list.
  // The user view will always show the 6 stubs.
  if (isProviderView && earnedBadgeIds.length === 0 && badgesToRender.length > 0) {
    return (
      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={50}>
        <h3 className="text-xl font-semibold mb-4 text-amber-600 flex items-center">
          <i className="fas fa-trophy mr-2 text-amber-500"></i> User's Achievements
        </h3>
        <p className="col-span-full text-slate-500 italic">User has not earned any badges yet.</p>
      </AnimatedDiv>
    );
  }
  
  // If BADGE_DEFINITIONS is somehow empty (should not happen with constants), handle gracefully.
  if (badgesToRender.length === 0) {
     return (
      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={isProviderView ? 50 : 200}>
        <h3 className="text-xl font-semibold mb-3 text-amber-600 flex items-center">
            <i className="fas fa-trophy mr-2 text-amber-500"></i> {isProviderView ? "User's Achievements" : "Your Achievements"}
        </h3>
        <p className="text-slate-500 italic">No badges are currently defined.</p>
      </AnimatedDiv>
    );
  }
  
  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={isProviderView ? 50 : 200}>
      <h3 className="text-xl font-semibold mb-4 text-amber-600 flex items-center">
        <i className="fas fa-trophy mr-2 text-amber-500"></i> 
        {isProviderView ? "User's Achievements" : "Your Achievements"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {badgesToRender.map((badge, index) => {
          const isEarned = earnedBadgeIds.includes(badge.id);
          
          let baseCardClasses = "p-4 rounded-lg shadow-md flex flex-col items-center text-center border-2 transition-all duration-200";
          let badgeStyleClasses = "";
          let iconStyleClasses = `${badge.icon} text-4xl mb-3`;

          if (isEarned) {
            badgeStyleClasses = badge.color || 'bg-amber-300 text-amber-700 border-amber-400'; // Default earned color
            // Icon color is derived from badgeStyleClasses (text-amber-700 part)
          } else {
            badgeStyleClasses = 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-70 hover:opacity-85 hover:grayscale-0 transform hover:scale-105';
            iconStyleClasses += ' text-slate-400'; // Specific muted color for unearned icon
          }

          return (
            <AnimatedDiv 
              key={badge.id} 
              className={`${baseCardClasses} ${badgeStyleClasses}`}
              delay={(isProviderView ? 50 : 100) + index * 50}
              title={isProviderView && !isEarned ? `${badge.name} (Not yet earned by user)` : (isEarned ? badge.name : `${badge.name} (Not yet earned)`)}
            >
              <i className={iconStyleClasses}></i>
              <h4 className={`text-md font-semibold mb-1 ${isEarned ? '' : 'text-slate-500'}`}>{badge.name}</h4>
              <p className={`text-xs ${isEarned ? (badge.color ? '' : 'text-amber-600') : 'text-slate-500'}`}>{badge.description}</p>
              {isProviderView && !isEarned && <p className="text-xs mt-1 italic text-slate-500">(Not Earned by User)</p>}
            </AnimatedDiv>
          );
        })}
      </div>
    </AnimatedDiv>
  );
};

export default BadgesDisplay;

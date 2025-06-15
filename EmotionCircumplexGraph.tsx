
import React from 'react';
import { EmotionScore, EmotionValenceArousal } from './types';
import { EMOTION_VALENCE_AROUSAL_MAP, EMOTION_HEX_COLORS } from './constants';
import { AnimatedDiv } from './uiComponents';

interface EmotionCircumplexGraphProps {
  emotions: EmotionScore[];
}

const EmotionCircumplexGraph: React.FC<EmotionCircumplexGraphProps> = ({ emotions }) => {
  const graphSize = 220; // Diameter of the main circle
  const padding = 30; // Padding around the graph for labels
  const svgSize = graphSize + padding * 2;
  const center = svgSize / 2;
  const radius = graphSize / 2;

  const plottedEmotions = emotions
    .map(em => {
      const va = EMOTION_VALENCE_AROUSAL_MAP[em.emotion] || EMOTION_VALENCE_AROUSAL_MAP.Default;
      if (va.valence === 0 && va.arousal === 0 && em.emotion !== 'Default') { // Only plot known emotions
        // console.warn(`No V-A mapping for emotion: ${em.emotion}`);
        return null;
      }
      return {
        ...em,
        x: center + va.valence * radius,
        y: center - va.arousal * radius, // SVG Y is inverted
        color: EMOTION_HEX_COLORS[em.emotion] || EMOTION_HEX_COLORS.Default,
      };
    })
    .filter(Boolean) as (EmotionScore & { x: number; y: number; color: string })[];

  if (plottedEmotions.length === 0) {
    return <p className="text-sm text-slate-500 italic mt-2">No specific emotions with known Valence/Arousal values to display on the circumplex graph.</p>;
  }

  return (
    <AnimatedDiv className="mt-4" delay={50}>
      <h4 className="text-md font-semibold text-blue-600 mb-2">Emotional Landscape (Circumplex Model)</h4>
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full max-w-xs mx-auto" aria-labelledby="circumplex-title">
        <title id="circumplex-title">Circumplex model graph showing emotion valence and arousal.</title>
        {/* Background Quadrant Colors (Subtle) */}
        <rect x={center} y={padding} width={radius} height={radius} fill="#e0f2fe" opacity="0.3" /> {/* Pleasant, High Arousal (e.g., sky-100) */}
        <rect x={padding} y={padding} width={radius} height={radius} fill="#fecaca" opacity="0.3" /> {/* Unpleasant, High Arousal (e.g., red-100) */}
        <rect x={padding} y={center} width={radius} height={radius} fill="#f3e8ff" opacity="0.3" /> {/* Unpleasant, Low Arousal (e.g., purple-100) */}
        <rect x={center} y={center} width={radius} height={radius} fill="#dcfce7" opacity="0.3" /> {/* Pleasant, Low Arousal (e.g., green-100) */}

        {/* Main Circle Outline */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#cbd5e1" strokeWidth="1" /> {/* slate-300 */}
        
        {/* Axes */}
        <line x1={padding} y1={center} x2={svgSize - padding} y2={center} stroke="#94a3b8" strokeWidth="1" /> {/* Valence Axis (slate-400) */}
        <line x1={center} y1={padding} x2={center} y2={svgSize - padding} stroke="#94a3b8" strokeWidth="1" /> {/* Arousal Axis (slate-400) */}

        {/* Axes Labels */}
        <text x={svgSize - padding + 5} y={center} dy="0.32em" textAnchor="start" fontSize="10" fill="#475569">Pleasant</text> {/* slate-600 */}
        <text x={padding - 5} y={center} dy="0.32em" textAnchor="end" fontSize="10" fill="#475569">Unpleasant</text>
        <text x={center} y={padding - 8} textAnchor="middle" fontSize="10" fill="#475569">High Arousal</text>
        <text x={center} y={svgSize - padding + 15} textAnchor="middle" fontSize="10" fill="#475569">Low Arousal</text>

        {/* Emotion Points */}
        {plottedEmotions.map(em => (
          <circle
            key={em.emotion}
            cx={em.x}
            cy={em.y}
            r={3 + em.score * 4} // Size based on intensity
            fill={em.color}
            opacity={0.7 + em.score * 0.3} // Opacity based on intensity
            stroke="#FFFFFF"
            strokeWidth="0.5"
          >
            <title>{`${em.emotion} (Score: ${(em.score * 100).toFixed(0)}%, V: ${EMOTION_VALENCE_AROUSAL_MAP[em.emotion]?.valence || 0}, A: ${EMOTION_VALENCE_AROUSAL_MAP[em.emotion]?.arousal || 0})`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-xs text-slate-500 mt-2 text-center">Dots represent emotions. Size/opacity indicates intensity. Position shows pleasantness (left/right) and energy level (up/down).</p>
    </AnimatedDiv>
  );
};

export default EmotionCircumplexGraph;

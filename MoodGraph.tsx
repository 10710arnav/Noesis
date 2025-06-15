
import React from 'react';
import { MoodGraphDataPoint, Sentiment } from './types';
import { MOOD_TEXT_COLORS } from './constants'; // MOOD_COLORS is not directly used for SVG fills here, direct hex preferred.
import { AnimatedDiv } from './uiComponents';

interface MoodGraphProps {
  data: MoodGraphDataPoint[];
  isLoading?: boolean;
}

const AXIS_LABEL_FONT_SIZE = 8;
const AXIS_TITLE_FONT_SIZE = 9;
const TEXT_COLOR_MUTED = "text-slate-500";
const TEXT_COLOR_NORMAL = "text-slate-600";
const GRID_LINE_COLOR = "#e2e8f0"; // slate-200
const DATA_LINE_COLOR = "#6D28D9"; // purple-700 (darker for better definition)

const getSentimentHexColor = (sentiment: Sentiment): string => {
  if (sentiment === Sentiment.Positive) return '#4ade80'; // Tailwind green-400
  if (sentiment === Sentiment.Negative) return '#f43f5e'; // Tailwind rose-500
  if (sentiment === Sentiment.Neutral) return '#60a5fa';  // Tailwind sky-400
  return '#94a3b8'; // Tailwind slate-400 for default/unknown
};


const MoodGraph: React.FC<MoodGraphProps> = ({ data, isLoading }) => {
  const graphHeight = 200;
  const graphWidth = 500;
  const padding = { top: 15, right: 15, bottom: 40, left: 55 }; // Adjusted padding
  const innerWidth = graphWidth - padding.left - padding.right;
  const innerHeight = graphHeight - padding.top - padding.bottom;

  const yTicks = [
    { value: 1, label: "Positive", sentimentVal: Sentiment.Positive },
    { value: 0, label: "Neutral", sentimentVal: Sentiment.Neutral },
    { value: -1, label: "Negative", sentimentVal: Sentiment.Negative }, // Removed leading space
  ];
  const yScale = (value: number) => innerHeight - ((value + 1) / 2) * innerHeight;

  const numXLabelsTarget = 5;
  let xTickValues: MoodGraphDataPoint[] = [];
  if (data.length > 1) {
    const indices = new Set<number>();
    // Ensure first and last points are included as labels if possible
    indices.add(0);
    indices.add(data.length - 1);

    // Add intermediate points
    if (data.length > 2) {
      for (let i = 1; i < numXLabelsTarget -1; i++) {
        const p = i / (numXLabelsTarget -1);
        indices.add(Math.floor(p * (data.length -1)));
      }
    }
    
    // Sort unique indices and map to data points
    xTickValues = Array.from(indices)
                        .sort((a,b) => a - b)
                        .map(idx => data[idx])
                        .filter(Boolean); // Filter out undefined if data length was small
    // Deduplicate if first/last are the same due to small data length
     xTickValues = Array.from(new Map(xTickValues.map(item => [item.date, item])).values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  } else if (data.length === 1) {
    xTickValues = [data[0]];
  }


  return (
    <AnimatedDiv className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto custom-scrollbar" delay={200}>
      <h3 className="text-xl font-semibold mb-4 text-blue-600">Mood Trend (Last 30 Days)</h3>
      <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full min-w-[450px]" aria-labelledby="mood-graph-title" aria-describedby="mood-graph-description">
        <title id="mood-graph-title">Mood Trend</title>
        <desc id="mood-graph-description">Line graph showing mood trend over the last 30 days. Y-axis represents mood (Positive, Neutral, Negative). X-axis represents date.</desc>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y-Axis Grid Lines and Labels */}
          {yTicks.map(tick => (
            <g key={tick.value} role="presentation">
              <line
                x1={0}
                y1={yScale(tick.value)}
                x2={innerWidth}
                y2={yScale(tick.value)}
                stroke={GRID_LINE_COLOR}
                strokeDasharray="2,2"
                aria-hidden="true"
              />
              <text
                x={-8} // Position further left
                y={yScale(tick.value)}
                dy="0.32em"
                textAnchor="end"
                fontSize={AXIS_LABEL_FONT_SIZE}
                className={`fill-current ${MOOD_TEXT_COLORS[tick.sentimentVal] || TEXT_COLOR_MUTED}`}
                aria-hidden="true"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* X-Axis Tick Labels */}
          {xTickValues.map((d, i) => {
            const dataIndex = data.findIndex(item => item.date === d.date);
            if (dataIndex === -1) return null;
            const xPos = data.length > 1 ? (dataIndex / (data.length - 1)) * innerWidth : innerWidth / 2;


            const parts = d.date.split('-'); 
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;

            return (
              <text
                key={`x-label-${i}`}
                x={xPos}
                y={innerHeight + 15} // Adjusted y position
                textAnchor="middle"
                fontSize={AXIS_LABEL_FONT_SIZE}
                className={`fill-current ${TEXT_COLOR_MUTED}`}
                aria-hidden="true"
              >
                {formattedDate}
              </text>
            );
          })}
          {/* X-Axis Title */}
          <text 
            x={innerWidth / 2} 
            y={innerHeight + 30} // Adjusted y position
            textAnchor="middle" 
            fontSize={AXIS_TITLE_FONT_SIZE}
            className={`fill-current ${TEXT_COLOR_NORMAL} font-medium`}
            aria-hidden="true"
          >
            Date (Last 30 Days)
          </text>


          {/* Conditional Content: Loading, No Data, or Graph */}
          {isLoading ? (
            <text
              x={innerWidth / 2}
              y={innerHeight / 2}
              textAnchor="middle"
              dy="0.32em"
              fontSize="10"
              className={`fill-current ${TEXT_COLOR_MUTED} animate-pulse`}
              role="status"
              aria-live="polite"
            >
              Loading mood data...
            </text>
          ) : data.length < 2 ? (
            <text
              x={innerWidth / 2}
              y={innerHeight / 2}
              textAnchor="middle"
              dy="0.32em"
              fontSize="10"
              className={`fill-current ${TEXT_COLOR_MUTED}`}
              role="status"
              aria-live="polite"
            >
              {data.length === 1 ? "Only one day of data. Need more for a trend." : "Not enough mood data to display a trend."}
            </text>
          ) : (
            <>
              {(() => {
                const points = data.map((d, i) => {
                  const x = (i / (data.length - 1)) * innerWidth;
                  const y = yScale(d.moodValue);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke={DATA_LINE_COLOR}
                      strokeWidth="1.5" // Thinner line
                      points={points}
                      aria-label="Mood trend line"
                    />
                    {data.map((d, i) => {
                      const x = (i / (data.length - 1)) * innerWidth;
                      const y = yScale(d.moodValue);
                      const dateParts = d.date.split('-');
                      const displayDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
                      return (
                        <circle
                          key={d.date}
                          cx={x}
                          cy={y}
                          r="3" // Smaller points
                          fill={getSentimentHexColor(d.sentiment)}
                          stroke="#fff"
                          strokeWidth="1" // Thinner stroke
                          role="img"
                          aria-label={`Data point for ${displayDate}, Mood: ${d.sentiment}`}
                        >
                          <title>{`Date: ${displayDate}, Mood: ${d.sentiment}`}</title>
                        </circle>
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
        </g>
      </svg>
    </AnimatedDiv>
  );
};

export default MoodGraph;

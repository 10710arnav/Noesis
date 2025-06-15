
export enum Sentiment {
  Positive = "Positive",
  Negative = "Negative",
  Neutral = "Neutral",
}

export interface EmotionScore {
  emotion: string;
  score: number; // 0-1
}

export interface CognitiveDistortion {
  distortion: string;
  snippet: string;
  explanation?: string;
}

export interface JournalEntryAnalysis {
  sentiment: Sentiment;
  emotions: EmotionScore[];
  themes: string[];
  cognitiveDistortions: CognitiveDistortion[];
  summary?: string;
  friendlyFeedback?: string;
  completedChecklistItems?: string[]; // Array of IDs of completed social good checklist items
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  text: string;
  audioUrl?: string; // If voice note was saved
  analysis?: JournalEntryAnalysis;
}

// --- Interactive Wellness Suggestion Props ---
export interface AmbientSoundOption {
  name: string; // e.g., "Ocean Waves", "Rain Sounds"
  src: string;  // URL to the audio file
}

export interface MeditationInteractiveProps {
  type: 'meditation';
  durationSeconds: number;
  steps: string[];
  ambientSounds?: AmbientSoundOption[]; // Array of sound options
}

export interface BreathingInteractiveProps {
  type: 'breathing';
  patternName: string; // e.g., "4-7-8", "Box Breathing"
  inhale: number;
  hold?: number; 
  exhale: number;
  holdAfterExhale?: number; 
  repetitions: number;
  visualCue?: 'circle' | 'bar';
  ambientSounds?: AmbientSoundOption[]; // Array of sound options
}

export interface GenericContentInteractiveProps {
  type: 'generic'; // For suggestions like gratitude list, journaling prompts
  contentTitle: string;
  contentSteps: string[];
}
// --- End Interactive Wellness Suggestion Props ---


export interface WellnessSuggestion {
  id: string;
  title: string;
  description: string;
  type: "meditation" | "breathing" | "grounding" | "gratitude" | "activity" | "affirmation" | "cbt" | "release" | "social-awareness" | "community-action";
  icon?: string; // FontAwesome icon class
  content?: string; // Original simple content, can be deprecated or used as fallback
  interactiveProps?: MeditationInteractiveProps | BreathingInteractiveProps | GenericContentInteractiveProps;
}

export interface DoctorShareSettings {
  isConnected: boolean;
  providerEmail?: string;
  shareSummary: boolean;
  shareThemes: boolean;
  shareMoodTrends: boolean;
  alertOnCrisis: boolean; // If AI detects crisis, alert doctor
}

// For single entry AI analysis
export interface SingleEntryAiResponse {
  sentiment: Sentiment;
  emotions: EmotionScore[];
  themes: string[];
  cognitiveDistortions: CognitiveDistortion[];
  summary: string;
  friendlyFeedback: string;
  completedChecklistItems?: string[]; // Array of IDs of completed social good checklist items
}

// For daily log AI analysis
export interface DailyLogAiResponse {
  overallSentiment: Sentiment;
  dominantEmotions: EmotionScore[]; // Top emotions for the day
  dailyThemes: string[]; // Consolidated themes
  dailySummaryText: string;
}

// Union type for AI service responses
export type AiAnalysisResponse = SingleEntryAiResponse | DailyLogAiResponse;


// Structure for the processed daily log analysis
export interface DailyLogAnalysis {
  overallSentiment: Sentiment;
  dominantEmotions: EmotionScore[];
  dailyThemes: string[];
  dailySummaryText: string;
  // Potentially: wellnessSuggestions?: WellnessSuggestion[];
}

// --- Chatbot ---
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  isLoading?: boolean;
}

// --- Daily Checklist ---
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  aiCompleted?: boolean; // Flag if AI marked this as complete
}

// --- Badges ---
export interface BadgeRequirement {
  days: number; // Number of days required
  type: 'consecutive_all_items' | 'total_all_items_in_period'; // Type of requirement
  periodDays?: number; // For 'total_all_items_in_period', e.g., 30 for "within 30 days"
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // FontAwesome icon class
  requirement: BadgeRequirement;
  color?: string; // Tailwind color class for badge accent
}

// --- Mood Graph ---
export interface MoodGraphDataPoint {
  date: string; // YYYY-MM-DD
  moodValue: number; // e.g., Positive: 1, Neutral: 0, Negative: -1
  sentiment: Sentiment; // Original sentiment for coloring/tooltip
}

// --- Circumplex Model ---
export interface EmotionValenceArousal {
  valence: number; // -1 (unpleasant) to +1 (pleasant)
  arousal: number; // -1 (low energy/calm) to +1 (high energy/excited)
}

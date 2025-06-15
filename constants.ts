
import { WellnessSuggestion, AmbientSoundOption, Sentiment, ChecklistItem, Badge, EmotionValenceArousal } from './types';

export const GUIDED_PROMPTS: string[] = [
  "What was the high point and low point of your day?",
  "Describe a challenge you faced today and how you handled it.",
  "What are three things you are grateful for right now?",
  "How are you feeling physically and emotionally at this moment?",
  "What's one thing you learned today, about yourself or the world?",
  "Is there anything you're worrying about? Write it down.",
  "What's a small act of kindness you witnessed or performed today?",
  "Reflect on a moment today when you felt truly present.",
  "What is one thing you could do tomorrow to make it a better day?",
  "Describe something beautiful you noticed today."
];

export const DAILY_AFFIRMATIONS: string[] = [
  "I am capable of amazing things.",
  "I choose to find joy in the ordinary.",
  "I am resilient and can handle whatever comes my way.",
  "Today is a new opportunity for growth and happiness.",
  "I am grateful for the good in my life.",
  "I approach this day with a positive attitude.",
  "I am worthy of love and respect.",
  "I embrace challenges as chances to learn.",
  "My potential is limitless.",
  "I radiate positivity and attract good things.",
  "I am in control of my thoughts and actions.",
  "I trust the journey, even when I don't understand it.",
  "Every day, in every way, I am getting better and better.",
  "I am enough, just as I am.",
  "I choose peace over worry.",
  "I am creating a life I love.",
  "I believe in my ability to succeed.",
  "My mind is filled with positive thoughts.",
  "I am strong, I am confident, I am happy.",
  "I give myself permission to shine."
];


const DEFAULT_AMBIENT_SOUNDS: AmbientSoundOption[] = [
  { name: "Gentle Ambient", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Rain Sounds", src: "https://www.soundjay.com/nature/rain-07.mp3" }, 
  { name: "Birdsong", src: "https://www.soundjay.com/nature/birds-04.mp3" } 
];

export const PREDEFINED_WELLNESS_SUGGESTIONS: WellnessSuggestion[] = [
  { 
    id: 'ws1', 
    title: 'Calming Anxiety Meditation', 
    description: 'A 5-minute guided meditation to ease anxiety.', 
    type: 'meditation', 
    icon: 'fas fa-brain', 
    content: 'Find a quiet space, sit comfortably, and focus on your breath. Let thoughts pass without judgment.',
    interactiveProps: {
      type: 'meditation',
      durationSeconds: 300, // 5 minutes
      steps: [
        "Find a quiet, comfortable position, either sitting or lying down.",
        "Gently close your eyes, or maintain a soft gaze downwards.",
        "Bring your attention to your breath. Notice the sensation of air entering your nostrils and filling your lungs.",
        "Observe the natural rhythm of your breath without trying to change it.",
        "If your mind wanders, gently acknowledge the thought and bring your focus back to your breath.",
        "Continue this for the duration of the meditation, allowing yourself to relax deeper with each exhale."
      ],
      ambientSounds: DEFAULT_AMBIENT_SOUNDS
    }
  },
  { 
    id: 'ws2', 
    title: '4-7-8 Breathing Technique', 
    description: 'A simple technique to promote calm: Inhale for 4s, hold for 7s, exhale for 8s.', 
    type: 'breathing', 
    icon: 'fas fa-wind',
    content: 'This rhythmic breathing can help reduce anxiety and promote relaxation. Focus on maintaining the count.',
    interactiveProps: {
      type: 'breathing',
      patternName: '4-7-8 Breathing',
      inhale: 4,
      hold: 7,
      exhale: 8,
      repetitions: 5,
      visualCue: 'circle',
    }
  },
  { 
    id: 'ws3', 
    title: 'Grounding: 5-4-3-2-1', 
    description: 'Engage your senses to anchor yourself in the present moment.', 
    type: 'grounding', 
    icon: 'fas fa-anchor',
    content: 'Look around. Name 5 things you can see. Then, 4 things you can physically feel. 3 things you can hear. 2 things you can smell. Finally, 1 thing you can taste.',
    interactiveProps: {
        type: 'generic',
        contentTitle: '5-4-3-2-1 Grounding Exercise',
        contentSteps: [
            "Take a deep breath to begin.",
            "Acknowledge 5 things you see around you. (e.g., 'I see the blue sky', 'I see my hands', 'I see a plant').",
            "Acknowledge 4 things you can touch around you. (e.g., 'I feel the texture of my clothes', 'I feel the chair beneath me').",
            "Acknowledge 3 things you can hear. Focus on external sounds. (e.g., 'I hear birds chirping', 'I hear distant traffic').",
            "Acknowledge 2 things you can smell. (e.g., 'I smell coffee brewing', 'I smell fresh air'). If you can\'t smell anything, name your two favorite smells.",
            "Acknowledge 1 thing you can taste. (e.g., 'I taste mint from my toothpaste', 'I taste the water I just drank'). If you can\'t taste anything, name your favorite taste.",
            "End with another deep breath."
        ]
    }
  },
  { 
    id: 'ws4', 
    title: 'Gratitude List', 
    description: 'List three small things that went well or you appreciate today.', 
    type: 'gratitude', 
    icon: 'fas fa-smile-beam',
    content: 'Reflecting on positive aspects of your day can shift your perspective and improve mood.',
    interactiveProps: {
        type: 'generic',
        contentTitle: 'Daily Gratitude Reflection',
        contentSteps: [
            "Take a moment to reflect on your day, or the past 24 hours.",
            "Think of three things, no matter how small, for which you are grateful.",
            "Examples: 'A warm cup of coffee', 'A kind word from someone', 'The sun shining'.",
            "You can write them down or simply hold them in your mind.",
            "Consider why you are grateful for each item."
        ]
    }
  },
  { id: 'ws5', title: 'Short Walk & Music', description: 'A 10-minute walk can boost your mood. Listen to something uplifting.', type: 'activity', icon: 'fas fa-walking', content: 'Consider a brief walk. Fresh air and movement can make a big difference. Pair it with an inspiring podcast or your favorite music.'},
  { id: 'ws6', title: 'Positive Affirmations', description: 'Repeat kind and empowering statements to yourself.', type: 'affirmation', icon: 'fas fa-bullhorn', content: 'Examples: "I am capable." "I am worthy of peace." "I can handle challenges." "I choose to be kind to myself."'},
  { 
    id: 'ws7', 
    title: 'Challenge That Thought (CBT)', 
    description: 'Question a negative thought: Is it 100% true? What\'s another perspective?', 
    type: 'cbt', 
    icon: 'fas fa-comments',
    content: 'Identify a specific negative thought you\'ve had. Ask: What evidence supports this thought? What evidence contradicts it? Is there a more balanced or compassionate way to view this situation?',
    interactiveProps: {
        type: 'generic',
        contentTitle: 'Challenge Negative Thoughts',
        contentSteps: [
            "Identify a negative thought you\'re experiencing.",
            "Write it down or say it aloud.",
            "Ask yourself: What is the evidence FOR this thought? Be objective.",
            "Ask yourself: What is the evidence AGAINST this thought? Be equally objective.",
            "Are there any unhelpful thinking styles (cognitive distortions) at play? (e.g., catastrophizing, mind-reading).",
            "What would you tell a friend who had this thought in a similar situation?",
            "Can you develop a more balanced or realistic thought based on this reflection?"
        ]
    }
  },
  { id: 'ws8', title: 'Journal Release', description: 'Write a letter to the source of your anger/frustration. No need to send it.', type: 'release', icon: 'fas fa-feather-alt', content: 'Freely express your feelings about the situation or person. This is for your eyes only, to help process and release the emotions.'},
  { 
    id: 'ws9', 
    title: 'Empathy Expansion', 
    description: "Step into someone else's shoes to understand their feelings and perspective.", 
    type: 'social-awareness', 
    icon: 'fas fa-user-friends', // Changed icon
    interactiveProps: {
        type: 'generic',
        contentTitle: 'Empathy Expansion Exercise',
        contentSteps: [
            "Think of someone you interacted with today, or someone whose situation is different from yours.",
            "Try to imagine what their day might have been like from their point of view.",
            "What challenges might they be facing that you aren't aware of?",
            "What joys or successes might they be experiencing?",
            "How might their background or experiences shape their current perspective?",
            "Reflect on one small way you could show more understanding or support towards them or others like them."
        ]
    }
  },
  { 
    id: 'ws10', 
    title: 'Community Connection Idea', 
    description: "Brainstorm one way to contribute positively to your local community or a cause you care about.", 
    type: 'community-action', 
    icon: 'fas fa-hands-helping',
    interactiveProps: {
        type: 'generic',
        contentTitle: 'My Community Connection Idea',
        contentSteps: [
            "What is a local need or a cause you feel passionate about (e.g., environment, animal welfare, supporting a local group)?",
            "Think of one small, actionable step you could take this week. It could be researching local organizations, donating a small item, or sharing information.",
            "How would this action, however small, contribute to the greater good?",
            "Write down your idea and one tiny step to get started."
        ]
    }
  }
];

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

export const COGNITIVE_DISTORTION_EXPLANATIONS: Record<string, string> = {
  "Catastrophizing": "Exaggerating the potential negative consequences of an event, seeing it as a catastrophe.",
  "Black-and-White Thinking": "Seeing things in absolute, all-or-nothing terms, with no middle ground.",
  "Mind Reading": "Assuming you know what others are thinking, usually negatively, without direct evidence.",
  "Overgeneralization": "Drawing broad conclusions based on a single event or piece of evidence.",
  "Personalization": "Believing you are responsible for events that are outside your control.",
  "Should Statements": "Having rigid rules about how you or others should behave, and feeling guilty or resentful when these rules are broken.",
  "Emotional Reasoning": "Believing something is true because you feel it strongly, ignoring evidence to the contrary."
};

export const MOOD_COLORS: Record<string, string> = {
  Positive: "bg-green-400", 
  Negative: "bg-rose-400",   
  Neutral: "bg-sky-300", 
  Default: "bg-slate-300" 
};
export const MOOD_TEXT_COLORS: Record<string, string> = { 
  Positive: "text-green-800",
  Negative: "text-rose-800",
  Neutral: "text-sky-800",
  Default: "text-slate-800"
};

export const MOOD_EMOJIS: Record<Sentiment | 'Default', string> = {
  [Sentiment.Positive]: "😊",
  [Sentiment.Negative]: "😟",
  [Sentiment.Neutral]: "😐",
  Default: "🤔" 
};

export const EMOTION_COLORS: Record<string, string> = {
  Joy: "text-yellow-500", 
  Sadness: "text-blue-500",
  Anger: "text-red-500",
  Fear: "text-purple-500",
  Anxiety: "text-teal-500",
  Surprise: "text-sky-400", 
  Confidence: "text-lime-500", 
  Contentment: "text-green-500",
  Stress: "text-orange-500", 
  Hope: "text-cyan-400", 
  Frustration: "text-pink-500",
  Calm: "text-sky-500", 
  Gratitude: "text-emerald-500", 
  Fatigue: "text-slate-500",
  Optimism: "text-yellow-400", // Added
  Pessimism: "text-indigo-400", // Added
  Irritation: "text-red-400", // Added
  Excitement: "text-orange-400", // Added
  Motivation: "text-lime-400", // Added
  Apathy: "text-gray-400", // Added
  Loneliness: "text-blue-400", // Added
  Default: "text-slate-600"
};

// SVG friendly hex colors (approximating Tailwind)
export const EMOTION_HEX_COLORS: Record<string, string> = {
  Joy: "#F59E0B",          // yellow-500
  Sadness: "#3B82F6",      // blue-500
  Anger: "#EF4444",        // red-500
  Fear: "#8B5CF6",         // purple-500
  Anxiety: "#14B8A6",      // teal-500
  Surprise: "#38BDF8",     // sky-400
  Confidence: "#84CC16",   // lime-500
  Contentment: "#10B981",  // green-500
  Stress: "#F97316",       // orange-500
  Hope: "#22D3EE",         // cyan-400
  Frustration: "#EC4899",  // pink-500
  Calm: "#0EA5E9",         // sky-500
  Gratitude: "#059669",    // emerald-500
  Fatigue: "#64748B",      // slate-500
  Optimism: "#FACC15",     // yellow-400
  Pessimism: "#818CF8",    // indigo-400
  Irritation: "#F87171",   // red-400
  Excitement: "#FB923C",   // orange-400
  Motivation: "#A3E635",   // lime-400
  Apathy: "#9CA3AF",       // gray-400
  Loneliness: "#60A5FA",   // blue-400
  Default: "#475569"       // slate-600
};


export const CORE_DAILY_EMOTIONS: string[] = [
  "Joy", "Sadness", "Anger", "Fear", "Anxiety", 
  "Contentment", "Stress", "Hope", "Frustration", "Calm", 
  "Gratitude", "Fatigue", "Optimism", "Pessimism", 
  "Irritation", "Excitement", "Motivation", "Apathy", "Loneliness"
];

export interface TherapeuticThemeCategory {
  id: string;
  displayName: string;
  keywords: string[];
  icon?: string; // Optional FontAwesome icon class
}

export const THERAPEUTIC_THEME_CATEGORIES: TherapeuticThemeCategory[] = [
  { 
    id: 'anxiety_stress', 
    displayName: 'Anxiety & Stress', 
    keywords: ['anxiety', 'stress', 'worry', 'fear', 'panic', 'overwhelmed', 'nervous', 'tense', 'pressure'],
    icon: 'fas fa-bolt'
  },
  { 
    id: 'mood_depression', 
    displayName: 'Mood & Depression', 
    keywords: ['sadness', 'depression', 'low mood', 'hopeless', 'unhappy', 'gloomy', 'fatigue', 'apathy', 'down', 'empty'],
    icon: 'fas fa-cloud-rain' 
  },
  { 
    id: 'relationships', 
    displayName: 'Relationships & Social', 
    keywords: ['relationship', 'family', 'friend', 'partner', 'social', 'loneliness', 'conflict', 'communication', 'connection', 'isolation', 'argument'],
    icon: 'fas fa-users'
  },
  { 
    id: 'self_esteem', 
    displayName: 'Self-Esteem & Self-Worth', 
    keywords: ['self-esteem', 'self-worth', 'confidence', 'inadequacy', 'self-criticism', 'value', 'shame', 'insecure', 'doubt'],
    icon: 'fas fa-id-badge'
  },
  { 
    id: 'coping_resilience', 
    displayName: 'Coping & Resilience', 
    keywords: ['coping', 'resilience', 'strength', 'adapting', 'overcoming', 'dealing', 'managing', 'bounce back', 'strong'],
    icon: 'fas fa-shield-alt'
  },
  { 
    id: 'trauma_grief', 
    displayName: 'Trauma & Grief', 
    keywords: ['trauma', 'grief', 'loss', 'mourning', 'bereavement', 'past event', 'painful memory', 'sad memory'],
    icon: 'fas fa-heart-broken'
  },
  { 
    id: 'life_transitions', 
    displayName: 'Life Transitions & Change', 
    keywords: ['change', 'transition', 'new job', 'moving', 'adjustment', 'uncertainty', 'new beginning', 'different'],
    icon: 'fas fa-route'
  },
  { 
    id: 'anger_frustration', 
    displayName: 'Anger & Frustration', 
    keywords: ['anger', 'frustration', 'irritation', 'resentment', 'annoyance', 'mad', 'upset', 'annoyed'],
    icon: 'fas fa-fire-alt'
  },
  { 
    id: 'habits_behavior', 
    displayName: 'Habits & Behaviors', 
    keywords: ['habit', 'addiction', 'craving', 'pattern', 'behavior', 'procrastination', 'motivation', 'discipline', 'routine'],
    icon: 'fas fa-sync-alt'
  },
  { 
    id: 'positive_wellbeing', 
    displayName: 'Positive Wellbeing & Growth', 
    keywords: ['joy', 'gratitude', 'growth', 'achievement', 'positive', 'contentment', 'hope', 'optimism', 'happiness', 'fulfillment', 'mindfulness', 'peace', 'calm', 'proud', 'excited'],
    icon: 'fas fa-spa'
  },
  { 
    id: 'work_school', 
    displayName: 'Work & School', 
    keywords: ['work', 'school', 'career', 'study', 'project', 'deadline', 'performance', 'job', 'class', 'assignment'],
    icon: 'fas fa-briefcase'
  },
  { 
    id: 'health_body', 
    displayName: 'Health & Body Image', 
    keywords: ['health', 'body image', 'sleep', 'illness', 'physical', 'exercise', 'diet', 'weight', 'appearance', 'energy'],
    icon: 'fas fa-heartbeat'
  },
  {
    id: 'equality_social_justice',
    displayName: 'Equality & Social Justice',
    keywords: ['equality', 'fairness', 'justice', 'bias', 'diversity', 'inclusion', 'rights', 'advocacy', 'perspective', 'understanding others'],
    icon: 'fas fa-balance-scale'
  },
  {
    id: 'community_contribution',
    displayName: 'Community & Contribution',
    keywords: ['community', 'helping', 'kindness', 'volunteering', 'social good', 'environment', 'support', 'connection', 'collaboration'],
    icon: 'fas fa-hands-helping'
  }
];

export const SOCIAL_GOOD_CHECKLIST_ITEMS: Omit<ChecklistItem, 'completed' | 'aiCompleted'>[] = [
  { id: 'sg1', text: "Listened actively to someone without interrupting." },
  { id: 'sg2', text: "Learned something new about a different perspective or culture." },
  { id: 'sg3', text: "Performed a random act of kindness, big or small." },
  { id: 'sg4', text: "Reflected on a personal bias and considered how to challenge it." },
  { id: 'sg5', text: "Offered help or support to someone in my community/network." },
  { id: 'sg6', text: "Took a moment to appreciate diversity around me." },
  { id: 'sg7', text: "Made an environmentally conscious choice (e.g., reduced waste, conserved energy)." }
];


export const CHATBOT_SYSTEM_INSTRUCTION = `You are Noesis AI, a friendly, empathetic, and supportive wellness companion chatbot within a journaling app.
Your primary purpose is to help users reflect on their well-being and gently guide them towards positive actions and mindsets.
Focus on promoting these core values:
1.  **Equality and Fairness:** Encourage understanding diverse perspectives, recognizing and challenging personal biases, treating everyone with respect, and advocating for fairness.
2.  **Social Good and Community:** Inspire acts of kindness, helping others, contributing to community well-being, environmental consciousness, and collaboration for positive change.
3.  **Personal Growth and Well-being:** Support self-reflection, mindfulness, gratitude, resilience, and positive self-talk.

When a user shares their thoughts or feelings:
- Respond with empathy and validation.
- Ask open-ended questions to encourage deeper reflection.
- If appropriate, subtly connect their experiences to the core values. For example, if they mention a conflict, you might gently ask about understanding the other person's viewpoint. If they share a success, you could link it to gratitude or helping others.
- Suggest small, actionable steps related to these values.

Important:
- Do NOT give medical or psychological therapy advice. Suggest professional help if the user expresses severe distress.
- Keep responses concise, warm, and conversational (1-3 sentences is ideal).
- Use emojis sparingly to add warmth (e.g., 😊, 👍, 🌱).
- Be a good listener first and foremost.
`;

export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'empathy_expert_1',
    name: 'Empathy Explorer',
    description: 'First day with all social good acts completed!',
    icon: 'fas fa-hand-holding-heart',
    requirement: { type: 'total_all_items_in_period', days: 1, periodDays: Infinity },
    color: 'bg-emerald-400 text-emerald-800 border-emerald-500' // Added border
  },
  {
    id: 'social_advocate_3',
    name: 'Social Advocate Bronze',
    description: 'Logged 3 days with completed social good acts in a month.',
    icon: 'fas fa-award',
    requirement: { type: 'total_all_items_in_period', days: 3, periodDays: 30 },
    color: 'bg-orange-400 text-orange-800 border-orange-500' // Added border
  },
  {
    id: 'kindness_streak_7',
    name: 'Kindness Champion (7 Days)',
    description: 'Completed all social good acts for 7 consecutive days!',
    icon: 'fas fa-medal',
    requirement: { type: 'consecutive_all_items', days: 7 },
    color: 'bg-yellow-400 text-yellow-800 border-yellow-500' // Added border
  },
  {
    id: 'community_star_15',
    name: 'Community Star (15 Days)',
    description: 'Completed all social good acts on 15 total days.',
    icon: 'fas fa-star',
    requirement: { type: 'total_all_items_in_period', days: 15, periodDays: Infinity }, 
    color: 'bg-sky-400 text-sky-800 border-sky-500' // Added border
  },
  {
    id: 'journal_streak_3',
    name: 'Consistent Voice (3 Days)',
    description: 'Made a journal entry for 3 days in a row.', // Actual awarding logic not in scope
    icon: 'fas fa-calendar-check',
    requirement: { type: 'consecutive_all_items', days: 3 }, // Placeholder requirement
    color: 'bg-teal-400 text-teal-800 border-teal-500'
  },
  {
    id: 'wellness_explorer_1',
    name: 'Mindful Moment User',
    description: 'Used an interactive wellness tool.', // Actual awarding logic not in scope
    icon: 'fas fa-spa',
    requirement: { type: 'total_all_items_in_period', days: 1, periodDays: Infinity }, // Placeholder requirement
    color: 'bg-cyan-400 text-cyan-800 border-cyan-500'
  }
];

export const EMOTION_VALENCE_AROUSAL_MAP: Record<string, EmotionValenceArousal> = {
  // Positive Valence, High Arousal
  Joy: { valence: 0.8, arousal: 0.6 },
  Excitement: { valence: 0.7, arousal: 0.8 },
  Surprise: { valence: 0.4, arousal: 0.7 }, // Assuming positive surprise for this mapping
  Optimism: { valence: 0.6, arousal: 0.4 },
  Hope: { valence: 0.5, arousal: 0.3 },
  Motivation: { valence: 0.6, arousal: 0.7 },
  Confidence: { valence: 0.7, arousal: 0.5 },

  // Positive Valence, Low Arousal
  Contentment: { valence: 0.7, arousal: -0.4 },
  Calm: { valence: 0.6, arousal: -0.6 },
  Gratitude: { valence: 0.8, arousal: -0.2 },
  Relaxed: { valence: 0.7, arousal: -0.7 }, 

  // Negative Valence, High Arousal
  Anger: { valence: -0.6, arousal: 0.7 },
  Fear: { valence: -0.7, arousal: 0.6 },
  Anxiety: { valence: -0.5, arousal: 0.5 },
  Stress: { valence: -0.4, arousal: 0.6 },
  Frustration: { valence: -0.5, arousal: 0.4 },
  Irritation: { valence: -0.4, arousal: 0.3 },

  // Negative Valence, Low Arousal
  Sadness: { valence: -0.8, arousal: -0.6 },
  Fatigue: { valence: -0.4, arousal: -0.7 },
  Apathy: { valence: -0.3, arousal: -0.8 },
  Pessimism: { valence: -0.6, arousal: -0.4 },
  Loneliness: { valence: -0.7, arousal: -0.5 },
  Boredom: { valence: -0.5, arousal: -0.7 },

  // Default for unknown emotions (can be treated as neutral or ignored in graph)
  Default: { valence: 0, arousal: 0 }
};

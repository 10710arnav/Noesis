
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { JournalEntryAnalysis, SingleEntryAiResponse, DailyLogAiResponse, Sentiment, CognitiveDistortion, DailyLogAnalysis, ChatMessage as AppChatMessage } from '../types';
import { GEMINI_MODEL_TEXT, COGNITIVE_DISTORTION_EXPLANATIONS, CORE_DAILY_EMOTIONS, CHATBOT_SYSTEM_INSTRUCTION, SOCIAL_GOOD_CHECKLIST_ITEMS } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
let chatInstance: Chat | null = null;

const getChatSession = (): Chat => {
  if (!chatInstance) {
    if (!API_KEY) {
      // This case should ideally be handled by UI, but as a fallback:
      throw new Error("Gemini API key is not configured. Cannot create chat session.");
    }
    chatInstance = ai.chats.create({
      model: GEMINI_MODEL_TEXT,
      config: {
        systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
        temperature: 0.7, // Allow for some creativity in conversation
      },
    });
  }
  return chatInstance;
};


export const analyzeJournalEntry = async (entryText: string): Promise<JournalEntryAnalysis | null> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured for single entry analysis.");
    return {
        sentiment: Sentiment.Neutral,
        emotions: [{ emotion: 'Info', score: 0.8 }],
        themes: ['API Key Missing'],
        cognitiveDistortions: [],
        summary: "Could not connect to AI for analysis. API Key is missing.",
        friendlyFeedback: "It seems there's an issue connecting to the AI. Please check configuration. Remember to be kind to yourself today!",
        completedChecklistItems: []
    };
  }
  
  const socialGoodItemsForPrompt = SOCIAL_GOOD_CHECKLIST_ITEMS.map(item => ({ id: item.id, text: item.text }));

  const prompt = `
    Analyze the following journal entry. Your response MUST be a valid JSON object.
    Do not wrap the JSON in markdown (e.g. \`\`\`json ... \`\`\`).
    Identify:
    1. Overall sentiment: Choose one from "Positive", "Negative", "Neutral".
    2. Key emotions: Provide an array of objects, each with "emotion" (e.g., Joy, Sadness, Anger, Fear, Anxiety, Surprise, Confidence) and "score" (a float between 0 and 1 indicating intensity). Include up to 5 dominant emotions.
    3. Main themes or topics: Provide an array of strings (e.g., "Work Stress", "Relationship Issues", "Self-Reflection"). Limit to 3-5 key themes.
    4. Potential cognitive distortions: Provide an array of objects, each with "distortion" (e.g., "Catastrophizing", "Black-and-White Thinking", "Mind Reading"), and "snippet" (the exact text phrase from the entry that suggests this distortion). If no distortions are clear, provide an empty array.
    5. A concise summary of the entry in 1-2 sentences.
    6. Friendly Feedback: Write a short, empathetic, and supportive message (1-3 sentences). Acknowledge their feelings. If appropriate based on the entry's content, gently weave in values like generosity, kindness, helpfulness, respecting others' feelings, treating people equally, or working for the overall social good. For example, if they helped someone, acknowledge that kindness. If they faced unfairness, empathize and subtly reinforce equality. The tone should remain supportive and natural, not preachy.
    7. Completed Social Good Checklist Items: Based SOLELY on the content of the journal entry, identify which of the following social good actions were performed or strongly indicated. Return an array of their 'id' strings. If none are clearly indicated, return an empty array.
       Available actions: ${JSON.stringify(socialGoodItemsForPrompt)}

    Journal Entry:
    ---
    ${entryText}
    ---

    JSON Response Format Example:
    {
      "sentiment": "Positive",
      "emotions": [{ "emotion": "Joy", "score": 0.8 }, { "emotion": "Gratitude", "score": 0.7 }],
      "themes": ["Helping a friend", "Community Garden"],
      "cognitiveDistortions": [],
      "summary": "The user describes helping a friend and working at the community garden.",
      "friendlyFeedback": "It's wonderful that you helped your friend and contributed to the community garden! Acts of kindness make a real difference.",
      "completedChecklistItems": ["sg3", "sg5"] 
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.70, // Slightly lower temp for more factual checklist identification
        },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData: SingleEntryAiResponse = JSON.parse(jsonStr);
    
    const distortionsWithExplanations: CognitiveDistortion[] = parsedData.cognitiveDistortions.map(d => ({
        ...d,
        explanation: COGNITIVE_DISTORTION_EXPLANATIONS[d.distortion] || "A pattern of thought that may not be fully accurate or helpful."
    }));

    return {
        ...parsedData,
        cognitiveDistortions: distortionsWithExplanations,
        friendlyFeedback: parsedData.friendlyFeedback || "It's good that you're expressing your thoughts. Keep it up!", 
        completedChecklistItems: parsedData.completedChecklistItems || [],
    };

  } catch (error) {
    console.error("Error analyzing journal entry with Gemini:", error);
    let errorMessage = "AI analysis failed. Please try again later.";
    if (error instanceof Error) {
        errorMessage = `AI analysis error: ${error.message}`;
    }
    return {
        sentiment: Sentiment.Neutral,
        emotions: [],
        themes: ["Analysis Error"],
        cognitiveDistortions: [],
        summary: errorMessage,
        friendlyFeedback: "There was an issue with the AI analysis, but I'm here for you. Remember your strength and be gentle with yourself.",
        completedChecklistItems: []
    };
  }
};


export const analyzeDailyLog = async (entryTexts: string[]): Promise<DailyLogAnalysis | null> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured for daily log analysis.");
    return {
        overallSentiment: Sentiment.Neutral,
        dominantEmotions: [{ emotion: 'Info', score: 0.8 }],
        dailyThemes: ['API Key Missing'],
        dailySummaryText: "Could not connect to AI for daily analysis. API Key is missing."
    };
  }
  if (entryTexts.length === 0) {
    return null; 
  }

  const entriesString = entryTexts.map((text, index) => `Entry ${index + 1}:\n---\n${text}\n---`).join('\n\n');
  
  const coreEmotionsExampleString = `Consider emotions like: ${CORE_DAILY_EMOTIONS.join(", ")}.`;


  const prompt = `
    Analyze all the following journal entries made throughout a single day.
    Provide an overall summary and analysis for the entire day.
    Your response MUST be a valid JSON object. Do not wrap the JSON in markdown.
    Identify:
    1. Overall sentiment for the day: Choose one from "Positive", "Negative", "Neutral". This should reflect the general mood considering all entries.
    2. Dominant Emotions for the day: Based on all entries, identify up to 3-4 key emotions that best characterize the overall emotional landscape of the day. These emotions should reflect the day's general tenor or significant emotional undercurrents. For each, provide an "emotion" and a "score". The "emotion" should ideally be chosen from a list of common emotional states. ${coreEmotionsExampleString} The "score" (a float between 0 and 1) should represent the emotion's overall prominence, significance, or influence on the day, NOT just peak intensity from a single isolated event. The goal is to provide a coherent emotional snapshot of the day; avoid presenting directly opposing emotions (e.g., high Joy and high Sadness both at 0.9) as the primary overall tone unless the dailySummaryText robustly explains this specific complex balance as a key feature of the day.
    3. Main themes or topics for the day: Provide an array of strings (e.g., "Work Projects", "Family Interactions", "Personal Growth"). Limit to 3-5 key themes that represent the day.
    4. A concise summary for the entire day in 2-3 sentences. This summary should capture the essence of the day's reflections. Crucially, it should also try to explain the day's emotional journey, especially if there were significant emotional shifts, a mix of strong feelings, or if the dominant emotions require context to make sense (e.g., "The day began with optimism for a new project, but unexpected challenges led to rising stress and frustration, eventually settling into fatigue by evening. Despite the difficulties, a moment of gratitude was noted.").

    Journal Entries for the Day:
    ${entriesString}

    JSON Response Format:
    {
      "overallSentiment": "Neutral",
      "dominantEmotions": [{ "emotion": "Stress", "score": 0.7 }, { "emotion": "Hope", "score": 0.5 }],
      "dailyThemes": ["Project Deadlines", "Future Plans"],
      "dailySummaryText": "The day was marked by stress from project deadlines, but also a sense of hope regarding future plans."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.65, 
        },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData: DailyLogAiResponse = JSON.parse(jsonStr);
    
    return {
        ...parsedData,
    };

  } catch (error) {
    console.error("Error analyzing daily log with Gemini:", error);
    let errorMessage = "Daily AI analysis failed. Please try again later.";
    if (error instanceof Error) {
        errorMessage = `Daily AI analysis error: ${error.message}`;
    }
    return {
        overallSentiment: Sentiment.Neutral,
        dominantEmotions: [],
        dailyThemes: ["Daily Analysis Error"],
        dailySummaryText: errorMessage
    };
  }
};

export const getChatbotResponse = async (messageText: string): Promise<string> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured for chatbot.");
    return "I'm sorry, I can't connect to my knowledge base right now. Please ensure the API key is set up.";
  }
  try {
    const chat = getChatSession();
    const response: GenerateContentResponse = await chat.sendMessage({ message: messageText });
    return response.text;
  } catch (error) {
    console.error("Error getting chatbot response from Gemini:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      return "It seems there's an issue with the API configuration. I can't respond right now.";
    }
    // Reset chat instance if there's a persistent error with it
    if (error instanceof Error && (error.message.includes("400") || error.message.includes("500"))) {
        chatInstance = null; // Attempt to re-establish chat on next message.
    }
    return "I'm having a little trouble thinking right now. Could you try asking again in a moment?";
  }
};

export const resetChatSession = () => {
  chatInstance = null;
};

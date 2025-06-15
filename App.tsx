
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { JournalEntry, JournalEntryAnalysis, WellnessSuggestion, DoctorShareSettings, Sentiment, MeditationInteractiveProps, BreathingInteractiveProps, GenericContentInteractiveProps, DailyLogAnalysis, AmbientSoundOption, ChatMessage, ChecklistItem, Badge, MoodGraphDataPoint, EmotionScore } from './types';
import { GUIDED_PROMPTS, PREDEFINED_WELLNESS_SUGGESTIONS, MOOD_COLORS, EMOTION_COLORS, MOOD_TEXT_COLORS, CORE_DAILY_EMOTIONS, MOOD_EMOJIS, DAILY_AFFIRMATIONS, THERAPEUTIC_THEME_CATEGORIES, SOCIAL_GOOD_CHECKLIST_ITEMS, BADGE_DEFINITIONS } from './constants';
import { analyzeJournalEntry, analyzeDailyLog, getChatbotResponse, resetChatSession } from './services/geminiService';
import { AnimatedDiv, Button, LoadingSpinner, Alert } from './uiComponents';
import ProviderDashboardPage from './ProviderDashboardPage';
import DashboardMoodCalendar from './DashboardMoodCalendar';
import DashboardThemesDisplay from './DashboardThemesDisplay';
import BadgesDisplay from './BadgesDisplay';
import DashboardEmotionalTrends from './DashboardEmotionalTrends';
import MoodGraph from './MoodGraph'; 
import EmotionCircumplexGraph from './EmotionCircumplexGraph';

// Helper: Generate unique ID
const generateId = (): string => Math.random().toString(36).substr(2, 9);

// Helper: Format date for display
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'});
};

// Helper: Format date to YYYY-MM-DD for localStorage keys and consistent daily aggregation (local date based)
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


// Password Hashing
const simpleHash = async (str: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.warn("Crypto API for SHA-256 hashing not available or failed, using fallback. This is less secure.", error);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; 
    }
    return `fallback_${hash.toString()}_${str.length}`; 
  }
};

// --- Daily Affirmation Component ---
const DailyAffirmationCard: React.FC = () => {
  const [affirmation, setAffirmation] = useState('');

  useEffect(() => {
    const getDayOfYear = (date: Date): number => {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };
    const today = new Date();
    if (DAILY_AFFIRMATIONS.length > 0) {
      const dayIndex = getDayOfYear(today) % DAILY_AFFIRMATIONS.length;
      setAffirmation(DAILY_AFFIRMATIONS[dayIndex]);
    }
  }, []);

  if (!affirmation) return null;

  return (
    <AnimatedDiv className="bg-emerald-50 p-4 rounded-xl shadow-lg mb-6 transition-all duration-500 ease-in-out hover:shadow-xl hover:scale-[1.01] transform">
      <h3 className="text-lg font-semibold text-emerald-700 mb-2 flex items-center">
        <i className="fas fa-sun mr-2 text-yellow-400 animate-pulse"></i> Your Daily Spark
      </h3>
      <p className="text-slate-700 italic text-center text-md">"{affirmation}"</p>
    </AnimatedDiv>
  );
};

// --- Prompt Suggestion Panel ---
interface PromptSuggestionsPanelProps {
  currentPrompt: string;
  onNewPrompt: () => void;
}
const PromptSuggestionsPanel: React.FC<PromptSuggestionsPanelProps> = ({ currentPrompt, onNewPrompt }) => {
  return (
    <AnimatedDiv className="bg-sky-50 p-4 rounded-xl shadow-lg mb-6 transition-shadow duration-300 hover:shadow-xl" delay={100}>
      <h3 className="text-lg font-semibold text-sky-700 mb-2">Need Inspiration? Try a Prompt:</h3>
      {currentPrompt ? (
        <p className="text-slate-600 italic">"{currentPrompt}"</p>
      ) : (
        <p className="text-slate-500">Click the button for a suggestion!</p>
      )}
      <Button onClick={onNewPrompt} variant="ghost" size="sm" className="mt-3 !text-sky-600 hover:!bg-sky-100 !border-sky-500">
        <i className="fas fa-lightbulb mr-2"></i>Get Another Prompt
      </Button>
    </AnimatedDiv>
  );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const savedEntries = localStorage.getItem('noesis_entries');
    return savedEntries ? JSON.parse(savedEntries) : [];
  });
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [activeWellnessSession, setActiveWellnessSession] = useState<WellnessSuggestion | null>(null);

  // Password state
  const [isLocked, setIsLocked] = useState(true);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Chatbot State
  const [showChatbot, setShowChatbot] = useState(false);

  // Daily Checklist State
  const [dailyChecklist, setDailyChecklist] = useState<ChecklistItem[]>([]);

  // Badge State
  const [earnedBadges, setEarnedBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('noesis_earned_badges');
    return saved ? JSON.parse(saved) : [];
  });
  const [badgeNotification, setBadgeNotification] = useState<Badge | null>(null);

  // Doctor Settings for Provider View
  const [doctorSettings, setDoctorSettings] = useState<DoctorShareSettings>(() => {
    const saved = localStorage.getItem('noesis_doctor_settings');
    return saved ? JSON.parse(saved) : {
      isConnected: false, providerEmail: '', shareSummary: true,
      shareThemes: true, shareMoodTrends: true, alertOnCrisis: false,
    };
  });


  useEffect(() => {
    const storedHash = localStorage.getItem('noesis_password_hash');
    setPasswordHash(storedHash);
    if (!storedHash) {
      setShowSetPasswordModal(true);
      setIsLocked(true); 
    } else {
      setIsLocked(true); 
    }
    setAppInitialized(true);
    const initialLoadingElement = document.getElementById('initial-loading');
    if (initialLoadingElement) {
        initialLoadingElement.style.display = 'none';
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('noesis_entries', JSON.stringify(journalEntries));
  }, [journalEntries]);

  // Load and save checklist for the selected date
  useEffect(() => {
    const dateKey = formatDateToYYYYMMDD(selectedDate);
    const savedChecklist = localStorage.getItem(`noesis_checklist_${dateKey}`);
    if (savedChecklist) {
      setDailyChecklist(JSON.parse(savedChecklist));
    } else {
      setDailyChecklist(SOCIAL_GOOD_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false, aiCompleted: false })));
    }
  }, [selectedDate]);

  const checkAndAwardBadges = useCallback((currentDate: Date) => {
    const dateKey = formatDateToYYYYMMDD(currentDate);
    const dailyCompletionStatusKey = `noesis_daily_social_good_completed_${dateKey}`;
    const isDayCompleted = localStorage.getItem(dailyCompletionStatusKey) === 'true';

    if (!isDayCompleted) return; 

    const newEarnedBadges: Badge[] = [];

    BADGE_DEFINITIONS.forEach(badge => {
      if (earnedBadges.includes(badge.id)) return; 

      let achieved = false;
      if (badge.requirement.type === 'consecutive_all_items') {
        let consecutiveDays = 0;
        for (let i = 0; i < badge.requirement.days; i++) {
          const d = new Date(currentDate);
          d.setDate(currentDate.getDate() - i);
          const prevDateKey = formatDateToYYYYMMDD(d);
          if (localStorage.getItem(`noesis_daily_social_good_completed_${prevDateKey}`) === 'true') {
            consecutiveDays++;
          } else {
            break;
          }
        }
        if (consecutiveDays >= badge.requirement.days) achieved = true;
      } else if (badge.requirement.type === 'total_all_items_in_period') {
        let totalDays = 0;
        const period = badge.requirement.periodDays === Infinity ? 365 * 5 : badge.requirement.periodDays; 
        for (let i = 0; i < period; i++) {
          const d = new Date(currentDate);
          d.setDate(currentDate.getDate() - i);
          const prevDateKey = formatDateToYYYYMMDD(d);
          if (localStorage.getItem(`noesis_daily_social_good_completed_${prevDateKey}`) === 'true') {
            totalDays++;
          }
        }
        if (totalDays >= badge.requirement.days) achieved = true;
      }

      if (achieved) {
        newEarnedBadges.push(badge);
      }
    });

    if (newEarnedBadges.length > 0) {
      const updatedEarnedBadgeIds = [...earnedBadges, ...newEarnedBadges.map(b => b.id)];
      setEarnedBadges(updatedEarnedBadgeIds);
      localStorage.setItem('noesis_earned_badges', JSON.stringify(updatedEarnedBadgeIds));
      setBadgeNotification(newEarnedBadges[0]); 
      setTimeout(() => setBadgeNotification(null), 5000); 
    }
  }, [earnedBadges]);


  const handleUpdateChecklist = useCallback((updatedList: ChecklistItem[], forDate: Date) => {
    setDailyChecklist(updatedList);
    const dateKey = formatDateToYYYYMMDD(forDate);
    localStorage.setItem(`noesis_checklist_${dateKey}`, JSON.stringify(updatedList));

    const allCompleted = updatedList.every(item => item.completed);
    if (allCompleted) {
      localStorage.setItem(`noesis_daily_social_good_completed_${dateKey}`, 'true');
    } else {
      localStorage.setItem(`noesis_daily_social_good_completed_${dateKey}`, 'false');
    }
    checkAndAwardBadges(forDate);
  }, [checkAndAwardBadges]);


  const handleSetPassword = async (newPass: string) => {
    const hash = await simpleHash(newPass);
    localStorage.setItem('noesis_password_hash', hash);
    setPasswordHash(hash);
    setIsLocked(false);
    setShowSetPasswordModal(false);
    setAuthError(null);
    resetChatSession(); 
  };

  const handleUnlock = async (attempt: string) => {
    if (!passwordHash) { 
      setAuthError("No password set. Please set a password.");
      setShowSetPasswordModal(true);
      return;
    }
    const attemptHash = await simpleHash(attempt);
    if (attemptHash === passwordHash) {
      setIsLocked(false);
      setAuthError(null);
    } else {
      setAuthError("Incorrect password. Please try again.");
    }
  };
  
  const handleLockApp = () => {
    setIsLocked(true);
    setShowChatbot(false); 
  };
  
  const handleRemovePassword = () => {
    localStorage.removeItem('noesis_password_hash');
    setPasswordHash(null);
    setIsLocked(true); 
    setShowSetPasswordModal(true); 
    resetChatSession();
  };
  
  const handleChangePasswordInSettings = async (newPasswordHash: string) => {
    setPasswordHash(newPasswordHash);
    localStorage.setItem('noesis_password_hash', newPasswordHash);
    resetChatSession();
  };


  if (!appInitialized) {
    return null; 
  }

  if (showSetPasswordModal && !passwordHash) {
    return <SetPasswordModal onSetPassword={handleSetPassword} show={showSetPasswordModal} />;
  }

  if (isLocked && passwordHash) {
    return <PasswordLockScreen onUnlock={handleUnlock} error={authError} show={isLocked} />;
  }
  
  if (isLocked && !passwordHash && !showSetPasswordModal) {
     return <SetPasswordModal onSetPassword={handleSetPassword} show={true} />;
  }


  const addJournalEntry = async (text: string, entryDate: Date, audioUrl?: string) => {
    setIsLoading(true);
    setError(null);
    const newEntryPartial: Omit<JournalEntry, 'id' | 'analysis'> = {
      date: entryDate.toISOString(),
      text,
      audioUrl,
    };

    try {
      const analysis = await analyzeJournalEntry(text);
      const newEntry: JournalEntry = {
        ...newEntryPartial,
        id: generateId(),
        analysis: analysis || undefined,
      };
      setJournalEntries(prevEntries => [newEntry, ...prevEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      if (analysis?.completedChecklistItems && analysis.completedChecklistItems.length > 0) {
        const entrysDateKey = formatDateToYYYYMMDD(entryDate);
        let checklistForEntryDate: ChecklistItem[];
        const savedChecklist = localStorage.getItem(`noesis_checklist_${entrysDateKey}`);
        if (savedChecklist) {
          checklistForEntryDate = JSON.parse(savedChecklist);
        } else {
          checklistForEntryDate = SOCIAL_GOOD_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false, aiCompleted: false }));
        }

        const updatedChecklistForEntryDate = checklistForEntryDate.map(item => {
          if (analysis.completedChecklistItems!.includes(item.id)) {
            return { ...item, completed: true, aiCompleted: true };
          }
          return item;
        });
        
        if (entrysDateKey === formatDateToYYYYMMDD(selectedDate)) {
            handleUpdateChecklist(updatedChecklistForEntryDate, entryDate);
        } else { 
            localStorage.setItem(`noesis_checklist_${entrysDateKey}`, JSON.stringify(updatedChecklistForEntryDate));
            const allCompleted = updatedChecklistForEntryDate.every(item => item.completed);
            if (allCompleted) {
              localStorage.setItem(`noesis_daily_social_good_completed_${entrysDateKey}`, 'true');
            } else {
              localStorage.setItem(`noesis_daily_social_good_completed_${entrysDateKey}`, 'false');
            }
            checkAndAwardBadges(entryDate); 
        }
      }


    } catch (e) {
      console.error("Failed to add journal entry or analyze:", e);
      setError("Failed to save or analyze entry. Please try again.");
      const newEntry: JournalEntry = {
        ...newEntryPartial,
        id: generateId(),
        analysis: undefined, 
      };
      setJournalEntries(prevEntries => [newEntry, ...prevEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      <Navbar onLockApp={handleLockApp} onToggleChatbot={() => setShowChatbot(prev => !prev)} isChatbotVisible={showChatbot} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        {badgeNotification && (
          <Alert
            message={`New Badge Unlocked: ${badgeNotification.name}!`}
            type="success"
            icon={badgeNotification.icon}
            onClose={() => setBadgeNotification(null)}
          />
        )}
        {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
        {isLoading && !activeWellnessSession && <LoadingSpinner text="Processing entry..." />}
        <Routes>
          <Route path="/" element={
            <JournalPage 
              entries={journalEntries} 
              addEntry={addJournalEntry} 
              isLoadingEntry={isLoading} 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate}
              setActiveWellnessSession={setActiveWellnessSession}
              checklistItems={dailyChecklist}
              onUpdateChecklist={(updatedItems) => handleUpdateChecklist(updatedItems, selectedDate)}
            />
          } />
          <Route path="/dashboard" element={<DashboardPage entries={journalEntries} earnedBadges={earnedBadges} />} />
          <Route path="/settings" element={
            <SettingsPage 
                setJournalEntries={setJournalEntries} 
                currentPasswordHash={passwordHash}
                onChangePassword={handleChangePasswordInSettings}
                onRemovePassword={handleRemovePassword}
                doctorSettings={doctorSettings}
                setDoctorSettings={setDoctorSettings}
            />} 
          />
          <Route path="/entry/:id" element={<EntryDetailPage entries={journalEntries} setActiveWellnessSession={setActiveWellnessSession} />} />
          <Route path="/dashboard/provider-view" element={
            <ProviderDashboardPage 
              entries={journalEntries} 
              earnedBadges={earnedBadges} 
              doctorSettings={doctorSettings} 
              localDateFormatter={formatDateToYYYYMMDD}
            />} 
          />
        </Routes>
      </main>
      {activeWellnessSession && (
        <InteractiveWellnessModal 
          suggestion={activeWellnessSession} 
          onClose={() => setActiveWellnessSession(null)} 
          show={!!activeWellnessSession}
        />
      )}
      {showChatbot && <ChatbotModal onClose={() => setShowChatbot(false)} show={showChatbot} />}
      <Footer />
    </div>
  );
};

// --- Password Protection Components ---
const PasswordLockScreen: React.FC<{ onUnlock: (password: string) => void; error: string | null; show: boolean }> = ({ onUnlock, error, show }) => {
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(passwordAttempt);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-800 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4 z-[200]">
      <div 
        className={`bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center transform transition-all duration-300 ease-out ${isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <i className="fas fa-lock text-5xl text-purple-500 mb-6"></i>
        <h1 className="text-3xl font-bold text-blue-600 mb-3">Noesis is Locked</h1>
        <p className="text-slate-600 mb-6">Please enter your password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={passwordAttempt}
              onChange={(e) => setPasswordAttempt(e.target.value)}
              placeholder="Password"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
              aria-label="Password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" size="lg">Unlock</Button>
        </form>
        <p className="text-xs text-slate-500 mt-6">
          Noesis uses local password protection. If you forget your password, you may need to clear application data (which will delete entries) to reset.
        </p>
      </div>
    </div>
  );
};

const SetPasswordModal: React.FC<{ onSetPassword: (password: string) => void; show: boolean }> = ({ onSetPassword, show }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [show]);
  
  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    onSetPassword(newPassword);
  };

  return (
     <div className="fixed inset-0 bg-gradient-to-br from-slate-800 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4 z-[200]">
      <div 
        className={`bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center transform transition-all duration-300 ease-out ${isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <i className="fas fa-shield-alt text-5xl text-emerald-500 mb-6"></i>
        <h1 className="text-3xl font-bold text-blue-600 mb-3">Set Your Noesis Password</h1>
        <p className="text-slate-600 mb-6">Create a password to protect your journal entries. This password is stored locally in your browser.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (min. 6 characters)"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
              aria-label="New Password"
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
              aria-label="Confirm New Password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" size="lg">Set Password & Unlock</Button>
        </form>
         <p className="text-xs text-slate-500 mt-6">
          Choose a strong, unique password. If forgotten, access to entries may be lost unless application data is cleared.
        </p>
      </div>
    </div>
  );
};


// --- Navigation Components ---
const Navbar: React.FC<{onLockApp: () => void; onToggleChatbot: () => void; isChatbotVisible: boolean}> = ({onLockApp, onToggleChatbot, isChatbotVisible}) => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Journal', icon: 'fas fa-book-open' },
    { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
    { path: '/settings', label: 'Settings', icon: 'fas fa-cog' },
  ];

  return (
    <nav className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-white text-2xl font-bold flex items-center group">
              <i className="fas fa-brain text-3xl mr-2.5 text-white drop-shadow-sm group-hover:scale-110 transition-all duration-200"></i>
              <span>Noesis</span>
            </Link>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map(item => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors duration-150 transform hover:scale-105 hover:-translate-y-0.5 ${
                      location.pathname === item.path
                        ? 'bg-purple-700 text-white shadow-md' 
                        : 'text-indigo-100 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <i className={`${item.icon} mr-2`}></i>{item.label}
                  </Link>
                ))}
              </div>
            </div>
             <button 
              onClick={onToggleChatbot} 
              title={isChatbotVisible ? "Close Wellness Companion" : "Open Wellness Companion"}
              className={`ml-4 p-2 rounded-full transform hover:scale-110 active:scale-100 transition-transform focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 ${isChatbotVisible ? 'bg-blue-700 text-white' : 'text-indigo-100 hover:bg-blue-600 hover:text-white'}`}
              aria-label={isChatbotVisible ? "Close Wellness Companion chatbot" : "Open Wellness Companion chatbot"}
              aria-pressed={isChatbotVisible}
            >
              <i className="fas fa-comments"></i>
            </button>
            <button 
              onClick={onLockApp} 
              title="Lock App"
              className="ml-4 p-2 rounded-full text-indigo-100 hover:bg-blue-600 hover:text-white transform hover:scale-110 active:scale-100 transition-transform focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75"
              aria-label="Lock application"
            >
              <i className="fas fa-lock"></i>
            </button>
          </div>
          <div className="md:hidden"> {/* Mobile menu button placeholder */} </div>
        </div>
      </div>
    </nav>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 text-center p-4 text-sm text-indigo-100 border-t border-purple-700">
    <p>&copy; {new Date().getFullYear()} Noesis. Your confidential space to reflect, understand, and grow.</p>
    <p className="mt-1 text-xs">Noesis is a mental wellness tool, not a replacement for professional medical advice, diagnosis, or treatment. AI interactions are for informational and reflective purposes only.</p>
  </footer>
);

// --- Page Components ---

interface CalendarViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  entries: JournalEntry[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedDate, setSelectedDate, entries, currentMonth, setCurrentMonth }) => {
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay()); 

  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); 

  const days: Date[] = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const handleDayClick = (day: Date) => setSelectedDate(day);
  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const getMoodForDay = (date: Date): { sentiment?: Sentiment, emoji?: string } => {
    const localDateKey = formatDateToYYYYMMDD(date);
    const entriesForDay = entries.filter(e => formatDateToYYYYMMDD(new Date(e.date)) === localDateKey);
    
    if (entriesForDay.length === 0) return {};
    
    const analyzedEntriesForDay = entriesForDay.filter(e => e.analysis?.sentiment);
    const latestAnalyzedEntry = analyzedEntriesForDay.length > 0
        ? analyzedEntriesForDay.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : undefined;
    const sentiment = latestAnalyzedEntry?.analysis?.sentiment;
    
    const hasUnanalyzedEntryThisDay = entriesForDay.length > 0 && !sentiment;

    return { 
        sentiment, 
        emoji: sentiment ? MOOD_EMOJIS[sentiment] : (hasUnanalyzedEntryThisDay ? undefined : undefined) 
    };
  };

  return (
    <AnimatedDiv className="bg-white p-4 sm:p-6 rounded-xl shadow-lg"> 
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => changeMonth(-1)} variant="ghost" size="sm" aria-label="Previous month"><i className="fas fa-chevron-left"></i></Button>
        <h3 className="text-lg sm:text-xl font-semibold text-blue-600">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <Button onClick={() => changeMonth(1)} variant="ghost" size="sm" aria-label="Next month"><i className="fas fa-chevron-right"></i></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-purple-700 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d, index) => {
          const isCurrentMonthDay = d.getMonth() === currentMonth.getMonth();
          const isSelectedDay = d.toDateString() === selectedDate.toDateString();
          const isTodayDay = d.toDateString() === new Date().toDateString();
          const { sentiment, emoji } = getMoodForDay(d);
          
          const localDateKey = formatDateToYYYYMMDD(d);
          const entriesForThisDay = entries.filter(e => formatDateToYYYYMMDD(new Date(e.date)) === localDateKey);
          const hasUnanalyzedEntry = entriesForThisDay.length > 0 && !sentiment && isCurrentMonthDay;
          
          let bgColor = '';
          let textColor = '';
          let hoverClasses = ''; 
          let ringClasses = '';
          let scaleAndShadowClasses = 'transform transition-all duration-200'; 
          let additionalDayClasses = '';
          let borderClasses = 'border border-slate-200'; 

          if (isSelectedDay) {
            ringClasses = 'ring-2 ring-purple-500';
            scaleAndShadowClasses += ' scale-105 shadow-xl z-10'; 
            borderClasses = 'border-purple-300'; 
            if (sentiment && isCurrentMonthDay) {
              bgColor = MOOD_COLORS[sentiment] || '';
              textColor = MOOD_TEXT_COLORS[sentiment] || 'text-slate-700';
              hoverClasses = `hover:opacity-90`; 
            } else {
              bgColor = 'bg-purple-100';
              textColor = 'text-purple-700';
              hoverClasses = 'hover:bg-purple-200';
            }
          } else if (isTodayDay) {
            ringClasses = 'ring-1 ring-emerald-500';
            borderClasses = 'border-emerald-300';
            scaleAndShadowClasses += ' hover:scale-105 hover:shadow-lg'; 
            if (sentiment && isCurrentMonthDay) {
              bgColor = MOOD_COLORS[sentiment] || '';
              textColor = MOOD_TEXT_COLORS[sentiment] || 'text-slate-700';
              hoverClasses = `hover:opacity-80`;
            } else if (isCurrentMonthDay) { 
              bgColor = 'bg-emerald-50'; 
              textColor = 'text-emerald-700';
              hoverClasses = 'hover:bg-emerald-100';
            } else { 
              bgColor = 'bg-slate-100'; 
              textColor = 'text-slate-500';
              hoverClasses = 'hover:bg-slate-200';
              additionalDayClasses = 'opacity-70';
            }
          } else if (isCurrentMonthDay) {
            scaleAndShadowClasses += ' hover:scale-105 hover:shadow-md';
            if (sentiment) {
              bgColor = MOOD_COLORS[sentiment] || '';
              textColor = MOOD_TEXT_COLORS[sentiment] || 'text-slate-700';
              hoverClasses = `hover:opacity-80`;
            } else { 
              bgColor = 'bg-white';
              textColor = 'text-slate-700';
              hoverClasses = 'hover:bg-sky-100';
            }
          } else { 
            bgColor = 'bg-slate-50';
            textColor = 'text-slate-400';
            hoverClasses = 'hover:bg-slate-100';
            additionalDayClasses = 'opacity-70'; 
            scaleAndShadowClasses += ' hover:scale-105 hover:shadow-sm';
          }

          const dayBtnClasses = `
            p-1.5 sm:p-2 h-12 sm:h-16 rounded-lg 
            flex flex-col items-center justify-center 
            text-xs sm:text-sm 
            shadow-sm 
            ${borderClasses} 
            ${bgColor} ${textColor} ${hoverClasses} 
            ${ringClasses} ${scaleAndShadowClasses} ${additionalDayClasses}
          `.replace(/\s+/g, ' ').trim();
          
          return (
            <button
              key={index}
              onClick={() => handleDayClick(d)}
              className={dayBtnClasses}
              aria-pressed={isSelectedDay}
              aria-label={`Select day ${d.toLocaleDateString()}${sentiment ? `, Mood: ${sentiment}` : ''}`}
            >
              <span>{d.getDate()}</span>
              {emoji && isCurrentMonthDay && <span className="mt-1 text-lg" aria-hidden="true">{emoji}</span>}
              {hasUnanalyzedEntry && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400" title="Entry present, no analysis"></span>}
            </button>
          );
        })}
      </div>
    </AnimatedDiv>
  );
};

// --- Social Good Checklist Component ---
interface SocialGoodChecklistProps {
  items: ChecklistItem[];
  selectedDate: Date;
}

const SocialGoodChecklist: React.FC<SocialGoodChecklistProps> = ({ items, selectedDate }) => {
  return (
    <AnimatedDiv className="bg-lime-50 p-4 rounded-xl shadow-lg mb-6 transition-shadow duration-300 hover:shadow-xl" delay={150}>
      <h3 className="text-lg font-semibold text-lime-700 mb-3 flex items-center">
        <i className="fas fa-hands-helping mr-2 text-lime-600"></i> Today's Acts of Kindness & Social Good
      </h3>
      {items.length === 0 ? (
         <p className="text-slate-500">No checklist items available for today.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center group">
              <div 
                className={`h-5 w-5 mr-3 flex items-center justify-center rounded border-2 ${
                  item.completed 
                    ? 'bg-lime-500 border-lime-600' 
                    : 'bg-white border-slate-300 group-hover:border-lime-400'
                  } transition-all`}
                  aria-checked={item.completed}
                  role="checkbox"
                  aria-labelledby={`checklist-label-${item.id}-${formatDateToYYYYMMDD(selectedDate)}`}
              >
                {item.completed && <i className="fas fa-check text-xs text-white"></i>}
              </div>
              <span 
                id={`checklist-label-${item.id}-${formatDateToYYYYMMDD(selectedDate)}`}
                className={`text-slate-700 text-sm transition-colors ${item.completed ? 'line-through text-slate-500' : 'group-hover:text-lime-800'}`}
              >
                {item.text}
              </span>
              {item.aiCompleted && !item.completed && <i className="fas fa-robot text-xs text-blue-400 ml-2" title="AI suggested this based on your entry (needs verification if feature allowed manual completion)"></i>}
              {item.aiCompleted && item.completed && <i className="fas fa-brain text-xs text-green-600 ml-2" title="AI detected this completed"></i>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500 mt-3 italic">These items are automatically checked by AI based on your journal entries.</p>
    </AnimatedDiv>
  );
};


interface JournalPageProps {
  entries: JournalEntry[];
  addEntry: (text: string, entryDate: Date, audioUrl?: string) => Promise<void>;
  isLoadingEntry: boolean; 
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setActiveWellnessSession: (suggestion: WellnessSuggestion) => void;
  checklistItems: ChecklistItem[];
  onUpdateChecklist: (items: ChecklistItem[], forDate: Date) => void;
}

const JournalPage: React.FC<JournalPageProps> = ({ entries, addEntry, isLoadingEntry, selectedDate, setSelectedDate, setActiveWellnessSession, checklistItems, onUpdateChecklist }) => {
  const [entryText, setEntryText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const [dailyLogAnalysis, setDailyLogAnalysis] = useState<DailyLogAnalysis | null>(null);
  const [isLoadingDailyAnalysis, setIsLoadingDailyAnalysis] = useState(false);
  const [dailyAnalysisError, setDailyAnalysisError] = useState<string | null>(null);

  const entriesForSelectedDate = React.useMemo(() => {
    const localSelectedDateKey = formatDateToYYYYMMDD(selectedDate);
    return entries.filter(entry => 
      formatDateToYYYYMMDD(new Date(entry.date)) === localSelectedDateKey
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, selectedDate]);


  useEffect(() => {
    if (selectedDate.getMonth() !== currentCalendarMonth.getMonth() || selectedDate.getFullYear() !== currentCalendarMonth.getFullYear()) {
      setCurrentCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate, currentCalendarMonth]);

  useEffect(() => {
    const fetchDailySummary = async () => {
      if (entriesForSelectedDate.length === 0) {
        setDailyLogAnalysis(null);
        setDailyAnalysisError(null);
        return;
      }
      setIsLoadingDailyAnalysis(true);
      setDailyAnalysisError(null);
      try {
        const texts = entriesForSelectedDate.map(e => e.text);
        const analysis = await analyzeDailyLog(texts);
        setDailyLogAnalysis(analysis);
      } catch (err) {
        console.error("Error fetching daily analysis:", err);
        setDailyAnalysisError("Failed to load daily summary. Please try again.");
        setDailyLogAnalysis(null);
      } finally {
        setIsLoadingDailyAnalysis(false);
      }
    };

    fetchDailySummary();
  }, [selectedDate, entriesForSelectedDate]);


  const selectRandomPrompt = () => {
    if (GUIDED_PROMPTS.length > 0) {
      const randomIndex = Math.floor(Math.random() * GUIDED_PROMPTS.length);
      const newPrompt = GUIDED_PROMPTS[randomIndex];
      setCurrentPrompt(newPrompt);
    }
  };
  
  const handleSaveEntry = async () => {
    if (entryText.trim() || audioChunksRef.current.length > 0) {
      const entryTimestamp = new Date(selectedDate); 
      const now = new Date(); 
      entryTimestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        await addEntry(entryText, entryTimestamp, audioUrl);
        audioChunksRef.current = [];
      } else {
        await addEntry(entryText, entryTimestamp);
      }
      setEntryText('');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            if (finalTranscript) {
              setEntryText(prev => prev.trim() + (prev.trim() ? ' ' : '') + finalTranscript.trim() + ' ');
            }
          };
          recognitionRef.current.start();
        } else {
          console.warn("Speech Recognition API not supported.");
        }

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please ensure permission is granted.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <CalendarView 
        selectedDate={selectedDate} 
        setSelectedDate={setSelectedDate} 
        entries={entries}
        currentMonth={currentCalendarMonth}
        setCurrentMonth={setCurrentCalendarMonth}
      />

      <DailyAffirmationCard />
      
      <DailyLogSummaryCard 
        analysis={dailyLogAnalysis} 
        isLoading={isLoadingDailyAnalysis} 
        error={dailyAnalysisError}
        date={selectedDate}
        setActiveWellnessSession={setActiveWellnessSession}
        hasEntries={entriesForSelectedDate.length > 0}
      />
      
      <PromptSuggestionsPanel currentPrompt={currentPrompt} onNewPrompt={selectRandomPrompt} />

      <SocialGoodChecklist items={checklistItems} selectedDate={selectedDate} />


      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={200}> 
        <h2 className="text-2xl font-semibold mb-3 text-purple-600">
          New Entry for {formatDateShort(selectedDate)}
        </h2>
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          placeholder={"How are you feeling today? What's on your mind?"}
          className="w-full h-48 p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400 resize-none ruled-background"
          disabled={isLoadingEntry}
          aria-label={`Journal entry for ${formatDateShort(selectedDate)}`}
        />
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex space-x-3">
            <Button onClick={handleSaveEntry} disabled={isLoadingEntry || (!entryText.trim() && audioChunksRef.current.length === 0)} leftIcon={<i className="fas fa-save"></i>}>
              {isLoadingEntry ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button onClick={toggleRecording} variant="secondary" leftIcon={<i className={`fas ${isRecording ? 'fa-stop-circle text-red-500' : 'fa-microphone'}`}></i>} aria-pressed={isRecording}>
              {isRecording ? 'Stop Recording' : 'Start Voice Note'}
            </Button>
          </div>
        </div>
      </AnimatedDiv>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-blue-600">Entries for {formatDateShort(selectedDate)}</h3>
        {entriesForSelectedDate.length === 0 && !isLoadingEntry ? (
          <p className="text-slate-500 text-center py-4 bg-slate-100 rounded-lg">No entries for this day. Write one above!</p> 
        ) : (
          <div className="space-y-4">
            {entriesForSelectedDate.map((entry, index) => (
              <JournalEntryCard key={entry.id} entry={entry} animationDelay={index * 100} />
            ))}
          </div>
        )}
         {isLoadingEntry && entriesForSelectedDate.length === 0 && <LoadingSpinner text="Loading entries..."/> }
      </div>
    </div>
  );
};

interface EntryDetailPageProps {
  entries: JournalEntry[];
  setActiveWellnessSession: (suggestion: WellnessSuggestion) => void;
}
const EntryDetailPage: React.FC<EntryDetailPageProps> = ({ entries, setActiveWellnessSession }) => {
  const { id } = useParams<{ id: string }>();
  const entry = entries.find(e => e.id === id);

  if (!entry) {
    return <AnimatedDiv className="text-center p-8 bg-white rounded-xl shadow-lg"> 
      <h2 className="text-2xl font-semibold text-red-600">Entry not found</h2>
      <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">Go back to Journal</Link>
    </AnimatedDiv>;
  }

  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg"> 
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-purple-600">{formatDate(entry.date)}</h2>
        <Link to="/" className="text-sm text-blue-500 hover:underline">&larr; Back to Journal</Link>
      </div>
      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mb-6 ruled-background ruled-text-display p-2">{entry.text}</p>
      {entry.audioUrl && (
        <div className="my-4">
          <h4 className="text-md font-semibold text-purple-500 mb-1">Voice Note:</h4>
          <audio controls src={entry.audioUrl} className="w-full" aria-label="Voice note audio player">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      {entry.analysis && <AnalysisDisplay analysis={entry.analysis} />}
      {entry.analysis && <WellnessSuggestionsDisplay analysisSource={entry.analysis} setActiveWellnessSession={setActiveWellnessSession} />}
    </AnimatedDiv>
  );
};


interface JournalEntryCardProps {
  entry: JournalEntry;
  animationDelay?: number;
}
const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry, animationDelay = 0 }) => (
  <AnimatedDiv delay={animationDelay} duration={300} initialY={3}>
    <Link 
      to={`/entry/${entry.id}`} 
      className="block bg-white hover:bg-purple-50 p-4 rounded-lg shadow-md hover:shadow-xl hover:scale-[1.02] transform transition-all duration-200 ease-in-out"
    >
      <div className="flex justify-between items-start">
        <h4 className="text-lg font-semibold text-blue-600 mb-1">{formatDate(entry.date)}</h4>
        {entry.analysis?.sentiment && (
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${MOOD_COLORS[entry.analysis.sentiment] || MOOD_COLORS.Default} ${MOOD_TEXT_COLORS[entry.analysis.sentiment] || MOOD_TEXT_COLORS.Default} flex items-center`}>
            {entry.analysis.sentiment} 
            <span className="ml-1.5 text-sm" aria-hidden="true">{MOOD_EMOJIS[entry.analysis.sentiment] || ''}</span>
          </span>
        )}
      </div>
      <p className="text-slate-600 truncate text-sm mb-2">{entry.text.substring(0,150)}...</p> 
      {entry.audioUrl && <i className="fas fa-volume-up text-purple-500 mr-2" aria-label="Voice note included"></i>}
      <div className="text-xs text-emerald-700">
        {entry.analysis?.themes && entry.analysis.themes.length > 0 && (
          <span>Themes: {entry.analysis.themes.join(', ')}</span>
        )}
      </div>
    </Link>
  </AnimatedDiv>
);


const AnalysisDisplay: React.FC<{ analysis: JournalEntryAnalysis }> = ({ analysis }) => (
  <AnimatedDiv className="mt-6 p-4 bg-indigo-50 rounded-lg shadow-inner" delay={100}>
    <h3 className="text-xl font-semibold mb-3 text-purple-700">AI Analysis (Single Entry)</h3>
    <p className="text-sm text-slate-600 mb-3 italic">{analysis.summary || "Summary not available."}</p>
    
    {analysis.friendlyFeedback && (
      <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-md shadow-sm">
        <h4 className="text-md font-semibold text-blue-600 mb-1 flex items-center">
          <i className="fas fa-heart text-blue-500 mr-2"></i>A Friendly Thought
        </h4>
        <p className="text-sm text-slate-700 italic leading-relaxed">{analysis.friendlyFeedback}</p>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="text-md font-semibold text-blue-600 mb-1">Sentiment:</h4>
        <p className={`font-medium ${MOOD_TEXT_COLORS[analysis.sentiment] || MOOD_TEXT_COLORS.Default} flex items-center`}>
          {analysis.sentiment} 
          <span className="ml-1.5 text-lg" aria-hidden="true">{MOOD_EMOJIS[analysis.sentiment] || ''}</span>
        </p>
      </div>
      <div>
        <h4 className="text-md font-semibold text-blue-600 mb-1">Emotions:</h4>
        {analysis.emotions.length > 0 ? (
          <ul className="list-disc list-inside">
            {analysis.emotions.map(e => (
              <li key={e.emotion} className={`${EMOTION_COLORS[e.emotion] || EMOTION_COLORS.Default} text-sm`}>
                {e.emotion}: {(e.score * 100).toFixed(0)}%
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-600">No specific emotions detected.</p>}
      </div>
      <div>
        <h4 className="text-md font-semibold text-blue-600 mb-1">Key Themes:</h4>
        {analysis.themes.length > 0 ? (
          <ul className="list-disc list-inside">
            {analysis.themes.map(theme => <li key={theme} className="text-sm text-slate-700">{theme}</li>)}
          </ul>
        ) : <p className="text-sm text-slate-600">No specific themes identified.</p>}
      </div>
      <div>
        <h4 className="text-md font-semibold text-blue-600 mb-1">Cognitive Distortions:</h4>
        {analysis.cognitiveDistortions.length > 0 ? (
          <ul className="space-y-1">
            {analysis.cognitiveDistortions.map((cd, index) => (
              <li key={index} className="text-sm text-slate-700">
                <strong className={`${EMOTION_COLORS['Anxiety'] || 'text-teal-600'}`}>{cd.distortion}:</strong> "{cd.snippet}"
                {cd.explanation && <p className="text-xs text-slate-500 italic ml-2">- {cd.explanation}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-600">No cognitive distortions flagged.</p>}
      </div>
    </div>
    {analysis.emotions && analysis.emotions.length > 0 && (
        <EmotionCircumplexGraph emotions={analysis.emotions} />
    )}
  </AnimatedDiv>
);


// --- Daily Log Summary Card ---
interface DailyLogSummaryCardProps {
  analysis: DailyLogAnalysis | null;
  isLoading: boolean;
  error: string | null;
  date: Date;
  setActiveWellnessSession: (suggestion: WellnessSuggestion) => void;
  hasEntries: boolean;
}

const DailyLogSummaryCard: React.FC<DailyLogSummaryCardProps> = ({ analysis, isLoading, error, date, setActiveWellnessSession, hasEntries }) => {
  if (!hasEntries && !isLoading) { 
      return null; 
  }
  if (isLoading) {
    return (
      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl" delay={50}> 
        <h2 className="text-xl font-semibold mb-3 text-purple-600">Daily Summary for {formatDateShort(date)}</h2>
        <LoadingSpinner text="Generating daily summary..." />
      </AnimatedDiv>
    );
  }

  if (error) {
    return (
      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl" delay={50}>
        <h2 className="text-xl font-semibold mb-3 text-purple-600">Daily Summary for {formatDateShort(date)}</h2>
        <Alert type="error" message={error} />
      </AnimatedDiv>
    );
  }

  if (!analysis) {
     if (hasEntries) { 
        return (
          <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl" delay={50}>
            <h2 className="text-xl font-semibold mb-3 text-purple-600">Daily Summary for {formatDateShort(date)}</h2>
            <p className="text-slate-600">Daily summary could not be generated or is not available.</p>
          </AnimatedDiv>
        );
     }
     return null; 
  }

  return (
    <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl" delay={50}>
      <h2 className="text-xl font-semibold mb-3 text-purple-600">Overall Summary for {formatDateShort(date)}</h2>
      <p className="text-sm text-slate-700 mb-4 italic leading-relaxed">{analysis.dailySummaryText}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <h4 className="text-md font-semibold text-blue-500 mb-1">Overall Sentiment:</h4>
          <p className={`font-medium ${MOOD_TEXT_COLORS[analysis.overallSentiment] || MOOD_TEXT_COLORS.Default} flex items-center`}>
            {analysis.overallSentiment}
             <span className="ml-1.5 text-lg" aria-hidden="true">{MOOD_EMOJIS[analysis.overallSentiment] || ''}</span>
          </p>
        </div>
        <div>
          <h4 className="text-md font-semibold text-blue-500 mb-1">Key Emotional Tone:</h4>
          {analysis.dominantEmotions.length > 0 ? (
            <ul className="list-disc list-inside">
              {analysis.dominantEmotions.map(e => (
                <li key={e.emotion} className={`${EMOTION_COLORS[e.emotion] || EMOTION_COLORS.Default} text-sm`}>
                  {e.emotion}: {(e.score * 100).toFixed(0)}% <span className="text-xs text-slate-500">(Significance)</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-600">No specific dominant emotions for the day.</p>}
        </div>
        <div>
          <h4 className="text-md font-semibold text-blue-500 mb-1">Key Daily Themes:</h4>
          {analysis.dailyThemes.length > 0 ? (
            <ul className="list-disc list-inside">
              {analysis.dailyThemes.map(theme => <li key={theme} className="text-sm text-slate-700">{theme}</li>)}
            </ul>
          ) : <p className="text-sm text-slate-600">No specific themes identified for the day.</p>}
        </div>
      </div>
      <WellnessSuggestionsDisplay analysisSource={analysis} setActiveWellnessSession={setActiveWellnessSession} context="daily" />
    </AnimatedDiv>
  );
};


interface WellnessSuggestionsDisplayProps {
  analysisSource: JournalEntryAnalysis | DailyLogAnalysis; 
  setActiveWellnessSession: (suggestion: WellnessSuggestion) => void;
  context?: 'entry' | 'daily';
}

const WellnessSuggestionsDisplay: React.FC<WellnessSuggestionsDisplayProps> = ({ analysisSource, setActiveWellnessSession, context = 'entry' }) => {
  const getRelevantSuggestions = (): WellnessSuggestion[] => {
    const suggestions: WellnessSuggestion[] = [];
    const addedIds = new Set<string>();

    const addSuggestionById = (id: string) => {
      if (!addedIds.has(id)) {
        const suggestion = PREDEFINED_WELLNESS_SUGGESTIONS.find(s => s.id === id);
        if (suggestion) {
          suggestions.push(suggestion);
          addedIds.add(id);
        }
      }
    };
    
    const emotions = 'emotions' in analysisSource ? analysisSource.emotions : analysisSource.dominantEmotions;
    const themes = 'themes' in analysisSource ? analysisSource.themes : analysisSource.dailyThemes;
    const cognitiveDistortions = 'cognitiveDistortions' in analysisSource ? analysisSource.cognitiveDistortions : [];


    if (emotions.some(e => (e.emotion === 'Anxiety' || e.emotion === 'Fear' || e.emotion === 'Stress') && e.score > 0.4)) { 
      addSuggestionById('ws1'); addSuggestionById('ws2'); addSuggestionById('ws3');
    }
    if (emotions.some(e => (e.emotion === 'Sadness' || e.emotion === 'Fatigue') && e.score > 0.4)) {
      addSuggestionById('ws4'); addSuggestionById('ws5');
    }
    if (emotions.some(e => (e.emotion === 'Anger' || e.emotion === 'Frustration') && e.score > 0.4)) {
      addSuggestionById('ws8');
    }
    if (cognitiveDistortions.length > 0 && context === 'entry') { 
      addSuggestionById('ws7');
    }
     if (themes.some(t => {
        const lowerT = t.toLowerCase();
        return THERAPEUTIC_THEME_CATEGORIES.find(cat => cat.id === 'equality_social_justice')?.keywords.some(kw => lowerT.includes(kw)) ||
               THERAPEUTIC_THEME_CATEGORIES.find(cat => cat.id === 'self_esteem')?.keywords.some(kw => lowerT.includes(kw));
     })) {
       addSuggestionById('ws9'); 
       addSuggestionById('ws6'); 
       if(!addedIds.has('ws7')) addSuggestionById('ws7'); 
    }
     if (themes.some(t => {
        const lowerT = t.toLowerCase();
        return THERAPEUTIC_THEME_CATEGORIES.find(cat => cat.id === 'community_contribution')?.keywords.some(kw => lowerT.includes(kw));
     })) {
        addSuggestionById('ws10'); 
     }

    
    if (suggestions.length < 2 && !addedIds.has('ws4')) {
      addSuggestionById('ws4'); 
    }
     if (suggestions.length < 1 && !addedIds.has('ws1')) {
      addSuggestionById('ws1'); 
    }
    return suggestions.slice(0, 3); 
  };

  const relevantSuggestions = getRelevantSuggestions();
  if (relevantSuggestions.length === 0) return null;

  return (
    <AnimatedDiv className={`mt-6 ${context === 'daily' ? '' : 'p-4 bg-indigo-50 rounded-lg shadow-inner'}`} delay={context === 'entry' ? 150 : 50}>
      <h3 className="text-xl font-semibold mb-3 text-purple-700">
        {context === 'daily' ? "Daily Wellness Ideas" : "Personalized Wellness Suggestions"}
      </h3>
      <div className="space-y-3">
        {relevantSuggestions.map(suggestion => (
          <Button 
            key={suggestion.id} 
            variant="secondary" 
            className="w-full justify-start text-left !bg-purple-50 hover:!bg-purple-100 !border-purple-200 !text-slate-800 focus:!ring-purple-400"
            onClick={() => suggestion.interactiveProps && setActiveWellnessSession(suggestion)}
            disabled={!suggestion.interactiveProps}
            title={suggestion.interactiveProps ? suggestion.title : `${suggestion.title} (Not interactive yet)`}
          >
            <div className="flex items-center">
              {suggestion.icon && <i className={`${suggestion.icon} mr-3 w-5 text-center text-purple-500`}></i>}
              <div>
                <h4 className="text-md font-semibold text-purple-600">{suggestion.title}</h4>
                <p className="text-sm text-slate-700 mt-1">{suggestion.description}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </AnimatedDiv>
  );
};

// --- Interactive Wellness Modal and Components ---

interface InteractiveWellnessModalProps {
  suggestion: WellnessSuggestion;
  onClose: () => void;
  show: boolean;
}

const InteractiveWellnessModal: React.FC<InteractiveWellnessModalProps> = ({ suggestion, onClose, show }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50); 
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      setIsAnimatingIn(false);
    }
  }, [show, onClose]);

  if (!show) return null;

  const renderSuggestionContent = () => {
    if (!suggestion.interactiveProps) {
      return <p className="text-slate-700">{suggestion.content || "No interactive content available."}</p>;
    }
    switch (suggestion.interactiveProps.type) {
      case 'meditation': return <MeditationPlayer props={suggestion.interactiveProps} onClose={onClose} />;
      case 'breathing': return <BreathingGuide props={suggestion.interactiveProps} onClose={onClose} />;
      case 'generic': return <GenericContentDisplay props={suggestion.interactiveProps} onClose={onClose} />;
      default: return <p className="text-slate-700">Unsupported interactive session.</p>;
    }
  };
  
  const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wellness-modal-title"
    >
      <div 
        ref={modalContentRef}
        className={`bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-all duration-300 ease-out ${isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={handleModalContentClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="wellness-modal-title" className="text-2xl font-semibold text-blue-600 flex items-center">
            {suggestion.icon && <i className={`${suggestion.icon} mr-3 text-blue-500`}></i>}
            {suggestion.title}
          </h2>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm" 
            aria-label="Close wellness session" 
            className="!text-blue-500 hover:!bg-blue-100 !border-transparent"
          >
            <i className="fas fa-times text-xl"></i>
          </Button>
        </div>
        {renderSuggestionContent()}
      </div>
    </div>
  );
};

const MeditationPlayer: React.FC<{ props: MeditationInteractiveProps, onClose: () => void }> = ({ props, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(props.durationSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAudioSrc, setSelectedAudioSrc] = useState<string | null>(
    props.ambientSounds && props.ambientSounds.length > 0 ? props.ambientSounds[0].src : null
  );
  const [currentAudioName, setCurrentAudioName] = useState<string | null>(
    props.ambientSounds && props.ambientSounds.length > 0 ? props.ambientSounds[0].name : null
  );
  const timerIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (selectedAudioSrc && audioRef.current) {
              audioRef.current.pause();
            }
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      if (selectedAudioSrc && audioRef.current && audioRef.current.readyState >= 2) { 
        audioRef.current.play().catch(e => console.warn("Audio play failed.", e));
      }
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (selectedAudioSrc && audioRef.current && audioRef.current.readyState >= 2) {
         audioRef.current.pause();
      }
      if (timeLeft === 0 && isPlaying) {
        setIsPlaying(false);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, timeLeft, selectedAudioSrc]);

  useEffect(() => {
    if (audioRef.current && selectedAudioSrc) {
        if (audioRef.current.src !== selectedAudioSrc) {
            audioRef.current.src = selectedAudioSrc;
            audioRef.current.load(); 
        }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; 
        audioRef.current.load();
      }
    };
  }, [selectedAudioSrc]); 

  const togglePlay = () => {
    if (!isPlaying && timeLeft === 0 && props.durationSeconds > 0) {
      setTimeLeft(props.durationSeconds);
    }
    setIsPlaying(prev => !prev);
  };
  
  const handleEndSession = () => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    onClose();
  };

  const handleSoundChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSrc = event.target.value;
    const soundOption = props.ambientSounds?.find(s => s.src === newSrc);
    
    if (audioRef.current) {
        audioRef.current.pause();
    }

    setSelectedAudioSrc(newSrc === "none" ? null : newSrc);
    setCurrentAudioName(newSrc === "none" || !soundOption ? null : soundOption.name);
  };


  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  
  let buttonText = isPlaying ? 'Pause' : 'Start';
  if (timeLeft === 0 && props.durationSeconds > 0 && !isPlaying) {
    buttonText = 'Restart';
  }

  return (
    <div className="space-y-4 text-center">
      {selectedAudioSrc && (
        <audio ref={audioRef} src={selectedAudioSrc} loop playsInline style={{ display: 'none' }} aria-hidden="true" />
      )}
      
      {props.ambientSounds && props.ambientSounds.length > 0 && (
        <div className="my-3">
          <label htmlFor="ambient-sound-select" className="block text-sm font-medium text-slate-700 mb-1">Ambient Sound:</label>
          <select 
            id="ambient-sound-select"
            value={selectedAudioSrc || "none"}
            onChange={handleSoundChange}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-slate-800"
          >
            <option value="none">None</option>
            {props.ambientSounds.map(sound => (
              <option key={sound.src} value={sound.src}>{sound.name}</option>
            ))}
          </select>
        </div>
      )}

      <p className="text-5xl font-mono text-purple-500 my-4">{formatTime(timeLeft)}</p>
      <div className="h-32 p-3 bg-sky-50 rounded-lg text-slate-700 text-sm overflow-y-auto text-left custom-scrollbar ruled-background">
        <h4 className="font-semibold text-sky-700 mb-2 sticky top-0 bg-sky-50 py-1">Instructions:</h4>
        {props.steps.map((step, index) => <p key={index} className="mb-1.5">{index + 1}. {step}</p>)}
      </div>
      <p className="text-xs text-slate-500 italic min-h-[1.2em]">
        {currentAudioName ? `Playing: ${currentAudioName}` : (props.ambientSounds && props.ambientSounds.length > 0 ? "Select an ambient sound or focus on your breath." : "Focus on your breath.")}
      </p>
      <div className="flex justify-center space-x-4 mt-6">
        <Button onClick={togglePlay} leftIcon={<i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>} size="lg">
          {buttonText}
        </Button>
        <Button onClick={handleEndSession} variant="secondary" size="lg">End Session</Button>
      </div>
    </div>
  );
};


const BreathingGuide: React.FC<{ props: BreathingInteractiveProps, onClose: () => void }> = ({ props, onClose }) => {
  type ActiveBreathingPhase = 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';
  type BreathingPhaseState = 'idle' | ActiveBreathingPhase;

  const [phase, setPhase] = useState<BreathingPhaseState>('idle');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [cyclesDone, setCyclesDone] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== 'idle' && phaseTimeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => setPhaseTimeLeft(prev => prev - 1), 1000);
    } else if (phaseTimeLeft === 0 && phase !== 'idle') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      let nextPhaseDetermination: BreathingPhaseState = 'idle'; 
      let nextPhaseDuration = 0;
      let incrementCycle = false;

      const currentActivePhase = phase as ActiveBreathingPhase;
      
      if (cyclesDone >= props.repetitions && ( (currentActivePhase === 'exhale' && !props.holdAfterExhale) || currentActivePhase === 'holdAfterExhale') ) {
         setPhase('idle');
         return;
      }
      
      switch (currentActivePhase) {
        case 'inhale':
          nextPhaseDetermination = props.hold ? 'hold' : 'exhale';
          nextPhaseDuration = props.hold || props.exhale;
          break;
        case 'hold':
          nextPhaseDetermination = 'exhale';
          nextPhaseDuration = props.exhale;
          break;
        case 'exhale':
          if (props.holdAfterExhale) {
            nextPhaseDetermination = 'holdAfterExhale';
            nextPhaseDuration = props.holdAfterExhale;
          } else {
            nextPhaseDetermination = 'inhale';
            nextPhaseDuration = props.inhale;
            incrementCycle = true;
          }
          break;
        case 'holdAfterExhale':
          nextPhaseDetermination = 'inhale';
          nextPhaseDuration = props.inhale;
          incrementCycle = true;
          break;
        default: 
          setPhase('idle'); return;
      }
      
      const newCyclesDone = incrementCycle ? cyclesDone + 1 : cyclesDone;

      if (newCyclesDone >= props.repetitions && nextPhaseDetermination === 'inhale' ) {
           setPhase('idle'); 
           if (incrementCycle) setCyclesDone(newCyclesDone);
      } else {
        setPhase(nextPhaseDetermination);
        setPhaseTimeLeft(nextPhaseDuration);
        if (incrementCycle) setCyclesDone(newCyclesDone);
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [phase, phaseTimeLeft, cyclesDone, props]);

  const startExercise = () => {
    setCyclesDone(0);
    setPhase('inhale');
    setPhaseTimeLeft(props.inhale);
  };
  const stopExercise = () => {
    setPhase('idle');
    setPhaseTimeLeft(0);
    if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const getPhaseText = () => {
    if (phase === 'idle') return (cyclesDone >= props.repetitions && phaseTimeLeft === 0) ? "Finished!" : props.patternName;
    return `${phase.charAt(0).toUpperCase() + phase.slice(1)} (${phaseTimeLeft}s)`;
  };
  
  let visualSize = 100; 
  const maxGrowth = 50; 
  if (phase === 'inhale' && props.inhale > 0) {
      visualSize = 100 + ((props.inhale - phaseTimeLeft) / props.inhale) * maxGrowth;
  } else if (phase === 'exhale' && props.exhale > 0) {
      visualSize = 100 + maxGrowth - (((props.exhale - phaseTimeLeft) / props.exhale) * maxGrowth);
  } else if (phase === 'hold') {
      visualSize = 100 + maxGrowth;
  } 
  
  return (
    <div className="space-y-4 text-center text-slate-800">
      <div className="flex justify-center items-center h-48 my-4">
        {props.visualCue === 'circle' && (
          <div className="rounded-full bg-gradient-to-br from-green-400 via-cyan-400 to-blue-400 transition-all duration-1000 ease-in-out" 
               style={{ width: `${visualSize}px`, height: `${visualSize}px` }} aria-hidden="true"></div>
        )}
      </div>
      <p className="text-3xl font-semibold text-blue-500 h-10">{getPhaseText()}</p>
      <p className="text-sm text-slate-600">Cycles: {Math.min(cyclesDone, props.repetitions)} / {props.repetitions}</p>
      <div className="flex justify-center space-x-4 mt-6">
        {phase === 'idle' ? (
          <Button onClick={startExercise} leftIcon={<i className="fas fa-play"></i>} size="lg" disabled={phaseTimeLeft > 0}>
            {(cyclesDone >= props.repetitions && phaseTimeLeft === 0) ? "Restart" : "Start"}
          </Button>
        ) : (
          <Button onClick={stopExercise} leftIcon={<i className="fas fa-stop"></i>} size="lg" variant="secondary">Stop</Button>
        )}
        <Button onClick={onClose} variant={phase === 'idle' ? "secondary" : "ghost"} size="lg">Close</Button>
      </div>
    </div>
  );
};

const GenericContentDisplay: React.FC<{ props: GenericContentInteractiveProps, onClose: () => void }> = ({ props, onClose }) => (
  <div className="space-y-3 text-slate-700">
    <h4 className="text-lg font-semibold text-purple-600">{props.contentTitle}</h4>
    <div className="bg-sky-50 p-3 rounded-md ruled-background ruled-text-display">
      <ul className="list-disc list-outside pl-5 space-y-1 text-sm ">
        {props.contentSteps.map((step, index) => <li key={index}>{step}</li>)}
      </ul>
    </div>
    <div className="flex justify-end mt-6">
      <Button onClick={onClose} variant="secondary">Done</Button>
    </div>
  </div>
);

// --- Chatbot Component ---
const ChatbotModal: React.FC<{ onClose: () => void; show: boolean }> = ({ onClose, show }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [show]); 

   useEffect(() => { 
    if (show && messages.length === 0 && !localStorage.getItem('noesis_chat_greeted')) {
      setMessages([
        { id: generateId(), text: "Hi there! I'm your Noesis wellness companion. How are you feeling, or what's on your mind? 😊", sender: 'bot', timestamp: new Date().toISOString() }
      ]);
      localStorage.setItem('noesis_chat_greeted', 'true');
    }
  }, [show, messages.length]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  if (!show) return null;
  
  const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      text: trimmedInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    
    const loadingBotMessageId = generateId();
    setMessages(prev => [...prev, {id: loadingBotMessageId, text: "Thinking...", sender: 'bot', timestamp: new Date().toISOString(), isLoading: true }]);

    try {
      const botResponseText = await getChatbotResponse(trimmedInput);
      const botMessage: ChatMessage = {
        id: generateId(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => prev.map(msg => msg.id === loadingBotMessageId ? botMessage : msg));

    } catch (error) {
      console.error("Chatbot API error:", error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        text: "I'm having a little trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => prev.map(msg => msg.id === loadingBotMessageId ? errorMessage : msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="chatbot-modal-title"
    >
      <div 
        className={`bg-gradient-to-br from-slate-50 via-sky-50 to-purple-50 p-4 sm:p-6 rounded-xl shadow-2xl max-w-md w-full h-[80vh] sm:h-[70vh] flex flex-col transform transition-all duration-300 ease-out ${isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={handleModalContentClick}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-300">
          <h2 id="chatbot-modal-title" className="text-xl font-semibold text-blue-600 flex items-center">
            <i className="fas fa-comments mr-3 text-blue-500"></i>Wellness Companion
          </h2>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm" 
            aria-label="Close chatbot" 
            className="!text-blue-500 hover:!bg-blue-100 !border-transparent"
          >
            <i className="fas fa-times text-xl"></i>
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 p-2 custom-scrollbar pr-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl shadow transition-opacity duration-300 ${msg.isLoading ? 'opacity-70' : 'opacity-100'} ${
                msg.sender === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : `bg-white text-slate-700 rounded-bl-none border border-slate-200 ${msg.isLoading ? 'italic text-slate-400' : ''}`
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400 text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-slate-300 flex items-center space-x-2">
          <input 
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <Button type="submit" disabled={isLoading || !userInput.trim()} size="md" className="!px-3 !py-3">
             {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
          </Button>
        </form>
      </div>
    </div>
  );
};


interface DashboardPageProps {
  entries: JournalEntry[];
  earnedBadges: string[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ entries, earnedBadges }) => {
  const [moodCalendarData, setMoodCalendarData] = useState<Record<string, {sentiment?: Sentiment, emoji?: string}>>({});
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [therapeuticThemeCounts, setTherapeuticThemeCounts] = useState<Record<string, number>>({});
  const [moodGraphData, setMoodGraphData] = useState<MoodGraphDataPoint[]>([]);
  const [isLoadingMoodGraph, setIsLoadingMoodGraph] = useState(true);

  const prepareMoodGraphData = useCallback((journalEntries: JournalEntry[]): MoodGraphDataPoint[] => {
    const moodMap = new Map<string, { sentiment: Sentiment; moodValue: number }>();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); // 30 days including today

    const entriesByLocalDay: Record<string, JournalEntry[]> = {};
    journalEntries.forEach(entry => {
        const localDate = new Date(entry.date);
        const dayKey = formatDateToYYYYMMDD(localDate);
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
        const dateKey = formatDateToYYYYMMDD(new Date(d));
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
        const dayKey = formatDateToYYYYMMDD(localDate);
        if (!entriesByLocalDay[dayKey]) {
            entriesByLocalDay[dayKey] = [];
        }
        entriesByLocalDay[dayKey].push(entry);

        // For theme counting (last 30 days)
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
        } else if (entriesForTheDay.length > 0 && !data[dateKey]) {
            data[dateKey] = { sentiment: undefined, emoji: undefined }; 
        }
    }
    
    setMoodCalendarData(data);
    setTherapeuticThemeCounts(themeCounts);
    setMoodGraphData(prepareMoodGraphData(entries));
    setIsLoadingMoodGraph(false);
  }, [entries, prepareMoodGraphData]);
  
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
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Your Wellness Dashboard</h2>
      
      <BadgesDisplay earnedBadgeIds={earnedBadges} />
      <MoodGraph data={moodGraphData} isLoading={isLoadingMoodGraph} />
      <DashboardMoodCalendar 
        moodCalendarData={moodCalendarData}
        currentDisplayMonth={currentDisplayMonth}
        onChangeDisplayMonth={changeDisplayMonth}
        localDateFormatter={formatDateToYYYYMMDD}
      />
      <DashboardThemesDisplay sortedTherapeuticThemes={sortedTherapeuticThemes} />
      <DashboardEmotionalTrends entries={entries} />
    </div>
  );
};

interface ChangePasswordModalProps {
  currentPasswordHash: string | null;
  onChangePassword: (newPasswordHash: string) => Promise<void>;
  onClose: () => void;
  show: boolean;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ currentPasswordHash, onChangePassword, onClose, show }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError(null);
      setSuccess(null);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPasswordHash) {
      setError("Cannot change password as no password is currently set.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    const currentPasswordAttemptHash = await simpleHash(currentPassword);
    if (currentPasswordAttemptHash !== currentPasswordHash) {
      setError("Incorrect current password.");
      return;
    }
    if (await simpleHash(newPassword) === currentPasswordHash) {
      setError("New password cannot be the same as the old password.");
      return;
    }

    const newHashedPassword = await simpleHash(newPassword);
    await onChangePassword(newHashedPassword);
    setSuccess("Password changed successfully! The app will lock on next session or if you manually lock it.");
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={onClose}>
      <div 
        className={`bg-white p-6 rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ease-out ${isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-blue-600">Change Password</h2>
          <Button onClick={onClose} variant="ghost" size="sm" aria-label="Close" className="!text-blue-500 hover:!bg-blue-100 !border-transparent">
            <i className="fas fa-times text-xl"></i>
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required 
                 className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          <input type="password" placeholder="New Password (min. 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                 className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
          <Button type="submit" className="w-full" size="lg">Change Password</Button>
        </form>
      </div>
    </div>
  );
};


interface SettingsPageProps {
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  currentPasswordHash: string | null;
  onChangePassword: (newPasswordHash: string) => Promise<void>;
  onRemovePassword: () => void;
  doctorSettings: DoctorShareSettings; 
  setDoctorSettings: React.Dispatch<React.SetStateAction<DoctorShareSettings>>; 
}

const SettingsPage: React.FC<SettingsPageProps> = ({ setJournalEntries, currentPasswordHash, onChangePassword, onRemovePassword, doctorSettings, setDoctorSettings }) => {
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordToRemove, setPasswordToRemove] = useState('');
  const [removePasswordError, setRemovePasswordError] = useState<string | null>(null);
  const navigate = useNavigate(); 

  useEffect(() => localStorage.setItem('noesis_doctor_settings', JSON.stringify(doctorSettings)), [doctorSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setDoctorSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleConnect = () => {
    if (doctorSettings.providerEmail && doctorSettings.providerEmail.includes('@')) {
       setDoctorSettings(prev => ({ ...prev, isConnected: true }));
       setShowConfirmation(`Connection initiated with ${doctorSettings.providerEmail}. (This is a demo feature and does not send real emails or data).`);
    } else { setShowConfirmation("Please enter a valid provider email."); }
    setTimeout(() => setShowConfirmation(null), 5000);
  };
  
  const handleDisconnect = () => {
     setDoctorSettings(prev => ({ ...prev, isConnected: false, providerEmail: '' }));
     setShowConfirmation("Disconnected from provider.");
     setTimeout(() => setShowConfirmation(null), 3000);
  };
  
  const handleAttemptRemovePassword = async () => {
    setRemovePasswordError(null);
    if (!currentPasswordHash) {
      setShowConfirmation("No password is set to remove.");
      setTimeout(() => setShowConfirmation(null), 3000);
      return;
    }
    const attemptHash = await simpleHash(passwordToRemove);
    if (attemptHash === currentPasswordHash) {
      if(window.confirm("Are you sure you want to remove password protection? The app will require setting a new password on next load if you wish to protect it again.")) {
        onRemovePassword();
        setShowConfirmation("Password protection removed. Noesis will prompt for a new password on next load if protection is desired.");
        setTimeout(() => setShowConfirmation(null), 4000);
        setPasswordToRemove('');
      }
    } else {
      setRemovePasswordError("Incorrect password. Cannot remove protection.");
    }
  };


  const sharingOptions = [
    { name: "shareSummary", label: "Share high-level summaries of entries." },
    { name: "shareThemes", label: "Share identified key themes and topics." },
    { name: "shareMoodTrends", label: "Share overall mood trends (calendar view summary)." },
    { name: "alertOnCrisis", label: "Allow AI to suggest alerting provider in case of detected crisis patterns (Requires provider confirmation, demo only)." }
  ];


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Settings</h2>
      {showConfirmation && <Alert message={showConfirmation} type={showConfirmation.includes("valid provider email") || showConfirmation.includes("Failed") || removePasswordError ? "warning" : "success"} onClose={() => setShowConfirmation(null)} />}
      
      {showChangePasswordModal && currentPasswordHash && (
        <ChangePasswordModal 
          currentPasswordHash={currentPasswordHash}
          onChangePassword={async (newHash) => {
            await onChangePassword(newHash);
            setShowChangePasswordModal(false);
            setShowConfirmation("Password changed successfully. Please lock and unlock to test.");
             setTimeout(() => setShowConfirmation(null), 4000);
          }}
          onClose={() => setShowChangePasswordModal(false)}
          show={showChangePasswordModal}
        />
      )}

      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={50}>
         <h3 className="text-xl font-semibold mb-4 text-blue-600">Security & Password</h3>
         {currentPasswordHash ? (
            <div className="space-y-3">
                <Button onClick={() => setShowChangePasswordModal(true)} leftIcon={<i className="fas fa-key"></i>}>Change Password</Button>
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-2">To remove password protection, enter your current password:</p>
                    <input 
                        type="password" 
                        placeholder="Current Password" 
                        value={passwordToRemove} 
                        onChange={e => setPasswordToRemove(e.target.value)}
                        className="p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-blue-500 max-w-xs mr-2"
                    />
                    <Button onClick={handleAttemptRemovePassword} variant="danger" size="sm" disabled={!passwordToRemove}>Remove Password Protection</Button>
                    {removePasswordError && <p className="text-red-500 text-xs mt-1">{removePasswordError}</p>}
                </div>
            </div>
         ) : (
            <p className="text-slate-600">Password protection is not currently set up. The app will prompt on next load if needed.</p>
         )}
      </AnimatedDiv>

      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={100}> 
        <h3 className="text-xl font-semibold mb-1 text-blue-600">Doctor / Therapist Integration (Opt-In)</h3>
        <p className="text-sm text-slate-600 mb-4">This is a conceptual feature. Full entries are NEVER shared. Data sharing would require secure, compliant backend infrastructure not present in this demo. All settings are for demonstration purposes only and operate on local storage.</p>
        {!doctorSettings.isConnected ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="providerEmail" className="block text-sm font-medium text-slate-700 mb-1">Provider's Email (Conceptual):</label>
              <input type="email" id="providerEmail" name="providerEmail" value={doctorSettings.providerEmail || ''} onChange={handleInputChange}
                    className="w-full max-w-md p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                    placeholder="doctor@example.com" />
            </div>
            <Button onClick={handleConnect} disabled={!doctorSettings.providerEmail} leftIcon={<i className="fas fa-user-md"></i>}>Connect (Demo)</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-600 font-semibold">Connected with: {doctorSettings.providerEmail} (Demo Connection)</p>
            <h4 className="text-md font-semibold text-blue-500 mt-4">Sharing Preferences (Conceptual):</h4>
            {sharingOptions.map(item => (
              <div key={item.name} className="flex items-center">
                <input 
                  type="checkbox" 
                  id={item.name} 
                  name={item.name} 
                  checked={doctorSettings[item.name as keyof DoctorShareSettings] as boolean} 
                  onChange={handleInputChange} 
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                <label htmlFor={item.name} className="ml-2 block text-sm text-slate-700">{item.label}</label>
              </div>
            ))}
            <Button onClick={() => navigate('/dashboard/provider-view')} variant="ghost" className="mt-2" leftIcon={<i className="fas fa-eye"></i>}>
                View Dashboard as {doctorSettings.providerEmail || 'Provider'}
            </Button>
            <Button onClick={handleDisconnect} variant="danger" className="mt-4" leftIcon={<i className="fas fa-unlink"></i>}>Disconnect (Demo)</Button>
          </div>
        )}
      </AnimatedDiv>

      <AnimatedDiv className="bg-white p-6 rounded-xl shadow-lg" delay={150}>
        <h3 className="text-xl font-semibold mb-4 text-emerald-600">Data Management</h3>
        <p className="text-sm text-slate-600 mb-2">All journal data is stored locally in your browser. Clearing your browser's site data for Noesis will erase all entries and password settings.</p>
        <Button 
          onClick={() => {
            if (window.confirm("Are you sure you want to delete ALL journal entries and settings (including password) from local storage? This action cannot be undone.")) {
              localStorage.removeItem('noesis_entries');
              localStorage.removeItem('noesis_doctor_settings'); 
              localStorage.removeItem('noesis_password_hash'); 
              localStorage.removeItem('noesis_chat_history'); 
              localStorage.removeItem('noesis_chat_greeted');
              localStorage.removeItem('noesis_earned_badges');
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('noesis_checklist_') || key.startsWith('noesis_daily_social_good_completed_')) {
                  localStorage.removeItem(key);
                }
              });
              setJournalEntries([]); 
              resetChatSession(); 
              window.location.reload(); 
            }
          }}
          variant="danger"
          size="sm"
          leftIcon={<i className="fas fa-trash-alt"></i>}
        >
          Delete All App Data (Entries & Settings)
        </Button>
      </AnimatedDiv>
    </div>
  );
};

export default App;

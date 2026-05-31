/**
 * gameStore.js — Icebreaker AI demo game state
 * Uses Zustand for local state. In production, replace with WebSocket sync.
 */
import { create } from 'zustand';

// Demo icebreaker prompts used when no AI backend
export const DEMO_PROMPTS = [
  "If you could have dinner with anyone, living or dead, who would it be and why?",
  "What's the most unusual skill you have that nobody at work knows about?",
  "If your life had a theme song, what would it be?",
  "What's the weirdest job you've ever had?",
  "If you could only eat one cuisine for the rest of your life, what would it be?",
  "What's something you believed as a child that turned out to be completely wrong?",
  "If you could switch jobs with anyone in the room for a week, who would you choose?",
  "What's your most embarrassing autocorrect story?",
];

// Demo players with pre-set answers for simulation
export const DEMO_PLAYERS = [
  { id: 'p1', name: 'Alex T.', emoji: '🦁', color: '#F97316' },
  { id: 'p2', name: 'Jordan M.', emoji: '🦊', color: '#06B6D4' },
  { id: 'p3', name: 'Sam K.', emoji: '🐺', color: '#10B981' },
  { id: 'p4', name: 'Riley B.', emoji: '🦋', color: '#F59E0B' },
  { id: 'p5', name: 'Morgan L.', emoji: '🦅', color: '#8B5CF6' },
];

// Pre-baked answers per prompt index for the demo
const DEMO_ANSWERS = [
  // Prompt 0 - dinner with anyone
  {
    p1: "Einstein. I'd ask him to explain his theory of relativity in plain English — and then argue about it.",
    p2: "David Attenborough. Imagine the dinner conversation. Every dish becomes a wildlife documentary.",
    p3: "My 70-year-old future self. I need the cheat codes for life.",
    p4: "Nikola Tesla, but I'd make sure we met somewhere with good WiFi.",
    p5: "Gordon Ramsay. Someone has to tell me my cooking is terrible to my face.",
  },
  // Prompt 1 - unusual skill
  {
    p1: "I can fold a fitted sheet perfectly. I consider this my greatest professional achievement.",
    p2: "I know every country's flag by heart. Every. Single. One.",
    p3: "I can open a wine bottle with a shoe. Don't ask how I learned this.",
    p4: "I speak fluent Pig Latin. It's useless but I'm very fast.",
    p5: "I can guess the calorie count of any restaurant meal within 50 calories.",
  },
  // Prompt 2 - theme song
  {
    p1: "Eye of the Tiger — I want everyone to think I have my life together.",
    p2: "Stayin' Alive — it's aspirational at this point in the project.",
    p3: "Yakety Sax. You'd understand if you saw my commute.",
    p4: "Africa by Toto. I don't know why. It just feels right.",
    p5: "All Star by Smash Mouth. I peaked in 2001.",
  },
];

const ICEBREAKER_CATEGORIES = [
  { id: 'work',    label: 'Work & Career', emoji: '💼' },
  { id: 'fun',     label: 'Fun & Hobbies', emoji: '🎮' },
  { id: 'deep',    label: 'Deep Thoughts', emoji: '🧠' },
  { id: 'random',  label: 'Random Chaos', emoji: '🎲' },
  { id: 'team',    label: 'Team Building', emoji: '🤝' },
];

export { ICEBREAKER_CATEGORIES };

export const useGameStore = create((set, get) => ({
  // Session state
  sessionCode: null,
  isHost: false,
  hostName: '',
  category: 'fun',
  players: [],
  phase: 'home', // 'home' | 'lobby' | 'prompt' | 'answering' | 'results' | 'finished'

  // Current round
  roundIndex: 0,
  currentPrompt: '',
  answers: {}, // playerId -> answer text
  aiCommentary: '', // AI-generated commentary on answers
  votes: {}, // playerId -> voted for playerId (most relatable)
  revealIndex: 0, // for animated reveal of answers

  // Demo simulation
  demoJoinedCount: 1,
  demoTimerActive: false,

  // Actions
  startSession: (hostName, category) => {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    set({
      sessionCode: code,
      isHost: true,
      hostName,
      category,
      players: [{ id: 'host', name: hostName, emoji: '👑', color: '#7C3AED' }],
      phase: 'lobby',
      roundIndex: 0,
      answers: {},
      aiCommentary: '',
      demoJoinedCount: 1,
    });
  },

  joinSession: (code, playerName) => {
    const emoji = ['😎', '🤓', '🦄', '🎯', '🚀'][Math.floor(Math.random() * 5)];
    set({
      sessionCode: code.toUpperCase(),
      isHost: false,
      players: [{ id: 'me', name: playerName, emoji, color: '#F97316' }],
      phase: 'lobby',
    });
  },

  // Simulate players joining for demo
  addDemoPlayer: () => {
    const { demoJoinedCount, players } = get();
    if (demoJoinedCount >= DEMO_PLAYERS.length) return;
    const next = DEMO_PLAYERS[demoJoinedCount];
    set({
      players: [...players, next],
      demoJoinedCount: demoJoinedCount + 1,
    });
  },

  startRound: () => {
    const { roundIndex } = get();
    const prompt = DEMO_PROMPTS[roundIndex % DEMO_PROMPTS.length];
    set({
      phase: 'prompt',
      currentPrompt: prompt,
      answers: {},
      aiCommentary: '',
      revealIndex: 0,
    });
  },

  showAnswering: () => set({ phase: 'answering' }),

  submitAnswer: (playerId, answer) => {
    set(state => ({
      answers: { ...state.answers, [playerId]: answer },
    }));
  },

  // For demo: fill in pre-baked answers from other players
  fillDemoAnswers: (myAnswer) => {
    const { roundIndex, players } = get();
    const promptIdx = roundIndex % DEMO_ANSWERS.length;
    const demoAnswerSet = DEMO_ANSWERS[promptIdx] || {};
    const newAnswers = { host: myAnswer };
    players.forEach(p => {
      if (p.id !== 'host' && demoAnswerSet[p.id]) {
        newAnswers[p.id] = demoAnswerSet[p.id];
      }
    });
    set({ answers: newAnswers });
  },

  showResults: (commentary) => {
    set({ phase: 'results', aiCommentary: commentary || '', revealIndex: 0 });
  },

  revealNext: () => {
    set(state => ({ revealIndex: state.revealIndex + 1 }));
  },

  nextRound: () => {
    set(state => ({
      roundIndex: state.roundIndex + 1,
      phase: 'prompt',
      answers: {},
      aiCommentary: '',
      revealIndex: 0,
      currentPrompt: DEMO_PROMPTS[(state.roundIndex + 1) % DEMO_PROMPTS.length],
    }));
  },

  endSession: () => {
    set({
      phase: 'finished',
      sessionCode: null,
    });
  },

  resetGame: () => {
    set({
      sessionCode: null,
      isHost: false,
      players: [],
      phase: 'home',
      roundIndex: 0,
      answers: {},
      aiCommentary: '',
      demoJoinedCount: 1,
    });
  },
}));

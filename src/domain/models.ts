export type Position = 'Defense' | 'Forward' | 'Goalie';
export type HomeAway = 'home' | 'away';
export type ShiftRating = 'good' | 'neutral' | 'poor' | 'unrated';

export const EVENT_TYPES = [
  'GOAL',
  'ASSIST',
  'SOG',
  'SHOT',
  'BLOCK',
  'TAKEAWAY',
  'GIVEAWAY',
  'PLUS',
  'MINUS'
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type Player = {
  id: string;
  name: string;
  jerseyNumber: string;
  position: Position;
  teamName: string;
  season: string;
};

export type Shift = {
  id: string;
  period: number;
  startGameSeconds: number;
  endGameSeconds: number | null;
  startTimestamp: number;
  endTimestamp: number | null;
  durationSeconds: number | null;
  rating: ShiftRating;
};

export type GameEvent = {
  id: string;
  type: EventType;
  period: number;
  gameSeconds: number | null;
  shiftId: string | null;
  timestamp: number;
  source: 'live' | 'manual';
};

export type Game = {
  id: string;
  date: string;
  opponent: string;
  homeAway: HomeAway;
  location: string;
  tournamentName: string;
  periodLengthSeconds: number;
  periodCount: number;
  currentPeriod: number;
  clockSeconds: number;
  clockRunning: boolean;
  clockStartedAt: number | null;
  clockStartedFromSeconds: number;
  periodClockSeconds: Record<number, number>;
  shifts: Shift[];
  events: GameEvent[];
  status: 'live' | 'complete';
  ourScore: number;
  opponentScore: number;
  notes: string;
  createdAt: number;
  completedAt: number | null;
};

export type AppData = {
  player: Player | null;
  games: Game[];
  activeGameId: string | null;
};

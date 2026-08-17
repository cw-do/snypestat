export type Position = 'Defense' | 'Forward' | 'Goalie';
export type HomeAway = 'home' | 'away';
export type ShiftRating = 'good' | 'neutral' | 'poor' | 'unrated';
export type CameraRatio = '16:9' | '4:3';
export type PenaltyType = 'MINOR' | 'DOUBLE_MINOR' | 'MAJOR' | 'MISCONDUCT' | 'GAME_MISCONDUCT' | 'MAJOR_GAME' | 'CUSTOM';

export type CameraSettings = {
  enabled: boolean;
  ratio: CameraRatio;
  zoom: number;
  audioEnabled: boolean;
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  enabled: false,
  ratio: '16:9',
  zoom: 0,
  audioEnabled: true
};

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
  videoRecordingStartedAt: number | null;
  video: ShiftVideo | null;
};

export type ShiftVideo = {
  id: string;
  uri: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  ratio: CameraRatio;
  zoom: number;
  audioEnabled: boolean;
  storage: 'document' | 'cache';
};

export type GameEvent = {
  id: string;
  type: EventType;
  period: number;
  gameSeconds: number | null;
  shiftId: string | null;
  timestamp: number;
  source: 'live' | 'manual';
  videoOffsetMs: number | null;
};

export type GamePenalty = {
  id: string;
  type: PenaltyType;
  assessedSeconds: number;
  ejected: boolean;
  period: number;
  gameSeconds: number | null;
  shiftId: string | null;
  timestamp: number;
  source: 'live' | 'manual';
  videoOffsetMs: number | null;
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
  penalties: GamePenalty[];
  minorPenaltySeconds: number;
  cameraSettings: CameraSettings;
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

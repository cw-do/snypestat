import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DEFAULT_CAMERA_SETTINGS } from '../domain/models';

const STORAGE_KEY = '@snypestat/data/v1';
export const EMPTY_DATA: AppData = { player: null, games: [], activeGameId: null };

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as AppData;
    return {
      player: parsed.player ?? null,
      games: Array.isArray(parsed.games)
        ? parsed.games.map((game) => ({
            ...game,
            tournamentName: game.tournamentName ?? '',
            periodClockSeconds: game.periodClockSeconds ?? { [game.currentPeriod]: game.clockSeconds },
            cameraSettings: { ...DEFAULT_CAMERA_SETTINGS, ...(game.cameraSettings ?? {}) },
            minorPenaltySeconds: game.minorPenaltySeconds ?? 120,
            penalties: Array.isArray(game.penalties) ? game.penalties.map((penalty) => ({ ...penalty, videoOffsetMs: penalty.videoOffsetMs ?? null })) : [],
            shifts: game.shifts.map((shift) => ({ ...shift, videoRecordingStartedAt: shift.videoRecordingStartedAt ?? shift.video?.startedAt ?? null, video: shift.video ?? null })),
            events: game.events.map((event) => ({ ...event, source: event.source ?? 'live', videoOffsetMs: event.videoOffsetMs ?? null }))
          }))
        : [],
      activeGameId: parsed.activeGameId ?? null
    };
  } catch {
    return EMPTY_DATA;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

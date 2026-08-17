import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { NeuroPuckBrand } from './components/NeuroPuckBrand';
import { colors } from './design/tokens';
import { EMPTY_DATA, loadData, saveData } from './data/storage';
import { AppData, CameraSettings, DEFAULT_CAMERA_SETTINGS, EventType, Game, GamePenalty, PenaltyType, Player, Shift, ShiftVideo } from './domain/models';
import { effectiveClock } from './domain/stats';
import { GameSummaryScreen } from './screens/GameSummaryScreen';
import { GameReviewScreen } from './screens/GameReviewScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LiveGameScreen } from './screens/LiveGameScreen';
import { NewGameInput, NewGameScreen } from './screens/NewGameScreen';
import { PlayerSetupScreen } from './screens/PlayerSetupScreen';
import { SeasonDashboardScreen } from './screens/SeasonDashboardScreen';
import { TeamSearchScreen } from './screens/TeamSearchScreen';

type Route =
  | { name: 'home' }
  | { name: 'new-game' }
  | { name: 'season' }
  | { name: 'team-search'; query?: string }
  | { name: 'live'; gameId: string }
  | { name: 'summary'; gameId: string }
  | { name: 'review'; gameId: string; returnTo: 'live' | 'summary' };

export function SnypeStatApp() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    void loadData().then((saved) => {
      setData(saved);
      if (saved.activeGameId && saved.games.some((game) => game.id === saved.activeGameId && game.status === 'live')) setRoute({ name: 'live', gameId: saved.activeGameId });
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void saveData(data);
  }, [data, loaded]);

  const updateGame = useCallback((id: string, updater: (game: Game) => Game) => {
    setData((current) => ({ ...current, games: current.games.map((game) => game.id === id ? updater(game) : game) }));
  }, []);
  const activeId = route.name === 'live' || route.name === 'summary' || route.name === 'review' ? route.gameId : null;
  const activeGame = useMemo(() => activeId ? data.games.find((game) => game.id === activeId) ?? null : null, [activeId, data.games]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loaded || !data.player || route.name === 'home') return false;
      if (route.name === 'live' && activeGame?.cameraSettings.enabled) return false;
      if (route.name === 'review') {
        setRoute(route.returnTo === 'live'
          ? { name: 'live', gameId: route.gameId }
          : { name: 'summary', gameId: route.gameId });
        return true;
      }
      setRoute({ name: 'home' });
      return true;
    });
    return () => subscription.remove();
  }, [activeGame?.cameraSettings.enabled, data.player, loaded, route]);

  if (!loaded) return <View style={styles.loading}><NeuroPuckBrand productLine /><ActivityIndicator color={colors.blue} size="small" /></View>;
  if (!data.player) return <PlayerSetupScreen onSave={(player: Player) => setData((current) => ({ ...current, player }))} />;

  const createGame = (input: NewGameInput) => {
    const now = Date.now();
    const game: Game = {
      id: `game-${now}`,
      ...input,
      currentPeriod: 1,
      clockSeconds: input.periodLengthSeconds,
      clockRunning: false,
      clockStartedAt: null,
      clockStartedFromSeconds: input.periodLengthSeconds,
      periodClockSeconds: { 1: input.periodLengthSeconds },
      shifts: [], events: [], penalties: [], cameraSettings: { ...DEFAULT_CAMERA_SETTINGS }, status: 'live', ourScore: 0, opponentScore: 0, notes: '', createdAt: now, completedAt: null
    };
    setData((current) => ({ ...current, games: [...current.games, game], activeGameId: game.id }));
    setRoute({ name: 'live', gameId: game.id });
  };

  const toggleClock = (game: Game) => updateGame(game.id, (current) => {
    const now = Date.now();
    if (current.clockRunning) {
      const clockSeconds = effectiveClock(current, now);
      return { ...current, clockSeconds, clockRunning: false, clockStartedAt: null, clockStartedFromSeconds: clockSeconds, periodClockSeconds: { ...current.periodClockSeconds, [current.currentPeriod]: clockSeconds } };
    }
    if (current.clockSeconds <= 0) return current;
    return { ...current, clockRunning: true, clockStartedAt: now, clockStartedFromSeconds: current.clockSeconds };
  });
  const selectPeriod = (game: Game, period: number) => updateGame(game.id, (current) => {
    if (period === current.currentPeriod || period < 1 || period > current.periodCount) return current;
    const now = Date.now();
    const currentClock = effectiveClock(current, now);
    const clocks = { ...current.periodClockSeconds, [current.currentPeriod]: currentClock };
    const targetClock = clocks[period] ?? current.periodLengthSeconds;
    return {
      ...current,
      currentPeriod: period,
      clockSeconds: targetClock,
      clockRunning: false,
      clockStartedAt: null,
      clockStartedFromSeconds: targetClock,
      periodClockSeconds: clocks,
      shifts: closeOpenShift(current.shifts, now, currentClock)
    };
  });
  const endPeriod = (game: Game) => updateGame(game.id, (current) => {
    const now = Date.now();
    return {
      ...current,
      clockSeconds: 0,
      clockRunning: false,
      clockStartedAt: null,
      clockStartedFromSeconds: 0,
      periodClockSeconds: { ...current.periodClockSeconds, [current.currentPeriod]: 0 },
      shifts: closeOpenShift(current.shifts, now, 0)
    };
  });
  const toggleShift = (game: Game) => {
    const active = game.shifts.find((shift) => shift.endTimestamp == null);
    if (active) endShift(game, Date.now());
    else startShift(game, `shift-${Date.now()}`, Date.now(), null);
  };
  const startShift = (game: Game, shiftId: string, startedAt: number, videoRecordingStartedAt: number | null) => updateGame(game.id, (current) => {
    if (current.shifts.some((shift) => shift.endTimestamp == null)) return current;
    const clock = effectiveClock(current, startedAt);
    const shift: Shift = { id: shiftId, period: current.currentPeriod, startGameSeconds: clock, endGameSeconds: null, startTimestamp: startedAt, endTimestamp: null, durationSeconds: null, rating: 'unrated', videoRecordingStartedAt, video: null };
    return { ...current, shifts: [...current.shifts, shift] };
  });
  const endShift = (game: Game, endedAt: number) => updateGame(game.id, (current) => {
    const clock = effectiveClock(current, endedAt);
    const active = current.shifts.find((shift) => shift.endTimestamp == null);
    if (!active) return current;
    return { ...current, shifts: current.shifts.map((shift) => shift.id === active.id ? { ...shift, endGameSeconds: clock, endTimestamp: endedAt, durationSeconds: Math.max(0, Math.round((endedAt - shift.startTimestamp) / 1000)) } : shift) };
  });
  const recordEvent = (game: Game, type: EventType) => updateGame(game.id, (current) => {
    const now = Date.now();
    const active = current.shifts.find((shift) => shift.endTimestamp == null);
    return { ...current, events: [...current.events, { id: `event-${now}-${type}`, type, period: current.currentPeriod, gameSeconds: effectiveClock(current, now), shiftId: active?.id ?? null, timestamp: now, source: 'live', videoOffsetMs: active?.videoRecordingStartedAt != null ? Math.max(0, now - active.videoRecordingStartedAt) : null }] };
  });
  const undo = (game: Game) => updateGame(game.id, (current) => ({ ...current, events: current.events.slice(0, -1) }));
  const deleteEvent = (game: Game, eventId: string) => updateGame(game.id, (current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId) }));
  const adjustEvent = (game: Game, type: EventType, delta: 1 | -1) => updateGame(game.id, (current) => {
    if (delta === 1) {
      const now = Date.now();
      return { ...current, events: [...current.events, { id: `event-${now}-${type}-edit`, type, period: current.currentPeriod, gameSeconds: null, shiftId: null, timestamp: now, source: 'manual', videoOffsetMs: null }] };
    }
    let index = -1;
    for (let i = current.events.length - 1; i >= 0; i -= 1) {
      if (current.events[i].type === type || (type === 'SOG' && current.events[i].type === 'SHOT')) { index = i; break; }
    }
    return index < 0 ? current : { ...current, events: current.events.filter((_, eventIndex) => eventIndex !== index) };
  });
  const attachShiftVideo = (game: Game, shiftId: string, video: ShiftVideo) => updateGame(game.id, (current) => ({ ...current, shifts: current.shifts.map((shift) => shift.id === shiftId ? { ...shift, videoRecordingStartedAt: video.startedAt, video } : shift) }));
  const markRecordingFailed = (game: Game, shiftId: string) => updateGame(game.id, (current) => ({ ...current, shifts: current.shifts.map((shift) => shift.id === shiftId ? { ...shift, videoRecordingStartedAt: null } : shift) }));
  const updateCameraSettings = (game: Game, settings: Partial<CameraSettings>) => updateGame(game.id, (current) => ({ ...current, cameraSettings: { ...current.cameraSettings, ...settings } }));
  const recordPenalty = (game: Game, penalty: Omit<GamePenalty, 'id'>) => updateGame(game.id, (current) => ({ ...current, penalties: [...current.penalties, { ...penalty, id: `penalty-${penalty.timestamp}-${penalty.type}` }] }));
  const adjustPim = (game: Game, deltaSeconds: 30 | -30) => updateGame(game.id, (current) => {
    if (deltaSeconds > 0) {
      const now = Date.now();
      const penalty: GamePenalty = { id: `penalty-${now}-manual`, type: 'CUSTOM', assessedSeconds: 30, ejected: false, period: current.currentPeriod, gameSeconds: null, shiftId: null, timestamp: now, source: 'manual', videoOffsetMs: null };
      return { ...current, penalties: [...current.penalties, penalty] };
    }
    const penalties = [...current.penalties];
    const last = penalties[penalties.length - 1];
    if (!last) return current;
    if (last.assessedSeconds <= 30) penalties.pop();
    else penalties[penalties.length - 1] = { ...last, assessedSeconds: last.assessedSeconds - 30 };
    return { ...current, penalties };
  });
  const deletePenalty = (game: Game, penaltyId: string) => updateGame(game.id, (current) => ({ ...current, penalties: current.penalties.filter((penalty) => penalty.id !== penaltyId) }));
  const finish = (game: Game, atPeriodEnd = false) => {
    const now = Date.now();
    updateGame(game.id, (current) => {
      const clock = atPeriodEnd ? 0 : effectiveClock(current, now);
      return {
        ...current, status: 'complete', clockSeconds: clock, clockRunning: false, clockStartedAt: null, completedAt: now,
        periodClockSeconds: { ...current.periodClockSeconds, [current.currentPeriod]: clock },
        shifts: current.shifts.map((shift) => shift.endTimestamp == null ? { ...shift, endGameSeconds: clock, endTimestamp: now, durationSeconds: Math.max(0, Math.round((now - shift.startTimestamp) / 1000)) } : shift)
      };
    });
    setData((current) => ({ ...current, activeGameId: null }));
    setRoute({ name: 'summary', gameId: game.id });
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const suggestedTournament = [...data.games].sort((a, b) => b.createdAt - a.createdAt).find((game) => game.date === yesterdayKey && game.tournamentName)?.tournamentName ?? '';
  const previousOpponents = Array.from(new Set([...data.games].sort((a, b) => b.createdAt - a.createdAt).map((game) => game.opponent).filter(Boolean)));

  if (route.name === 'new-game') return <NewGameScreen onBack={() => setRoute({ name: 'home' })} onStart={createGame} suggestedTournament={suggestedTournament} previousOpponents={previousOpponents} />;
  if (route.name === 'season') return <SeasonDashboardScreen player={data.player} games={data.games} onBack={() => setRoute({ name: 'home' })} />;
  if (route.name === 'team-search') return <TeamSearchScreen player={data.player} games={data.games} initialQuery={route.query} onBack={() => setRoute({ name: 'home' })} />;
  if (route.name === 'live' && activeGame) return <LiveGameScreen game={activeGame} player={data.player} onToggleClock={() => toggleClock(activeGame)} onNextPeriod={() => selectPeriod(activeGame, activeGame.currentPeriod + 1)} onSelectPeriod={(period) => selectPeriod(activeGame, period)} onEndPeriod={() => endPeriod(activeGame)} onToggleShift={() => toggleShift(activeGame)} onCameraStartShift={(shiftId, startedAt) => startShift(activeGame, shiftId, startedAt, startedAt)} onCameraEndShift={(endedAt) => endShift(activeGame, endedAt)} onAttachShiftVideo={(shiftId, video) => attachShiftVideo(activeGame, shiftId, video)} onRecordingFailed={(shiftId) => markRecordingFailed(activeGame, shiftId)} onCameraSettings={(settings) => updateCameraSettings(activeGame, settings)} onPenalty={(penalty) => recordPenalty(activeGame, penalty)} onEvent={(type) => recordEvent(activeGame, type)} onUndo={() => undo(activeGame)} onReview={() => setRoute({ name: 'review', gameId: activeGame.id, returnTo: 'live' })} onFinish={(atPeriodEnd) => finish(activeGame, atPeriodEnd)} />;
  if (route.name === 'summary' && activeGame) return <GameSummaryScreen game={activeGame} player={data.player} onDone={() => setRoute({ name: 'home' })} onReview={() => setRoute({ name: 'review', gameId: activeGame.id, returnTo: 'summary' })} />;
  if (route.name === 'review' && activeGame) return <GameReviewScreen game={activeGame} onBack={() => route.returnTo === 'live' ? setRoute({ name: 'live', gameId: activeGame.id }) : setRoute({ name: 'summary', gameId: activeGame.id })} onAdjust={(type, delta) => adjustEvent(activeGame, type, delta)} onAdjustPim={(delta) => adjustPim(activeGame, delta)} onDelete={(eventId) => deleteEvent(activeGame, eventId)} onDeletePenalty={(penaltyId) => deletePenalty(activeGame, penaltyId)} />;
  return <HomeScreen player={data.player} games={data.games} onNewGame={() => setRoute({ name: 'new-game' })} onOpenSeason={() => setRoute({ name: 'season' })} onTeamSearch={(query) => setRoute({ name: 'team-search', query })} onOpenGame={(id) => { const game = data.games.find((item) => item.id === id); if (game?.status === 'live') setRoute({ name: 'live', gameId: id }); else if (game) setRoute({ name: 'summary', gameId: id }); }} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, backgroundColor: colors.ink } });

function closeOpenShift(shifts: Shift[], now: number, gameSeconds: number): Shift[] {
  return shifts.map((shift) => shift.endTimestamp == null ? {
    ...shift,
    endGameSeconds: gameSeconds,
    endTimestamp: now,
    durationSeconds: Math.max(0, Math.round((now - shift.startTimestamp) / 1000))
  } : shift);
}

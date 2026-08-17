import { EventType, Game, Shift } from './models';

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function effectiveClock(game: Game, now = Date.now()): number {
  if (!game.clockRunning || game.clockStartedAt == null) return game.clockSeconds;
  const elapsed = Math.max(0, Math.floor((now - game.clockStartedAt) / 1000));
  return Math.max(0, game.clockStartedFromSeconds - elapsed);
}

export function effectiveShiftDuration(shift: Shift, now = Date.now()): number {
  if (shift.durationSeconds != null) return shift.durationSeconds;
  return Math.max(0, Math.floor((now - shift.startTimestamp) / 1000));
}

export function eventCount(game: Game, type: EventType): number {
  return game.events.reduce((sum, event) => sum + (event.type === type ? 1 : 0), 0);
}

export function summarizeGame(game: Game, now = Date.now()) {
  const totalToi = game.shifts.reduce((sum, shift) => sum + effectiveShiftDuration(shift, now), 0);
  const shiftCount = game.shifts.length;
  return {
    totalToi,
    shiftCount,
    averageShift: shiftCount ? Math.round(totalToi / shiftCount) : 0,
    longestShift: shiftCount
      ? Math.max(...game.shifts.map((shift) => effectiveShiftDuration(shift, now)))
      : 0,
    goals: eventCount(game, 'GOAL'),
    assists: eventCount(game, 'ASSIST'),
    points: eventCount(game, 'GOAL') + eventCount(game, 'ASSIST'),
    shots: eventCount(game, 'SOG') + eventCount(game, 'GOAL') + eventCount(game, 'SHOT'),
    blocks: eventCount(game, 'BLOCK'),
    takeaways: eventCount(game, 'TAKEAWAY'),
    giveaways: eventCount(game, 'GIVEAWAY'),
    plusMinus: eventCount(game, 'PLUS') - eventCount(game, 'MINUS'),
    penaltySeconds: game.penalties.reduce((sum, penalty) => sum + penalty.assessedSeconds, 0),
    recordedShifts: game.shifts.filter((shift) => shift.video != null).length
  };
}

export function summarizeSeason(games: Game[]) {
  const completed = games.filter((game) => game.status === 'complete');
  const totals = completed.map((game) => summarizeGame(game));
  const count = completed.length;
  return {
    games: count,
    averageToi: count ? Math.round(totals.reduce((sum, stat) => sum + stat.totalToi, 0) / count) : 0,
    averageShifts: count
      ? totals.reduce((sum, stat) => sum + stat.shiftCount, 0) / count
      : 0,
    blocksPerGame: count
      ? totals.reduce((sum, stat) => sum + stat.blocks, 0) / count
      : 0,
    plusMinus: totals.reduce((sum, stat) => sum + stat.plusMinus, 0)
  };
}

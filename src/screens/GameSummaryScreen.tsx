import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Card, Metric, ScreenHeader } from '../components/ui';
import { colors, spacing, tracking } from '../design/tokens';
import { Game, Player } from '../domain/models';
import { formatClock, summarizeGame } from '../domain/stats';

export function GameSummaryScreen({ game, player, onDone, onReview }: { game: Game; player: Player; onDone: () => void; onReview: () => void }) {
  const insets = useSafeAreaInsets();
  const stats = summarizeGame(game);
  const periodToi = Array.from({ length: game.periodCount }, (_, index) => game.shifts.filter((shift) => shift.period === index + 1).reduce((sum, shift) => sum + (shift.durationSeconds ?? 0), 0));
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.complete}>GAME COMPLETE</Text>
      <ScreenHeader eyebrow={`${game.date} · ${player.name}`} title={`${game.homeAway === 'home' ? 'VS' : '@'} ${game.opponent.toUpperCase()}`} />
      {game.tournamentName ? <Text style={styles.tournament}>{game.tournamentName.toUpperCase()}</Text> : null}
      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>TOTAL TIME ON ICE</Text><Text style={styles.heroValue}>{formatClock(stats.totalToi)}</Text>
        <View style={styles.metricRow}><Metric label="Shifts" value={String(stats.shiftCount)} /><Metric label="Avg shift" value={formatClock(stats.averageShift)} /><Metric label="Longest" value={formatClock(stats.longestShift)} /></View>
      </Card>
      <View style={styles.periodRow}>{periodToi.map((seconds, index) => <View key={index} style={styles.period}><Text style={styles.periodLabel}>P{index + 1}</Text><Text style={styles.periodValue}>{formatClock(seconds)}</Text></View>)}</View>
      <Text style={styles.section}>GAME EVENTS</Text>
      <Card style={styles.statsGrid}>
        <Stat label="G" value={stats.goals} /><Stat label="A" value={stats.assists} /><Stat label="TP" value={stats.points} /><Stat label="SOG" value={stats.shots} /><Stat label="BLK" value={stats.blocks} /><Stat label="TK" value={stats.takeaways} /><Stat label="GV" value={stats.giveaways} /><Stat label="PLUS / MINUS" value={stats.plusMinus > 0 ? `+${stats.plusMinus}` : stats.plusMinus} accent={stats.plusMinus >= 0 ? colors.green : colors.red} /><Stat label="PIM" value={formatClock(stats.penaltySeconds)} accent={stats.penaltySeconds ? colors.red : colors.ice} /><Stat label="SHIFT FILM" value={`${stats.recordedShifts} / ${stats.shiftCount}`} accent={stats.recordedShifts ? colors.blue : colors.muted} />
      </Card>
      <ActionButton label="REVIEW & EDIT STATS" tone="ghost" onPress={onReview} />
      <ActionButton label="BACK TO HOME" onPress={onDone} />
    </ScrollView>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  complete: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide },
  tournament: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: -8 },
  heroCard: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  heroLabel: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide },
  heroValue: { color: colors.ice, fontSize: 52, lineHeight: 57, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  metricRow: { width: '100%', flexDirection: 'row', paddingHorizontal: spacing.sm },
  periodRow: { flexDirection: 'row', gap: spacing.sm },
  period: { flex: 1, backgroundColor: colors.inkRaised, borderRadius: 12, borderWidth: 1, borderColor: colors.lineSoft, alignItems: 'center', padding: spacing.md },
  periodLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  periodValue: { color: colors.ice, fontSize: 15, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 0, overflow: 'hidden' },
  stat: { width: '50%', minHeight: 82, justifyContent: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderRightWidth: 1, borderColor: colors.lineSoft },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  statValue: { color: colors.ice, fontSize: 25, fontWeight: '900', marginTop: 4 }
});

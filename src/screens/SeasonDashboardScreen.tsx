import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Metric, NavBackButton, ScreenHeader } from '../components/ui';
import { TrendChart } from '../components/TrendChart';
import { StatGuideModal } from '../components/StatGuideModal';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { Game, Player } from '../domain/models';
import { formatClock, summarizeGame, summarizeSeason } from '../domain/stats';

type MetricKey = 'toi' | 'points' | 'sog' | 'blocks' | 'takeaways' | 'giveaways' | 'plusMinus';
type ViewMode = 'game' | 'cumulative';
const METRICS: Array<{ key: MetricKey; label: string; short: string }> = [
  { key: 'toi', label: 'Time on Ice', short: 'TOI' }, { key: 'points', label: 'Total Points', short: 'TP' },
  { key: 'sog', label: 'Shots on Goal', short: 'SOG' }, { key: 'blocks', label: 'Blocked Shots', short: 'BLK' },
  { key: 'takeaways', label: 'Takeaways', short: 'TK' }, { key: 'giveaways', label: 'Giveaways', short: 'GV' },
  { key: 'plusMinus', label: 'Plus / Minus', short: '+/−' }
];

export function SeasonDashboardScreen({ player, games, onBack }: { player: Player; games: Game[]; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [metric, setMetric] = useState<MetricKey>('toi');
  const [mode, setMode] = useState<ViewMode>('game');
  const [guideOpen, setGuideOpen] = useState(false);
  const completed = useMemo(() => [...games].filter((game) => game.status === 'complete').sort((a, b) => a.createdAt - b.createdAt), [games]);
  const gameStats = useMemo(() => completed.map((game) => ({ game, stats: summarizeGame(game) })), [completed]);
  const season = summarizeSeason(completed);
  const perGameValues = gameStats.map(({ stats }) => valueFor(metric, stats));
  const values = mode === 'game' ? perGameValues : perGameValues.reduce<number[]>((result, value) => [...result, (result.at(-1) ?? 0) + value], []);
  const selected = METRICS.find((item) => item.key === metric)!;
  const totalPoints = gameStats.reduce((sum, item) => sum + item.stats.points, 0);
  const insight = trendInsight(metric, perGameValues);
  const formatValue = (value: number) => metric === 'toi' ? formatClock(value) : String(Math.round(value * 10) / 10);

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
      <NavBackButton onPress={onBack} />
      <ScreenHeader eyebrow={player.season} title="Season pulse" action={<Pressable onPress={() => setGuideOpen(true)} style={styles.guideButton}><Text style={styles.guideButtonText}>?  STAT GUIDE</Text></Pressable>} />
      <Text style={styles.player}>{player.name.toUpperCase()}  ·  #{player.jerseyNumber || '—'}  ·  {player.position.toUpperCase()}</Text>
      <Card style={styles.heroCard}><View style={styles.metricRow}><Metric label="Games" value={String(season.games)} /><Metric label="TOI / Game" value={formatClock(season.averageToi)} /><Metric label="Points" value={String(totalPoints)} /><Metric label="+ / −" value={season.plusMinus > 0 ? `+${season.plusMinus}` : String(season.plusMinus)} accent={season.plusMinus >= 0 ? colors.green : colors.red} /></View></Card>

      {completed.length ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricTabs}>{METRICS.map((item) => <Pressable key={item.key} onPress={() => setMetric(item.key)} style={[styles.metricTab, metric === item.key && styles.metricTabActive]}><Text style={[styles.metricTabText, metric === item.key && styles.metricTabTextActive]}>{item.short}</Text></Pressable>)}</ScrollView>
        <Card style={styles.chartCard}>
          <View style={styles.chartHead}><View><Text style={styles.chartKicker}>TREND</Text><Text style={styles.chartTitle}>{selected.label}</Text></View><View style={styles.modeToggle}>{(['game', 'cumulative'] as ViewMode[]).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.mode, mode === item && styles.modeActive]}><Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item === 'game' ? 'BY GAME' : 'TOTAL'}</Text></Pressable>)}</View></View>
          <TrendChart values={values} formatValue={formatValue} />
          <View style={[styles.insight, { borderColor: insight.color }]}><View style={[styles.insightDot, { backgroundColor: insight.color }]} /><View style={{ flex: 1 }}><Text style={[styles.insightLabel, { color: insight.color }]}>{insight.label}</Text><Text style={styles.insightText}>{insight.text}</Text></View></View>
          <Text style={styles.disclaimer}>Trend direction is context—not a performance grade. Opponent strength, role and game situation matter.</Text>
        </Card>
        <Text style={styles.section}>GAME-BY-GAME</Text>
        {[...gameStats].reverse().map(({ game, stats }, reverseIndex) => <View key={game.id} style={styles.gameRow}><View style={styles.gameNumber}><Text style={styles.gameNumberText}>G{gameStats.length - reverseIndex}</Text></View><View style={{ flex: 1 }}><Text style={styles.opponent}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}</Text><Text style={styles.gameMeta}>{game.date}{game.tournamentName ? ` · ${game.tournamentName}` : ''}</Text></View><View style={styles.gameStat}><Text style={styles.gameStatValue}>{formatClock(stats.totalToi)}</Text><Text style={styles.gameStatLabel}>TOI</Text></View><View style={styles.gameStat}><Text style={styles.gameStatValue}>{stats.points}</Text><Text style={styles.gameStatLabel}>TP</Text></View><View style={styles.gameStat}><Text style={styles.gameStatValue}>{stats.shots}</Text><Text style={styles.gameStatLabel}>SOG</Text></View></View>)}
      </> : <Card style={styles.empty}><Text style={styles.emptyTitle}>NO COMPLETED GAMES YET</Text><Text style={styles.emptyText}>Complete a game to start building the player’s season trend.</Text></Card>}
      <StatGuideModal visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </ScrollView>
  );
}

type Stats = ReturnType<typeof summarizeGame>;
function valueFor(metric: MetricKey, stats: Stats): number {
  if (metric === 'toi') return stats.totalToi;
  if (metric === 'points') return stats.points;
  if (metric === 'sog') return stats.shots;
  return stats[metric];
}

function trendInsight(metric: MetricKey, values: number[]): { label: string; text: string; color: string } {
  if (values.length < 4) return { label: 'BUILDING BASELINE', text: `${values.length} game${values.length === 1 ? '' : 's'} recorded. Four or more games create a more useful comparison.`, color: colors.blue };
  const windowSize = Math.min(3, Math.floor(values.length / 2));
  const recent = average(values.slice(-windowSize));
  const previous = average(values.slice(-windowSize * 2, -windowSize));
  const change = previous === 0 ? (recent === 0 ? 0 : 1) : (recent - previous) / Math.abs(previous);
  const steady = Math.abs(change) < 0.08;
  const percent = Math.round(Math.abs(change) * 100);
  if (steady) return { label: 'STEADY', text: `The last ${windowSize} games are within 8% of the previous ${windowSize}.`, color: colors.blue };
  const up = change > 0;
  const desirable = metric === 'giveaways' ? !up : up;
  const direction = up ? 'higher' : 'lower';
  const context = metric === 'toi' || metric === 'plusMinus' ? 'Review role and game context alongside this change.' : desirable ? 'The recent direction is encouraging; keep watching the sample grow.' : 'This is worth watching, but a short run does not define the season.';
  return { label: desirable ? 'POSITIVE DIRECTION' : 'WATCH TREND', text: `Recent ${METRICS.find((item) => item.key === metric)?.short} is ${percent}% ${direction} than the previous ${windowSize} games. ${context}`, color: desirable ? colors.green : colors.amber };
}
function average(values: number[]): number { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  player: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: -5 },
  guideButton: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.blueDeep, alignItems: 'center', justifyContent: 'center' },
  guideButtonText: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  heroCard: { paddingVertical: spacing.xl },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricTabs: { gap: spacing.sm, paddingVertical: spacing.xs },
  metricTab: { minWidth: 54, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  metricTabActive: { backgroundColor: '#103747', borderColor: colors.blue },
  metricTabText: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  metricTabTextActive: { color: colors.blue },
  chartCard: { paddingHorizontal: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  chartHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartKicker: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: tracking.wide },
  chartTitle: { color: colors.ice, fontSize: 20, fontWeight: '900', marginTop: 3 },
  modeToggle: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: colors.ink },
  mode: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.pill },
  modeActive: { backgroundColor: colors.surfaceHigh },
  modeText: { color: colors.mutedDim, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  modeTextActive: { color: colors.ice },
  insight: { flexDirection: 'row', gap: spacing.sm, borderLeftWidth: 2, backgroundColor: colors.inkRaised, borderRadius: radius.sm, padding: spacing.md },
  insightDot: { width: 7, height: 7, borderRadius: 4, marginTop: 3 },
  insightLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  insightText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  disclaimer: { color: colors.mutedDim, fontSize: 9, lineHeight: 14 },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: spacing.md },
  gameRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: radius.md },
  gameNumber: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#103747' },
  gameNumberText: { color: colors.blue, fontSize: 10, fontWeight: '900' },
  opponent: { color: colors.ice, fontSize: 12, fontWeight: '900' },
  gameMeta: { color: colors.muted, fontSize: 8, marginTop: 4 },
  gameStat: { width: 37, alignItems: 'flex-end' },
  gameStatValue: { color: colors.ice, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  gameStatLabel: { color: colors.mutedDim, fontSize: 8, fontWeight: '900', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, marginTop: spacing.lg },
  emptyTitle: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' }
});

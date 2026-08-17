import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Card, Metric, ScreenHeader } from '../components/ui';
import { StatGuideModal } from '../components/StatGuideModal';
import { NeuroPuckBrand } from '../components/NeuroPuckBrand';
import { colors, spacing, tracking } from '../design/tokens';
import { Game, Player } from '../domain/models';
import { formatClock, summarizeGame, summarizeSeason } from '../domain/stats';

type Props = { player: Player; games: Game[]; onNewGame: () => void; onOpenGame: (id: string) => void; onOpenSeason: () => void; onTeamSearch: (query?: string) => void };

export function HomeScreen({ player, games, onNewGame, onOpenGame, onOpenSeason, onTeamSearch }: Props) {
  const insets = useSafeAreaInsets();
  const [guideOpen, setGuideOpen] = useState(false);
  const season = summarizeSeason(games);
  const recent = [...games].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }]}>
      <View style={styles.top}><View style={styles.logoMark} /><Text style={styles.logo}>SNYPE STAT</Text><View style={{ flex: 1 }} /><Pressable onPress={() => setGuideOpen(true)} hitSlop={10}><Text style={styles.help}>?  STAT GUIDE</Text></Pressable><View style={styles.offlineDot} /><Text style={styles.offline}>OFFLINE READY</Text></View>
      <ScreenHeader eyebrow={player.season} title={player.name.toUpperCase()} action={<View style={styles.number}><Text style={styles.numberText}>#{player.jerseyNumber || '—'}</Text></View>} />
      <Text style={styles.playerMeta}>{player.position.toUpperCase()}{player.teamName ? `  ·  ${player.teamName.toUpperCase()}` : ''}</Text>
      <Pressable onPress={onOpenSeason} style={({ pressed }) => pressed && { opacity: 0.78 }}>
        <Card style={styles.seasonCard}>
          <View style={styles.pulseHead}><Text style={styles.cardKicker}>SEASON PULSE</Text><Text style={styles.pulseOpen}>VIEW TRENDS  ›</Text></View>
          <View style={styles.metricRow}>
            <Metric label="Games" value={String(season.games)} />
            <Metric label="TOI / Game" value={formatClock(season.averageToi)} />
            <Metric label="Blocks / G" value={season.blocksPerGame.toFixed(1)} />
            <Metric label="+ / −" value={season.plusMinus > 0 ? `+${season.plusMinus}` : String(season.plusMinus)} accent={season.plusMinus >= 0 ? colors.green : colors.red} />
          </View>
        </Card>
      </Pressable>
      <ActionButton label="START NEW GAME" onPress={onNewGame} style={styles.start} />
      <ActionButton label="TEAM SEARCH" tone="ghost" onPress={() => onTeamSearch()} />
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>RECENT GAMES</Text><Text style={styles.sectionCount}>{games.length} TOTAL</Text></View>
      {recent.length ? recent.map((game) => <GameRow key={game.id} game={game} onPress={() => onOpenGame(game.id)} onTeamPress={() => onTeamSearch(game.opponent)} />) : (
        <Card style={styles.empty}><Text style={styles.emptyTitle}>READY FOR PUCK DROP</Text><Text style={styles.emptyText}>Your completed games and development trend will appear here.</Text></Card>
      )}
      <View style={styles.brandFooter}><View style={styles.brandDivider} /><NeuroPuckBrand compact productLine /></View>
      <StatGuideModal visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </ScrollView>
  );
}

function GameRow({ game, onPress, onTeamPress }: { game: Game; onPress: () => void; onTeamPress: () => void }) {
  const stats = summarizeGame(game);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.gameRow, pressed && { opacity: 0.75 }]}>
      <View style={[styles.statusBar, { backgroundColor: game.status === 'live' ? colors.green : colors.blue }]} />
      <View style={{ flex: 1 }}><Pressable onPress={(event) => { event.stopPropagation(); onTeamPress(); }} hitSlop={8} style={styles.teamLink}><Text style={styles.opponent}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}</Text><Text style={styles.teamLinkHint}>TEAM INFO  ↗</Text></Pressable><Text style={styles.gameMeta}>{game.date}{game.tournamentName ? ` · ${game.tournamentName}` : ''}  ·  {game.status === 'live' ? `LIVE · P${game.currentPeriod}` : `${stats.shiftCount} SHIFTS`}</Text></View>
      <View style={styles.toi}><Text style={styles.toiValue}>{formatClock(stats.totalToi)}</Text><Text style={styles.toiLabel}>TOI</Text></View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.blue, marginRight: 8, transform: [{ skewX: '-12deg' }] },
  logo: { color: colors.ice, fontSize: 12, fontWeight: '900', letterSpacing: tracking.wide },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green, marginRight: 6 },
  offline: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  help: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginRight: spacing.md },
  number: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  numberText: { color: colors.blue, fontSize: 17, fontWeight: '900' },
  playerMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: tracking.label, marginTop: -10 },
  seasonCard: { gap: spacing.lg, overflow: 'hidden' },
  cardKicker: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide },
  pulseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseOpen: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metricRow: { flexDirection: 'row', gap: spacing.md },
  start: { minHeight: 72 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: tracking.label },
  sectionCount: { color: colors.mutedDim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  gameRow: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.lineSoft, paddingRight: spacing.lg, overflow: 'hidden' },
  statusBar: { alignSelf: 'stretch', width: 4 },
  opponent: { color: colors.ice, fontSize: 15, fontWeight: '900' },
  teamLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamLinkHint: { color: colors.blue, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  gameMeta: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 5, letterSpacing: 0.5 },
  toi: { alignItems: 'flex-end' },
  toiValue: { color: colors.ice, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  toiLabel: { color: colors.mutedDim, fontSize: 9, fontWeight: '900', marginTop: 2 },
  chevron: { color: colors.mutedDim, fontSize: 26 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { color: colors.ice, fontSize: 14, fontWeight: '900', letterSpacing: 1.4 },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
  brandFooter: { marginTop: spacing.lg, gap: spacing.lg },
  brandDivider: { height: 1, backgroundColor: colors.lineSoft }
});

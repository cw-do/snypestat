import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Card, Metric, NavBackButton, ScreenHeader } from '../components/ui';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { Game, Player } from '../domain/models';
import { formatClock, summarizeGame } from '../domain/stats';

type Props = { player: Player; games: Game[]; initialQuery?: string; onBack: () => void };

export function TeamSearchScreen({ player, games, initialQuery = '', onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery === 'Opponent' ? '' : initialQuery);
  const completed = games.filter((game) => game.status === 'complete');
  const recentOpponents = useMemo(() => Array.from(new Set([...games].sort((a, b) => b.createdAt - a.createdAt).map((game) => game.opponent).filter((name) => name && name !== 'Opponent'))).slice(0, 6), [games]);
  const matches = completed.filter((game) => query.trim() && normalize(game.opponent).includes(normalize(query)));
  const matchStats = matches.map(summarizeGame);
  const seasonStart = Number.parseInt(player.season.match(/\d{4}/)?.[0] ?? '', 10) || new Date().getFullYear();
  const currentSeason = `${seasonStart}–${String((seasonStart + 1) % 100).padStart(2, '0')}`;
  const previousSeason = `${seasonStart - 1}–${String(seasonStart % 100).padStart(2, '0')}`;
  const releaseDate = new Date(seasonStart, 8, 30);
  const isPreseason = new Date() < releaseDate;

  const openTeamSearch = () => {
    const trimmed = query.trim();
    const url = trimmed
      ? `https://www.google.com/search?q=${encodeURIComponent(`site:myhockeyrankings.com/team-info ${trimmed} ${currentSeason}`)}`
      : `https://myhockeyrankings.com/rankings/${seasonStart}`;
    void Linking.openURL(url);
  };
  const openRankings = (year: number) => void Linking.openURL(`https://myhockeyrankings.com/rankings/${year}`);
  const averageToi = matchStats.length ? Math.round(matchStats.reduce((sum, stats) => sum + stats.totalToi, 0) / matchStats.length) : 0;
  const totals = matchStats.reduce((result, stats) => ({ points: result.points + stats.points, sog: result.sog + stats.shots, blocks: result.blocks + stats.blocks, plusMinus: result.plusMinus + stats.plusMinus }), { points: 0, sog: 0, blocks: 0, plusMinus: 0 });

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
      <NavBackButton onPress={onBack} />
      <ScreenHeader eyebrow="Opponent intelligence" title="Team search" />
      <Text style={styles.lead}>Find the official MYHockey team page, then compare it with your player’s own history against that opponent.</Text>

      <View>
        <Text style={styles.label}>TEAM NAME</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Nashville Jr Predators 14U AAA" placeholderTextColor={colors.mutedDim} autoCapitalize="words" returnKeyType="search" onSubmitEditing={openTeamSearch} style={styles.input} />
      </View>
      <ActionButton label="FIND ON MYHOCKEY" onPress={openTeamSearch} />
      <Text style={styles.sourceNote}>Opens official MYHockey results in your browser. StatCam Hockey does not scrape or republish MYHockey data.</Text>

      {recentOpponents.length ? <><Text style={styles.section}>RECENT OPPONENTS</Text><View style={styles.chips}>{recentOpponents.map((name) => <Pressable key={name} onPress={() => setQuery(name)} style={[styles.chip, query === name && styles.chipActive]}><Text numberOfLines={1} style={[styles.chipText, query === name && styles.chipTextActive]}>{name}</Text></Pressable>)}</View></> : null}

      <Text style={styles.section}>MYHOCKEY SEASONS</Text>
      <View style={styles.seasonRow}>
        <SeasonLink label="CURRENT" season={currentSeason} status={isPreseason ? 'Ratings begin Sep 30' : 'Ratings available'} active onPress={() => openRankings(seasonStart)} />
        <SeasonLink label="PREVIOUS" season={previousSeason} status="Final season data" onPress={() => openRankings(seasonStart - 1)} />
      </View>
      <Card style={styles.mhrNote}><Text style={styles.mhrNoteTitle}>{isPreseason ? 'PRESEASON CONTEXT' : 'RATING CONTEXT'}</Text><Text style={styles.mhrNoteText}>{isPreseason ? `${currentSeason} ratings and rankings are not published until September 30. Use the previous season as context, not as a prediction.` : 'Rating is a mathematical estimate of team performance. Ranking is the team’s position within a category; the two are related but not interchangeable.'}</Text></Card>

      <Text style={styles.section}>YOUR PLAYER VS THIS TEAM</Text>
      {matches.length ? <>
        <Card style={styles.historyCard}><View style={styles.historyMetrics}><Metric label="Games" value={String(matches.length)} /><Metric label="TOI / Game" value={formatClock(averageToi)} /><Metric label="Points" value={String(totals.points)} /><Metric label="+ / −" value={totals.plusMinus > 0 ? `+${totals.plusMinus}` : String(totals.plusMinus)} accent={totals.plusMinus >= 0 ? colors.green : colors.red} /></View><View style={styles.secondary}><Text style={styles.secondaryText}>{totals.sog} SOG</Text><Text style={styles.secondaryDot}>•</Text><Text style={styles.secondaryText}>{totals.blocks} BLK</Text></View></Card>
        {[...matches].reverse().map((game) => { const stats = summarizeGame(game); return <View key={game.id} style={styles.gameRow}><View><Text style={styles.gameDate}>{game.date}</Text><Text style={styles.gameOpponent}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}</Text></View><View style={{ flex: 1 }} /><MiniStat label="TOI" value={formatClock(stats.totalToi)} /><MiniStat label="TP" value={String(stats.points)} /><MiniStat label="SOG" value={String(stats.shots)} /></View>; })}
      </> : <Card style={styles.empty}><Text style={styles.emptyTitle}>{query.trim() ? 'NO LOCAL MATCHUPS' : 'SELECT AN OPPONENT'}</Text><Text style={styles.emptyText}>{query.trim() ? 'MYHockey may still have this team. Your player history will appear after a completed tracked game.' : 'Search a team or choose one from recent opponents.'}</Text></Card>}
    </ScrollView>
  );
}

function SeasonLink({ label, season, status, active, onPress }: { label: string; season: string; status: string; active?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.seasonLink, active && styles.seasonLinkActive, pressed && { opacity: 0.75 }]}><Text style={[styles.seasonLabel, active && { color: colors.blue }]}>{label}</Text><Text style={styles.seasonValue}>{season}</Text><Text style={styles.seasonStatus}>{status}</Text><Text style={styles.openText}>OPEN RANKINGS  ↗</Text></Pressable>;
}
function MiniStat({ label, value }: { label: string; value: string }) { return <View style={styles.miniStat}><Text style={styles.miniValue}>{value}</Text><Text style={styles.miniLabel}>{label}</Text></View>; }
function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim(); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 20, maxWidth: 350 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.label, marginBottom: spacing.sm },
  input: { height: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, color: colors.ice, fontSize: 16, fontWeight: '700', paddingHorizontal: spacing.lg },
  sourceNote: { color: colors.mutedDim, fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: spacing.md },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { maxWidth: '100%', minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blueSurface },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  chipTextActive: { color: colors.blue },
  seasonRow: { flexDirection: 'row', gap: spacing.sm },
  seasonLink: { flex: 1, minHeight: 132, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.surface, padding: spacing.md },
  seasonLinkActive: { borderColor: colors.blueDeep },
  seasonLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  seasonValue: { color: colors.ice, fontSize: 19, fontWeight: '900', marginTop: 7 },
  seasonStatus: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 5 },
  openText: { color: colors.blue, fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginTop: 'auto' },
  mhrNote: { backgroundColor: colors.inkRaised, borderColor: colors.line },
  mhrNoteTitle: { color: colors.amber, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  mhrNoteText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: spacing.sm },
  historyCard: { gap: spacing.lg },
  historyMetrics: { flexDirection: 'row', gap: spacing.sm },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryText: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  secondaryDot: { color: colors.mutedDim },
  gameRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: radius.md, padding: spacing.md },
  gameDate: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  gameOpponent: { color: colors.ice, fontSize: 10, fontWeight: '900', marginTop: 4, maxWidth: 155 },
  miniStat: { width: 36, alignItems: 'flex-end' },
  miniValue: { color: colors.ice, fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  miniLabel: { color: colors.mutedDim, fontSize: 7, fontWeight: '900', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { color: colors.ice, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  emptyText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: spacing.sm }
});

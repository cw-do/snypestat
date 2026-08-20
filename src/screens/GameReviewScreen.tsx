import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Card, NavBackButton, ScreenHeader } from '../components/ui';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { EventType, Game, GameEvent, Shift } from '../domain/models';
import { eventCount, formatClock } from '../domain/stats';
import { shiftVideoExists } from '../services/shiftVideoStorage';

const EDITABLE: Array<{ type: EventType; label: string }> = [
  { type: 'GOAL', label: 'G' }, { type: 'ASSIST', label: 'A' }, { type: 'SOG', label: 'SOG' },
  { type: 'BLOCK', label: 'BLK' }, { type: 'TAKEAWAY', label: 'TK' }, { type: 'GIVEAWAY', label: 'GV' },
  { type: 'PLUS', label: '+' }, { type: 'MINUS', label: '−' }
];

const LABELS: Partial<Record<EventType, string>> = {
  GOAL: 'Goal', ASSIST: 'Assist', SOG: 'Shot on Goal', SHOT: 'Shot on Goal', BLOCK: 'Blocked Shot',
  TAKEAWAY: 'Takeaway', GIVEAWAY: 'Giveaway', PLUS: 'Plus', MINUS: 'Minus'
};

type Props = {
  game: Game;
  onBack: () => void;
  onAdjust: (type: EventType, delta: 1 | -1) => void;
  onAdjustPim: (deltaSeconds: 30 | -30) => void;
  onDelete: (eventId: string) => void;
  onDeletePenalty: (penaltyId: string) => void;
};

export function GameReviewScreen({ game, onBack, onAdjust, onAdjustPim, onDelete, onDeletePenalty }: Props) {
  const insets = useSafeAreaInsets();
  const shiftIndex = new Map(game.shifts.map((shift, index) => [shift.id, index + 1]));
  const events = [...game.events].reverse();
  const pimSeconds = game.penalties.reduce((sum, penalty) => sum + penalty.assessedSeconds, 0);
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
      <NavBackButton label="GAME" onPress={onBack} />
      <ScreenHeader eyebrow="Game review" title="Stats, shifts & film" />
      <Text style={styles.matchup}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}{game.tournamentName ? ` · ${game.tournamentName.toUpperCase()}` : ''}</Text>

      <Text style={styles.section}>ADJUST TOTALS</Text>
      <Card style={styles.adjustCard}>
        {EDITABLE.map(({ type, label }) => {
          const count = type === 'SOG' ? eventCount(game, 'SOG') + eventCount(game, 'GOAL') + eventCount(game, 'SHOT') : eventCount(game, type);
          const removableCount = type === 'SOG' ? eventCount(game, 'SOG') + eventCount(game, 'SHOT') : count;
          return <View key={type} style={styles.adjustRow}><Text style={styles.adjustLabel}>{label}</Text><View style={styles.stepper}><Pressable onPress={() => onAdjust(type, -1)} disabled={removableCount === 0} style={[styles.step, removableCount === 0 && { opacity: 0.3 }]}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.count}>{count}</Text><Pressable onPress={() => onAdjust(type, 1)} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable></View></View>;
        })}
      </Card>
      <Text style={styles.adjustNote}>Manual additions keep working without a game-clock or video timestamp.</Text>

      <Card style={styles.pimCard}>
        <View><Text style={styles.adjustLabel}>PIM</Text><Text style={styles.pimHint}>Official assessed penalty minutes</Text></View>
        <View style={styles.stepper}><Pressable onPress={() => onAdjustPim(-30)} disabled={!game.penalties.length} style={[styles.step, !game.penalties.length && { opacity: 0.3 }]}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.pimCount}>{formatClock(pimSeconds)}</Text><Pressable onPress={() => onAdjustPim(30)} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable></View>
      </Card>
      <Text style={styles.adjustNote}>PIM adjustments use 30-second steps. Live penalties keep their type and game context.</Text>

      <View style={styles.sectionRow}><Text style={styles.section}>PENALTY TIMELINE</Text><Text style={styles.eventTotal}>{game.penalties.length} PENALTIES</Text></View>
      {game.penalties.length ? [...game.penalties].reverse().map((penalty) => <View key={penalty.id} style={styles.eventRow}><View style={styles.timeBox}><Text style={styles.eventPeriod}>{penalty.source === 'manual' ? 'MANUAL' : `P${penalty.period}`}</Text><Text style={styles.eventTime}>{penalty.gameSeconds == null ? '—' : formatClock(penalty.gameSeconds)}</Text></View><View style={{ flex: 1 }}><Text style={styles.eventName}>{penalty.type.replaceAll('_', ' ')}</Text><Text style={styles.eventMeta}>{formatClock(penalty.assessedSeconds)} PIM{penalty.ejected ? ' · EJECTED' : ''}{penalty.videoOffsetMs != null ? ` · VIDEO ${formatClock(penalty.videoOffsetMs / 1000)}` : ''}</Text></View><Pressable onPress={() => onDeletePenalty(penalty.id)} hitSlop={10} style={styles.delete}><Text style={styles.deleteText}>DELETE</Text></Pressable></View>) : <Card><Text style={styles.empty}>No penalties recorded.</Text></Card>}

      <View style={styles.sectionRow}><Text style={styles.section}>EVENT TIMELINE</Text><Text style={styles.eventTotal}>{events.length} EVENTS</Text></View>
      {events.length ? events.map((event) => {
        const shift = event.shiftId ? shiftIndex.get(event.shiftId) : null;
        return <View key={event.id} style={styles.eventRow}><View style={styles.timeBox}><Text style={styles.eventPeriod}>{event.source === 'manual' ? 'MANUAL' : `P${event.period}`}</Text><Text style={styles.eventTime}>{event.gameSeconds == null ? '—' : formatClock(event.gameSeconds)}</Text></View><View style={{ flex: 1 }}><Text style={styles.eventName}>{LABELS[event.type] ?? event.type}</Text><Text style={styles.eventMeta}>{event.source === 'manual' ? 'Time unknown · Manual adjustment' : `${shift ? `Shift ${shift}` : 'No active shift'} · ${new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}${event.videoOffsetMs != null ? ` · VIDEO ${formatClock(event.videoOffsetMs / 1000)}` : ''}`}</Text></View><Pressable onPress={() => onDelete(event.id)} hitSlop={10} style={styles.delete}><Text style={styles.deleteText}>DELETE</Text></Pressable></View>;
      }) : <Card><Text style={styles.empty}>No events recorded yet.</Text></Card>}

      <View style={styles.sectionRow}><Text style={styles.section}>SHIFT FILM</Text><Text style={styles.eventTotal}>{game.shifts.filter((shift) => shift.video).length} RECORDED</Text></View>
      {game.shifts.map((shift, index) => <ShiftFilmCard key={shift.id} shift={shift} index={index} events={game.events.filter((event) => event.shiftId === shift.id)} />)}
    </ScrollView>
  );
}

function ShiftFilmCard({ shift, index, events }: { shift: Shift; index: number; events: GameEvent[] }) {
  const video = shift.video;
  const available = Boolean(video && shiftVideoExists(video.uri));
  return <View style={styles.filmCard}>
    <View style={styles.shiftRow}><Text style={styles.shiftNumber}>SHIFT {index + 1}</Text><Text style={styles.shiftPeriod}>P{shift.period}</Text><Text style={styles.shiftClock}>{formatClock(shift.startGameSeconds)} → {shift.endGameSeconds == null ? 'LIVE' : formatClock(shift.endGameSeconds)}</Text><Text style={styles.shiftDuration}>{shift.durationSeconds == null ? 'LIVE' : formatClock(shift.durationSeconds)}</Text></View>
    {video && available ? <ShiftVideoPlayer uri={video.uri} ratio={video.ratio} events={events} /> : <View style={styles.noVideo}><Text style={styles.noVideoTitle}>{video ? 'VIDEO FILE UNAVAILABLE' : 'NO VIDEO FOR THIS SHIFT'}</Text><Text style={styles.noVideoCopy}>{video ? 'The file may have been removed by the device.' : 'Shift timing and stats are still available.'}</Text></View>}
  </View>;
}

function ShiftVideoPlayer({ uri, ratio, events }: { uri: string; ratio: string; events: GameEvent[] }) {
  const player = useVideoPlayer(uri);
  const bookmarks = events.filter((event) => event.videoOffsetMs != null).sort((a, b) => (a.videoOffsetMs ?? 0) - (b.videoOffsetMs ?? 0));
  const jump = (offsetMs: number) => { player.currentTime = offsetMs / 1000; player.play(); };
  return <View style={styles.videoArea}><VideoView player={player} style={[styles.video, { aspectRatio: ratio === '4:3' ? 4 / 3 : 16 / 9 }]} nativeControls contentFit="contain" /><View style={styles.bookmarks}>{bookmarks.length ? bookmarks.map((event) => <Pressable key={event.id} onPress={() => jump(event.videoOffsetMs ?? 0)} style={styles.bookmark}><Text style={styles.bookmarkType}>{event.type}</Text><Text style={styles.bookmarkTime}>{formatClock((event.videoOffsetMs ?? 0) / 1000)}</Text></Pressable>) : <Text style={styles.noBookmarks}>No video bookmarks in this shift.</Text>}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink }, content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  matchup: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: -5 },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, eventTotal: { color: colors.mutedDim, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  adjustCard: { paddingVertical: 0 }, adjustRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  adjustLabel: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.blue, fontSize: 20, fontWeight: '700' },
  count: { color: colors.ice, width: 28, textAlign: 'center', fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] }, adjustNote: { color: colors.mutedDim, fontSize: 10, lineHeight: 15, paddingHorizontal: spacing.xs },
  pimCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pimHint: { color: colors.muted, fontSize: 9, marginTop: 4 }, pimCount: { color: colors.ice, width: 66, textAlign: 'center', fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  eventRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing.md }, timeBox: { width: 55 },
  eventPeriod: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, eventTime: { color: colors.ice, fontSize: 15, fontWeight: '900', marginTop: 3, fontVariant: ['tabular-nums'] },
  eventName: { color: colors.ice, fontSize: 13, fontWeight: '900' }, eventMeta: { color: colors.muted, fontSize: 9, marginTop: 4 }, delete: { paddingVertical: spacing.sm }, deleteText: { color: colors.red, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, empty: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  filmCard: { overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.surface }, shiftRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.inkRaised, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  shiftNumber: { color: colors.ice, width: 58, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, shiftPeriod: { color: colors.blue, fontSize: 10, fontWeight: '900' }, shiftClock: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] }, shiftDuration: { color: colors.ice, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  noVideo: { minHeight: 74, alignItems: 'center', justifyContent: 'center', padding: spacing.md }, noVideoTitle: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, noVideoCopy: { color: colors.mutedDim, fontSize: 9, marginTop: 4 },
  videoArea: { padding: spacing.sm, gap: spacing.sm }, video: { width: '100%', maxHeight: 360, borderRadius: radius.sm, backgroundColor: colors.black }, bookmarks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bookmark: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.blueDeep, backgroundColor: colors.blueSurface }, bookmarkType: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }, bookmarkTime: { color: colors.ice, fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] }, noBookmarks: { color: colors.mutedDim, fontSize: 9, paddingHorizontal: spacing.xs }
});

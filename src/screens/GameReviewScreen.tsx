import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, NavBackButton, ScreenHeader } from '../components/ui';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { EventType, Game } from '../domain/models';
import { eventCount, formatClock } from '../domain/stats';

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
  onDelete: (eventId: string) => void;
};

export function GameReviewScreen({ game, onBack, onAdjust, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const shiftIndex = new Map(game.shifts.map((shift, index) => [shift.id, index + 1]));
  const events = [...game.events].reverse();
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
      <NavBackButton label="GAME" onPress={onBack} />
      <ScreenHeader eyebrow="Game review" title="Stats & timeline" />
      <Text style={styles.matchup}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}{game.tournamentName ? `  ·  ${game.tournamentName.toUpperCase()}` : ''}</Text>

      <Text style={styles.section}>ADJUST TOTALS</Text>
      <Card style={styles.adjustCard}>
        {EDITABLE.map(({ type, label }) => {
          const count = type === 'SOG' ? eventCount(game, 'SOG') + eventCount(game, 'GOAL') + eventCount(game, 'SHOT') : eventCount(game, type);
          const removableCount = type === 'SOG' ? eventCount(game, 'SOG') + eventCount(game, 'SHOT') : count;
          return <View key={type} style={styles.adjustRow}><Text style={styles.adjustLabel}>{label}</Text><View style={styles.stepper}><Pressable onPress={() => onAdjust(type, -1)} disabled={removableCount === 0} style={[styles.step, removableCount === 0 && { opacity: 0.3 }]}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.count}>{count}</Text><Pressable onPress={() => onAdjust(type, 1)} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable></View></View>;
        })}
      </Card>
      <Text style={styles.adjustNote}>Adding a stat uses the current period and game-clock position. Removing deletes the latest matching event.</Text>

      <View style={styles.sectionRow}><Text style={styles.section}>EVENT TIMELINE</Text><Text style={styles.eventTotal}>{events.length} EVENTS</Text></View>
      {events.length ? events.map((event) => {
        const shift = event.shiftId ? shiftIndex.get(event.shiftId) : null;
        return <View key={event.id} style={styles.eventRow}><View style={styles.timeBox}><Text style={styles.eventPeriod}>{event.source === 'manual' ? 'MANUAL' : `P${event.period}`}</Text><Text style={styles.eventTime}>{event.gameSeconds == null ? '—' : formatClock(event.gameSeconds)}</Text></View><View style={{ flex: 1 }}><Text style={styles.eventName}>{LABELS[event.type] ?? event.type}</Text><Text style={styles.eventMeta}>{event.source === 'manual' ? 'Time unknown · Manual adjustment' : `${shift ? `Shift ${shift}` : 'No active shift'} · ${new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`}</Text></View><Pressable onPress={() => onDelete(event.id)} hitSlop={10} style={styles.delete}><Text style={styles.deleteText}>DELETE</Text></Pressable></View>;
      }) : <Card><Text style={styles.empty}>No events recorded yet.</Text></Card>}

      <Text style={styles.section}>SHIFT TIMELINE</Text>
      {game.shifts.map((shift, index) => <View key={shift.id} style={styles.shiftRow}><Text style={styles.shiftNumber}>SHIFT {index + 1}</Text><Text style={styles.shiftPeriod}>P{shift.period}</Text><Text style={styles.shiftClock}>{formatClock(shift.startGameSeconds)} → {shift.endGameSeconds == null ? 'LIVE' : formatClock(shift.endGameSeconds)}</Text><Text style={styles.shiftDuration}>{shift.durationSeconds == null ? 'LIVE' : formatClock(shift.durationSeconds)}</Text></View>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  matchup: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: -5 },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide, marginTop: spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eventTotal: { color: colors.mutedDim, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  adjustCard: { paddingVertical: 0 },
  adjustRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  adjustLabel: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.blue, fontSize: 20, fontWeight: '700' },
  count: { color: colors.ice, width: 28, textAlign: 'center', fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  adjustNote: { color: colors.mutedDim, fontSize: 10, lineHeight: 15, paddingHorizontal: spacing.xs },
  eventRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineSoft, padding: spacing.md },
  timeBox: { width: 55 },
  eventPeriod: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eventTime: { color: colors.ice, fontSize: 15, fontWeight: '900', marginTop: 3, fontVariant: ['tabular-nums'] },
  eventName: { color: colors.ice, fontSize: 13, fontWeight: '900' },
  eventMeta: { color: colors.muted, fontSize: 9, marginTop: 4 },
  delete: { paddingVertical: spacing.sm },
  deleteText: { color: colors.red, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  shiftRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.lineSoft },
  shiftNumber: { color: colors.ice, width: 58, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  shiftPeriod: { color: colors.blue, fontSize: 10, fontWeight: '900' },
  shiftClock: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  shiftDuration: { color: colors.ice, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] }
});

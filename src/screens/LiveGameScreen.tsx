import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ActionButton } from '../components/ui';
import { StatGuideModal } from '../components/StatGuideModal';
import { PenaltyModal } from '../components/PenaltyModal';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { CameraSettings, EventType, Game, GamePenalty, PenaltyType, Player, ShiftVideo } from '../domain/models';
import { effectiveClock, effectiveShiftDuration, formatClock, summarizeGame } from '../domain/stats';
import { CameraShiftMode, LivePenaltyContext } from './CameraShiftMode';

type Props = {
  game: Game;
  player: Player;
  onToggleClock: () => void;
  onNextPeriod: () => void;
  onSelectPeriod: (period: number) => void;
  onEndPeriod: () => void;
  onToggleShift: () => void;
  onCameraStartShift: (shiftId: string, startedAt: number) => void;
  onCameraEndShift: (endedAt: number) => void;
  onAttachShiftVideo: (shiftId: string, video: ShiftVideo) => void;
  onRecordingFailed: (shiftId: string) => void;
  onCameraSettings: (settings: Partial<CameraSettings>) => void;
  onPenalty: (penalty: Omit<GamePenalty, 'id'>) => void;
  onEvent: (type: EventType) => void;
  onUndo: () => void;
  onReview: () => void;
  onFinish: (atPeriodEnd?: boolean) => void;
};

const EVENTS: Array<{ type: EventType; label: string; tone?: 'good' | 'bad' }> = [
  { type: 'GOAL', label: 'G' }, { type: 'ASSIST', label: 'A' },
  { type: 'SOG', label: 'SOG' }, { type: 'BLOCK', label: 'BLK' },
  { type: 'TAKEAWAY', label: 'TAKEAWAY', tone: 'good' }, { type: 'GIVEAWAY', label: 'GIVEAWAY', tone: 'bad' },
  { type: 'PLUS', label: '+', tone: 'good' }, { type: 'MINUS', label: '−', tone: 'bad' }
];

export function LiveGameScreen(props: Props) {
  const { game, player } = props;
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState<EventType | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [penaltyContext, setPenaltyContext] = useState<LivePenaltyContext | null>(null);
  const lastTap = useRef<{ type: EventType; at: number } | null>(null);
  const activeShift = game.shifts.find((shift) => shift.endTimestamp == null) ?? null;
  const clock = effectiveClock(game, now);
  const stats = useMemo(() => summarizeGame(game, now), [game, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(timer);
  }, [flash]);

  const event = (type: EventType) => {
    const tappedAt = Date.now();
    if (lastTap.current?.type === type && tappedAt - lastTap.current.at < 320) return;
    lastTap.current = { type, at: tappedAt };
    props.onEvent(type);
    setFlash(type);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };
  const toggleShift = () => {
    props.onToggleShift();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };
  const isFinalPeriod = game.currentPeriod === game.periodCount;
  const confirmFinish = () => Alert.alert('End this game?', 'The current shift will be closed and the game summary created.', [{ text: 'Keep tracking', style: 'cancel' }, { text: 'End game', style: 'destructive', onPress: () => props.onFinish(false) }]);
  const confirmEndPeriod = () => isFinalPeriod
    ? Alert.alert(`End Period ${game.currentPeriod} and finish the game?`, 'The clock will move to 00:00, the active shift will close, and the game summary will be created.', [{ text: 'Keep tracking', style: 'cancel' }, { text: 'End game', style: 'destructive', onPress: () => props.onFinish(true) }])
    : Alert.alert(`End Period ${game.currentPeriod}?`, 'The clock will move to 00:00 and any active shift will close.', [{ text: 'Cancel', style: 'cancel' }, { text: 'End period', style: 'destructive', onPress: props.onEndPeriod }]);

  const openPenalty = (context?: LivePenaltyContext) => {
    const timestamp = Date.now();
    const captured = context ?? {
      period: game.currentPeriod,
      gameSeconds: effectiveClock(game, timestamp),
      shiftId: activeShift?.id ?? null,
      timestamp,
      source: 'live' as const,
      videoOffsetMs: null
    };
    if (!context && activeShift) props.onToggleShift();
    setPenaltyContext(captured);
    setPenaltyOpen(true);
  };

  const submitPenalty = (type: PenaltyType, assessedSeconds: number, ejected: boolean) => {
    if (!penaltyContext) return;
    props.onPenalty({ ...penaltyContext, type, assessedSeconds, ejected });
    setPenaltyOpen(false);
    setPenaltyContext(null);
  };

  if (game.cameraSettings.enabled) return <>
    <CameraShiftMode game={game} player={player} now={now} onExit={() => props.onCameraSettings({ enabled: false })} onToggleClock={props.onToggleClock} onSelectPeriod={props.onSelectPeriod} onStartShift={props.onCameraStartShift} onEndShift={props.onCameraEndShift} onAttachVideo={props.onAttachShiftVideo} onRecordingFailed={props.onRecordingFailed} onSettings={props.onCameraSettings} onEvent={event} onUndo={props.onUndo} onPenalty={openPenalty} />
    <PenaltyModal visible={penaltyOpen} minorSeconds={game.minorPenaltySeconds} onCancel={() => { setPenaltyOpen(false); setPenaltyContext(null); }} onSubmit={submitPenalty} />
  </>;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.topbar}>
        <View><Text style={styles.period}>LIVE TRACKER</Text><Text style={styles.matchup}>{game.homeAway === 'home' ? 'VS' : '@'} {game.opponent.toUpperCase()}{game.tournamentName ? ` · ${game.tournamentName.toUpperCase()}` : ''}</Text></View>
        <View style={styles.topActions}><Pressable onPress={() => setHelpOpen(true)} hitSlop={10}><Text style={styles.help}>HELP</Text></Pressable><Pressable onPress={confirmFinish} hitSlop={10}><Text style={styles.endGame}>END GAME</Text></Pressable></View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.periodPicker}>
          {Array.from({ length: game.periodCount }, (_, index) => index + 1).map((period) => <Pressable key={period} onPress={() => props.onSelectPeriod(period)} style={[styles.periodChoice, game.currentPeriod === period && styles.periodChoiceActive]}><Text style={[styles.periodChoiceText, game.currentPeriod === period && styles.periodChoiceTextActive]}>P{period}</Text></Pressable>)}
          <Pressable onPress={confirmEndPeriod} style={[styles.endPeriod, isFinalPeriod && styles.endFinal]}><Text style={styles.endPeriodText}>{isFinalPeriod ? 'END GAME' : 'END PERIOD'}</Text></Pressable>
        </View>
        <Pressable disabled={Boolean(activeShift)} onPress={() => props.onCameraSettings({ enabled: true })} style={[styles.cameraMode, activeShift && { opacity: 0.4 }]}><View style={styles.cameraIcon}><View style={styles.cameraLens} /></View><View style={{ flex: 1 }}><Text style={styles.cameraTitle}>CAMERA SHIFT MODE</Text><Text style={styles.cameraCopy}>{activeShift ? 'End the current shift before opening the camera.' : 'START SHIFT will record rear-camera video.'}</Text></View><Text style={styles.cameraOpen}>OPEN →</Text></Pressable>
        <Pressable onPress={props.onToggleClock} style={styles.clockArea}>
          <Text style={styles.clock}>{formatClock(clock)}</Text>
          <View style={styles.clockControl}><View style={[styles.clockDot, { backgroundColor: game.clockRunning && clock > 0 ? colors.green : colors.amber }]} /><Text style={styles.clockControlText}>{game.clockRunning && clock > 0 ? 'CLOCK RUNNING · TAP TO PAUSE' : 'CLOCK PAUSED · TAP TO START'}</Text></View>
        </Pressable>

        <View style={[styles.statusPanel, activeShift ? styles.statusOn : styles.statusBench]}>
          <View><Text style={[styles.statusLabel, activeShift && { color: colors.green }]}>{activeShift ? 'ON ICE' : 'ON BENCH'}</Text><Text style={styles.player}>{player.name.toUpperCase()}  #{player.jerseyNumber}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={styles.shiftLabel}>{activeShift ? `SHIFT ${game.shifts.length}` : `${game.shifts.length} SHIFTS`}</Text><Text style={[styles.shiftTime, activeShift && { color: colors.green }]}>{activeShift ? formatClock(effectiveShiftDuration(activeShift, now)) : formatClock(stats.totalToi)}</Text></View>
        </View>

        {activeShift ? <><View style={styles.eventGrid}>{EVENTS.map(({ type, label, tone }) => (
          <Pressable key={type} onPress={() => event(type)} style={({ pressed }) => [styles.eventButton, tone === 'good' && styles.eventGood, tone === 'bad' && styles.eventBad, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={[styles.eventText, (type === 'PLUS' || type === 'MINUS') && styles.eventSymbol]}>{label}</Text>
            <Text style={styles.eventCount}>{game.events.filter((item) => item.type === type).length}</Text>
          </Pressable>
        ))}</View></> : <View style={styles.benchMessage}><Text style={styles.benchTitle}>EYES ON THE ICE</Text><Text style={styles.benchCopy}>Start a shift as the player steps over the boards.</Text></View>}
        <Pressable onPress={() => openPenalty()} style={styles.penaltyButton}><Text style={styles.penaltyText}>PENALTY</Text><Text style={styles.penaltyHint}>{activeShift ? 'ENDS SHIFT · ADD PIM' : 'ADD PIM FROM THE BENCH'}</Text></Pressable>

        <ActionButton label={activeShift ? 'END SHIFT' : 'START SHIFT'} tone={activeShift ? 'red' : 'green'} onPress={toggleShift} style={styles.shiftButton} />
        <View style={styles.utilityRow}>
          <Pressable onPress={props.onUndo} disabled={!game.events.length} style={[styles.utility, !game.events.length && { opacity: 0.35 }]}><Text style={styles.utilityText}>↶  UNDO LAST</Text></Pressable>
          <Pressable onPress={props.onReview} style={styles.utility}><Text style={styles.utilityText}>REVIEW LOG</Text></Pressable>
          {clock === 0 && game.currentPeriod < game.periodCount ? <Pressable onPress={props.onNextPeriod} style={[styles.utility, styles.nextPeriod]}><Text style={[styles.utilityText, { color: colors.blue }]}>NEXT PERIOD  ›</Text></Pressable> : null}
        </View>
      </ScrollView>
      {flash ? <View style={[styles.toast, { bottom: insets.bottom + 16 }]}><Text style={styles.toastText}>{flash.replace('_', ' ')} RECORDED</Text><Pressable onPress={props.onUndo}><Text style={styles.toastUndo}>UNDO</Text></Pressable></View> : null}
      <StatGuideModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <PenaltyModal visible={penaltyOpen} minorSeconds={game.minorPenaltySeconds} onCancel={() => { setPenaltyOpen(false); setPenaltyContext(null); }} onSubmit={submitPenalty} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  topbar: { height: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  period: { color: colors.blue, fontSize: 11, fontWeight: '900', letterSpacing: tracking.label },
  matchup: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  endGame: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  help: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  content: { padding: spacing.lg, gap: spacing.md },
  periodPicker: { flexDirection: 'row', gap: spacing.sm },
  periodChoice: { width: 46, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkRaised },
  periodChoiceActive: { borderColor: colors.blue, backgroundColor: '#103747' },
  periodChoiceText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  periodChoiceTextActive: { color: colors.blue },
  endPeriod: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.redDeep, alignItems: 'center', justifyContent: 'center' },
  endFinal: { backgroundColor: '#351820', borderColor: colors.red },
  endPeriodText: { color: colors.red, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  clockArea: { alignItems: 'center', paddingVertical: spacing.sm },
  clock: { color: colors.ice, fontSize: 61, lineHeight: 68, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  clockControl: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  clockDot: { width: 7, height: 7, borderRadius: 4 },
  clockControlText: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  cameraMode: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.blueDeep, backgroundColor: '#0B2633' },
  cameraIcon: { width: 35, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: colors.blue },
  cameraLens: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ice },
  cameraTitle: { color: colors.ice, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cameraCopy: { color: colors.muted, fontSize: 9, marginTop: 3 },
  cameraOpen: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  statusPanel: { minHeight: 88, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBench: { backgroundColor: colors.surface, borderColor: colors.lineSoft },
  statusOn: { backgroundColor: '#0C2B25', borderColor: colors.greenDeep },
  statusLabel: { color: colors.muted, fontSize: 13, fontWeight: '900', letterSpacing: tracking.label },
  player: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 5 },
  shiftLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  shiftTime: { color: colors.ice, fontSize: 25, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 },
  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  eventButton: { width: '48.8%', minHeight: 67, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventGood: { borderColor: '#205C4A' },
  eventBad: { borderColor: '#61303A' },
  eventText: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  eventSymbol: { fontSize: 27 },
  eventCount: { color: colors.mutedDim, fontSize: 13, fontWeight: '900' },
  penaltyButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.redDeep, backgroundColor: '#28161D' },
  penaltyText: { color: colors.red, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  penaltyHint: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  benchMessage: { minHeight: 142, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  benchTitle: { color: colors.ice, fontSize: 15, fontWeight: '900', letterSpacing: tracking.label },
  benchCopy: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  shiftButton: { minHeight: 82 },
  utilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  utility: { flex: 1, minHeight: 46, borderRadius: radius.sm, backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  nextPeriod: { borderColor: colors.blueDeep },
  utilityText: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, minHeight: 50, backgroundColor: colors.ice, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  toastText: { color: colors.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  toastUndo: { color: colors.redDeep, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});

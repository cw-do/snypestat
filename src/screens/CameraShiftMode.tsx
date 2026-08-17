import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { CameraSettings, EventType, Game, Player, ShiftVideo } from '../domain/models';
import { effectiveClock, effectiveShiftDuration, formatClock } from '../domain/stats';
import { persistShiftVideo } from '../services/shiftVideoStorage';

export type LivePenaltyContext = {
  period: number;
  gameSeconds: number;
  shiftId: string | null;
  timestamp: number;
  source: 'live';
  videoOffsetMs: number | null;
};

type Props = {
  game: Game;
  player: Player;
  now: number;
  onExit: () => void;
  onToggleClock: () => void;
  onSelectPeriod: (period: number) => void;
  onStartShift: (shiftId: string, startedAt: number) => void;
  onEndShift: (endedAt: number) => void;
  onAttachVideo: (shiftId: string, video: ShiftVideo) => void;
  onRecordingFailed: (shiftId: string) => void;
  onSettings: (settings: Partial<CameraSettings>) => void;
  onEvent: (type: EventType) => void;
  onUndo: () => void;
  onPenalty: (context: LivePenaltyContext) => void;
};

type RecordingSession = {
  shiftId: string;
  startedAt: number;
  endedAt: number | null;
  ratio: CameraSettings['ratio'];
  zoom: number;
  audioEnabled: boolean;
};

const LEFT_EVENTS: Array<{ type: EventType; label: string }> = [
  { type: 'GOAL', label: 'GOAL' }, { type: 'ASSIST', label: 'AST' }, { type: 'SOG', label: 'SOG' }
];
const RIGHT_EVENTS: Array<{ type: EventType; label: string }> = [
  { type: 'BLOCK', label: 'BLK' }, { type: 'TAKEAWAY', label: 'TK' }, { type: 'GIVEAWAY', label: 'GV' }
];

const ZOOM_PRESETS = [
  { label: '1×', value: 0 },
  { label: '3×', value: 0.35 },
  { label: '5×', value: 0.65 }
] as const;

export function CameraShiftMode(props: Props) {
  useKeepAwake('camera-shift-mode');
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef<RecordingSession | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [cameraZoom, setCameraZoom] = useState(props.game.cameraSettings.zoom);
  const zoomRef = useRef(props.game.cameraSettings.zoom);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const activeShift = props.game.shifts.find((shift) => shift.endTimestamp == null) ?? null;
  const trackingShift = Boolean(activeShift || recording);
  const clock = effectiveClock(props.game, props.now);
  const settings = props.game.cameraSettings;
  const audioAvailable = settings.audioEnabled && microphonePermission?.granted === true;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (trackingShift || saving) {
        Alert.alert('Recording in progress', 'End the current shift and wait for the video to save before leaving Camera Shift Mode.');
        return true;
      }
      props.onExit();
      return true;
    });
    return () => subscription.remove();
  }, [saving, trackingShift, props.onExit]);

  useEffect(() => {
    if (pinchRef.current) return;
    zoomRef.current = settings.zoom;
    setCameraZoom(settings.zoom);
  }, [settings.zoom]);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
    return () => {
      cameraRef.current?.stopRecording();
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (activeShift?.videoRecordingStartedAt != null && !activeShift.video && !recordingRef.current && !recording) props.onRecordingFailed(activeShift.id);
  }, [activeShift?.id]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(timer);
  }, [flash]);

  const grantAccess = async () => {
    const camera = await requestCameraPermission();
    if (!camera.granted) return;
    if (settings.audioEnabled && !microphonePermission?.granted) await requestMicrophonePermission();
  };

  const recordVideo = async (session: RecordingSession) => {
    try {
      const result = await cameraRef.current?.recordAsync({ maxDuration: 180 });
      if (!result?.uri) throw new Error('No video file was returned.');
      const endedAt = session.endedAt ?? Date.now();
      const saved = await persistShiftVideo(result.uri, props.game.id, session.shiftId);
      props.onAttachVideo(session.shiftId, {
        id: `video-${session.shiftId}`,
        uri: saved.uri,
        startedAt: session.startedAt,
        endedAt,
        durationSeconds: Math.max(0, Math.round((endedAt - session.startedAt) / 1000)),
        ratio: session.ratio,
        zoom: session.zoom,
        audioEnabled: session.audioEnabled,
        storage: saved.storage
      });
      if (recordingRef.current?.shiftId === session.shiftId) recordingRef.current = null;
      setRecording(false);
      setSaving(false);
      if (session.endedAt == null) Alert.alert('Video limit reached', 'Recording stopped after 3 minutes. Shift tracking is still active.');
    } catch {
      props.onRecordingFailed(session.shiftId);
      if (recordingRef.current?.shiftId === session.shiftId) recordingRef.current = null;
      setRecording(false);
      setSaving(false);
      Alert.alert('Video was not saved', 'Shift timing and stats are still safe. You can continue tracking.');
    }
  };

  const startShift = () => {
    if (recordingRef.current || recording) return;
    const startedAt = Date.now();
    const shiftId = `shift-${startedAt}`;
    const session: RecordingSession = { shiftId, startedAt, endedAt: null, ratio: settings.ratio, zoom: settings.zoom, audioEnabled: audioAvailable };
    props.onStartShift(shiftId, startedAt);
    recordingRef.current = session;
    if (!cameraReady || !cameraRef.current) {
      props.onRecordingFailed(shiftId);
      recordingRef.current = null;
      Alert.alert('Camera not ready', 'Shift timing started without video.');
      return;
    }
    setRecording(true);
    setSaving(false);
    void recordVideo(session);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const endShift = () => {
    const endedAt = Date.now();
    if (recordingRef.current) { recordingRef.current.endedAt = endedAt; setSaving(true); }
    cameraRef.current?.stopRecording();
    props.onEndShift(endedAt);
    setRecording(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const selectPeriod = (period: number) => {
    if (period === props.game.currentPeriod || saving) return;
    if (activeShift || recordingRef.current) endShift();
    props.onSelectPeriod(period);
  };

  const event = (type: EventType) => {
    props.onEvent(type);
    setFlash(type.replace('_', ' '));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const penalty = () => {
    const timestamp = Date.now();
    const context: LivePenaltyContext = {
      period: props.game.currentPeriod,
      gameSeconds: effectiveClock(props.game, timestamp),
      shiftId: activeShift?.id ?? null,
      timestamp,
      source: 'live',
      videoOffsetMs: activeShift?.videoRecordingStartedAt != null ? Math.max(0, timestamp - activeShift.videoRecordingStartedAt) : null
    };
    if (activeShift) endShift();
    props.onPenalty(context);
  };

  const setZoom = (next: number, persist = true) => {
    const zoom = Math.max(0, Math.min(1, Number(next.toFixed(3))));
    zoomRef.current = zoom;
    setCameraZoom(zoom);
    if (persist) props.onSettings({ zoom });
  };

  const touchDistance = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) return null;
    return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
  };

  const beginPinch = (event: GestureResponderEvent) => {
    const distance = touchDistance(event);
    if (distance != null) pinchRef.current = { distance, zoom: zoomRef.current };
  };

  const movePinch = (event: GestureResponderEvent) => {
    const distance = touchDistance(event);
    if (distance == null) return;
    if (!pinchRef.current) {
      pinchRef.current = { distance, zoom: zoomRef.current };
      return;
    }
    const scale = Math.max(0.25, distance / Math.max(1, pinchRef.current.distance));
    setZoom(pinchRef.current.zoom + Math.log2(scale) * 0.24, false);
  };

  const endPinch = () => {
    if (!pinchRef.current) return;
    pinchRef.current = null;
    props.onSettings({ zoom: zoomRef.current });
  };

  if (!cameraPermission?.granted) {
    return <View style={styles.permission}><Text style={styles.permissionKicker}>CAMERA SHIFT MODE</Text><Text style={styles.permissionTitle}>Record only the shifts that matter.</Text><Text style={styles.permissionCopy}>Camera access records the rear-camera view. Microphone access is optional and only adds rink audio.</Text><Pressable onPress={() => void grantAccess()} style={styles.permissionButton}><Text style={styles.permissionButtonText}>ALLOW CAMERA ACCESS</Text></Pressable><Pressable onPress={props.onExit} style={styles.continueButton}><Text style={styles.continueText}>CONTINUE WITHOUT CAMERA</Text></Pressable></View>;
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="video" mute={!audioAvailable} ratio={settings.ratio} videoQuality={settings.ratio === '4:3' ? '4:3' : '720p'} videoStabilizationMode="auto" zoom={cameraZoom} onCameraReady={() => { setCameraReady(true); setCameraError(null); }} onMountError={(error) => setCameraError(error.message)} />
      <View
        style={styles.pinchSurface}
        onMoveShouldSetResponder={(event) => event.nativeEvent.touches.length >= 2}
        onResponderGrant={beginPinch}
        onResponderMove={movePinch}
        onResponderRelease={endPinch}
        onResponderTerminate={endPinch}
        onResponderTerminationRequest={() => false}
      >
        <Text style={styles.pinchHint}>PINCH TO ZOOM</Text>
      </View>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, spacing.sm), paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md) }]}>
        <Pressable onPress={props.onToggleClock} style={styles.statusPill}><Text style={styles.clock}>{formatClock(clock)}</Text><View style={[styles.clockDot, { backgroundColor: props.game.clockRunning ? colors.green : colors.amber }]} /></Pressable>
        <View style={styles.periodRow}>{Array.from({ length: props.game.periodCount }, (_, index) => index + 1).map((period) => <Pressable key={period} disabled={saving} onPress={() => selectPeriod(period)} style={[styles.periodChoice, props.game.currentPeriod === period && styles.periodChoiceActive, saving && { opacity: 0.4 }]}><Text style={[styles.periodChoiceText, props.game.currentPeriod === period && styles.periodChoiceTextActive]}>P{period}</Text></Pressable>)}</View>
        <View style={styles.recordPill}><View style={[styles.recordDot, recording && { backgroundColor: colors.red }]} /><Text style={styles.recordText}>{recording ? `REC ${activeShift ? formatClock(effectiveShiftDuration(activeShift, props.now)) : '00:00'}` : activeShift ? 'SHIFT · NO VIDEO' : 'READY'}</Text></View>
        <View style={styles.settingRow}>
          {(['16:9', '4:3'] as const).map((ratio) => <Pressable key={ratio} disabled={trackingShift || saving} onPress={() => props.onSettings({ ratio })} style={[styles.mini, settings.ratio === ratio && styles.miniActive, (trackingShift || saving) && { opacity: 0.45 }]}><Text style={[styles.miniText, settings.ratio === ratio && styles.miniTextActive]}>{ratio}</Text></Pressable>)}
          <Pressable onPress={() => setZoom(cameraZoom - 0.08)} style={styles.zoomStep}><Text style={styles.zoomStepText}>−</Text></Pressable>
          {ZOOM_PRESETS.map((preset) => <Pressable key={preset.label} onPress={() => setZoom(preset.value)} style={[styles.zoomPreset, Math.abs(cameraZoom - preset.value) < 0.025 && styles.zoomPresetActive]}><Text style={[styles.zoomPresetText, Math.abs(cameraZoom - preset.value) < 0.025 && styles.zoomPresetTextActive]}>{preset.label}</Text></Pressable>)}
          <Pressable onPress={() => setZoom(cameraZoom + 0.08)} style={styles.zoomStep}><Text style={styles.zoomStepText}>+</Text></Pressable>
          <Pressable disabled={trackingShift || saving} onPress={props.onExit} style={[styles.exit, (trackingShift || saving) && { opacity: 0.4 }]}><Text style={styles.exitText}>EXIT CAMERA</Text></Pressable>
        </View>
      </View>

      <View style={[styles.leftRail, { left: Math.max(insets.left, spacing.md) }]}>{LEFT_EVENTS.map((item) => <CameraStatButton key={item.type} label={item.label} onPress={() => event(item.type)} disabled={!activeShift} />)}</View>
      <View style={[styles.rightRail, { right: Math.max(insets.right, spacing.md) }]}>{RIGHT_EVENTS.map((item) => <CameraStatButton key={item.type} label={item.label} onPress={() => event(item.type)} disabled={!activeShift} />)}</View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.sm), paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md) }]}>
        <View style={styles.bottomSide}><Pressable onPress={penalty} style={[styles.secondary, styles.penalty]}><Text style={styles.secondaryText}>PENALTY</Text></Pressable><Pressable onPress={props.onUndo} disabled={!props.game.events.length} style={[styles.secondary, !props.game.events.length && { opacity: 0.4 }]}><Text style={styles.secondaryText}>UNDO</Text></Pressable></View>
        <Pressable disabled={saving} onPress={trackingShift ? endShift : startShift} style={[styles.shiftButton, trackingShift ? styles.endShift : styles.startShift, saving && { opacity: 0.65 }]}><Text style={styles.shiftEyebrow}>{trackingShift ? `SHIFT ${props.game.shifts.length || 1} · ${playerLabel(props.player)}` : playerLabel(props.player)}</Text><Text style={styles.shiftText}>{saving ? 'SAVING VIDEO…' : trackingShift ? 'END SHIFT' : 'START SHIFT + RECORD'}</Text></Pressable>
        <View style={styles.bottomSide}><Pressable onPress={() => event('PLUS')} disabled={!activeShift} style={[styles.scoreButton, styles.plus, !activeShift && { opacity: 0.4 }]}><Text style={styles.scoreText}>+</Text></Pressable><Pressable onPress={() => event('MINUS')} disabled={!activeShift} style={[styles.scoreButton, styles.minus, !activeShift && { opacity: 0.4 }]}><Text style={styles.scoreText}>−</Text></Pressable></View>
      </View>
      {cameraError ? <View style={styles.error}><Text style={styles.errorText}>CAMERA ERROR · {cameraError}</Text></View> : null}
      {settings.audioEnabled && !microphonePermission?.granted ? <Pressable onPress={() => void requestMicrophonePermission()} style={styles.audioBanner}><Text style={styles.audioBannerText}>RINK AUDIO OFF · ENABLE MICROPHONE</Text></Pressable> : null}
      {flash ? <View style={styles.flash}><Text style={styles.flashText}>{flash} RECORDED</Text></View> : null}
    </View>
  );
}

function CameraStatButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.statButton, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.96 }] }]}><Text style={styles.statText}>{label}</Text></Pressable>;
}

function playerLabel(player: Player): string {
  return `${player.name.toUpperCase()} · #${player.jerseyNumber || '—'}`;
}

const glass = 'rgba(3, 12, 19, 0.68)';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.ink },
  permissionKicker: { color: colors.red, fontSize: 10, fontWeight: '900', letterSpacing: tracking.wide },
  permissionTitle: { color: colors.ice, fontSize: 28, lineHeight: 34, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  permissionCopy: { color: colors.muted, maxWidth: 430, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: spacing.md },
  permissionButton: { minWidth: 280, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.blue, marginTop: spacing.xl },
  permissionButtonText: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  continueButton: { padding: spacing.lg },
  continueText: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(2,8,12,0.58)', paddingBottom: spacing.sm },
  statusPill: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  clock: { color: colors.ice, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  clockDot: { width: 7, height: 7, borderRadius: 4 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodChoice: { minWidth: 34, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: glass },
  periodChoiceActive: { borderColor: colors.blue, backgroundColor: 'rgba(10,70,92,0.9)' },
  periodChoiceText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  periodChoiceTextActive: { color: colors.blue },
  recordPill: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: glass },
  recordDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.mutedDim },
  recordText: { color: colors.ice, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  settingRow: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  mini: { minWidth: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  miniActive: { borderColor: colors.blue, backgroundColor: 'rgba(10,70,92,0.8)' },
  miniText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  miniTextActive: { color: colors.blue },
  zoomStep: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: glass },
  zoomStepText: { color: colors.ice, fontSize: 21, fontWeight: '900' },
  zoomPreset: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  zoomPresetActive: { borderColor: colors.ice, backgroundColor: 'rgba(234,248,252,0.9)' },
  zoomPresetText: { color: colors.ice, fontSize: 9, fontWeight: '900' },
  zoomPresetTextActive: { color: colors.ink },
  exit: { height: 36, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: glass, borderWidth: 1, borderColor: colors.line },
  exitText: { color: colors.ice, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  leftRail: { position: 'absolute', top: '26%', gap: spacing.sm },
  rightRail: { position: 'absolute', top: '26%', gap: spacing.sm },
  pinchSurface: { position: 'absolute', top: 76, bottom: 92, left: 96, right: 96, alignItems: 'center', justifyContent: 'center' },
  pinchHint: { color: 'rgba(255,255,255,0.42)', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(3,12,19,0.32)' },
  statButton: { width: 72, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  statText: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: 'rgba(2,8,12,0.58)', paddingTop: spacing.sm },
  bottomSide: { width: 158, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  penalty: { borderColor: 'rgba(255,100,112,0.7)' },
  secondaryText: { color: colors.ice, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  shiftButton: { width: 285, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 2 },
  startShift: { backgroundColor: 'rgba(22,192,128,0.9)', borderColor: colors.green },
  endShift: { backgroundColor: 'rgba(210,48,66,0.92)', borderColor: colors.red },
  shiftEyebrow: { color: 'rgba(7,16,24,0.72)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  shiftText: { color: colors.ink, fontSize: 15, fontWeight: '900', letterSpacing: 1.1, marginTop: 3 },
  scoreButton: { width: 70, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1 },
  plus: { backgroundColor: 'rgba(13,93,68,0.82)', borderColor: colors.green },
  minus: { backgroundColor: 'rgba(105,30,41,0.82)', borderColor: colors.red },
  scoreText: { color: colors.white, fontSize: 25, fontWeight: '900' },
  error: { position: 'absolute', top: 74, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.redDeep },
  errorText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  audioBanner: { position: 'absolute', top: 74, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.amber, backgroundColor: 'rgba(40,30,8,0.88)' },
  audioBannerText: { color: colors.amber, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  flash: { position: 'absolute', alignSelf: 'center', top: '46%', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: 'rgba(234,248,252,0.9)' },
  flashText: { color: colors.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});

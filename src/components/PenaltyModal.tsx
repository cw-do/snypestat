import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { PenaltyType } from '../domain/models';
import { formatClock } from '../domain/stats';

type Props = {
  visible: boolean;
  minorSeconds: number;
  onCancel: () => void;
  onSubmit: (type: PenaltyType, assessedSeconds: number, ejected: boolean) => void;
};

export function PenaltyModal({ visible, minorSeconds, onCancel, onSubmit }: Props) {
  const [customSeconds, setCustomSeconds] = useState(minorSeconds);
  useEffect(() => { if (visible) setCustomSeconds(minorSeconds); }, [minorSeconds, visible]);

  const options: Array<{ label: string; detail: string; type: PenaltyType; seconds: number; ejected?: boolean }> = [
    { label: 'MINOR', detail: formatClock(minorSeconds), type: 'MINOR', seconds: minorSeconds },
    { label: 'DOUBLE MINOR', detail: formatClock(minorSeconds * 2), type: 'DOUBLE_MINOR', seconds: minorSeconds * 2 },
    { label: 'MAJOR', detail: '05:00', type: 'MAJOR', seconds: 300 },
    { label: 'MISCONDUCT', detail: '10:00', type: 'MISCONDUCT', seconds: 600 },
    { label: 'GAME MISCONDUCT', detail: '10:00 · EJECTED', type: 'GAME_MISCONDUCT', seconds: 600, ejected: true },
    { label: 'MAJOR + GAME', detail: '15:00 · EJECTED', type: 'MAJOR_GAME', seconds: 900, ejected: true }
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}><View><Text style={styles.eyebrow}>PENALTY</Text><Text style={styles.title}>Add assessed PIM</Text></View><Pressable onPress={onCancel} style={styles.close}><Text style={styles.closeText}>CANCEL</Text></Pressable></View>
          <Text style={styles.note}>PIM records the official assessed penalty, not the exact time the player misses.</Text>
          <View style={styles.grid}>{options.map((option) => <Pressable key={option.label} onPress={() => onSubmit(option.type, option.seconds, Boolean(option.ejected))} style={({ pressed }) => [styles.option, pressed && styles.pressed]}><Text style={styles.optionLabel}>{option.label}</Text><Text style={[styles.optionDetail, option.ejected && { color: colors.red }]}>{option.detail}</Text></Pressable>)}</View>
          <View style={styles.custom}>
            <Text style={styles.customLabel}>CUSTOM · 30 SECOND STEPS</Text>
            <View style={styles.stepper}><Pressable onPress={() => setCustomSeconds((value) => Math.max(30, value - 30))} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.customValue}>{formatClock(customSeconds)}</Text><Pressable onPress={() => setCustomSeconds((value) => Math.min(3600, value + 30))} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable><Pressable onPress={() => onSubmit('CUSTOM', customSeconds, false)} style={styles.add}><Text style={styles.addText}>ADD PIM</Text></Pressable></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: { backgroundColor: colors.inkRaised, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.red, fontSize: 9, fontWeight: '900', letterSpacing: tracking.wide },
  title: { color: colors.ice, fontSize: 23, fontWeight: '900', marginTop: 3 },
  close: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  closeText: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: '48.8%', minHeight: 61, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  optionLabel: { color: colors.ice, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  optionDetail: { color: colors.blue, fontSize: 10, fontWeight: '900', marginTop: 4 },
  custom: { borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: spacing.md, gap: spacing.sm },
  customLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  stepText: { color: colors.blue, fontSize: 24, fontWeight: '800' },
  customValue: { width: 62, color: colors.ice, textAlign: 'center', fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  add: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.red },
  addText: { color: colors.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Card, ScreenHeader } from '../components/ui';
import { NeuroPuckBrand } from '../components/NeuroPuckBrand';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { Player, Position } from '../domain/models';

export function PlayerSetupScreen({ onSave }: { onSave: (player: Player) => void }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [team, setTeam] = useState('');
  const [season, setSeason] = useState('2026–27');
  const [position, setPosition] = useState<Position>('Defense');

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: `player-${Date.now()}`,
      name: name.trim(),
      jerseyNumber: number.trim(),
      position,
      teamName: team.trim(),
      season: season.trim() || '2026–27'
    });
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}><View style={styles.brandMark} /><Text style={styles.brand}>SNYPE STAT</Text></View>
        <NeuroPuckBrand productLine />
        <ScreenHeader eyebrow="First line" title="Build your player card" />
        <Text style={styles.lead}>Set it once. During the game, we keep typing out of your way.</Text>
        <Card style={{ gap: spacing.lg }}>
          <Field label="Player name" value={name} onChangeText={setName} placeholder="Player Name" autoFocus />
          <View style={styles.split}>
            <View style={{ flex: 0.42 }}><Field label="Jersey" value={number} onChangeText={setNumber} placeholder="56" keyboardType="number-pad" maxLength={3} /></View>
            <View style={{ flex: 1 }}><Field label="Team" value={team} onChangeText={setTeam} placeholder="Team Name" /></View>
          </View>
          <Field label="Season" value={season} onChangeText={setSeason} placeholder="2026–27" />
          <View>
            <Text style={styles.label}>POSITION</Text>
            <View style={styles.segmentRow}>
              {(['Defense', 'Forward', 'Goalie'] as Position[]).map((item) => (
                <Pressable key={item} onPress={() => setPosition(item)} style={[styles.segment, position === item && styles.segmentActive]}>
                  <Text style={[styles.segmentText, position === item && styles.segmentTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>
        <ActionButton label="CREATE PLAYER" onPress={save} disabled={!name.trim()} />
        <Text style={styles.offline}>Stored on this phone · Works offline</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, ...props }: FieldProps) {
  return <View><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.mutedDim} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 5, height: 23, borderRadius: 3, backgroundColor: colors.blue, transform: [{ skewX: '-12deg' }] },
  brand: { color: colors.ice, fontSize: 13, fontWeight: '900', letterSpacing: tracking.wide },
  lead: { color: colors.muted, fontSize: 15, lineHeight: 22, maxWidth: 320 },
  split: { flexDirection: 'row', gap: spacing.md },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.label, marginBottom: spacing.sm, textTransform: 'uppercase' },
  input: { height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, color: colors.ice, fontSize: 17, fontWeight: '700', paddingHorizontal: spacing.lg },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, height: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { borderColor: colors.blue, backgroundColor: '#103344' },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: colors.blue },
  offline: { color: colors.mutedDim, textAlign: 'center', fontSize: 11, fontWeight: '700' }
});

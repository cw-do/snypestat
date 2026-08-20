import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Card, NavBackButton, ScreenHeader } from '../components/ui';
import { colors, radius, spacing, tracking } from '../design/tokens';
import { Game, HomeAway } from '../domain/models';
import { suggestNearestIceRink } from '../services/nearbyRink';

export type NewGameInput = Pick<Game, 'opponent' | 'date' | 'homeAway' | 'location' | 'tournamentName' | 'periodLengthSeconds' | 'periodCount' | 'minorPenaltySeconds'>;

export function NewGameScreen({ onBack, onStart, suggestedTournament = '', previousOpponents = [] }: { onBack: () => void; onStart: (input: NewGameInput) => void; suggestedTournament?: string; previousOpponents?: string[] }) {
  const insets = useSafeAreaInsets();
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [tournamentName, setTournamentName] = useState(suggestedTournament);
  const [homeAway, setHomeAway] = useState<HomeAway>('home');
  const [periodLength, setPeriodLength] = useState(15);
  const [periodCount, setPeriodCount] = useState(3);
  const [minorPenaltySeconds, setMinorPenaltySeconds] = useState(120);
  const [rinkStatus, setRinkStatus] = useState<'idle' | 'locating' | 'suggested' | 'denied' | 'unavailable'>('idle');
  const locationEdited = useRef(false);
  const lookupInFlight = useRef(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const opponentMatches = opponent.trim()
    ? previousOpponents.filter((name) => name !== 'Opponent' && name.toLowerCase() !== opponent.trim().toLowerCase() && name.toLowerCase().includes(opponent.trim().toLowerCase())).slice(0, 5)
    : [];

  const findNearbyRink = async () => {
    if (lookupInFlight.current) return;
    locationEdited.current = false;
    lookupInFlight.current = true;
    setRinkStatus('locating');
    try {
      const result = await suggestNearestIceRink();
      if (result.status === 'suggested' && !locationEdited.current) {
        setLocation(result.name);
        setRinkStatus('suggested');
      } else if (result.status !== 'suggested') {
        setRinkStatus(result.status);
      }
    } finally {
      lookupInFlight.current = false;
    }
  };

  const editLocation = (value: string) => {
    locationEdited.current = true;
    setRinkStatus('idle');
    setLocation(value);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <NavBackButton onPress={onBack} />
        <ScreenHeader eyebrow="Game setup" title="Next matchup" />
        <Card style={{ gap: spacing.lg }}>
          <View>
            <Field label="Opponent · optional" value={opponent} onChangeText={setOpponent} placeholder="Opponent" autoFocus autoComplete="off" />
            {opponentMatches.length ? <View style={styles.suggestions}>{opponentMatches.map((name) => <Pressable key={name} onPress={() => setOpponent(name)} style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.surfaceHigh }]}><View style={styles.suggestionIcon}><Text style={styles.suggestionIconText}>VS</Text></View><Text numberOfLines={1} style={styles.suggestionText}>{name}</Text><Text style={styles.suggestionUse}>USE</Text></Pressable>)}</View> : null}
          </View>
          <View>
            <View style={styles.fieldLabelRow}><Text style={[styles.label, { marginBottom: 0 }]}>LOCATION · OPTIONAL</Text><Pressable onPress={() => void findNearbyRink()} disabled={rinkStatus === 'locating'} style={({ pressed }) => [styles.rinkSearch, pressed && { opacity: 0.7 }, rinkStatus === 'locating' && { opacity: 0.5 }]}><Text style={styles.rinkSearchText}>{rinkStatus === 'locating' ? 'SEARCHING…' : '⌖  RINK SEARCH'}</Text></Pressable></View>
            <TextInput value={location} onChangeText={editLocation} placeholder="Rink name or location" placeholderTextColor={colors.mutedDim} style={styles.input} />
            {rinkStatus !== 'idle' ? <Text style={[styles.rinkStatus, rinkStatus === 'suggested' && { color: colors.green }]}>{rinkStatus === 'locating' ? 'Finding ice rinks within 5 miles…' : rinkStatus === 'suggested' ? 'Suggested within 5 miles · Edit anytime · © OpenStreetMap contributors' : rinkStatus === 'denied' ? 'Location permission not granted · Enter the rink manually' : 'No ice rink found within 5 miles · Enter the rink manually'}</Text> : null}
          </View>
          <Field label="Tournament · optional" value={tournamentName} onChangeText={setTournamentName} placeholder="Tournament Name" />
          <View><Text style={styles.label}>HOME / AWAY</Text><View style={styles.segments}>{(['home', 'away'] as HomeAway[]).map((item) => <Choice key={item} label={item.toUpperCase()} active={homeAway === item} onPress={() => setHomeAway(item)} />)}</View></View>
        </Card>
        <Card style={{ gap: spacing.lg }}>
          <View><Text style={styles.label}>PERIOD LENGTH</Text><View style={styles.segments}>{[12, 15, 20].map((value) => <Choice key={value} label={`${value}:00`} active={periodLength === value} onPress={() => setPeriodLength(value)} />)}</View></View>
          <View><Text style={styles.label}>PERIODS</Text><View style={styles.segments}>{[2, 3, 4].map((value) => <Choice key={value} label={String(value)} active={periodCount === value} onPress={() => setPeriodCount(value)} />)}</View></View>
          <View><Text style={styles.label}>DEFAULT MINOR PENALTY</Text><View style={styles.segments}>{[90, 120].map((value) => <Choice key={value} label={value === 90 ? '1:30' : '2:00'} active={minorPenaltySeconds === value} onPress={() => setMinorPenaltySeconds(value)} />)}</View></View>
        </Card>
        <View style={styles.noteRow}><Text style={styles.noteLabel}>DATE</Text><Text style={styles.noteValue}>{today}</Text><View style={styles.dot} /><Text style={styles.noteLabel}>COUNTDOWN CLOCK</Text></View>
        <ActionButton label="START GAME" onPress={() => onStart({ opponent: opponent.trim() || 'Opponent', date: today, homeAway, location: location.trim(), tournamentName: tournamentName.trim(), periodLengthSeconds: periodLength * 60, periodCount, minorPenaltySeconds })} style={{ minHeight: 72 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={colors.mutedDim} /></View>;
}
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: tracking.label, marginBottom: spacing.sm, textTransform: 'uppercase' },
  input: { height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, color: colors.ice, fontSize: 16, fontWeight: '700', paddingHorizontal: spacing.lg },
  fieldLabelRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  rinkSearch: { minHeight: 30, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.blueDeep, backgroundColor: colors.blueSurface },
  rinkSearchText: { color: colors.blue, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  rinkStatus: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  suggestions: { marginTop: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkRaised, overflow: 'hidden' },
  suggestion: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  suggestionIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSurface },
  suggestionIconText: { color: colors.blue, fontSize: 7, fontWeight: '900' },
  suggestionText: { flex: 1, color: colors.ice, fontSize: 12, fontWeight: '800' },
  suggestionUse: { color: colors.mutedDim, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  segments: { flexDirection: 'row', gap: spacing.sm },
  choice: { flex: 1, height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  choiceActive: { backgroundColor: colors.blueSurface, borderColor: colors.blue },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  choiceTextActive: { color: colors.blue },
  noteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noteLabel: { color: colors.mutedDim, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  noteValue: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.mutedDim }
});

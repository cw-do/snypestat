import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, tracking } from '../design/tokens';

export function ScreenHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function NavBackButton({ label = 'HOME', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.navBack, pressed && styles.navBackPressed]}>
      <Text style={styles.navChevron}>‹</Text>
      <View><Text style={styles.navHint}>BACK TO</Text><Text style={styles.navLabel}>{label}</Text></View>
    </Pressable>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'ice' | 'green' | 'red' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({ label, onPress, tone = 'ice', disabled, style }: ActionButtonProps) {
  const gradients = {
    ice: ['#75D2FF', '#2F87F2'] as const,
    green: ['#54EDB0', '#20B67E'] as const,
    red: ['#FF7782', '#D93D4D'] as const,
    ghost: [colors.surfaceHigh, colors.surface] as const
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.buttonWrap, style, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.78 }]}
    >
      <LinearGradient colors={gradients[tone]} style={styles.button}>
        <Text style={[styles.buttonLabel, tone === 'ghost' && { color: colors.ice }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  eyebrow: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    marginBottom: 5
  },
  title: { color: colors.ice, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: tracking.tight },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  navBack: { alignSelf: 'flex-start', minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 15, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  navBackPressed: { backgroundColor: colors.surfaceHigh, borderColor: colors.blueDeep, transform: [{ scale: 0.98 }] },
  navChevron: { color: colors.blue, fontSize: 28, lineHeight: 30, fontWeight: '500', marginTop: -2 },
  navHint: { color: colors.mutedDim, fontSize: 7, lineHeight: 9, fontWeight: '900', letterSpacing: 1 },
  navLabel: { color: colors.ice, fontSize: 11, lineHeight: 14, fontWeight: '900', letterSpacing: 1.2 },
  buttonWrap: { minHeight: 58, borderRadius: radius.md, overflow: 'hidden' },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonLabel: { color: colors.ink, fontSize: 15, fontWeight: '900', letterSpacing: tracking.label },
  metric: { flex: 1, minWidth: 74 },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  metricValue: { color: colors.ice, fontSize: 22, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] }
});

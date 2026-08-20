import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tracking } from '../design/tokens';

const logo = require('../../assets/icon/logo_statcamHockey.png');

type Props = {
  compact?: boolean;
  tagline?: boolean;
};

export function StatCamBrand({ compact = false, tagline = false }: Props) {
  return (
    <View style={[styles.root, compact && styles.rootCompact]} accessibilityLabel="StatCam Hockey brand">
      <Image source={logo} resizeMode="contain" style={[styles.logo, compact && styles.logoCompact]} />
      <View style={styles.copy}>
        <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>STATCAM <Text style={styles.wordmarkAccent}>HOCKEY</Text></Text>
        {tagline ? <Text style={styles.tagline}>SHIFT FILM · LIVE STATS</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  rootCompact: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  logo: { width: 112, height: 112, borderRadius: 24 },
  logoCompact: { width: 42, height: 42, borderRadius: 10 },
  copy: { alignItems: 'center' },
  wordmark: { color: colors.ice, fontSize: 14, fontWeight: '900', letterSpacing: tracking.wide },
  wordmarkCompact: { fontSize: 11 },
  wordmarkAccent: { color: colors.blue },
  tagline: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: tracking.label, marginTop: 5 }
});

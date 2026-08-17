import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tracking } from '../design/tokens';

const wordmark = require('../../assets/brand/neuropuck-brand.png');

type Props = {
  compact?: boolean;
  productLine?: boolean;
};

export function NeuroPuckBrand({ compact = false, productLine = false }: Props) {
  return (
    <View style={[styles.root, compact && styles.rootCompact]} accessibilityLabel="NeuroPuck brand">
      {productLine ? <Text style={styles.productLine}>SNYPE STAT · A NEUROPUCK PRODUCT</Text> : null}
      <Image source={wordmark} resizeMode="contain" style={[styles.wordmark, compact && styles.wordmarkCompact]} />
      <Text style={styles.copyright}>© {new Date().getFullYear()} NEUROPUCK. ALL RIGHTS RESERVED.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  rootCompact: { gap: 6, paddingVertical: spacing.md },
  productLine: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: tracking.label },
  wordmark: { width: 252, height: 36 },
  wordmarkCompact: { width: 164, height: 23 },
  copyright: { color: colors.mutedDim, fontSize: 8, fontWeight: '700', letterSpacing: 0.7 }
});

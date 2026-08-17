import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, spacing } from '../design/tokens';

type Props = { values: number[]; formatValue: (value: number) => string };

export function TrendChart({ values, formatValue }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(260, windowWidth - 64);
  const height = 190;
  const padX = 12;
  const padTop = 18;
  const padBottom = 24;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const spread = Math.max(1, rawMax - rawMin);
  const min = rawMin - spread * 0.12;
  const max = rawMax + spread * 0.12;
  const chartHeight = height - padTop - padBottom;
  const x = (index: number) => values.length <= 1 ? width / 2 : padX + index * ((width - padX * 2) / (values.length - 1));
  const y = (value: number) => padTop + ((max - value) / (max - min)) * chartHeight;
  const linePath = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ');
  const areaPath = values.length ? `${linePath} L ${x(values.length - 1)} ${height - padBottom} L ${x(0)} ${height - padBottom} Z` : '';

  return (
    <View>
      <View style={styles.range}><Text style={styles.rangeText}>{formatValue(rawMax)}</Text><Text style={styles.rangeText}>{formatValue(rawMin)}</Text></View>
      <Svg width={width} height={height}>
        <Defs><LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.blue} stopOpacity="0.28" /><Stop offset="1" stopColor={colors.blue} stopOpacity="0.01" /></LinearGradient></Defs>
        {[0, 0.5, 1].map((fraction) => <Line key={fraction} x1={padX} x2={width - padX} y1={padTop + chartHeight * fraction} y2={padTop + chartHeight * fraction} stroke={colors.lineSoft} strokeWidth={1} />)}
        {areaPath ? <Path d={areaPath} fill="url(#trendFill)" /> : null}
        {linePath ? <Path d={linePath} fill="none" stroke={colors.blue} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {values.map((value, index) => <Circle key={index} cx={x(index)} cy={y(value)} r={4.5} fill={colors.ink} stroke={colors.blue} strokeWidth={2.5} />)}
      </Svg>
      <View style={styles.axis}><Text style={styles.axisText}>GAME 1</Text>{values.length > 2 ? <Text style={styles.axisText}>GAME {Math.ceil(values.length / 2)}</Text> : <View />}<Text style={styles.axisText}>GAME {Math.max(1, values.length)}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  range: { position: 'absolute', top: 2, bottom: 28, right: spacing.xs, zIndex: 2, justifyContent: 'space-between', alignItems: 'flex-end' },
  rangeText: { color: colors.mutedDim, fontSize: 8, fontWeight: '800' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -18, paddingHorizontal: spacing.sm },
  axisText: { color: colors.mutedDim, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }
});

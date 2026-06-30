// PriceChart — lightweight SVG line chart for price history.
// No chart library: pure react-native-svg path generation.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { PricePoint } from '../types';
import { FONT_FAMILY } from '../config';
import { ThemeColors } from '../services/theme';

interface PriceChartProps {
  points: PricePoint[];
  colors: ThemeColors;
  height?: number;
  width?: number;
}

export const PriceChart = React.memo(function PriceChart({ points, colors, height = 160, width = 320 }: PriceChartProps) {
  const { linePath, areaPath, up, lastDot } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: '', areaPath: '', up: true, lastDot: null as null | { x: number; y: number } };
    }
    const values = points.map(p => p.v);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const padX = 8;
    const padY = 16;
    const w = width - padX * 2;
    const h = height - padY * 2;

    const coords = points.map((p, i) => {
      const x = padX + (i / (points.length - 1)) * w;
      const y = padY + (1 - (p.v - minV) / range) * h;
      return { x, y };
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${height - padY} L${coords[0].x.toFixed(1)},${height - padY} Z`;
    const trendUp = values[values.length - 1] >= values[0];

    return { linePath: line, areaPath: area, up: trendUp, lastDot: coords[coords.length - 1] };
  }, [points, height, width]);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Belum cukup data untuk grafik. Data terkumpul tiap kamu buka app.
        </Text>
      </View>
    );
  }

  const lineColor = up ? colors.priceUp : colors.priceDown;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.22" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {lastDot && <Circle cx={lastDot.x} cy={lastDot.y} r={4} fill={lineColor} />}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, fontFamily: FONT_FAMILY.regular },
});

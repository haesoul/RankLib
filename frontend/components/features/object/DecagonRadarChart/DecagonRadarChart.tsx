import { Colors } from '@/CONSTANTS';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

export interface RadarAxisDatum {
  key: string;
  label: string;
  value: number; // 0..maxValue; use 0 for an empty corner
}

interface DecagonRadarChartProps {
  axes: RadarAxisDatum[];     // padded/truncated to AXIS_COUNT internally
  maxValue?: number;          // default 10 — adjust if your rank scale differs
  size?: number;
  rings?: number;
  fillColor?: string;
  strokeColor?: string;
  gridColor?: string;
  labelColor?: string;
  labelFontSize?: number;
}

const AXIS_COUNT = 10;
// offset by half a step so the shape has flat top/bottom edges, like the reference card
const START_ANGLE = -Math.PI / 2 - Math.PI / AXIS_COUNT;

function pointOnAxis(index: number, radius: number, cx: number, cy: number) {
  const angle = START_ANGLE + index * ((2 * Math.PI) / AXIS_COUNT);
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle };
}

export function DecagonRadarChart({
  axes,
  maxValue = 10,
  size = 250,
  rings = 5,
  fillColor = Colors.primary + '55',
  strokeColor = Colors.primary,
  gridColor = 'rgba(255,255,255,0.14)',
  labelColor = Colors.textSecondary,
  labelFontSize = 11,
}: DecagonRadarChartProps) {
  const padding = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - padding;

  const safeAxes = Array.from({ length: AXIS_COUNT }, (_, i) => axes[i] ?? { key: `empty-${i}`, label: '', value: 0 });

  const dataPoints = safeAxes.map((axis, i) => {
    const clamped = Math.max(0, Math.min(axis.value, maxValue));
    return pointOnAxis(i, (clamped / maxValue) * maxRadius, cx, cy);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gridPolygons = Array.from({ length: rings }, (_, ring) => {
    const r = (maxRadius * (ring + 1)) / rings;
    return Array.from({ length: AXIS_COUNT }, (_, i) => pointOnAxis(i, r, cx, cy))
      .map(p => `${p.x},${p.y}`)
      .join(' ');
  });

  const outerPoints = Array.from({ length: AXIS_COUNT }, (_, i) => pointOnAxis(i, maxRadius, cx, cy));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridPolygons.map((pts, i) => (
          <Polygon key={`grid-${i}`} points={pts} fill="none" stroke={gridColor} strokeWidth={1} />
        ))}
        {outerPoints.map((p, i) => (
          <Line key={`spoke-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={gridColor} strokeWidth={1} />
        ))}

        <Polygon points={dataPolygon} fill={fillColor} stroke={strokeColor} strokeWidth={2} strokeLinejoin="round" />

        {dataPoints.map((p, i) =>
          safeAxes[i].value > 0 ? <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2.5} fill={strokeColor} /> : null
        )}

        {safeAxes.map((axis, i) => {
          if (!axis.label) return null;
          const label = axis.label.length > 14 ? `${axis.label.slice(0, 13)}…` : axis.label;
          const lp = pointOnAxis(i, maxRadius + padding * 0.62, cx, cy);
          const cos = Math.cos(lp.angle);
          const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
          return (
            <SvgText key={`label-${i}`} x={lp.x} y={lp.y} fill={labelColor} fontSize={labelFontSize} fontWeight="700" textAnchor={anchor} alignmentBaseline="middle">
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

import { Colors } from '@/CONSTANTS';
import { RankType } from '@/realm/models';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  rankType?: RankType;
  size?: number;
}

function toGlow(hex: string): string {
  const map: Record<string, string> = {
    [Colors.rankSSS]: Colors.rankSSSGlow,
    [Colors.rankSS]:  Colors.rankSSGlow,
    [Colors.rankS]:   Colors.rankSGlow,
    [Colors.rankA]:   Colors.rankAGlow,
    [Colors.rankB]:   Colors.rankBGlow,
    [Colors.rankC]:   Colors.rankCGlow,
    [Colors.rankD]:   Colors.rankDGlow,
    [Colors.rankE]:   Colors.rankEGlow,
  };
  return map[hex.toUpperCase()] ?? map[hex.toLowerCase()] ?? hex + '55';
}

function labelFontSize(name: string, badgePx: number): number {
  if (name.length === 1) return badgePx * 0.52;
  if (name.length === 2) return badgePx * 0.37;
  return badgePx * 0.26;
}

export const RankBadge: React.FC<Props> = ({ rankType, size = 72 }) => {
  const label = (rankType?.name ?? '?').toUpperCase();
  const color = rankType?.color ?? Colors.rankD;
  const glow  = toGlow(color);

  const pulse   = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulse,   { toValue: 1.07, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulse,   { toValue: 1.00, duration: 1400, useNativeDriver: true }),
    ]));
    const g = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1.0, duration: 1100, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
    ]));
    p.start(); g.start();
    return () => { p.stop(); g.stop(); };
  }, [rankType?._id]);

  const d  = size * 0.68;
  const fs = labelFontSize(label, size);

  return (
    <Animated.View style={[st.root, { width: size, height: size, transform: [{ scale: pulse }] }]}>
      <Animated.View style={[st.glowRing, {
        width: size + 20, height: size + 20,
        borderRadius: (size + 20) / 2,
        backgroundColor: glow,
        top: -10, left: -10,
        opacity: shimmer,
      }]} />

      <View style={[st.diamond, {
        width: d, height: d,
        borderRadius: d * 0.16,
        borderColor: color,
        top: (size - d) / 2, left: (size - d) / 2,
      }]} />

      <View style={[st.diamondInner, {
        width: d * 0.68, height: d * 0.68,
        borderRadius: d * 0.1,
        backgroundColor: color + '1E',
        top:  size / 2 - d * 0.34,
        left: size / 2 - d * 0.34,
      }]} />

      <View style={[st.labelLayer, { width: size, height: size }]}>
        <Text
          style={[st.label, { fontSize: fs, color: '#fff', textShadowColor: color }]}
          numberOfLines={1} adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>

      {([{top:6,left:6},{top:6,right:6},{bottom:6,left:6},{bottom:6,right:6}] as const).map((p,i)=>(
        <View key={i} style={[st.dot, { backgroundColor: color }, p as any]} />
      ))}
    </Animated.View>
  );
};

const st = StyleSheet.create({
  root:        { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  glowRing:    { position: 'absolute' },
  diamond:     { position: 'absolute', borderWidth: 2, transform: [{ rotate: '45deg' }], backgroundColor: 'transparent' },
  diamondInner:{ position: 'absolute', transform: [{ rotate: '45deg' }] },
  labelLayer:  { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label:       { fontWeight: '900', letterSpacing: -1.5, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, maxWidth: '84%' },
  dot:         { position: 'absolute', width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
});

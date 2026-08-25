import { DecagonRadarChart, RadarAxisDatum } from '@/components/features/object/DecagonRadarChart/DecagonRadarChart';
import { Colors, Radius } from '@/CONSTANTS';
import { GradeObject } from '@/realm/models';
import React, { forwardRef, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const RADAR_MAX = 10;

interface ObjectExportCardProps {
  obj: GradeObject;
  backgroundUri?: string | null;
  backgroundOpacity?: number;  
  overlayUri?: string | null;
  overlayEditable?: boolean;
  showScore?: boolean;
  showRank?: boolean;
}

export const ObjectExportCard = forwardRef<View, ObjectExportCardProps>(function ObjectExportCard(
  { obj, backgroundUri, backgroundOpacity = 0.4, overlayUri, overlayEditable = false, showScore = true, showRank = true },
  ref
) {
  const activeRankType = useMemo(() => {
    const types = obj.class_of_object?.rankTypes;
    if (!types?.length) return undefined;
    const rank = obj.overall_rank ?? 0;
    return [...types].filter(rt => rt.fromRank <= rank).sort((a, b) => b.fromRank - a.fromRank)[0];
  }, [obj]);

  const rankColor = activeRankType?.color ?? Colors.accent;

  const axes: RadarAxisDatum[] = useMemo(
    () =>
      obj.categories_of_object
        .sorted('rank', true)
        .slice(0, 10)
        .map(coo => ({ key: coo._id.toString(), label: coo.category.name, value: coo.rank ?? 0 })),
    [obj]
  );

  return (
    <View ref={ref} style={s.card} collapsable={false}>
      {backgroundUri ? (
        <Image source={{ uri: backgroundUri }} style={[StyleSheet.absoluteFillObject, { opacity: backgroundOpacity }]} resizeMode="cover" />
      ) : null}
      <View style={[StyleSheet.absoluteFillObject, s.scrim]} />

      {overlayUri ? <OverlayImage uri={overlayUri} editable={overlayEditable} /> : null}

      <View style={s.content}>
        <Text style={s.name} numberOfLines={2}>{obj.name}</Text>

        {/* <DecagonRadarChart axes={axes} maxValue={RADAR_MAX} size={250} fillColor={rankColor + '55'} strokeColor={rankColor} /> */}
        <View style={s.radarWrap}>
          <DecagonRadarChart
            axes={axes}
            maxValue={RADAR_MAX}
            size={210}
            fillColor={rankColor + '55'}
            strokeColor={rankColor}
          />
        </View>
        {(showScore || showRank) && (
          <View style={s.statsRow}>
            {showScore && (
              <View style={s.statBlock}>
                <Text style={s.statLabel}>SCORE</Text>
                <Text style={[s.statValue, { color: rankColor }]}>
                  {obj.overall_rank != null ? obj.overall_rank.toFixed(1) : '—'}
                </Text>
              </View>
            )}
            {showRank && activeRankType && (
              <View style={s.statBlock}>
                <Text style={s.statLabel}>RANK</Text>
                <Text style={[s.statValue, { color: rankColor }]}>{activeRankType.name}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

function OverlayImage({ uri, editable }: { uri: string; editable: boolean }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pan = Gesture.Pan()
    .enabled(editable)
    .onUpdate(e => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinch = Gesture.Pinch()
    .enabled(editable)
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <Animated.View style={[s.overlayWrap, style, editable && s.overlayEditingBorder]}>
        <Image source={{ uri }} style={s.overlayImage} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    backgroundColor: '#10101c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scrim: { backgroundColor: 'rgba(8,8,16,0.35)' },
  content: { flex: 1, padding: 18, justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textOffWhite, textAlign: 'center', letterSpacing: -0.4 },
  statsRow: { flexDirection: 'row', gap: 28 },
  statBlock: { alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 2, marginBottom: 2 },
  statValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  overlayWrap: { position: 'absolute', left: '50%', top: '50%', marginLeft: -80, marginTop: -80, width: 160, height: 160 },
  overlayEditingBorder: { borderWidth: 1.5, borderColor: Colors.accent, borderStyle: 'dashed', borderRadius: 8 },
  overlayImage: { width: '100%', height: '100%' },
  radarWrap: {
    position: 'absolute',
    top: 55,
    right: 4,
  },
});
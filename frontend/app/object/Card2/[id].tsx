/**
 * app/ObjectCard/[id].tsx  — карточка объекта с новым RankBadge + анимации
 */
import { RankBadge } from '@/components/features/class/RankType/RankBadge';
import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { Colors, Radius } from '@/CONSTANTS';
import { GradeObject } from '@/realm/models';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useObject } from '@realm/react';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { BSON } from 'realm';

function getScoreColor(v: number) {
  if (v >= 8.5) return Colors.rankS;
  if (v >= 7)   return Colors.rankC;
  if (v >= 5)   return Colors.primary;
  if (v >= 3)   return Colors.accent;
  return Colors.error;
}

export default function ObjectCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t }  = useTranslation();
  const [saved, setSaved] = useState(false);
  const viewRef = useRef(null);

  const objectId = useMemo(() => {
    try { return new BSON.ObjectId(id); } catch { return null; }
  }, [id]);
  const obj = useObject(GradeObject, objectId);

  // ── Entrance animations ──────────────────────────────────────────────────
  const cardOp  = useRef(new Animated.Value(0)).current;
  const cardTy  = useRef(new Animated.Value(24)).current;
  const badgeSc = useRef(new Animated.Value(0.6)).current;
  const gridOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOp, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(cardTy, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(badgeSc, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.timing(gridOp,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onCapture = async () => {
    try {
      const uri = await captureRef(viewRef, { format: 'png', quality: 1.0 });
      await MediaLibrary.createAssetAsync(uri);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
  };

  if (!objectId || !obj) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>Объект не найден</Text>
      </View>
    );
  }

  const activeRankType = useMemo(() => {
    const types = obj.class_of_object?.rankTypes;
    if (!types?.length) return undefined;
    const rank = obj.overall_rank ?? 0;
    return [...types].filter(rt => rt.fromRank <= rank).sort((a, b) => b.fromRank - a.fromRank)[0];
  }, [obj]);

  const topCategories = useMemo(
    () => obj.categories_of_object.sorted('rank', true).slice(0, 9),
    [obj]
  );

  const rankColor = activeRankType?.color ?? Colors.textSecondary;

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{
        headerTitle: obj.name,
        headerStyle: { backgroundColor: Colors.surfaceDarker },
        headerTintColor: Colors.text,
      }} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          ref={viewRef}
          style={[s.card, { opacity: cardOp, transform: [{ translateY: cardTy }] }]}
        >
          {/* Rank color top glow */}
          {activeRankType && (
            <View style={[s.topGlow, { backgroundColor: rankColor + '28' }]} />
          )}

          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={s.headerRow}>

            {/* Photo */}
            {obj.photo ? (
              <Image source={{ uri: obj.photo }} style={s.photo} />
            ) : (
              <View style={[s.photo, s.photoPlaceholder]}>
                <MaterialCommunityIcons name="image-off" size={32} color="#444" />
              </View>
            )}

            <View style={s.info}>
              <Text style={s.objName} numberOfLines={2}>{obj.name}</Text>
              <Text style={s.clsName}>{obj.class_of_object.name}</Text>

              <View style={s.ovrRow}>
                <Text style={s.ovrLabel}>OVR</Text>
                <Text style={[s.ovrValue, { color: rankColor }]}>
                  {obj.overall_rank != null ? obj.overall_rank.toFixed(2) : '—'}
                </Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: badgeSc }] }}>
              <RankBadge rankType={activeRankType} size={74} />
            </Animated.View>
          </View>

          <View style={[s.divider, { backgroundColor: rankColor + '30' }]} />

          {obj.description ? (
            <Text style={s.desc} numberOfLines={8}>{obj.description}</Text>
          ) : null}

          {topCategories.length > 0 && (
            <Animated.View style={[s.gridWrap, { opacity: gridOp }]}>
              <Text style={s.gridTitle}>Топ категорий</Text>
              <View style={s.grid}>
                {topCategories.map((coo, i) => {
                  const v = coo.rank ?? 0;
                  const barColor = getScoreColor(v);
                  const barW = `${Math.min(v * 10, 100)}%` as `${number}%`;

                  return (
                    <View key={coo._id.toString()} style={s.cell}>
                      <View style={s.cellIndex}>
                        <Text style={s.cellIndexTxt}>{i + 1}</Text>
                      </View>
                      <Text style={s.cellName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {coo.category.name}
                      </Text>
                      <Text style={[s.cellScore, { color: barColor }]}>{v.toFixed(1)}</Text>
                      <View style={s.barBg}>
                        <View style={[s.barFill, { width: barW, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ marginTop: 16 }}>
          <Button title={t('common.png_export')} onPress={onCapture} />
        </View>
        <SuccessMessage visible={saved} onClose={() => setSaved(false)} message={t('common.success_export')} />
      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: 14, paddingBottom: 48 },

  card: {
    backgroundColor: '#10101c',
    borderRadius: Radius.xxl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 18,
    overflow: 'hidden',
  },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },

  // Header
  headerRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  photo:           { width: 82, height: 82, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: Colors.surfaceDarker },
  photoPlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  info:            { flex: 1, justifyContent: 'center', paddingTop: 2 },
  objName:         { fontSize: 19, fontWeight: '800', color: Colors.textOffWhite, letterSpacing: -0.3, marginBottom: 4 },
  clsName:         { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },
  ovrRow:          { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  ovrLabel:        { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  ovrValue:        { fontSize: 28, fontWeight: '900', letterSpacing: -1 },

  divider: { height: 1, marginVertical: 12, marginHorizontal: -14 },

  desc: { color: '#a0a0b8', fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginBottom: 12 },

  // Grid
  gridWrap:  { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.lg, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  gridTitle: { color: Colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  cell: {
    width: '31%', aspectRatio: 1,
    backgroundColor: Colors.surfaceDarker,
    borderRadius: Radius.md,
    padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-between', overflow: 'hidden',
  },
  cellIndex:    { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  cellIndexTxt: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700' },
  cellName:     { color: '#ccc', fontSize: 10, fontWeight: '600', textAlign: 'center', flex: 1 },
  cellScore:    { fontSize: 17, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  barBg:        { height: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 2 },
});

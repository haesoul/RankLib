import { ObjectExportCard } from '@/components/features/object/Card/ObjectExportCard';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { GradeObject } from '@/realm/models';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useObject } from '@realm/react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { BSON } from 'realm';

const CYBER = {
  panel: '#0b0f1cf2',
  border: 'rgba(0,229,255,0.25)',
  neon: '#00e5ff',
  text: '#e8fbff',
  textDim: '#6f8a9c',
};

const OPACITY_STEPS = [0.2, 0.4, 0.6, 0.85];

export default function CardStudioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const objectId = useMemo(() => {
    try { return new BSON.ObjectId(id); } catch { return null; }
  }, [id]);
  const obj = useObject(GradeObject, objectId);

  const cardRef = useRef<View>(null);
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [overlayUri, setOverlayUri] = useState<string | null>(null);
  const [overlayEditable, setOverlayEditable] = useState(true);
  const [bgOpacityIdx, setBgOpacityIdx] = useState(1);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const pickImage = async (onPicked: (uri: string) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // SDK 52+: use mediaTypes: ['images']
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) onPicked(result.assets[0].uri);
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    const mediaPerm = await MediaLibrary.requestPermissionsAsync();
    if (!mediaPerm.granted) return;

    setExporting(true);
    setOverlayEditable(false);
    await new Promise(requestAnimationFrame);

    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.createAssetAsync(uri);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setOverlayEditable(true);
      setExporting(false);
    }
  };

  return (
    <View style={cs.container}>
      <LinearGradient colors={['#05070f', '#0a1230', '#05070f']} style={StyleSheet.absoluteFillObject} />
      <Stack.Screen options={{ headerShown: false }} />

      {!objectId || !obj ? (
        <View style={cs.center}>
          <Text style={{ color: CYBER.textDim }}>{t('object.not_found')}</Text>
        </View>
      ) : (
        <>
          <View style={cs.header}>
            <Pressable onPress={() => router.back()} style={cs.iconBtn} hitSlop={10}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={CYBER.neon} />
            </Pressable>
            <Text style={cs.headerTitle}>{t('object.card.studio_title')}</Text>
            <View style={cs.iconBtn} />
          </View>

          <View style={cs.cardStage}>
            <View style={cs.cardGlow}>
              <ObjectExportCard
                ref={cardRef}
                obj={obj}
                backgroundUri={backgroundUri}
                backgroundOpacity={OPACITY_STEPS[bgOpacityIdx]}
                overlayUri={overlayUri}
                overlayEditable={overlayEditable}
              />
            </View>
          </View>

          <View style={cs.controls}>
            <Pressable style={cs.controlBtn} onPress={() => pickImage(setBackgroundUri)}>
              <MaterialCommunityIcons name="image-outline" size={20} color={CYBER.neon} />
              <Text style={cs.controlLabel}>{t('object.card.pick_background')}</Text>
            </Pressable>

            <Pressable style={cs.controlBtn} onPress={() => pickImage(setOverlayUri)}>
              <MaterialCommunityIcons name="image-plus" size={20} color={CYBER.neon} />
              <Text style={cs.controlLabel}>{t('object.card.pick_overlay')}</Text>
            </Pressable>

            {backgroundUri && (
              <View style={cs.opacityRow}>
                <Text style={cs.opacityLabel}>{t('object.card.background_opacity')}</Text>
                <View style={cs.opacitySteps}>
                  {OPACITY_STEPS.map((v, i) => (
                    <Pressable key={v} onPress={() => setBgOpacityIdx(i)} style={[cs.opacityDot, i === bgOpacityIdx && cs.opacityDotActive]} />
                  ))}
                </View>
              </View>
            )}

            <Pressable style={[cs.exportBtn, exporting && { opacity: 0.6 }]} onPress={handleExport} disabled={exporting}>
              <MaterialCommunityIcons name="tray-arrow-down" size={20} color="#00131a" />
              <Text style={cs.exportLabel}>{t('common.png_export')}</Text>
            </Pressable>
          </View>

          <SuccessMessage visible={saved} onClose={() => setSaved(false)} message={t('common.success_export')} />
        </>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 54, paddingBottom: 12 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: CYBER.text, fontSize: 15, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  cardStage: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  cardGlow: { borderRadius: 28, shadowColor: CYBER.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  controls: { padding: 18, paddingBottom: 34, gap: 10 },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CYBER.panel, borderWidth: 1, borderColor: CYBER.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  controlLabel: { color: CYBER.text, fontSize: 13, fontWeight: '700' },
  opacityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 6 },
  opacityLabel: { color: CYBER.textDim, fontSize: 12, fontWeight: '600' },
  opacitySteps: { flexDirection: 'row', gap: 8 },
  opacityDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: CYBER.border },
  opacityDotActive: { backgroundColor: CYBER.neon, borderColor: CYBER.neon },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CYBER.neon, borderRadius: 16, paddingVertical: 15, marginTop: 6, shadowColor: CYBER.neon, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  exportLabel: { color: '#00131a', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});
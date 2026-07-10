
import { RankBadge } from '@/components/features/class/RankType/RankBadge';
import { Colors, RANK_COLOR_PRESETS, Radius } from '@/CONSTANTS';
import { ClassOfGrading, RankType } from '@/realm/models';
import { useObject, useRealm } from '@realm/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BSON } from 'realm';


interface FormState { name: string; fromRank: string; color: string }
const EMPTY: FormState = { name: '', fromRank: '', color: Colors.rankS };

function isFormValid(f: FormState) {
  return f.name.trim().length > 0 && !isNaN(parseFloat(f.fromRank));
}


const RankCard: React.FC<{
  rt: RankType; index: number;
  onEdit: () => void; onDelete: () => void;
}> = ({ rt, index, onEdit, onDelete }) => {
  const tx = useRef(new Animated.Value(32)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tx, { toValue: 0, duration: 300, delay: index * 55, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 300, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  const color = rt.color ?? Colors.primary;

  return (
    <Animated.View style={[st.card, { transform: [{ translateX: tx }], opacity: op }]}>
      <View style={[st.cardStripe, { backgroundColor: color }]} />

      <RankBadge rankType={rt} size={56} />

      <View style={st.cardBody}>
        <Text style={[st.cardName, { color }]}>{rt.name.toUpperCase()}</Text>
        <Text style={st.cardFrom}>от {rt.fromRank.toFixed(1)} баллов</Text>
      </View>

      <View style={st.cardActions}>
        <TouchableOpacity style={st.iconBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={st.iconBtnTxt}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.iconBtn, { backgroundColor: Colors.error + '22' }]} onPress={onDelete} activeOpacity={0.7}>
          <Text style={[st.iconBtnTxt, { color: Colors.error }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};


const FormSheet: React.FC<{
  visible: boolean;
  initial: RankType | null;
  onSave: (f: FormState) => void;
  onClose: () => void;
}> = ({ visible, initial, onSave, onClose }) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const slide = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setForm(initial
        ? { name: initial.name, fromRank: String(initial.fromRank), color: initial.color ?? Colors.rankS }
        : EMPTY
      );
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slide, { toValue: 500, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const set = (key: keyof FormState) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const previewRt = useMemo(() => ({
    name: form.name || '?', color: form.color, fromRank: 0,
  } as unknown as RankType), [form.name, form.color]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Animated.View
            style={[st.sheet, { transform: [{ translateY: slide }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>{initial ? 'Редактировать' : 'Новый ранг'}</Text>

            <View style={st.preview}>
              <RankBadge rankType={previewRt} size={80} />
              <View style={{ flex: 1 }}>
                <Text style={[st.previewName, { color: form.color || Colors.textSecondary }]}>
                  {form.name.toUpperCase() || '—'}
                </Text>
                <Text style={st.previewSub}>
                  Старт: {parseFloat(form.fromRank) >= 0 ? parseFloat(form.fromRank).toFixed(1) : '—'}
                </Text>
              </View>
            </View>

            <Text style={st.label}>Название</Text>
            <TextInput
              style={st.input} value={form.name} onChangeText={set('name')}
              placeholder="S, SS, God…" placeholderTextColor={Colors.textSecondary}
              autoCapitalize="characters" maxLength={6}
            />

            <Text style={st.label}>Мин. оценка (0–10)</Text>
            <TextInput
              style={st.input} value={form.fromRank} onChangeText={set('fromRank')}
              placeholder="9.0" placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad" maxLength={5}
            />

            <Text style={st.label}>Цвет</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
                {RANK_COLOR_PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.color}
                    style={[st.colorDot, { backgroundColor: p.color },
                      form.color === p.color && st.colorDotActive]}
                    onPress={() => setForm(f => ({ ...f, color: p.color }))}
                    activeOpacity={0.8}
                  >
                    {form.color === p.color && <Text style={st.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={[st.input, { marginBottom: 20 }]}
              value={form.color} onChangeText={set('color')}
              placeholder="#FFD600" placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none" maxLength={9}
            />

            <View style={st.formBtns}>
              <TouchableOpacity style={st.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={st.cancelTxt}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.saveBtn, !isFormValid(form) && { opacity: 0.4 }]}
                onPress={() => isFormValid(form) && onSave(form)}
                activeOpacity={isFormValid(form) ? 0.85 : 1}
              >
                <Text style={st.saveTxt}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};


export default function RankTypeManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const realm  = useRealm();

  const cls = useObject<ClassOfGrading>('ClassOfGrading', new BSON.ObjectId(id));

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing]           = useState<RankType | null>(null);

  // Header entrance
  const hOp = useRef(new Animated.Value(0)).current;
  const hTy = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(hOp, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(hTy, { toValue: 0,  duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const sorted = useMemo(
    () => [...(cls?.rankTypes ?? [])].sort((a, b) => b.fromRank - a.fromRank),
    [cls?.rankTypes?.length]
  );

  const openCreate = () => { setEditing(null); setSheetVisible(true); };
  const openEdit   = (rt: RankType) => { setEditing(rt); setSheetVisible(true); };
  const closeSheet = () => { setSheetVisible(false); setEditing(null); };

  const handleSave = useCallback((form: FormState) => {
    if (!cls) return;
    realm.write(() => {
      if (editing) {
        editing.name     = form.name.trim();
        editing.fromRank = parseFloat(form.fromRank);
        editing.color    = form.color;
      } else {
        const rt = realm.create<RankType>('RankType', {
          _id:      new BSON.ObjectId(),
          name:     form.name.trim(),
          fromRank: parseFloat(form.fromRank),
          color:    form.color,
          createdAt: new Date(),
        });
        cls.rankTypes?.push(rt);
      }
    });
    closeSheet();
  }, [realm, cls, editing]);

  const handleDelete = useCallback((rt: RankType) => {
    realm.write(() => realm.delete(rt));
  }, [realm]);

  if (!cls) return (
    <View style={st.centered}><Text style={{ color: Colors.textSecondary }}>Класс не найден</Text></View>
  );

  return (
    <SafeAreaView style={st.container}>

      {/* ── Header ── */}
      <Animated.View style={[st.header, { opacity: hOp, transform: [{ translateY: hTy }] }]}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={st.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.screenTitle}>Типы рангов</Text>
          <Text style={st.screenSub} numberOfLines={1}>{cls.name}</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Text style={st.addTxt}>+ Добавить</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Horizontal legend strip ── */}
      {sorted.length > 0 && (
        <View style={st.legendWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.legendContent}>
            {sorted.map(rt => (
              <TouchableOpacity key={rt._id.toHexString()} style={st.legendItem} onPress={() => openEdit(rt)} activeOpacity={0.75}>
                <RankBadge rankType={rt} size={44} />
                <Text style={[st.legendLabel, { color: rt.color ?? Colors.textSecondary }]}>
                  {rt.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── List ── */}
      {sorted.length === 0 ? (
        <View style={st.empty}>
          <Text style={{ fontSize: 52 }}>🏅</Text>
          <Text style={st.emptyTitle}>Нет рангов</Text>
          <Text style={st.emptySub}>Добавь первый тип ранга{'\n'}для этого класса</Text>
          <TouchableOpacity style={st.emptyBtn} onPress={openCreate} activeOpacity={0.85}>
            <Text style={st.emptyBtnTxt}>Создать ранг</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={rt => rt._id.toHexString()}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item, index }) => (
            <RankCard
              rt={item} index={index}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <FormSheet
        visible={sheetVisible}
        initial={editing}
        onSave={handleSave}
        onClose={closeSheet}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 58 : 20,
    paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inputBackground, alignItems: 'center', justifyContent: 'center' },
  backTxt:     { color: Colors.text, fontSize: 24, fontWeight: '300', lineHeight: 30 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: Colors.textOffWhite, letterSpacing: -0.3 },
  screenSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  addBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  addTxt:      { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Legend
  legendWrap:    { backgroundColor: Colors.surfaceDarker, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  legendContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 14, alignItems: 'center' },
  legendItem:    { alignItems: 'center', gap: 4 },
  legendLabel:   { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  cardStripe:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3 },
  cardBody:    { flex: 1 },
  cardName:    { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  cardFrom:    { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.inputBackground, alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt:  { color: Colors.textSecondary, fontSize: 15 },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textOffWhite, marginTop: 6 },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn:   { marginTop: 14, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.md },
  emptyBtnTxt:{ color: '#fff', fontSize: 15, fontWeight: '700' },

  // Sheet
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 42 : 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.inputBackground, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: Colors.textOffWhite, marginBottom: 18 },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: Colors.glass,
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: Colors.glassBorder,
    marginBottom: 20,
  },
  previewName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  previewSub:  { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  label: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, fontSize: 16, fontWeight: '600',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16,
  },
  colorDot:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { borderWidth: 2.5, borderColor: '#fff' },
  colorCheck:     { color: '#fff', fontSize: 14, fontWeight: '900' },

  formBtns:  { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.inputBackground, alignItems: 'center' },
  cancelTxt: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },

  // missing from Colors reference
});

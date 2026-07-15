
import { RankInput } from "@/components/UI/Input/RankInput";
import { SelectorItem, SelectorModal } from "@/components/UI/Modal/SelectorModal";
import { Colors } from "@/CONSTANTS";
import { ClassOfGrading, GradeObject } from "@/realm/models";
import { writeCategoryRank, writeSubcategoryRank } from "@/tools/categoryService";
import { GradeMode, getObjectRank, sortObjectsByRank } from "@/tools/rankUtils";
import { useObject, useRealm } from "@realm/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Realm } from "realm";

export default function BatchGradingPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const realm = useRealm();

  const classOfGrading = useObject<ClassOfGrading>(
    "ClassOfGrading",
    new Realm.BSON.ObjectId(id)
  );

  const categories = useMemo(
    () => (classOfGrading ? Array.from(classOfGrading.categories) : []),
    [classOfGrading]
  );

  const [mode, setMode] = useState<GradeMode>("category");
  const [categoryId, setCategoryId] = useState(categories[0]?._id.toHexString() ?? "");
  const [subcategoryId, setSubcategoryId] = useState(
    () => Array.from(categories[0]?.subcategories ?? [])[0]?._id.toHexString() ?? ""
  );
  const [catModal, setCatModal] = useState(false);
  const [subModal, setSubModal] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id.toHexString() === categoryId),
    [categories, categoryId]
  );
  const subcategories = useMemo(
    () => (selectedCategory ? Array.from(selectedCategory.subcategories) : []),
    [selectedCategory]
  );
  const selectedSubcategory = useMemo(
    () => subcategories.find((s) => s._id.toHexString() === subcategoryId),
    [subcategories, subcategoryId]
  );
useEffect(() => {
    console.log("mounted");
    return () => console.log("unmounted");
}, []);
  const handleSelectCategory = useCallback((id: string) => {
    setCategoryId(id);
    setMode("category");
    const cat = categories.find((c) => c._id.toHexString() === id);
    const subs = cat ? Array.from(cat.subcategories) : [];
    setSubcategoryId(subs[0]?._id.toHexString() ?? "");
  }, [categories]);

  const sortedObjects = useMemo(() => {
    if (!classOfGrading) return [];
    return sortObjectsByRank(Array.from(classOfGrading.objects), mode, categoryId, subcategoryId);
  }, [classOfGrading, mode, categoryId, subcategoryId]);

  const gradedCount = useMemo(
    () => sortedObjects.filter((o) => getObjectRank(o, mode, categoryId, subcategoryId) != null).length,
    [sortedObjects, mode, categoryId, subcategoryId]
  );

  const handleRankChange = useCallback((obj: GradeObject, newRank: number | null) => {
    if (!selectedCategory) return;
    if (mode === "category") {
      writeCategoryRank(realm, obj, selectedCategory, categoryId, newRank);
    } else if (selectedSubcategory) {
      writeSubcategoryRank(realm, obj, selectedCategory, categoryId, selectedSubcategory, subcategoryId, newRank);
    }
  }, [realm, mode, selectedCategory, categoryId, selectedSubcategory, subcategoryId]);

  const catItems: SelectorItem[] = categories.map((c) => ({
    id: c._id.toHexString(), label: c.name,
    sub: c.subcategories.length > 0 ? `${c.subcategories.length} подкатег.` : undefined,
  }));
  const subItems: SelectorItem[] = subcategories.map((s) => ({
    id: s._id.toHexString(), label: s.name,
  }));

  if (!classOfGrading) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Класс не найден</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.classLabel} numberOfLines={1}>{classOfGrading.name}</Text>
              <Text style={s.statsText}>{gradedCount}/{sortedObjects.length} оценено</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.tabs}>
            {(["category", "subcategory"] as GradeMode[]).map((m) => {
              const disabled = m === "subcategory" && subcategories.length === 0;
              return (
                <TouchableOpacity
                  key={m}
                  style={[s.tab, mode === m && s.tabActive, disabled && s.tabDisabled]}
                  onPress={() => !disabled && setMode(m)}
                  activeOpacity={disabled ? 1 : 0.7}
                >
                  <Text style={[s.tabText, mode === m && s.tabTextActive, disabled && s.tabTextDisabled]}>
                    {m === "category" ? "Категория" : "Подкатегория"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.selectorRow}>
            <TouchableOpacity style={s.chip} onPress={() => setCatModal(true)} activeOpacity={0.7}>
              <Text style={s.chipLabel}>Категория</Text>
              <Text style={s.chipValue} numberOfLines={1}>{selectedCategory?.name ?? "—"}</Text>
              <Text style={s.chipArrow}>›</Text>
            </TouchableOpacity>
            {mode === "subcategory" && (
              <TouchableOpacity style={[s.chip, s.chipAccent]} onPress={() => setSubModal(true)} activeOpacity={0.7}>
                <Text style={s.chipLabel}>Подкатегория</Text>
                <Text style={s.chipValue} numberOfLines={1}>{selectedSubcategory?.name ?? "—"}</Text>
                <Text style={s.chipArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.divider} />
        </View>

        <View style={s.colHeader}>
          <Text style={[s.colText, { width: 32, textAlign: "center" }]}>#</Text>
          <Text style={[s.colText, { flex: 1, marginLeft: 10 }]}>Объект</Text>
          <Text style={[s.colText, { width: 72, textAlign: "center" }]}>Оценка</Text>
        </View>

        <FlatList
          data={sortedObjects}
          keyExtractor={(o) => o._id.toHexString()}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={s.rowSep} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={s.emptyText}>Нет объектов в классе</Text>
            </View>
          }
          renderItem={({ item: obj, index }) => {
            const rank = getObjectRank(obj, mode, categoryId, subcategoryId);
            const isTop3 = index < 3 && rank != null;
            const barColor = require("@/tools/rankUtils").getRankColor(rank);
            return (
              <View style={[s.row, isTop3 && s.rowHighlighted]}>
                <View style={s.posBadge}>
                  <Text style={[
                    s.posText,
                    index === 0 && { color: "#FFD700" },
                    index === 1 && { color: "#C0C0C0" },
                    index === 2 && { color: "#CD7F32" },
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={[s.accentBar, { backgroundColor: barColor + "80" }]} />
                <View style={s.nameContainer}>
                  <Text style={s.objName} numberOfLines={2}>{obj.name}</Text>
                  {obj.object_name && <Text style={s.objSubname} numberOfLines={1}>{obj.object_name}</Text>}
                </View>
                <RankInput value={rank} onChange={(v) => handleRankChange(obj, v)} />
              </View>
            );
          }}
        />

        <SelectorModal
          visible={catModal} title="Выбери категорию"
          items={catItems} selectedId={categoryId}
          onSelect={handleSelectCategory} onClose={() => setCatModal(false)}
        />
        <SelectorModal
          visible={subModal} title="Выбери подкатегорию"
          items={subItems} selectedId={subcategoryId}
          onSelect={setSubcategoryId} onClose={() => setSubModal(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: Colors.textSecondary, fontSize: 15 },

  header: { backgroundColor: Colors.surface, paddingTop: Platform.OS === "ios" ? 54 : 16, paddingHorizontal: 16 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  classLabel: { fontSize: 20, fontWeight: "700", color: Colors.textOffWhite, letterSpacing: -0.3, marginBottom: 2 },
  statsText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.inputBackground, alignItems: "center", justifyContent: "center" },
  closeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },

  tabs: { flexDirection: "row", backgroundColor: Colors.inputBackground, borderRadius: 10, padding: 3, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: Colors.primary },
  tabDisabled: { opacity: 0.4 },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  tabTextActive: { color: Colors.text },
  tabTextDisabled: { color: Colors.textSecondary },

  selectorRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { flex: 1, backgroundColor: Colors.inputBackground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary + "40", flexDirection: "row", alignItems: "center", gap: 6 },
  chipAccent: { borderColor: Colors.accent + "40" },
  chipLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 },
  chipValue: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: "600" },
  chipArrow: { fontSize: 18, color: Colors.textSecondary, lineHeight: 20 },
  divider: { height: 1, backgroundColor: Colors.backgroundSecondary, marginHorizontal: -16 },

  colHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surfaceDarker, borderBottomWidth: 1, borderBottomColor: Colors.backgroundSecondary },
  colText: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },

  listContent: { paddingVertical: 8, paddingHorizontal: 12 },
  rowSep: { height: 1, backgroundColor: Colors.backgroundSecondary, marginHorizontal: 4 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderRadius: 8, gap: 6 },
  rowHighlighted: { backgroundColor: Colors.backgroundSecondary },
  posBadge: { width: 28, alignItems: "center" },
  posText: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  accentBar: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  nameContainer: { flex: 1, marginLeft: 4 },
  objName: { fontSize: 14, fontWeight: "600", color: Colors.textOffWhite, lineHeight: 18 },
  objSubname: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: "500" },
});

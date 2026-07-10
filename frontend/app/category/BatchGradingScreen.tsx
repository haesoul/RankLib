/**
 * BatchGradingScreen
 * Экран сравнительной оценки объектов класса по одной категории/подкатегории
 */

import {
  CategoryOfObject,
  ClassOfGrading,
  GradeObject,
  SubCategoryOfObject
} from "@/realm/models";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Realm } from "realm";

// ─── Colors (из CONSTANTS.ts) ─────────────────────────────────────────────────
const Colors = {
  background: "#000000",
  backgroundSecondary: "#18181a",
  surface: "#121212",
  inputBackground: "#262626",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  primary: "#8B5CF6",
  accent: "#EC4899",
  error: "#FF4757",
  success: "#2ECC71",
  surfaceDarker: "#0a0a0a",
  surfaceMuted: "#0f0f0f",
  textOffWhite: "#f5f5f7",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type GradeMode = "category" | "subcategory";

interface Props {
  realm: Realm;
  classOfGrading: ClassOfGrading;
  onClose?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRankColor(rank: number | null | undefined): string {
  if (rank == null) return Colors.textSecondary;
  if (rank >= 9) return "#FFD700";
  if (rank >= 7) return "#2ECC71";
  if (rank >= 5) return Colors.primary;
  if (rank >= 3) return "#F39C12";
  return Colors.error;
}

function getRankLabel(rank: number | null | undefined): string {
  if (rank == null) return "—";
  return rank.toFixed(1);
}

// ─── RankInput ────────────────────────────────────────────────────────────────

interface RankInputProps {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}

const RankInput: React.FC<RankInputProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value != null ? String(value) : "");

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(text);
    if (text.trim() === "" || isNaN(parsed)) {
      onChange(null);
    } else {
      onChange(Math.min(10, Math.max(0, parsed)));
    }
  };

  const color = getRankColor(value);

  if (editing) {
    return (
      <TextInput
        style={[styles.rankInput, { borderColor: color, color }]}
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        autoFocus
        maxLength={5}
        selectTextOnFocus
        placeholderTextColor={Colors.textSecondary}
        placeholder="0–10"
      />
    );
  }

  return (
    <TouchableOpacity
      style={[styles.rankBadge, { borderColor: color + "60" }]}
      onPress={() => {
        setText(value != null ? String(value) : "");
        setEditing(true);
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.rankBadgeText, { color }]}>
        {getRankLabel(value)}
      </Text>
    </TouchableOpacity>
  );
};

// ─── SelectorModal ────────────────────────────────────────────────────────────

interface SelectorItem {
  id: string;
  label: string;
  sub?: string;
}

interface SelectorModalProps {
  visible: boolean;
  title: string;
  items: SelectorItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const SelectorModal: React.FC<SelectorModalProps> = ({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item.id === selectedId && styles.modalItemActive,
                ]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item.id === selectedId && { color: Colors.primary },
                  ]}
                >
                  {item.label}
                </Text>
                {item.sub && (
                  <Text style={styles.modalItemSub}>{item.sub}</Text>
                )}
                {item.id === selectedId && (
                  <Text style={styles.modalItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Pressable>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const BatchGradingScreen: React.FC<Props> = ({
  realm,
  classOfGrading,
  onClose,
}) => {
  const categories = useMemo(
    () => Array.from(classOfGrading.categories),
    [classOfGrading]
  );

  const [mode, setMode] = useState<GradeMode>("category");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?._id?.toHexString() ?? ""
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id.toHexString() === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const subcategories = useMemo(
    () => (selectedCategory ? Array.from(selectedCategory.subcategories) : []),
    [selectedCategory]
  );

  // Auto-select first subcategory when category changes
  const handleSelectCategory = useCallback(
    (id: string) => {
      setSelectedCategoryId(id);
      setMode("category");
      const cat = categories.find((c) => c._id.toHexString() === id);
      const subs = cat ? Array.from(cat.subcategories) : [];
      if (subs.length > 0) {
        setSelectedSubcategoryId(subs[0]._id.toHexString());
      } else {
        setSelectedSubcategoryId("");
      }
    },
    [categories]
  );

  const selectedSubcategory = useMemo(
    () =>
      subcategories.find(
        (s) => s._id.toHexString() === selectedSubcategoryId
      ),
    [subcategories, selectedSubcategoryId]
  );

  // Objects sorted by current rank descending (nulls at bottom)
  const sortedObjects = useMemo(() => {
    const objs = Array.from(classOfGrading.objects);
    return [...objs].sort((a, b) => {
      const getRank = (obj: GradeObject): number | null => {
        if (mode === "category" && selectedCategory) {
          const cor = Array.from(obj.categories_of_object).find(
            (r) => r.category._id.toHexString() === selectedCategoryId
          );
          return cor?.rank ?? null;
        } else if (mode === "subcategory" && selectedSubcategory) {
          for (const cor of Array.from(obj.categories_of_object)) {
            if (cor.category._id.toHexString() === selectedCategoryId) {
              const sub = Array.from(cor.subcategories_of_category).find(
                (s) =>
                  s.subcategory._id.toHexString() === selectedSubcategoryId
              );
              return sub?.rank ?? null;
            }
          }
        }
        return null;
      };
      const ra = getRank(a);
      const rb = getRank(b);
      if (ra == null && rb == null) return 0;
      if (ra == null) return 1;
      if (rb == null) return -1;
      return rb - ra;
    });
  }, [
    classOfGrading,
    mode,
    selectedCategoryId,
    selectedSubcategoryId,
    selectedCategory,
    selectedSubcategory,
  ]);


  const handleCategoryRankChange = useCallback(
    (obj: GradeObject, newRank: number | null) => {
      if (!selectedCategory) return;
      realm.write(() => {
        let cor = Array.from(obj.categories_of_object).find(
          (r) => r.category._id.toHexString() === selectedCategoryId
        ) as CategoryOfObject | undefined;

        if (!cor) {
          cor = realm.create("CategoryOfObject", {
            _id: new Realm.BSON.ObjectId(),
            category: selectedCategory,
            object: obj,
            rank: newRank,
            subcategories_of_category: [],
            proof: null,
          }) as CategoryOfObject;
          (obj.categories_of_object as any).push(cor);
        } else {
          cor.rank = newRank;
        }
      });
    },
    [realm, selectedCategory, selectedCategoryId]
  );

  const handleSubcategoryRankChange = useCallback(
    (obj: GradeObject, newRank: number | null) => {
      if (!selectedCategory || !selectedSubcategory) return;
      realm.write(() => {
        let cor = Array.from(obj.categories_of_object).find(
          (r) => r.category._id.toHexString() === selectedCategoryId
        ) as CategoryOfObject | undefined;

        if (!cor) {
          cor = realm.create("CategoryOfObject", {
            _id: new Realm.BSON.ObjectId(),
            category: selectedCategory,
            object: obj,
            rank: null,
            subcategories_of_category: [],
            proof: null,
          }) as CategoryOfObject;
          (obj.categories_of_object as any).push(cor);
        }

        let sub = Array.from(cor.subcategories_of_category).find(
          (s) => s.subcategory._id.toHexString() === selectedSubcategoryId
        ) as SubCategoryOfObject | undefined;

        if (!sub) {
          sub = realm.create("SubCategoryOfObject", {
            _id: new Realm.BSON.ObjectId(),
            subcategory: selectedSubcategory,
            category_of_object: cor,
            rank: newRank,
            color: null,
            proof: null,
          }) as SubCategoryOfObject;
          (cor.subcategories_of_category as any).push(sub);
        } else {
          sub.rank = newRank;
        }
      });
    },
    [
      realm,
      selectedCategory,
      selectedSubcategory,
      selectedCategoryId,
      selectedSubcategoryId,
    ]
  );

  // ── Category selector items ──────────────────────────────────────────────
  const catItems: SelectorItem[] = categories.map((c) => ({
    id: c._id.toHexString(),
    label: c.name,
    sub:
      c.subcategories.length > 0
        ? `${c.subcategories.length} подкатегор.`
        : undefined,
  }));

  const subItems: SelectorItem[] = subcategories.map((s) => ({
    id: s._id.toHexString(),
    label: s.name,
  }));

  // ── Render object row ────────────────────────────────────────────────────
  const renderObjectRow = useCallback(
    ({ item: obj, index }: { item: GradeObject; index: number }) => {
      let currentRank: number | null | undefined = null;

      if (mode === "category") {
        const cor = Array.from(obj.categories_of_object).find(
          (r) => r.category._id.toHexString() === selectedCategoryId
        );
        currentRank = cor?.rank;
      } else {
        for (const cor of Array.from(obj.categories_of_object)) {
          if (cor.category._id.toHexString() === selectedCategoryId) {
            const sub = Array.from(cor.subcategories_of_category).find(
              (s) => s.subcategory._id.toHexString() === selectedSubcategoryId
            );
            currentRank = sub?.rank;
            break;
          }
        }
      }

      const rankColor = getRankColor(currentRank);
      const isTop3 = index < 3 && currentRank != null;

      return (
        <View style={[styles.objectRow, isTop3 && styles.objectRowHighlighted]}>
          {/* Position badge */}
          <View style={styles.positionBadge}>
            <Text
              style={[
                styles.positionText,
                index === 0 && { color: "#FFD700" },
                index === 1 && { color: "#C0C0C0" },
                index === 2 && { color: "#CD7F32" },
              ]}
            >
              {index + 1}
            </Text>
          </View>

          {/* Left accent bar */}
          <View
            style={[styles.accentBar, { backgroundColor: rankColor + "80" }]}
          />

          {/* Object name */}
          <View style={styles.objectNameContainer}>
            <Text style={styles.objectName} numberOfLines={2}>
              {obj.name}
            </Text>
            {obj.object_name && (
              <Text style={styles.objectSubname} numberOfLines={1}>
                {obj.object_name}
              </Text>
            )}
          </View>

          {/* Rank input */}
          <RankInput
            value={currentRank}
            onChange={(v) => {
              if (mode === "category") {
                handleCategoryRankChange(obj, v);
              } else {
                handleSubcategoryRankChange(obj, v);
              }
            }}
          />
        </View>
      );
    },
    [
      mode,
      selectedCategoryId,
      selectedSubcategoryId,
      handleCategoryRankChange,
      handleSubcategoryRankChange,
    ]
  );

  const gradedCount = useMemo(() => {
    return sortedObjects.filter((obj) => {
      if (mode === "category") {
        const cor = Array.from(obj.categories_of_object).find(
          (r) => r.category._id.toHexString() === selectedCategoryId
        );
        return cor?.rank != null;
      } else {
        for (const cor of Array.from(obj.categories_of_object)) {
          if (cor.category._id.toHexString() === selectedCategoryId) {
            const sub = Array.from(cor.subcategories_of_category).find(
              (s) => s.subcategory._id.toHexString() === selectedSubcategoryId
            );
            return sub?.rank != null;
          }
        }
        return false;
      }
    }).length;
  }, [sortedObjects, mode, selectedCategoryId, selectedSubcategoryId]);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.classLabel} numberOfLines={1}>
              {classOfGrading.name}
            </Text>
            <Text style={styles.statsText}>
              {gradedCount}/{sortedObjects.length} оценено
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Mode tabs ── */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === "category" && styles.modeTabActive]}
            onPress={() => setMode("category")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "category" && styles.modeTabTextActive,
              ]}
            >
              Категория
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === "subcategory" && styles.modeTabActive,
              subcategories.length === 0 && styles.modeTabDisabled,
            ]}
            onPress={() => {
              if (subcategories.length > 0) {
                setMode("subcategory");
                if (!selectedSubcategoryId && subcategories.length > 0) {
                  setSelectedSubcategoryId(
                    subcategories[0]._id.toHexString()
                  );
                }
              }
            }}
            activeOpacity={subcategories.length > 0 ? 0.7 : 1}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "subcategory" && styles.modeTabTextActive,
                subcategories.length === 0 && styles.modeTabTextDisabled,
              ]}
            >
              Подкатегория
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Selector row ── */}
        <View style={styles.selectorRow}>
          {/* Category selector */}
          <TouchableOpacity
            style={styles.selectorChip}
            onPress={() => setCatModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectorChipLabel}>Категория</Text>
            <Text style={styles.selectorChipValue} numberOfLines={1}>
              {selectedCategory?.name ?? "—"}
            </Text>
            <Text style={styles.selectorChipArrow}>›</Text>
          </TouchableOpacity>

          {/* Subcategory selector — shown only in subcategory mode */}
          {mode === "subcategory" && (
            <TouchableOpacity
              style={[styles.selectorChip, styles.selectorChipAccent]}
              onPress={() => setSubModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.selectorChipLabel}>Подкатегория</Text>
              <Text style={styles.selectorChipValue} numberOfLines={1}>
                {selectedSubcategory?.name ?? "—"}
              </Text>
              <Text style={styles.selectorChipArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.headerDivider} />
      </View>

      {/* ── Column header ── */}
      <View style={styles.columnHeader}>
        <Text style={styles.columnHeaderPos}>#</Text>
        <Text style={styles.columnHeaderName}>Объект</Text>
        <Text style={styles.columnHeaderRank}>Оценка</Text>
      </View>

      {/* ── Object list ── */}
      {sortedObjects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateText}>Нет объектов в классе</Text>
        </View>
      ) : (
        <FlatList
          data={sortedObjects}
          keyExtractor={(obj) => obj._id.toHexString()}
          renderItem={renderObjectRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        />
      )}

      {/* ── Modals ── */}
      <SelectorModal
        visible={catModalVisible}
        title="Выбери категорию"
        items={catItems}
        selectedId={selectedCategoryId}
        onSelect={handleSelectCategory}
        onClose={() => setCatModalVisible(false)}
      />
      <SelectorModal
        visible={subModalVisible}
        title="Выбери подкатегорию"
        items={subItems}
        selectedId={selectedSubcategoryId}
        onSelect={setSelectedSubcategoryId}
        onClose={() => setSubModalVisible(false)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  classLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textOffWhite,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Mode tabs ──
  modeTabs: {
    flexDirection: "row",
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  modeTabDisabled: {
    opacity: 0.4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  modeTabTextActive: {
    color: Colors.text,
  },
  modeTabTextDisabled: {
    color: Colors.textSecondary,
  },

  // ── Selectors ──
  selectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  selectorChip: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorChipAccent: {
    borderColor: Colors.accent + "40",
  },
  selectorChipLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  selectorChipValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600",
  },
  selectorChipArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  headerDivider: {
    height: 1,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: -16,
  },

  // ── Column header ──
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceDarker,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
  },
  columnHeaderPos: {
    width: 32,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  columnHeaderName: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  columnHeaderRank: {
    width: 72,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // ── List ──
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: 4,
  },

  // ── Object row ──
  objectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 6,
  },
  objectRowHighlighted: {
    backgroundColor: Colors.backgroundSecondary,
  },
  positionBadge: {
    width: 28,
    alignItems: "center",
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  accentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    flexShrink: 0,
  },
  objectNameContainer: {
    flex: 1,
    marginLeft: 4,
  },
  objectName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textOffWhite,
    lineHeight: 18,
  },
  objectSubname: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // ── Rank input ──
  rankBadge: {
    width: 64,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  rankInput: {
    width: 64,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: Colors.inputBackground,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 40,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%",
    paddingHorizontal: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.inputBackground,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textOffWhite,
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 8,
  },
  modalItemActive: {
    // subtle
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  modalItemSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalItemCheck: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
});

export default BatchGradingScreen;

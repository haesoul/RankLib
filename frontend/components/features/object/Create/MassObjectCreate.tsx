import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import PickImage from "@/components/UI/PickImage/PickImage";
import { Colors } from "@/CONSTANTS";
import { ClassOfGrading, Tag } from "@/realm/models";
import { batchCreateObjects } from "@/tools/objectService";
import React, { memo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Modal as RNModal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Realm from "realm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
  realm: Realm;
  classObj: ClassOfGrading;
}

interface ObjectFormItem {
  id: number;
  name: string;
  photo: string | undefined;
}

// ---------------------------------------------------------------------------
// FormRow — мемоизированная строка формы
//
// ✅ memo: при вводе текста в одну строку React не перерисовывает остальные N-1 строк.
// Без memo каждый setState на items перезапускал рендер ВСЕГО списка.
// ✅ Все колбэки принимаем стабильными ссылками (useCallback в родителе).
// ---------------------------------------------------------------------------

interface FormRowProps {
  item: ObjectFormItem;
  index: number;
  canDelete: boolean;
  onChangeName: (id: number, text: string) => void;
  onChangePhoto: (id: number, uri: string | undefined) => void;
  onDelete: (id: number) => void;
  objectLabel: string;
  namePlaceholder: string;
  deleteLabel: string;
}

const FormRow = memo(function FormRow({
  item,
  index,
  canDelete,
  onChangeName,
  onChangePhoto,
  onDelete,
  objectLabel,
  namePlaceholder,
  deleteLabel,
}: FormRowProps) {
  return (
    <View style={styles.formItemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIndexLabel}>
          {objectLabel} #{index + 1}
        </Text>
        {canDelete && (
          <TouchableOpacity onPress={() => onDelete(item.id)}>
            <Text style={styles.deleteText}>{deleteLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>{namePlaceholder}</Text>
      <Input
        value={item.name}
        onChangeText={(text) => onChangeName(item.id, text)}
        placeholder={namePlaceholder}
        placeholderTextColor="#999"
      />
      <PickImage
        photo={item.photo}
        onChange={(uri) => onChangePhoto(item.id, uri)}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// TagChip — мемоизированный чип тега (используется в модале выбора)
// ---------------------------------------------------------------------------

interface TagChipProps {
  tag: Tag;
  isSelected: boolean;
  onPress: (tag: Tag) => void;
}

const TagChip = memo(function TagChip({ tag, isSelected, onPress }: TagChipProps) {
  return (
    <TouchableOpacity
      style={[styles.tagItem, isSelected && styles.tagItemSelected]}
      onPress={() => onPress(tag)}
      activeOpacity={0.7}
    >
      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
        {tag.name}
      </Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// MassObjectCreate
// ---------------------------------------------------------------------------

export default function MassObjectCreate({ onClose, realm, classObj }: Props) {
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<ObjectFormItem>>(null);

  const [items, setItems] = useState<ObjectFormItem[]>([
    { id: Date.now(), name: "", photo: undefined },
  ]);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [tagsModalVisible, setTagsModalVisible] = useState(false);

  // ✅ Set вместо массива — поиск O(1) при рендере чипов
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  // Держим живые Realm-объекты отдельно для передачи в batchCreateObjects
  const selectedTagsRef = useRef<Tag[]>([]);

  // --- Теги ---

  const toggleTag = useCallback((tag: Tag) => {
    const hex = tag._id.toHexString();
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(hex)) {
        next.delete(hex);
        selectedTagsRef.current = selectedTagsRef.current.filter(
          (t) => !t._id.equals(tag._id)
        );
      } else {
        next.add(hex);
        selectedTagsRef.current = [...selectedTagsRef.current, tag];
      }
      return next;
    });
  }, []);

  // --- Управление формами ---

  // ✅ useCallback — стабильная ссылка, memo в FormRow не сбрасывается
  const handleChangeName = useCallback((id: number, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: text } : item))
    );
  }, []);

  const handleChangePhoto = useCallback((id: number, uri: string | undefined) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, photo: uri } : item))
    );
  }, []);

  const handleDelete = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleAddForms = useCallback(() => {
    const count = parseInt(amountToAdd, 10);
    if (isNaN(count) || count <= 0) return;
    if (items.length + count > 100) return;

    const newItems: ObjectFormItem[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      name: "",
      photo: undefined,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setAmountToAdd("");

    // Скроллим к концу после обновления
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [amountToAdd, items.length]);

  const handleCreate = useCallback(async () => {
    const validItems = items.filter((item) => item.name.trim() !== "");
    if (validItems.length === 0) return;

    try {
      await batchCreateObjects({
        realm,
        items: validItems,
        classObj,
        tags: selectedTagsRef.current,
      });
      setItems([{ id: Date.now(), name: "", photo: undefined }]);
      setSelectedTagIds(new Set());
      selectedTagsRef.current = [];
      setAmountToAdd("");
      onClose();
    } catch (error) {
      console.error("Error batch creating objects:", error);
    }
  }, [items, realm, classObj, onClose]);

  // --- FlatList helpers ---

  // ✅ keyExtractor вынесен из JSX — стабильная ссылка, не создаётся на каждый рендер
  const keyExtractor = useCallback((item: ObjectFormItem) => String(item.id), []);

  // ✅ renderItem с useCallback: FormRow и так memo, но стабильный renderItem
  // предотвращает лишние сравнения внутри FlatList
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ObjectFormItem>) => (
      <FormRow
        item={item}
        index={index}
        canDelete={items.length > 1}
        onChangeName={handleChangeName}
        onChangePhoto={handleChangePhoto}
        onDelete={handleDelete}
        objectLabel={t("object.object")}
        namePlaceholder={t("object.name_placeholder")}
        deleteLabel={t("common.delete")}
      />
    ),
    // items.length нужен только для canDelete — не вызывает полный ре-рендер списка
    [items.length, handleChangeName, handleChangePhoto, handleDelete, t]
  );

  const ListFooter = useCallback(
    () => (
      <View style={styles.generatorContainer}>
        <Text style={styles.generatorLabel}>{t("object.add_fields")}</Text>
        <View style={styles.generatorRow}>
          <TextInput
            style={styles.generatorInput}
            value={amountToAdd}
            onChangeText={(text) => {
              if (/^\d*$/.test(text)) setAmountToAdd(text);
            }}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor="#777"
            maxLength={3}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddForms}>
            <Text style={styles.addButtonText}>{t("common.add")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [amountToAdd, handleAddForms, t]
  );

  // Стабильный объект стиля колонки — не создаётся заново при каждом рендере
  const contentContainerStyle = styles.flatListContent;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t("object.mass_create")}</Text>

            <View style={styles.tagsHeaderBlock}>
              <Text style={styles.sectionHeader}>
                {t("tags.tags_for_all_objects")}
              </Text>
              <Button
                title={
                  selectedTagIds.size > 0
                    ? `${selectedTagIds.size} ${t("tags.tags_selected")}`
                    : t("tags.select_tags")
                }
                onPress={() => setTagsModalVisible(true)}
              />
              {selectedTagIds.size > 0 && (
                <View style={styles.previewTagsContainer}>
                  {selectedTagsRef.current.map((tag) => (
                    <Text
                      key={tag._id.toHexString()}
                      style={styles.previewTagText}
                    >
                      #{tag.name}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.divider} />
          </View>

          {/* ✅ FlatList вместо ScrollView + .map()
              — виртуализация: рендерит только видимые карточки.
              При 50+ формах ScrollView держал в памяти все Input и PickImage сразу. */}
          <FlatList
            ref={flatListRef}
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListFooterComponent={ListFooter}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            contentContainerStyle={contentContainerStyle}
            // ✅ Убираем лишние ре-рендеры при изменении длины items:
            // extraData нужен, чтобы FlatList знал о canDelete (зависит от items.length)
            extraData={items.length}
            // Небольшой initialNumToRender — формы тяжёлые (PickImage)
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
          />

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Button
              title={t("common.cancel")}
              textStyle={styles.cancelText}
              onPress={onClose}
            />
            <Button
              title={`${t("common.create")} (${items.length})`}
              textStyle={styles.createText}
              onPress={handleCreate}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Модал выбора тегов */}
      <RNModal
        visible={tagsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTagsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalInner}>
            <Text style={styles.title}>{t("tags.select_tags")}</Text>
            <Text style={[styles.label, styles.modalSubtitle]}>
              {t("class.class")}: {classObj.name}
            </Text>

            <ScrollView contentContainerStyle={styles.tagsContainer}>
              {!classObj.tags || classObj.tags.length === 0 ? (
                <Text style={styles.noTagsText}>
                  {t("tags.no_tags_in_class")}
                </Text>
              ) : (
                // ✅ TagChip мемоизирован — повторный рендер модала
                // не пересоздаёт DOM для невыбранных тегов
                classObj.tags.map((tag) => (
                  <TagChip
                    key={tag._id.toHexString()}
                    tag={tag}
                    isSelected={selectedTagIds.has(tag._id.toHexString())}
                    onPress={toggleTag}
                  />
                ))
              )}
            </ScrollView>

            <Button
              title={t("common.done") ?? "Готово"}
              textStyle={styles.createText}
              onPress={() => setTagsModalVisible(false)}
            />
          </View>
        </SafeAreaView>
      </RNModal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },

  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: 16,
  },

  headerContainer: {
    flexShrink: 0,
    marginTop: 10,
  },
  tagsHeaderBlock: {
    marginBottom: 5,
  },

  flatListContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
    flexShrink: 0,
    backgroundColor: Colors.background,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F5F5F5",
    textAlign: "center",
    marginBottom: 16,
  },
  label: {
    color: "#F5F5F5",
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 14,
  },
  sectionHeader: {
    color: "#CCC",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },

  formItemContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemIndexLabel: {
    color: "#4A90E2",
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteText: {
    color: "#FF5555",
    fontSize: 12,
  },

  generatorContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.backgroundSecondary,
    borderStyle: "dashed",
  },
  generatorLabel: {
    color: "#AAA",
    fontSize: 14,
    marginBottom: 10,
  },
  generatorRow: {
    flexDirection: "row",
    gap: 10,
  },
  generatorInput: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    color: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    textAlign: "center",
    height: 45,
  },
  addButton: {
    flex: 2,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 45,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },

  cancelText: {
    color: "#CCC",
    fontSize: 16,
    fontWeight: "600",
  },
  createText: {
    color: "#4A90E2",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  modalInner: {
    padding: 20,
    flex: 1,
  },
  modalSubtitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  noTagsText: {
    color: "#777",
    textAlign: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 20,
  },
  tagItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#333",
    borderRadius: 20,
    margin: 6,
    borderWidth: 1,
    borderColor: "#444",
  },
  tagItemSelected: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  tagText: {
    color: "#CCC",
    fontSize: 14,
    fontWeight: "500",
  },
  tagTextSelected: {
    color: "#FFF",
    fontWeight: "700",
  },
  previewTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  previewTagText: {
    color: "#888",
    fontSize: 12,
    fontStyle: "italic",
  },

  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 10,
  },
});
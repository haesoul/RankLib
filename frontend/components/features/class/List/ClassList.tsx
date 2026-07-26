import ClassCard from "@/components/features/class/Card/ClassCard";
import WarnModal from "@/components/UI/Modal/WarnModal";
import { Colors } from "@/CONSTANTS";
import { ClassOfGrading } from "@/realm/models";
import { deleteClass } from "@/services/CRUD/class/class.client";
import { useQuery, useRealm } from "@realm/react";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

type ShowAllClassesProps = {
  onSelectClass: (cls: ClassOfGrading) => void;
};

const ShowAllClasses = ({ onSelectClass }: ShowAllClassesProps) => {
  const { t } = useTranslation();
  const realm = useRealm();
  const gradeClasses = useQuery(ClassOfGrading).sorted('priority', false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);



  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (selectedIds.length > 0) {
            setSelectedIds([]);
            return true; 
          }

          return false; 
        },
      );

      return () => subscription.remove();
    }, [selectedIds]),
  );
  const { height: screenHeight } = useWindowDimensions();
  const CARD_HEIGHT = screenHeight * 0.135;
  const ROW_PITCH = CARD_HEIGHT + 8 + 5;

  const scrollOffset = useSharedValue(0);
  const dragAnchorIndex = useSharedValue(-1);
  const lastDragIndex = useSharedValue(-1);
  const dragBaseSelection = useRef<string[]>([]);

  const isSelectMode = selectedIds.length > 0;

  const handlePress = (item: ClassOfGrading) => {
    if (isSelectMode) {
      toggleSelectClass(item);
    } else {
      onSelectClass(item);
    }
  };

  const toggleSelectClass = (item: ClassOfGrading) => {
    const id = item._id.toHexString();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const applyDragRange = (anchorIndex: number, currentIndex: number) => {
    const total = gradeClasses.length;
    if (!total || anchorIndex < 0) return;
    const a = Math.min(anchorIndex, total - 1);
    const c = Math.min(Math.max(currentIndex, 0), total - 1);
    const from = Math.min(a, c);
    const to = Math.max(a, c);
    const rangeIds = gradeClasses.slice(from, to + 1).map((cls) => cls._id.toHexString());

    const merged = new Set(dragBaseSelection.current);
    rangeIds.forEach((id) => merged.add(id));
    setSelectedIds(Array.from(merged));
  };

  const startDragSelection = (anchorIndex: number) => {
    if (!gradeClasses.length) return;
    dragBaseSelection.current = selectedIds;
    applyDragRange(anchorIndex, anchorIndex);
  };

  const dragSelectGesture = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart((event) => {
      const y = event.y + scrollOffset.value;
      const idx = Math.floor(y / ROW_PITCH);
      dragAnchorIndex.value = idx;
      lastDragIndex.value = idx;
      runOnJS(startDragSelection)(idx);
    })
    .onUpdate((event) => {
      if (dragAnchorIndex.value < 0) return;
      const y = event.y + scrollOffset.value;
      const idx = Math.floor(y / ROW_PITCH);
      if (idx === lastDragIndex.value) return;
      lastDragIndex.value = idx;
      runOnJS(applyDragRange)(dragAnchorIndex.value, idx);
    })
    .onEnd(() => {
      dragAnchorIndex.value = -1;
      lastDragIndex.value = -1;
    });

  const deleteC = async () => {
    const toDelete = gradeClasses.filter((cls) => selectedIds.includes(cls._id.toHexString()));
    await deleteClass(realm, toDelete);
    setSelectedIds([]);
    setOpenDeleteModal(false);
  };

  const renderItem = ({ item, index }: { item: ClassOfGrading; index: number }) => {
    const id = item._id.toHexString();
    const isSelected = selectedIds.includes(id);

    return (
      <ClassCard 
        item={item} 
        index={index} 
        onPress={() => handlePress(item)} 
        onLongPress={() => toggleSelectClass(item)}
        isSelected={isSelected}
        isSelectMode={isSelectMode}
      />
    );
  };

  return (
    <View style={styles.container}>
      {isSelectMode && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionText}>
            Выбрано элементов: {selectedIds.length}
          </Text>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => setOpenDeleteModal(true)}
          >
            <Text style={styles.deleteButtonText}>Удалить</Text>
          </TouchableOpacity>
        </View>
      )}

      <GestureDetector gesture={dragSelectGesture}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={gradeClasses}
            keyExtractor={(item) => item._id.toHexString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20, gap: 5 }}
            extraData={selectedIds}
            onScroll={(e) => { scrollOffset.value = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          />
        </View>
      </GestureDetector>

      <WarnModal
        visible={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title={t('class.delete_class')}
        leftOption={{
          label: t('common.close'),
          onPress: () => setOpenDeleteModal(false),
          destructive: false
        }}
        rightOption={{
          label: t('class.delete_class'),
          onPress: deleteC,
          destructive: true,
          textSize: 13
        }}
        isDeletion={true}
      /> 
    </View>
  );
};

export default ShowAllClasses;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceDarker,
    padding: 0,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#0F0F11', 
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  selectionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 14,
  },
});
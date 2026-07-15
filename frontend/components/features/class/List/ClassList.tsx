import ClassCard from "@/components/features/class/Card/ClassCard";
import { Colors } from "@/CONSTANTS";
import { ClassOfGrading } from "@/realm/models";
import { useQuery, useRealm } from "@realm/react";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import WarnModal from "@/components/UI/Modal/WarnModal";
import { useTranslation } from "react-i18next";

type ShowAllClassesProps = {
  onSelectClass: (cls: ClassOfGrading) => void;
};

const ShowAllClasses = ({ onSelectClass }: ShowAllClassesProps) => {
  const { t } = useTranslation();
  const realm = useRealm();
  const gradeClasses = useQuery(ClassOfGrading).sorted('priority', false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

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

  const deleteC = () => {
    realm.write(() => {
      selectedIds.forEach((id) => {
        const obj = gradeClasses.find((cls) => cls._id.toHexString() === id);
        if (obj) {
          realm.delete(obj);
        }
      });
    });
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
      {/* Красивая экшен-панель для AMOLED */}
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

      <FlatList
        data={gradeClasses}
        keyExtractor={(item) => item._id.toHexString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20, gap: 5 }}
        extraData={selectedIds} 
      />

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
    // justifyContent: 'between',
    alignItems: 'center',
    backgroundColor: '#0F0F11', 
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
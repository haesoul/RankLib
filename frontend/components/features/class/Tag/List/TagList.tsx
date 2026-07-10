import { useObject, useRealm } from '@realm/react';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { BSON } from 'realm';

// Импортируйте ваши модели оттуда, где они определены
// import { ClassOfGrading, Tag } from './models'; 
// (Я использую классы из вашего промпта, предполагая, что они доступны)
// import { ClassOfGrading, Tag } from './schemas'; // Замените на ваш путь
import { Colors } from '@/CONSTANTS';
import { ClassOfGrading, Tag } from '@/realm/models';
import { useTranslation } from 'react-i18next';
interface ShowAllTagsOfClassProps {
  classId: string | BSON.ObjectId;
}

export const ShowAllTagsOfClass: React.FC<ShowAllTagsOfClassProps> = ({ classId }) => {
  const realm = useRealm();
  // Преобразуем string в ObjectId, если нужно
  const objectId = typeof classId === 'string' ? new BSON.ObjectId(classId) : classId;
  
  const classObj = useObject(ClassOfGrading, objectId);

  const [modalVisible, setModalVisible] = useState(false);
  const [tagName, setTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<BSON.ObjectId | null>(null);

  const {t, i18n} = useTranslation()
  if (!classObj) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('class.not_found')}</Text>
      </View>
    );
  }

  const openAddModal = () => {
    setTagName('');
    setEditingTagId(null);
    setModalVisible(true);
  };

  const openEditModal = (tag: Tag) => {
    setTagName(tag.name);
    setEditingTagId(tag._id);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!tagName.trim()) {
      return;
    }

    realm.write(() => {
      if (editingTagId) {
        const tagToEdit = classObj.tags?.find((t) => t._id.equals(editingTagId));
        if (tagToEdit) {
          tagToEdit.name = tagName.trim();
        }
      } else {
        classObj.tags?.push({
          _id: new BSON.ObjectId(),
          name: tagName.trim(),
          createdAt: new Date(),
        } as Tag); 
      }
    });

    setModalVisible(false);
  };

  // const handleDelete = () => {
  //   if (!editingTagId || !classObj.tags) return;

  //   realm.write(() => {
  //     const tagToDelete = realm.objectForPrimaryKey("Tag", editingTagId); 
  //     if (!tagToDelete) return;
  //     if (!classObj.tags) return;

  //     const objectsWithTag = realm.objects("GradeObject").filtered("ANY tags._id == $0", editingTagId);

  //     objectsWithTag.forEach((obj: any) => {
  //       const tagIndex = obj.tags.indexOf(tagToDelete);
  //       if (tagIndex > -1) {
  //         obj.tags.splice(tagIndex, 1);
  //       }
  //     });

  //     const classTagIndex = classObj.tags.findIndex((t) => t._id.equals(editingTagId));
  //     if (classTagIndex > -1) {
  //       classObj.tags.splice(classTagIndex, 1);
  //     }

  //     realm.delete(tagToDelete);
  //   });

  //   setModalVisible(false);
  //   setEditingTagId(null);
  // };
  const handleDelete = () => {
    if (!editingTagId || !classObj.tags) return;

    realm.write(() => {
      const tagToDelete = realm.objectForPrimaryKey("Tag", editingTagId);
      if (!tagToDelete || !classObj.tags) return;

      // ✅ Один запрос находит все объекты с этим тегом.
      // Realm возвращает живую коллекцию — итерируем снэпшот через Array.from.
      const objectsWithTag = realm.objects("GradeObject")
        .filtered("ANY tags._id == $0", editingTagId);

      for (const obj of Array.from(objectsWithTag) as any[]) {
        // filtered() + batch-delete — быстрее, чем indexOf + splice в цикле
        const tagRefs = obj.tags.filtered("_id == $0", editingTagId);
        realm.delete(tagRefs);
      }

      const classTagIndex = classObj.tags.findIndex(t => t._id.equals(editingTagId));
      if (classTagIndex > -1) classObj.tags.splice(classTagIndex, 1);

      realm.delete(tagToDelete);
    });

    setModalVisible(false);
    setEditingTagId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
            <Text style={styles.label}>{t('tags.tags')}</Text>
            <View style={styles.line} />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tagsContainer}>
        {(!classObj.tags || classObj.tags.length === 0) ? (
            <Text style={styles.emptyText}>{t('tags.no_tags_in_class')}</Text>
        ) : (
            classObj.tags.map((tag) => (
            <TouchableOpacity
                key={tag._id.toHexString()}
                style={styles.tagChip}
                onPress={() => openEditModal(tag)}
                activeOpacity={0.7}
            >
                <Text style={styles.tagText}>#{tag.name}</Text>
                <View style={styles.tagDecoration} />
            </TouchableOpacity>
            ))
        )}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                {editingTagId ? t('common.edit') : t('common.add')}
                </Text>
                <View style={styles.modalHeaderDecoration} />
            </View>

            <TextInput
              style={styles.input}
              // placeholder="Введите название тега..."
              placeholderTextColor="#555"
              value={tagName}
              onChangeText={setTagName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              {editingTagId && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{t('common.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};


const CYAN = '#00f3ff';
const PINK = '#ff0055';
const DARK_BG = '#121212';
const PANEL_BG = '#1E1E1E';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  label: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginRight: 8,
  },
  line: {
      height: 1,
      backgroundColor: '#333',
      width: 40,
  },
  addButton: {
    borderColor: Colors.primary,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyText: {
      color: Colors.primary,
      fontSize: 12,
      fontStyle: 'italic',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    color: PINK,
  },
  
  tagChip: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.success,
    position: 'relative',
    overflow: 'hidden',
  },
  tagText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },
  tagDecoration: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 4,
      height: 4,
      backgroundColor: Colors.primary,
  },

  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      justifyContent: 'space-between'
  },
  modalTitle: {
    color: CYAN,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  modalHeaderDecoration: {
      width: 40,
      height: 2,
      backgroundColor: Colors.primary
  },
  input: {
    backgroundColor: '#111',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#444',
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: CYAN,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 10,
    borderRadius: 2,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteBtn: {
      marginLeft: 'auto',
      marginRight: 10,
      borderWidth: 1,
      borderColor: PINK,
      paddingVertical: 8,
      paddingHorizontal: 12,
  },
  deleteBtnText: {
      color: PINK,
      fontSize: 10,
      fontWeight: 'bold',
  }
});
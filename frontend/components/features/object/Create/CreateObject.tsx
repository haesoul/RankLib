import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import Modal from "@/components/UI/Modal/Modal";
import PickImage from "@/components/UI/PickImage/PickImage";
import { ClassOfGrading, Tag } from "@/realm/models";
import { createObject } from "@/services/CRUD/object/object.client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Realm from "realm";

interface Props {
  visible: boolean;
  onClose: () => void;
  realm: Realm;
  classObj: ClassOfGrading;
}

export default function CreateObjectOfClass({ visible, onClose, realm, classObj }: Props) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const {t, i18n} = useTranslation()
  
  const toggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t._id.equals(tag._id));
    if (isSelected) {
      setSelectedTags(prev => prev.filter(t => !t._id.equals(tag._id)));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleCreate = async () => {
    await createObject({ realm, name, photo, classObj, tags: selectedTags });
    
    setName("");
    setPhoto(undefined);
    setSelectedTags([]);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} onClose={onClose}>
        <Text style={styles.title}>{t('object.create')}</Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.label}>{t('object.name_placeholder')}</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('object.name_placeholder')}
            placeholderTextColor="#999"
          />
          <PickImage photo={photo} onChange={setPhoto} />

          <View style={{ marginVertical: 10 }}>
            <Text style={styles.label}>{t('tags.tags')}</Text>
            <Button 
              title={selectedTags.length > 0 ? `${selectedTags.length} ${t('tags.tags_selected')}` : t('tags.select_tags')} 
              onPress={() => setTagsModalVisible(true)} 
            />
            {selectedTags.length > 0 && (
               <View style={styles.previewTagsContainer}>
                  {selectedTags.map(t => (
                    <Text key={t._id.toHexString()} style={styles.previewTagText}>#{t.name}</Text>
                  ))}
               </View>
            )}
          </View>

        </ScrollView>
        <View style={styles.buttons}>
          <Button title={t('common.cancel')} textStyle={styles.cancelText} onPress={onClose} />
          <Button title={t('common.create')} textStyle={styles.createText} onPress={handleCreate} />
        </View>
      </Modal>

      <Modal visible={tagsModalVisible} onClose={() => setTagsModalVisible(false)}>
        <Text style={styles.title}>{t('tags.select_tags')}</Text>
        <Text style={[styles.label, {textAlign: 'center', marginBottom: 20}]}>
            {t('class.class')} {classObj.name}
        </Text>
        
        <ScrollView contentContainerStyle={styles.tagsContainer}>
            {classObj.tags !== undefined && classObj.tags.length === 0 ? (
                <Text style={{color: '#777', textAlign: 'center'}}>{t('tags.no_tags_in_class')}</Text>
            ) : (
                classObj.tags !== undefined &&
                classObj.tags.map((tag) => {
                    const isSelected = selectedTags.some(t => t._id.equals(tag._id));
                    return (
                        <TouchableOpacity
                            key={tag._id.toHexString()}
                            style={[styles.tagItem, isSelected && styles.tagItemSelected]}
                            onPress={() => toggleTag(tag)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                                {tag.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })
            )}
        </ScrollView>

          <Button title={t('common.done')} textStyle={styles.createText} onPress={() => setTagsModalVisible(false)}/>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  title: {
    fontSize: 20,
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
  input: {
    backgroundColor: "#2E2E2E",
    color: "#F5F5F5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10, // Добавил gap для отступа между кнопками
  },
  cancelText: {
    color: "#F5F5F5", // Обычно отмена белая/серая
    fontSize: 16,
    fontWeight: "600",
  },
  createText: {
    color: "#F5F5F5", // Или акцентный цвет
    fontSize: 16,
    fontWeight: "600",
  },
  
  // --- НОВЫЕ СТИЛИ ДЛЯ ТЭГОВ ---
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  tagItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333',
    borderRadius: 20,
    margin: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  tagItemSelected: {
    backgroundColor: '#4A90E2', // Акцентный цвет (синий) при выборе
    borderColor: '#4A90E2',
  },
  tagText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  previewTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8
  },
  previewTagText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic'
  }
});
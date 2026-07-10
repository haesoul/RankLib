import styles from "@/app/object/STYLES";
import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import Modal from "@/components/UI/Modal/Modal";
import WarnModal from "@/components/UI/Modal/WarnModal";
import { GradeObject, Tag } from "@/realm/models";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";


const width = Dimensions.get("window").width;

interface Props {
  object: GradeObject;
  visible: boolean;
  onClose: () => void;
  selectedTags: Tag[];
  onOpenTags: () => void;
  onOpenDescription: () => void;
  onNavigate: (path: string) => void;
  onAutoCalcCats: () => void;
  onAutoCalcObject: () => void;
  onDelete: () => void;
  // Description modal
  descriptionModalVisible: boolean;
  onCloseDescription: () => void;
  newDescription: string;
  onChangeDescription: (text: string) => void;
  onSaveDescription: () => void;
  // Tags modal
  tagsModalVisible: boolean;
  onCloseTags: () => void;
  onToggleTag: (tag: Tag) => void;
  onDoneTags: () => void;
  // Delete modal
  openDeleteModal: boolean;
  onCloseDeleteModal: () => void;
}

export default function ObjectMenuModal({
  object,
  visible,
  onClose,
  selectedTags,
  onOpenTags,
  onOpenDescription,
  onNavigate,
  onAutoCalcCats,
  onAutoCalcObject,
  onDelete,
  descriptionModalVisible,
  onCloseDescription,
  newDescription,
  onChangeDescription,
  onSaveDescription,
  tagsModalVisible,
  onCloseTags,
  onToggleTag,
  onDoneTags,
  openDeleteModal,
  onCloseDeleteModal,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.modalViewContainer}>
        <View style={{ marginVertical: 10, marginBottom: 25, flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          <Button
            title={selectedTags.length > 0
              ? `${selectedTags.length} ${t('tags.tags_selected')}`
              : t('tags.select_tags')}
            onPress={onOpenTags}
          />
          {selectedTags.length > 0 && (
            <View style={styles.previewTagsContainer}>
              {selectedTags.map(tag => (
                <Text key={tag._id.toHexString()} style={styles.previewTagText}>#{tag.name}</Text>
              ))}
            </View>
          )}

          <Button title={t('categories.categories')} onPress={() => onNavigate(`/object/TopObjectCategories/${object._id.toHexString()}`)} />
          <Button title={t('common.edit')} onPress={onOpenDescription} style={{ width: width * 0.8 }} />

          <View style={styles.sectionHeader}>
            <View style={styles.line} />
            <Text style={styles.sectionHeaderText}>{t('common.cards').toUpperCase()}</Text>
            <View style={styles.line} />
          </View>

          <Button title={t('common.variant') + " 1"} onPress={() => onNavigate(`/object/Card1/${object._id.toHexString()}`)} />
          <Button
            title={t('common.variant') + " 2"}
            style={styles.width100}
            onPress={() => {
              onNavigate(`/object/Card2/${object._id.toHexString()}`);
              setTimeout(onClose, 300);
            }}
          />
        </View>

        <Button onPress={onAutoCalcCats}>
          <Text style={styles.buttonText}>{t('object.auto_calc_cats_based_by_subs')}</Text>
        </Button>
        <Button onPress={onAutoCalcObject}>
          <Text style={styles.buttonText}>{t('object.auto_calc_object_by_cats')}</Text>
        </Button>
        <Button title={t('common.delete')} textStyle={styles.buttonText} onPress={onDelete} style={{ backgroundColor: "#3b0b0b" }} />

        <WarnModal
          visible={openDeleteModal}
          onClose={onCloseDeleteModal}
          title={t('object.deletion')}
          message={t('object.deletion_warn_msg')}
          leftOption={{ label: t('common.cancel'), onPress: onCloseDeleteModal }}
          rightOption={{ label: t('common.delete'), onPress: onDelete, destructive: true }}
          isDeletion={true}
        />
      </View>

      {/* Description nested modal */}
      <Modal visible={descriptionModalVisible} onClose={onCloseDescription}>
        <View style={styles.headerRow}>
          <Text style={styles.descriptionText}>{t('common.description')}</Text>
          <Button onPress={() => onChangeDescription('')} style={{ width: 42, height: 42, flex: 1, paddingHorizontal: 0 }}>
            <MaterialIcons name="delete" size={22} color="#fff" />
          </Button>
        </View>
        <Input
          multiline
          numberOfLines={10}
          placeholder={t('common.description')}
          value={newDescription}
          onChangeText={onChangeDescription}
        />
        <Button title={t('common.save')} onPress={onSaveDescription} />
      </Modal>

      {/* Tags nested modal */}
      <Modal visible={tagsModalVisible} onClose={onCloseTags}>
        <Text style={styles.title}>{t('tags.select_tags')}</Text>
        <Text style={[styles.label, { textAlign: 'center', marginBottom: 20 }]}>
          {t('class.class')} {object.class_of_object.name}
        </Text>
        <ScrollView contentContainerStyle={styles.tagsContainer}>
          {!object.class_of_object.tags || object.class_of_object.tags.length === 0 ? (
            <Text style={{ color: '#777', textAlign: 'center' }}>{t('tags.no_tags_in_class')}</Text>
          ) : (
            object.class_of_object.tags.map(tag => {
              const isSelected = selectedTags.some(t => t._id.equals(tag._id));
              return (
                <TouchableOpacity
                  key={tag._id.toHexString()}
                  style={[styles.tagItem, isSelected && styles.tagItemSelected]}
                  onPress={() => onToggleTag(tag)}
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
        <Button title={t('common.done')} textStyle={styles.tagText} onPress={onDoneTags} />
      </Modal>
    </Modal>
  );
}

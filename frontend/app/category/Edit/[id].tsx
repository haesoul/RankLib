import Button from '@/components/UI/Buttons/Button';
import Input from '@/components/UI/Input/Input';
import Modal from '@/components/UI/Modal/Modal';
import WarnModal from '@/components/UI/Modal/WarnModal';
import { Category, ClassOfGrading, SubCategory } from "@/realm/models";
import { onChangeClass } from '@/realm/onChangeClass';
import { createCategory, deleteCategory, updateCatogory } from '@/services/CRUD/category/category.client';
import { createSubCategory, deleteSubCategory } from '@/services/CRUD/subcategory/subcategory.client';
import {
  compareByPriorityThenDate,
  deleteAllCategories,
  deleteSelectedCategories,
} from '@/tools/categoryService';
import { Feather } from '@expo/vector-icons';
import { useObject, useRealm } from "@realm/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import Realm from "realm";
import styles from '../STYLES';

export default function CategoriesReorderPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const realm = useRealm();
  const router = useRouter();

  const classObj = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));

  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newCategoryWeight, setNewCategoryWeight] = useState('');
  const [newSubWeight, setNewSubWeight] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState<Realm.BSON.ObjectId | null>(null);
  const [reloadFlag, setReloadFlag] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openRenameModal, setOpenRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Category | SubCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newCategoryPriority, setNewCategoryPriority] = useState(-1);
  const [selectedCat, setSelectedCat] = useState<Realm.BSON.ObjectId | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<Realm.BSON.ObjectId | null>(null);
  const [selectedCats, setSelectedCats] = useState<Realm.BSON.ObjectId[]>([]);
  const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<Realm.BSON.ObjectId | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    if (classObj?.categories) {
      const cats = Array.from(classObj.categories).filter(c => c.isValid());
      setCategoriesList([...cats].sort(compareByPriorityThenDate));
    }
  }, [classObj, reloadFlag]);

  if (!classObj) {
    return <Text style={{ padding: 16 }}>{t('class.not_found')}</Text>;
  }

  const onDragEnd = ({ data }: { data: Category[] }) => {
    const validData = data.filter(d => d && d.isValid());
    setCategoriesList(validData);

    realm.write(() => {
      const normalCats: Category[] = [];
      const specialCats: Category[] = [];

      validData.forEach(item => {
        if (!item.isValid()) return;
        if (item.priority === -1) specialCats.push(item);
        else normalCats.push(item);
      });

      let nextIndex = 1;
      normalCats.forEach(item => {
        const cat = realm.objectForPrimaryKey(Category, item._id);
        if (cat && cat.isValid()) cat.priority = nextIndex++;
      });

      specialCats.sort((a, b) => {
        if (!a.isValid() || !b.isValid()) return 0;
        return +b._id.getTimestamp() - +a._id.getTimestamp();
      });

      specialCats.forEach((item, i) => {
        const cat = realm.objectForPrimaryKey(Category, item._id);
        if (cat && cat.isValid()) cat.priority = nextIndex + i;
      });
    });

    onChangeClass(realm, classObj._id);
  };

  function toggleSelect(item: Category) {
    setSelectedCats(prev => {
      const exists = prev.some(id => id.equals(item._id));
      if (exists) return prev.filter(id => !id.equals(item._id));
      return [...prev, item._id];
    });
  }

  function deleteSelectedCats() {
    if (!classObj || selectedCats.length === 0) return;
    const idsToDelete = [...selectedCats];
    const idStrings = idsToDelete.map(id => id.toHexString());
    setCategoriesList(prev => prev.filter(c => c.isValid() && !idStrings.includes(c._id.toHexString())));
    setSelectedCats([]);
    deleteSelectedCategories(classObj, realm, idsToDelete, {
      setReloadFlag: () => setReloadFlag(prev => !prev),
      onChangeClass,
      setTargetCategoryId,
      onSuccess: () => setDeleteSelectedModal(false),
    });
  }

  const handleCategoryPress = (item: Category) => {
    if (selectedCats.length > 0) {
      toggleSelect(item);
      return;
    }
    setActiveCategoryId(prev =>
      prev && prev.equals(item._id) ? null : item._id
    );
    setTargetCategoryId(null);
    setNewSubName('');
    setNewSubWeight('');
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
    if (!item || !item.isValid()) return null;

    const itemId = item._id;
    const isSelected = selectedCats.some(id => id.equals(itemId));
    const isExpanded = activeCategoryId?.equals(itemId) ?? false;
    const showSubInput = targetCategoryId && String(targetCategoryId) === String(item._id);
    const subs = item.subcategories ? Array.from(item.subcategories).filter(s => s.isValid()) : [];

    return (
      <TouchableOpacity
        onLongPress={() => toggleSelect(item)}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.85}
        style={{ marginBottom: 10 }}
      >
        <ScaleDecorator>
          <View style={[
            localStyles.card,
            isSelected && localStyles.cardSelected,
            isActive && localStyles.cardDragging,
            isExpanded && localStyles.cardExpanded,
          ]}>

            <View style={localStyles.cardHeader}>
              <View style={localStyles.cardTitleWrap}>
                {isSelected && (
                  <Feather name="check-circle" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                )}
                <Text
                  style={[localStyles.cardTitle, isSelected && { color: '#FFD700' }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {subs.length > 0 && !isExpanded && (
                  <View style={localStyles.subBadge}>
                    <Text style={localStyles.subBadgeText}>{subs.length}</Text>
                  </View>
                )}
              </View>

              <View style={localStyles.cardActions}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setRenameTarget(item);
                    setRenameValue(item.name);
                  }}
                  style={localStyles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Feather name="edit-2" size={16} color="#888" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setActiveCategoryId(item._id);
                    setTargetCategoryId(item._id);
                    setNewSubName('');
                    setNewSubWeight('');
                  }}
                  style={localStyles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Feather name="plus" size={16} color="#4A90E2" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedCat(item._id);
                  }}
                  style={localStyles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Feather name="trash-2" size={16} color="#E05555" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPressIn={drag}
                  style={localStyles.dragHandle}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Feather name="menu" size={18} color={isActive ? '#FFD700' : '#444'} />
                </TouchableOpacity>
              </View>
            </View>

            {isExpanded && (
              <View style={localStyles.expandedContent}>
                {subs.length > 0 && (
                  <View style={localStyles.subList}>
                    {subs.map((s) => (
                      <View key={s._id.toHexString()} style={localStyles.subItem}>
                        <Text style={localStyles.subItemText} numberOfLines={1}>{s.name}</Text>
                        <View style={localStyles.subItemActions}>
                          <TouchableOpacity
                            onPress={() => { setRenameTarget(s); setRenameValue(s.name); }}
                            style={localStyles.miniBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="edit-2" size={13} color="#666" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setSelectedSubCat(s._id)}
                            style={localStyles.miniBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="x" size={13} color="#AA4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {showSubInput && (
                  <View style={localStyles.addSubRow}>
                    <View style={localStyles.addSubInputs}>
                      <Input
                        placeholder={t('categories.new_subcategory_placeholder')}
                        placeholderTextColor="#555"
                        value={newSubName}
                        onChangeText={setNewSubName}
                        autoFocus
                        containerStyle={{ marginVertical: 4, marginRight: 0 }} 
                      />
                      <Input
                        placeholder={t('categories.weight_meaning')}
                        placeholderTextColor="#555"
                        value={newSubWeight}
                        onChangeText={setNewSubWeight}
                        keyboardType="number-pad"
                        containerStyle={{ marginVertical: 4, marginRight: 0 }}
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={localStyles.addSubBtn}
                      onPress={() =>
                        createSubCategory(classObj, realm, item._id, newSubName, {
                          setReloadFlag: () => setReloadFlag(prev => !prev),
                          onChangeClass,
                          setNewSubName: () => setNewSubName(''),
                          setTargetCategoryId: () => setTargetCategoryId(null),
                        }, undefined, Number(newSubWeight))
                      }>
                      <Feather name="arrow-right" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {!showSubInput && (
                  <TouchableOpacity
                    style={localStyles.addSubHint}
                    onPress={(e) => {
                      e.stopPropagation();
                      setTargetCategoryId(item._id);
                      setNewSubName('');
                      setNewSubWeight('');
                    }}
                  >
                    <Feather name="plus" size={13} color="#4A90E2" />
                    <Text style={localStyles.addSubHintText}>{t('categories.new_subcategory_placeholder')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScaleDecorator>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainConatiner}>
      <View style={styles.container}>

        <View style={localStyles.topBlock}>
          <TouchableOpacity style={localStyles.deleteAllBtn} onPress={() => setOpenDeleteModal(true)}>
            <Feather name="trash-2" size={15} color="#E05555" />
            <Text style={localStyles.deleteAllText}>{t('common.delete_all')}</Text>
          </TouchableOpacity>
          {selectedCats.length > 0 && (
            <TouchableOpacity style={localStyles.deleteSelectedBtn} onPress={() => setDeleteSelectedModal(true)}>
              <Feather name="trash-2" size={15} color="#fff" />
              <Text style={localStyles.deleteSelectedText}>
                {t('common.delete_selected')} ({selectedCats.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <WarnModal
          visible={deleteSelectedModal}
          onClose={() => setDeleteSelectedModal(false)}
          title={t('common.delete_selected')}
          leftOption={{ label: t('common.close'), onPress: () => setDeleteSelectedModal(false), destructive: false }}
          rightOption={{ label: t('common.delete_selected'), onPress: deleteSelectedCats, destructive: true, textSize: 13 }}
          isDeletion={true}
        />

        <View style={localStyles.addCatRow}>
          <View style={localStyles.addCatInputsContainer}>
            <Input
              placeholder={t('categories.new_category_placeholder')}
              placeholderTextColor="#555"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              containerStyle={{ marginVertical: 4, marginRight: 0 }} 
            />
            <Input
              placeholder={t('categories.weight_meaning')}
              placeholderTextColor="#555"
              value={newCategoryWeight}
              onChangeText={setNewCategoryWeight}
              keyboardType="number-pad"
              containerStyle={{ marginVertical: 4, marginRight: 0 }}
            />
          </View>

          <TouchableOpacity
            style={localStyles.addCatBtn}
            onPress={() =>
              createCategory(classObj, realm, {
                setReloadFlag: () => setReloadFlag(prev => !prev),
                onChangeClass,
                setNewCategoryName: (v) => setNewCategoryName(v),
              }, newCategoryName, newCategoryPriority, Number(newCategoryWeight))
            }
          >
            <Feather name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={categoriesList}
          onDragEnd={onDragEnd}
          keyExtractor={(item) =>
            item && item.isValid() ? item._id.toHexString() : `invalid-${Math.random()}`
          }
          renderItem={renderItem}
          containerStyle={{ flex: 1 }}
          activationDistance={20}
        />
      </View>

      <WarnModal
        visible={selectedCat !== null}
        onClose={() => setSelectedCat(null)}
        title={t('categories.delete')}
        leftOption={{ label: t('common.close'), onPress: () => setSelectedCat(null), destructive: false }}
        rightOption={{
          label: t('common.delete'),
          onPress: () => {
            if (!selectedCat) return;
            deleteCategory(classObj, realm, selectedCat, {
              setReloadFlag: () => setReloadFlag(prev => !prev),
              onChangeClass,
              setTargetCategoryId: (id) => setTargetCategoryId(id),
              currentTargetCategoryId: targetCategoryId,
              onSuccess: () => setCategoriesList(prev => prev.filter(c => !c._id.equals(selectedCat))),
            });
          },
          destructive: true,
          textSize: 13,
        }}
        isDeletion={true}
      />
      <WarnModal
        visible={selectedSubCat !== null}
        onClose={() => setSelectedSubCat(null)}
        title={t('categories.delete_sub')}
        leftOption={{ label: t('common.close'), onPress: () => setSelectedSubCat(null), destructive: false }}
        rightOption={{
          label: t('common.delete'),
          onPress: () => {
            if (!selectedSubCat) return;
            deleteSubCategory(classObj, realm, selectedSubCat, {
              setReloadFlag: () => setReloadFlag(prev => !prev),
              onChangeClass,
              setTargetCategoryId: (id) => setTargetCategoryId(id),
            });
          },
          destructive: true,
          textSize: 13,
        }}
        isDeletion={true}
      />
      <WarnModal
        visible={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title={t('common.deletion')}
        leftOption={{ label: t('common.close'), onPress: () => setOpenDeleteModal(false), destructive: false }}
        rightOption={{
          label: t('common.delete_all'),
          onPress: () =>
            deleteAllCategories(classObj, realm, {
              setReloadFlag: () => setReloadFlag(prev => !prev),
              setTargetCategoryId: (id) => setTargetCategoryId(id),
              onChangeClass,
              setOpenDeleteModal: (val) => setOpenDeleteModal(val),
              onSuccess: () => setCategoriesList([]),
            }),
          destructive: true,
          textSize: 13,
        }}
        isDeletion={true}
      />

      <Modal visible={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <Text style={styles.title}>{t('common.changing')}</Text>
        <Input value={renameValue} onChangeText={setRenameValue} />
        <Input
          placeholder={t('categories.change_weight')}
          value={renameTarget?.objectSchema().name === 'Category' ? newCategoryWeight : newSubWeight}
          onChangeText={renameTarget?.objectSchema().name === 'Category' ? setNewCategoryWeight : setNewSubWeight}
          keyboardType="number-pad"
        />
        <View style={styles.modalButtonRow}>
          <Button title={t('common.close')} onPress={() => { setRenameTarget(null); setRenameValue(''); }} />
          <Button
            title={t('common.save')}
            onPress={() => {
              if (renameTarget) {
                updateCatogory(classObj, renameTarget, renameValue, Number(newCategoryWeight), null, realm, {
                  onChangeClass,
                  setRenameValue,
                });
              }
              setRenameTarget(null);
              setRenameValue('');
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  topBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  deleteAllText: {
    color: '#E05555',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5c1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteSelectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // addCatRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginBottom: 14,
  // },
  // addCatBtn: {
  //   width: 46,
  //   height: 46,
  //   borderRadius: 12,
  //   backgroundColor: '#4A90E2',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   flexShrink: 0,
  // },

  addCatRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 14,
  },
  addCatInputsContainer: {
    flex: 1,
    flexDirection: 'column', 
    marginRight: 10,
  },
  addCatBtn: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0, 
  },

  card: {
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#1e1c0e',
  },
  cardDragging: {
    borderColor: '#4A90E2',
    backgroundColor: '#111827',
    shadowColor: '#4A90E2',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  cardExpanded: {
    borderColor: '#2a2a2a',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  subBadge: {
    marginLeft: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  subBadgeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dragHandle: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#2a2a2a',
    marginLeft: 2,
  },

  // Expanded panel
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111',
  },
  subList: {
    marginBottom: 8,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 5,
  },
  subItemText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
  },
  subItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },

  // addSubRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 4,
  // },
  // addSubInputs: {
  //   flex: 1,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
  // addSubBtn: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 11,
  //   backgroundColor: '#4A90E2',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   flexShrink: 0,
  // },
  addSubRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4,
  },
  addSubInputs: {
    flex: 1,
    flexDirection: 'column', 
    justifyContent: 'center',
    marginRight: 8, 
  },
  addSubBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addSubHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  addSubHintText: {
    color: '#4A90E2',
    fontSize: 13,
  },
});

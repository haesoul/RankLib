import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import WarnModal from "@/components/UI/Modal/WarnModal";
import PickImage from "@/components/UI/PickImage/PickImage";
import {
  CategoryOfObject,
  GradeObject,
  SubCategoryOfObject,
  Tag
} from "@/realm/models";
import { compareByPriorityThenDate, updateCatsRankBySubs, updateRankService } from "@/tools/categoryService";
import { objectDescriptionService, toggleObjectTagsService, updateGradeObjectRank } from "@/tools/objectService";
import { useObject, useRealm } from "@realm/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

import ObjectHeader from "@/components/features/object/Header/ObjectHeader";
import Modal from "@/components/UI/Modal/Modal";
import SettingsModal from "@/components/UI/Modal/SettingsModal";
import { Colors } from "@/CONSTANTS";
import { deleteObject, updateObject } from "@/services/CRUD/object/object.client";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BSON } from "realm";
import styles from "./STYLES";
const width = Dimensions.get('window').width;
const to2 = (v: any) =>
  Number.isFinite(v) ? Number(v.toFixed(2)) : null;


export default function ObjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const realm = useRealm();
  const object = useObject(GradeObject, new BSON.ObjectId(id));
  
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [overallRankInput, setOverallRankInput] = useState("");
  const [error, setError] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
  const [subcategoryInputs, setSubcategoryInputs] = useState<Record<string, string>>({});
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [sortedCategories, setSortedCategories] = useState<CategoryOfObject[]>([])
  const [objectMenuOpen, setObjectMenuOpen] = useState(false);
  

  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [newDescription, setNewDescription] = useState(object?.description || '');

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  



  const {t, i18n} = useTranslation();
  useEffect(() => {
    if (object) {
      setNewDescription(object.description || '');
      setSelectedTags(Array.from(object.tags) || []);
      
      const cats = Array.from(object.categories_of_object);
      setSortedCategories([...cats].sort(compareByPriorityThenDate));
      
      const catInputs: Record<string, string> = {};
      const subInputs: Record<string, string> = {};
      object.categories_of_object.forEach(cat => {
        catInputs[cat._id.toHexString()] = cat.rank != null ? String(to2(cat.rank)) : '';
        cat.subcategories_of_category.forEach(sub => {
          subInputs[sub._id.toHexString()] = sub.rank != null ? String(to2(sub.rank)) : '';
        });
      });
      setCategoryInputs(catInputs);
      setSubcategoryInputs(subInputs);
    }
  }, [object]);
  const toggleCategory = (catId: string) =>
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));

  useEffect(() => {
    if (object?.photo) {
      setNewPhotoUri(object.photo + "?t=" + Date.now());
    }
  }, [object?.photo]);
  
  useEffect(() => {
    const catInputs: Record<string, string> = {};
    const subInputs: Record<string, string> = {};
    object?.categories_of_object.forEach(cat => {
      catInputs[cat._id.toHexString()] = cat.rank != null ? String(to2(cat.rank)) : '';
      cat.subcategories_of_category.forEach(sub => {
        subInputs[sub._id.toHexString()] = sub.rank != null ? String(to2(sub.rank)) : '';
      });
    });
    setCategoryInputs(catInputs);
    setSubcategoryInputs(subInputs);
  }, [object]);



  
  const saveChanges = async () => {
    await updateObject({
      realm,
      object,
      newPhotoUri,
      newTitle,
      overallRankInput,
      callbacks: {
        setNewPhotoUri,
        setNewTitle,
        setOverallRankInput,
        setEditing,
        setError
      }
    });
  };

  const updateRank = (cat: CategoryOfObject, value: string, sub?: SubCategoryOfObject) => {
    updateRankService(realm, cat, value, sub);
    if (sub) {
      setSubcategoryInputs(prev => ({ ...prev, [sub._id.toHexString()]: value }));
    } else {
      setCategoryInputs(prev => ({ ...prev, [cat._id.toHexString()]: value }));
    }
  };

  const deleteObj = () => {
    if (!realm || !object) return;
    const ok = deleteObject(realm, object);
    if (ok) router.push("/");
    else setError(t('object.failed_delete'));

  };

  const toggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t._id.equals(tag._id));
    if (isSelected) {
      setSelectedTags(prev => prev.filter(t => !t._id.equals(tag._id)));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };
  
  useEffect(() => {
    if (!object) return;
    const cats = Array.from(object.categories_of_object);
    setSortedCategories([...cats].sort(compareByPriorityThenDate));
  }, [object]);

  const objectMenuSections = [
    {
      title: t('common.edit') || 'Управление', 
      items: [
        {
          id: 'edit-main',
          title: t('common.edit'),
          icon: 'edit' as const,
          onPress: () => setEditing(true),
        },
        {
          id: 'edit-description',
          title: t('common.description'),
          icon: 'description' as const,
          onPress: () => setDescriptionModalVisible(true),
        },
        {
          id: 'tags',
          title: selectedTags.length > 0 
            ? `${selectedTags.length} ${t('tags.tags_selected')}` 
            : t('tags.select_tags'),
          icon: 'local-offer' as const,
          onPress: () => setTagsModalVisible(true),
        },

      ],
    },
    {
      title: t('common.cards').toUpperCase(),
      items: [
        {
          id: 'variant-1',
          title: `${t('common.variant')} 1`,
          icon: 'style' as const,
          onPress: () => {
            setObjectMenuOpen(false);
            router.push(`/object/Card1/${id}`);
          },
        },
        {
          id: 'variant-2',
          title: `${t('common.variant')} 2`,
          icon: 'style' as const,
          onPress: () => {
            setObjectMenuOpen(false);
            setTimeout(() => router.push(`/object/Card2/${id}`), 300);
          },
        },
      ],
    },
    {
      title: t('common.calculations') || 'Расчеты',
      items: [
        {
          id: 'calc-cats',
          title: t('object.auto_calc_cats_based_by_subs'),
          icon: 'calculate' as const,
          onPress: () => realm.write(() => updateCatsRankBySubs(sortedCategories)),
        },
        {
          id: 'calc-obj',
          title: t('object.auto_calc_object_by_cats'),
          icon: 'functions' as const,
          onPress: () => realm.write(() => updateGradeObjectRank(object as any)),
        },
      ],
    },
    {
      title: '⚠️ ' + t('common.deletion'),
      items: [
        {
          id: 'delete-obj',
          title: t('common.delete'),
          icon: 'delete-forever' as const,
          variant: 'danger' as const,
          onPress: () => setOpenDeleteModal(true),
        },
      ],
    },
  ];

  useEffect(() => {
    console.log("Current object: ", object?._id.toHexString())
  }, [object])
  
  if (!object) return <Text style={{ padding: 16 }}>{t('common.loading')}</Text>;
  return (
      <SafeAreaView style={{flex: 1, backgroundColor: "#0D0D0D"}}>
        <ScrollView contentContainerStyle={styles.container}>
          <View >

            <ObjectHeader object={object} newPhotoUri={newPhotoUri} objectMenuOpen={objectMenuOpen} setObjectMenuOpen={setObjectMenuOpen} setEditing={setEditing}/>
            {sortedCategories.length ? (
              sortedCategories.map(cat => {
                const catId = cat._id.toHexString();
                return (
                  <View key={catId} style={styles.card}>
                    <Button title={
                      <Text style={styles.categoryTitle}>
                        {cat.category?.name || t('common.without_name')} — {to2(cat.rank) ?? "—"}
                      </Text>
                    } 
                    onPress={() => toggleCategory(catId)} style={styles.categoies} 
                      />
                    <Input
                      placeholder={t('grading.grade')}
                      value={categoryInputs[catId] ?? (cat.rank != null ? String(to2(cat.rank)) : "")}
                      onChangeText={val => updateRank(cat, val)}
                      keyboardType="decimal-pad"
                    />
                    {expandedCategories[catId] &&
                      (cat.subcategories_of_category.length ? (
                        cat.subcategories_of_category.map((sub: SubCategoryOfObject) => {
                          const subId = sub._id.toHexString();
                          return (
                            <View key={subId} style={styles.subBox}>
                              <Text style={styles.subcategoies}>
                                {sub.subcategory?.name || t('common.without_name')} — {to2(sub.rank) ?? "—"}
                              </Text>
                              <Input
                                placeholder={t('grading.grade')}
                                value={
                                  subcategoryInputs[subId] ??
                                  (sub.rank != null ? String(to2(sub.rank)) : "")
                                }
                                onChangeText={val => updateRank(cat, val, sub)}
                                keyboardType="decimal-pad"
                              />
                              
                            </View>
                          );
                        })
                      ) : (
                        <Text style={[styles.subcategory, { color: "#000" }]}>{t('categories.no_subcategories')}</Text>
                      ))}
                  </View>
                );
              })
            ) : (
              <Text style={{ marginVertical: 8, color: "#000" }}>{t('categories.no_categories')}</Text>
            )}

          </View>
          
        </ScrollView>

        <SettingsModal
          visible={objectMenuOpen}
          onClose={() => setObjectMenuOpen(false)}
          title={t('common.settings')} 
          sections={objectMenuSections as any}
        />

        <Modal visible={editing} onClose={() => setEditing(false)}>
          <Text style={{ color: Colors.text }}>{error}</Text>

          <Text style={{ color: Colors.text }}>{t('object.name_placeholder')}</Text>
          <Input
            placeholder={t('object.name_placeholder')}
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <Text style={{ color: Colors.text }}>{t('grading.rank')}</Text>
          <Input
            placeholder={t('grading.update_rank_placeholder')}
            value={overallRankInput}
            onChangeText={setOverallRankInput}
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: "row", gap: 8, display: "flex" }}>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <PickImage photo={newPhotoUri} onChange={setNewPhotoUri}/>  

              <View style={styles.actionRow}>
                <Button
                  title={t('common.cancel')}
                  textStyle={styles.buttonText}
                  style={styles.halfButton}
                  onPress={() => {
                    setEditing(false);
                    setNewTitle("");
                    setNewPhotoUri(null);
                    setOverallRankInput("");
                    setError("");
                  }}
                />
                <Button
                  title={t('common.save')}
                  textStyle={styles.buttonText}
                  style={styles.halfButton}
                  onPress={saveChanges}
                />
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal 
          visible={descriptionModalVisible} 
          onClose={() => {
            setDescriptionModalVisible(false);
            if (object.description) setNewDescription(object.description.toString());  
          }}
        >
          <View style={styles.headerRow}>
            <Text style={styles.descriptionText}>{t('common.description')}</Text>
            <Button onPress={() => setNewDescription('')} style={{width: 42, height: 42, flex: 1, paddingHorizontal: 0}}>
              <MaterialIcons name="delete" size={22} color="#fff"/>
            </Button>  
          </View>
          
          <Input
            multiline
            numberOfLines={10}
            placeholder={t('common.description')}
            value={newDescription}
            onChangeText={setNewDescription}
          />
          <Button 
            title={t('common.save')} 
            onPress={() => {
              setDescriptionModalVisible(false);
              objectDescriptionService(realm, object, newDescription);
            }}
          />
        </Modal>

        <Modal visible={tagsModalVisible} onClose={() => setTagsModalVisible(false)}>
          <Text style={styles.title}>{t('tags.select_tags')}</Text>
          <Text style={[styles.label, {textAlign: 'center', marginBottom: 20}]}>
              {t('class.class')} {object.class_of_object.name}
          </Text>
          
          <ScrollView contentContainerStyle={styles.tagsContainer}>
            {object.class_of_object.tags?.length === 0 ? (
              <Text style={{color: '#777', textAlign: 'center'}}>{t('tags.no_tags_in_class')}</Text>
            ) : (
              object.class_of_object.tags?.map((tag) => {
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

          <Button 
            title={t('common.done')} 
            textStyle={styles.tagText} 
            onPress={() => {
              setTagsModalVisible(false);
              toggleObjectTagsService(realm, object, selectedTags);
            }}
          />
        </Modal>

        <WarnModal
          visible={openDeleteModal}
          onClose={() => setOpenDeleteModal(false)}
          title={t('object.deletion')}
          message={t('object.deletion_warn_msg')}
          leftOption={{
            label: t('common.cancel'),
            onPress: () => setOpenDeleteModal(false),
          }}
          rightOption={{
            label: t('common.delete'),
            onPress: deleteObj,
            destructive: true,
          }}
          isDeletion={true}
        />


      </SafeAreaView>
  );
}


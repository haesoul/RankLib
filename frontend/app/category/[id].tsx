import Button from '@/components/UI/Buttons/Button';
import Input from '@/components/UI/Input/Input';
import Modal from '@/components/UI/Modal/Modal';
import {
  Category,
  ClassOfGrading,
  SubCategory,
} from "@/realm/models";
import { onChangeClass } from '@/realm/onChangeClass';
import { createCategory, updateCatogory } from '@/services/CRUD/category/category.client';
import { createSubCategory } from '@/services/CRUD/subcategory/subcategory.client';
import { compareByPriorityThenDate, deleteAllCategories } from '@/tools/categoryService';
import { useObject, useRealm } from "@realm/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  ScrollView,
  Text,
  View
} from "react-native";
import Realm from "realm";
import styles from './STYLES';


export default function CategoriesPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const realm = useRealm();

  const classObj = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState<Realm.BSON.ObjectId | null>(null);
  const [reloadFlag, setReloadFlag] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const router = useRouter()
  const [newCatName, setNewCatName] = useState('');
  const [openRenameModal, setOpenRenameModal] = useState(false);

  const [newCategoryPriority, setNewCategoryPriority] = useState(-1);
  const [newCategoryWeight, setNewCategoryWeight] = useState(1);

  const [renameTarget, setRenameTarget] = useState<Category | SubCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');


  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  const {t, i18n} = useTranslation()

  if (!classObj) {
    return <Text style={{ padding: 16 }}>{t('class.not_found')}</Text>;
  }
  useEffect(() => {
    if (!classObj) return;

    const update = () => {
      const cats = Array.from(classObj.categories);
      setCategoriesList([...cats].sort(compareByPriorityThenDate));
    };
    update();
    classObj.categories.addListener(update);

    return () => {
      classObj.categories.removeListener(update);
    };
  }, [classObj]);

  
  return (


  <View style={styles.mainConatiner}>
    <View style={styles.container}>
      <View style={styles.block}>
        <Button onPress={() => router.push(`/category/Edit/${id}`)} title={t('common.edit')}/>
      </View>
        <Modal visible={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
            <Text style={styles.title}>{t('common.deletion')}</Text>
            <View style={styles.modalButtonRow}>

                <Button title={t('common.close')} style={styles.buttonText} onPress={() => setOpenDeleteModal(false)}/>

                <Button title={t('common.delete_all')} style={[styles.buttonText]} onPress={() => 
                  deleteAllCategories(classObj, realm,  {
                    setReloadFlag: () => setReloadFlag(prev => !prev),
                    setTargetCategoryId: (id) => setTargetCategoryId(id),
                    onChangeClass,
                    setOpenDeleteModal: (val) => setOpenDeleteModal(val),
                  })
                }/>
          </View>
        </Modal>
      <View style={styles.addRow}>
          <Input
            placeholder={t('categories.new_category_placeholder')}
            placeholderTextColor="#777"
            value={newCategoryName}
            containerStyle={{flex: 1}}
            onChangeText={setNewCategoryName}
          />
        <Button 
          title='＋' 
          style={{width: 45, height: 45, paddingVertical: 0, paddingHorizontal: 0, left: 4}} 
          textStyle={styles.addBtnText} 
          onPress={() => createCategory(classObj, realm,  {
            setReloadFlag: () => setReloadFlag(prev => !prev),
            onChangeClass,
            setNewCategoryName: (v) => setNewCategoryName(v),
            
          },
          newCategoryName,
          newCategoryPriority,
          newCategoryWeight
          )}
        />
      </View>

      <FlatList
        data={categoriesList}
        keyExtractor={(item) => item?._id.toHexString()}
        style={{flex: 1}}
        renderItem={({ item: cat }) => (
          <View style={styles.categoryBox}>
            <View style={styles.row}>
              <ScrollView style={styles.textWrapper}>
                <Text style={styles.catName}>{cat.name}</Text>
              </ScrollView>
              <Button onPress={() => router.push(`/category/Card/${cat._id}`)} title={t('grading.leaderboard')}/>
            </View>

            {cat.subcategories && cat.subcategories.length ? (
              <FlatList
                data={Array.from(cat.subcategories)}
                keyExtractor={(s) => s._id.toHexString()}
                renderItem={({ item: s }) => (
                  <View style={styles.subRow}>
                    <ScrollView style={styles.textWrapper}>
                      <Text style={styles.subName}>{s.name}</Text>
                    </ScrollView>

                  </View>
                )}
              />
            ) : (
              <Text style={styles.noSubs}>{t('categories.no_subcategories')}</Text>
            )}
            

            {targetCategoryId &&
              cat._id &&
              String(targetCategoryId) === String(cat._id) && (
                <View style={[styles.addRow, {width: '83%'}]}>
                  <Input
                    placeholder={t('categories.new_subcategory_placeholder')}
                    placeholderTextColor="#777"
                    value={newSubName}
                    onChangeText={setNewSubName}
                  />

                  <Button title='＋' 
                    onPress={() => createSubCategory(classObj, realm, cat?._id, newSubName, {
                      setReloadFlag: () => setReloadFlag(prev => !prev),
                      onChangeClass,
                      setNewSubName: () => setNewSubName(""),
                      setTargetCategoryId: () => setTargetCategoryId(null),
                    })}/>
                </View>
              )}
              
          </View>
          
        )}
      />
    </View>
      <Modal visible={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <Text style={styles.title}>{t('common.changing')}</Text>

        <Input
          value={renameValue}
          onChangeText={setRenameValue}
        />

        <View style={styles.modalButtonRow}>
          <Button
            title={t('common.close')}
            onPress={() => {
              setRenameTarget(null);
              setRenameValue('');
            }}
          />

        <Button
          title={t('common.save')}
          onPress={() => {
            updateCatogory(
              classObj,
              renameTarget!,
              renameValue,
              null,
              null,
              realm,                
              { onChangeClass }     
            );
            setRenameTarget(null);
            setRenameValue('');
          }}
        />
        </View>
      </Modal>
    </View>
  );
}


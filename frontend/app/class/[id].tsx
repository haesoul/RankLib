import Button from "@/components/UI/Buttons/Button";
import Modal from "@/components/UI/Modal/Modal";
import SettingsModal from "@/components/UI/Modal/SettingsModal";
import WarnModal from "@/components/UI/Modal/WarnModal";
import { ShowAllTagsOfClass } from "@/components/features/class/Tag/List/TagList";
import CreateObjectOfClass from "@/components/features/object/Create/CreateObject";
import MassObjectCreate from "@/components/features/object/Create/MassObjectCreate";
import ShowAllObjectsOfClass from "@/components/features/object/List/ObjectList";
import {
  ClassOfGrading
} from "@/realm/models";
import { deleteClass } from "@/services/CRUD/class/class.client";
import { getProModeStatus } from "@/tools";
import { MaterialIcons } from "@expo/vector-icons";
import { useObject, useRealm } from "@realm/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal as RNModal,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Realm from "realm";
import styles from "./STYLES";


export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const realm = useRealm();
  const router = useRouter();

  const classObj = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));
  const [showCreateObject, setShowCreateObject] = useState(false);
  const [showMassCreateObject, setShowMassCreateObject] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [classCardsModal, setClassCardsModal] = useState(false)

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [ShowAllTagsOfClassVisible, setShowAllTagsOfClassVisible] = useState(false);

  const tagsInClass = classObj?.tags ?? []
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [isProMode, setIsProMode] = useState(false)

  
  const {t, i18n} = useTranslation()

  useEffect(() => {
    async function loadMode() {
      const mode = await getProModeStatus()
      if (mode === 'true')  setIsProMode(true); else setIsProMode(false)
    }
    loadMode()
  }, [])
  
  const classSettingsSections = [
    {
      title: t('common.settings'),
      items: [
        {
          id: 'edit',
          title: t('common.edit'),
          icon: 'edit' as const,
          onPress: () => { router.push(`/class/Edit/${id}`); }
        },
        {
          id: 'categories',
          title: t('categories.categories'),
          icon: 'category' as const,
          onPress: () => {  router.push({ pathname: "/category/[id]", params: { id } }); }
        },
        {
          id: 'batch',
          title: t('grading.batch_grading'),
          icon: 'layers' as const,
          onPress: () => { router.push(`/category/BatchGrading/${id}`); }
        },
        {
          id: 'create',
          title: t('object.create'),
          icon: 'create' as const,
          onPress: () => (setShowCreateObject(true))
        },
        {
          id: 'mass_create',
          title: t('object.mass_create'),
          icon: 'create' as const,
          onPress: () => setShowMassCreateObject(true)
        },
        {
          id: 'rank_types',
          title: t('class.rank_types'),
          icon: 'grade' as const,
          onPress: () => router.push(`/class/RankType/${id}`)
        },
        ...(isProMode
          ? [
              {
                id: 'pro_mode',
                title: t('pro_mode.create_by_json'),
                icon: 'create' as const,
                variant: 'primary' as const,
                onPress: () => router.push(`/class/ProScreen/${id}`)
              },
            ]
        : []),
      ]
    },
    {
      title: t('tags.tags'),
      items: [
        {
          id: 'tags-list',
          title: t('tags.tags'),
          icon: 'label' as const,
          onPress: () => { setShowAllTagsOfClassVisible(true); }
        },
      ]
    },
    {
      title: t('class.class_card'),
      items: [
        {
          id: 'top100',
          title: t('grading.top100'),
          icon: 'star' as const,
          onPress: () => { router.push(`/class/CardTop100/${id}`); }
        },
        {
          id: 'cards',
          title: t('class.class_card'),
          icon: 'style' as const,
          onPress: () => { setClassCardsModal(true); }
        },
      ]
    },
    {
      title: t('common.settings'),
      items: [
        {
          id: 'delete',
          title: t('class.delete_class'),
          icon: 'delete' as const,
          variant: 'danger' as const,
          onPress: () => { setOpenDeleteModal(true); }
        }
      ]
    },
  ];
  // <Button title={t('object.mass_create')} onPress={() => setShowMassCreateObject(true)}/>


  function deleteC() {
    deleteClass(realm, classObj!);
    router.push('/');
    
  }
  function toCard(variant: 1 | 2) {
    const params = { id: id, tagIds: JSON.stringify(selectedTags) };

    if (variant === 1) {
      router.push({ pathname: "/class/Card1/[id]", params });
    } else if (variant === 2) {
      router.push({ pathname: "/class/Card2/[id]", params });
    }
  }
  const toggleTag = (tagIdHex: string) => {
    setSelectedTags(prev => 
      prev.includes(tagIdHex) 
        ? prev.filter(t => t !== tagIdHex) 
        : [...prev, tagIdHex]
    );
  };

  if (!classObj) return <Text style={{ padding: 16 }}>{t('class.not_found')}</Text>;
  return (
    <SafeAreaView style={styles.container}>      
      <ShowAllObjectsOfClass
        id={id}
        onPressObject={(obj) => {
        const oid = obj._id?.toHexString?.();
        if (oid) router.push({ pathname: "/object/[id]", params: { id: oid } });
        }}
        />

      <View style={styles.rowContent}>
        <Button title={t('object.create')} textStyle={[styles.buttonText]} style={{flex: 1, height: '100%'}} onPress={() => setShowCreateObject(true)}/>
        <Button 
          style={{
          height: '90%',
          aspectRatio: 1,
          paddingHorizontal: 0,
          marginLeft: 8,
        
          }} 
          onPress={() => setShowSettingsMenu(!showSettingsMenu)}
        >
            <MaterialIcons name="settings" size={28} color="#fff" />
        </Button>
      </View>
      {classObj && showCreateObject && (
        <CreateObjectOfClass visible={showCreateObject} classObj={classObj} onClose={() => setShowCreateObject(false)} realm={realm}/>
      )}
      <SettingsModal
        visible={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
        title={classObj.name}
        sections={classSettingsSections}
      />
      <RNModal visible={ShowAllTagsOfClassVisible} onRequestClose={() => setShowAllTagsOfClassVisible(false)} style={{height: '80%'}}>
        <View style={styles.RNModalContainer}>
          <ShowAllTagsOfClass classId={id}/>  
        </View>
      </RNModal>
      <Modal visible={classCardsModal} onClose={() => setClassCardsModal(false)}>
        <View style={styles.sectionHeader}>
          <View style={styles.line} />
            <Text style={styles.sectionHeaderText}>
              {t('tags.filter_by_tags').toUpperCase()}
            </Text>
          <View style={styles.line} />
        </View>
        <ScrollView horizontal>
          {tagsInClass?.map((tag, index) => {
            const tagId = tag._id.toHexString(); 
            const isSelected = selectedTags.includes(tagId);

            return (
              <TouchableOpacity
                key={tagId}
                onPress={() => toggleTag(tagId)}
                style={[
                  styles.tagContainer,
                  isSelected ? styles.tagActive : styles.tagInactive
                ]}
              >
                <Text style={[isSelected ? styles.textActive : styles.textInactive]}>
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}

        </ScrollView>
        <Button title={t('common.variant') + " 1"} textStyle={styles.buttonText} onPress={() => toCard(1)}/>
        <Button title={t('common.variant') + " 2"} textStyle={styles.buttonText} onPress={() => toCard(2)}/>
      </Modal>   

                
          <RNModal visible={showMassCreateObject} onRequestClose={() => setShowMassCreateObject(false)}>
            <MassObjectCreate onClose={() => setShowMassCreateObject(false)} realm={realm} classObj={classObj}/>
          </RNModal>
          <WarnModal
            visible={openDeleteModal}
            onClose={() => setOpenDeleteModal(false)}
            title={t('class.delete_class')}
            leftOption={
              { label: t('common.close'),
                onPress: () => setOpenDeleteModal(false),
                destructive: false
              }
            }
            rightOption={
              { label: t('class.delete_class'),
                onPress: deleteC,
                destructive: true,
                textSize: 13
              }
            }
            isDeletion={true}
          /> 
    </SafeAreaView>
 );
}



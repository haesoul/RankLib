// @/screens/settings/SettingsModal.tsx

import AnimatedSwitch from '@/components/Basic/AnimatedSwitch';
import { LanguageModal } from '@/components/shared/LanguageModal/LanguageModal';
import WarnModal from '@/components/UI/Modal/WarnModal';
import { SettingsItem } from '@/components/UI/Settings/SettingsList';
import SettingsPanel from '@/components/UI/Settings/SettingsPanel';
import { Colors } from '@/CONSTANTS';
import { getProModeStatus, toggleProMode } from '@/tools';
import { useRealm } from '@realm/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sections?: { title: string; items: SettingsItem[] }[];
  onCreateClass?: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  title,
  sections,
  onCreateClass,
}: SettingsModalProps) {
  const { t } = useTranslation();

  const router = useRouter();
  const realm = useRealm();
  const insets = useSafeAreaInsets();
  const [isProMode, setIsProMode] = useState(false)

  const [langModal, setLangModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);


  useEffect(() => {
    async function loadMode() {
      const mode = await getProModeStatus()
      if (mode === 'true')  setIsProMode(true); else setIsProMode(false)
    }
    loadMode()
  }, [])
  const handleDeleteAll = () => {
    realm.write(() => realm.deleteAll());
    setDeleteModal(false);
    onClose();
  };

  const handleToggleProMode = async () => {
    const newStatus = !isProMode; 
    await toggleProMode(); 
    setIsProMode(newStatus); 
  };
  const defaultSections = [
    {
      title: t('class.class'),
      items: [
        { 
          id: 'create-class',
          title: t('class.create'),
          icon: 'add-circle-outline' as const,
          variant: 'primary' as const,
          onPress: () => { onCreateClass?.(); onClose(); },
        },
        {
          id: 'language',
          title: t('language.change_language'),
          icon: 'language' as const,
          onPress: () => setLangModal(true),
        },
        ...(isProMode
          ? [
              {
                id: 'json-create',
                title: t('pro_mode.create_by_json'),
                icon: 'create' as const,
                variant: 'primary' as const,
                onPress: () => router.push('/ProMainScreen'),
              },
            ]
          : []),
      ],
    },
    {
      title: '⚠️ ' + t('common.deletion'),
      items: [
        {
          id: 'delete-all',
          title: t('common.delete_all'),
          icon: 'delete-forever' as const,
          variant: 'danger' as const,
          onPress: () => setDeleteModal(true),
        },
      ],
    },
    {
    title: t('common.modes') || 'Режимы',
    items: [
      {
        id: 'edit-mode',
        title: t('common.pro_mode'),
        icon: 'settings' as const,
        rightElement: <AnimatedSwitch active={isProMode} onPress={handleToggleProMode} />,
        onPress: handleToggleProMode
      },
    ],
  },
  ];

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        style={{backgroundColor: Colors.background}}
      >
        <View style={[styles.root, { paddingBottom: insets.bottom }]}>
          <Pressable onPress={onClose} style={styles.handle}>
            <View style={styles.handleBar} />
          </Pressable>

          <SettingsPanel
            title={title || t('common.settings')}
            sections={sections || defaultSections}
          />
        </View>
      </Modal>

      {!sections && (
        <>
          <LanguageModal visible={langModal} onClose={() => setLangModal(false)} />
          <WarnModal
            visible={deleteModal}
            onClose={() => setDeleteModal(false)}
            title={t('common.delete_all')}
            message={t('common.delete_all_confirmation')}
            leftOption={{ label: t('common.cancel'), onPress: () => setDeleteModal(false) }}
            rightOption={{ label: t('common.confirm'), onPress: handleDeleteAll, destructive: true }}
            isDeletion={true}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder },
});
import 'react-native-get-random-values';

import CreateClass from '@/components/features/class/Create/CreateClass';
import ShowAllClasses from '@/components/features/class/List/ClassList';
import Button from '@/components/UI/Buttons/Button';
import SettingsModal from '@/components/UI/Modal/SettingsModal';
import { Colors } from '@/CONSTANTS';
import '@/i18n/index';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [openCreateClass, setOpenCreateClass] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <SafeAreaView style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.topRow}>
        <Button
          title={t('class.create')}
          textStyle={styles.buttonText}
          style={{ flex: 1 }}
          onPress={() => setOpenCreateClass(true)}
        />
        <Button
          style={styles.settingsBtn}
          onPress={() => setShowSettings(true)}
        >
          <MaterialIcons name="settings" size={24} color="#fff" />
        </Button>
      </View>

      <View style={{ flex: 1 }}>
        <ShowAllClasses
          onSelectClass={(cls) =>
            router.push({ pathname: '/class/[id]', params: { id: cls._id.toHexString() } })
          }
        />
      </View>

      {openCreateClass && (
        <CreateClass visible={openCreateClass} onClose={() => setOpenCreateClass(false)} />
      )}

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onCreateClass={() => setOpenCreateClass(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 8,
    backgroundColor: Colors.surfaceDarker,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  buttonText: {
    color: Colors.textOffWhite,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsBtn: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
  },
});








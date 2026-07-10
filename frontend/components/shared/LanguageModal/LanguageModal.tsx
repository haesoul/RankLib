import Button from '@/components/UI/Buttons/Button';
import { globalLang } from '@/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';



interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ visible, onClose }) => {
  const { i18n, t } = useTranslation();

  const languagesList = Object.entries(globalLang).map(([key, value]) => ({
    code: key,
    ...value,
  }));

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    onClose(); 
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('language.select_language')}
            </Text>
          </View>

          <FlatList
            data={languagesList}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = i18n.language === item.code;

              return (
                <TouchableOpacity
                  style={[styles.langItem, isActive && styles.langItemActive]}
                  onPress={() => handleLanguageChange(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.langInfo}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                  
                  <View style={[styles.radioButton, isActive && styles.radioButtonActive]}>
                    {isActive && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <Button onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('common.cancel', 'Cancel')}</Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#080707ff',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffffff',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#251e1eff',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langItemActive: {
    backgroundColor: '#98a9ddff',
    borderColor: '#613bc9ff',
  },
  langInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d4cfcfff',
  },
  langLabelActive: {
    color: '#0f0885ff', 
    fontWeight: '700',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#140e77ff',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#ffffffff',
    fontWeight: '600',
  },
});
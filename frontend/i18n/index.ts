import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { LANGUAGE } from '@/CONSTANTS';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import es from './es';
import fr from './fr';
import ja from './ja';
import { ru } from './ru';
import zh from './zh';

const resources = {
  ru, 
  en,  
  es,
  zh,
  fr,
  ja,

};

const systemLanguage = Localization.getLocales()[0]?.languageCode ?? 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: systemLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE);
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
};

loadSavedLanguage();

export default i18n;



declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof resources['ru'];
  }
}



export const globalLang = {
  ru: { translation: ru, label: 'Русский', flag: '🇷🇺' },
  en: { translation: en, label: 'English', flag: '🇺🇸' },
  zh: { translation: zh, label: '中文', flag: '🇨🇳' },
  fr: { translation: fr, label: 'Français', flag: '🇫🇷' },
  ja: { translation: ja, label: '日本語', flag: '🇯🇵' },
  es: { translation: es, label: 'Español', flag: '🇪🇸' },
} as const;

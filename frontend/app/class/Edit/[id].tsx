import { ClassOfGrading } from '@/realm/models';
import { updateClass, UpdateGradingProps } from '@/services/CRUD/class/class.client';
import { Ionicons } from '@expo/vector-icons';
import { Realm, useObject, useRealm } from '@realm/react';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
const { width } = Dimensions.get('window');

export default function ClassSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const realm = useRealm();
  
  const classData = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));

  const [form, setForm] = useState<UpdateGradingProps>({});
  const [hasChanges, setHasChanges] = useState(false);


  const {t, i18n} = useTranslation()
  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name,
        photo: classData.photo,
        priority: classData.priority,
        objectName: classData.objectName,
        objectsName: classData.objectsName,
        noteName: classData.noteName,
        notesName: classData.notesName,
      });
    }
  }, []);

  const handleChange = (key: keyof UpdateGradingProps, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      console.log("Нет доступа к галерее");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      handleChange('photo', result.assets[0].uri);
      console.log('result: ', result.assets[0].uri)
    }
  };
  const handleSave = async () => {
    if (!classData) return;

    let finalPhotoUri = form.photo;

    const isNewPhoto = form.photo && form.photo !== classData.photo;

    if (isNewPhoto && form.photo) {
      try {
        const timestamp = new Date().getTime();
        const fileName = `photo_${timestamp}.jpg`; 
        const newPath = `${FileSystem.documentDirectory}${fileName}`;
        console.log('newPath: ', newPath)
        await FileSystem.copyAsync({
          from: form.photo,
          to: newPath
        });
        
        finalPhotoUri = newPath;
      } catch (e) {
        console.error("Ошибка при копировании фото:", e);
      }
    }

    updateClass(realm, classData, { ...form, photo: finalPhotoUri });

    setHasChanges(false);
  };
  if (!classData) return <View style={styles.screen}><Text style={{color:'#fff'}}>{t('common.loading')}</Text></View>;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            >
          <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={styles.headerContainer}>
            <ImageBackground
                source={form.photo ? { uri: form.photo } : undefined}
                style={styles.headerImage}
                imageStyle={{ opacity: 0.6 }}
            >
                <LinearGradient
                colors={['transparent', '#000']}
                style={styles.headerGradient}
                >
                <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#FFF" />
                    <Text style={styles.photoText}>{t('pickImage.change_photo')}</Text>
                </View>
                </LinearGradient>
            </ImageBackground>
            </TouchableOpacity>

            <View style={styles.formContainer}>
            
            <Text style={styles.sectionTitle}>{t('class.main_info')}</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('class.name_placeholder')}</Text>
                <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => handleChange('name', t)}
                placeholder="Ex: Top Movies"
                placeholderTextColor="#555"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('class.explained_priority')}</Text>
                <TextInput
                style={styles.input}
                value={String(form.priority || 0)}
                keyboardType="numeric"
                onChangeText={(t) => handleChange('priority', parseInt(t) || 0)}
                placeholder="1"
                placeholderTextColor="#555"
                />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>{t('class.terminology')}</Text>

            <Text style={styles.sectionSubtitle}>{t('class.terminology_setting')}</Text>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>{t('class.object_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.objectName}
                    onChangeText={(t) => handleChange('objectName', t)}
                    placeholder="Ex: Character"
                    placeholderTextColor="#555"
                />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('class.objects_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.objectsName}
                    onChangeText={(t) => handleChange('objectsName', t)}
                    placeholder="Ex: Characters"
                    placeholderTextColor="#555"
                />
                </View>
            </View>

            <View style={[styles.row, { marginTop: 15 }]}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>{t('class.note_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.noteName}
                    onChangeText={(t) => handleChange('noteName', t)}
                    placeholder="Ex: Episode"
                    placeholderTextColor="#555"
                />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('class.notes_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.notesName}
                    onChangeText={(t) => handleChange('notesName', t)}
                    placeholder="Ex: Episodes"
                    placeholderTextColor="#555"
                />
                </View>
            </View>

            </View>

            <View style={{ height: 100 }} /> 
        </ScrollView>
      </KeyboardAvoidingView>
      {hasChanges && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={20}
          style={styles.floatingFooter}
        >
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{t('common.save_changes')}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header
  headerContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  photoText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
    letterSpacing: 1,
  },

  // Form
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFD700', // Gold accent
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#CCC',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1A1A1D',
    color: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  previewText: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 10,
  },

  floatingFooter: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  saveButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});
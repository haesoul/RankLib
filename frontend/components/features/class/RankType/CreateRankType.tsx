import { createRankType } from '@/tools/classService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRealm } from '@realm/react';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import Realm from 'realm';
import ColorPicker, { HueSlider, Panel1, Preview, Swatches } from 'reanimated-color-picker';
interface CreateRankTypeProps {
  visible: boolean;
  onClose: () => void;
  classId: Realm.BSON.ObjectId; 
}

const DARK_BG = '#121212';
const CARD_BG = '#1E1E1E';
const ACCENT_COLOR = '#6C63FF';
const TEXT_COLOR = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0A0';

export const CreateRankType: React.FC<CreateRankTypeProps> = ({ visible, onClose, classId }) => {
  const realm = useRealm();
  
  const [name, setName] = useState('');
  const [fromRank, setFromRank] = useState('0');
  const [color, setColor] = useState('#FFD700');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = () => {
    try {
      createRankType(realm, classId, {
        name,
        fromRank: parseFloat(fromRank) || 0,
        color,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to create rank:", error);
    }
  };

  const resetForm = () => {
    setName('');
    setFromRank('0');
    setColor('#FFD700');
    setShowColorPicker(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Новый Ранг</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              <View style={styles.previewSection}>
                <Text style={styles.label}>Предпросмотр</Text>
                <View style={styles.previewBox}>
                  <MaterialCommunityIcons
                    name="star"
                    size={140}
                    color={color}
                    style={styles.starIcon} 
                    />
                  <View style={styles.starTextContainer}>
                    <Text 
                      style={styles.starText} 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                    >
                      {name || "NAME"}
                    </Text>
                    <Text style={styles.starSubText}>
                      {parseFloat(fromRank) > 0 ? `LVL ${fromRank}` : 'START'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Название ранга</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Например: Новичок"
                    placeholderTextColor={TEXT_SECONDARY}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Порог входа (From Rank)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={TEXT_SECONDARY}
                    value={fromRank}
                    onChangeText={setFromRank}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Цвет ранга</Text>
                  <TouchableOpacity 
                    style={[styles.colorTrigger, { borderColor: color }]}
                    onPress={() => setShowColorPicker(!showColorPicker)}
                  >
                    <View style={[styles.colorPreviewBubble, { backgroundColor: color }]} />
                    <Text style={styles.colorValueText}>{color.toUpperCase()}</Text>
                    <MaterialCommunityIcons
                        name={showColorPicker ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={TEXT_SECONDARY}
                    />
                  </TouchableOpacity>

                  {showColorPicker && (
                    <View style={styles.colorPickerContainer}>
                      <ColorPicker 
                        style={{ width: '100%' }} 
                        value={color}
                        onComplete={({ hex }: any) => {
                          'worklet'; 
                          runOnJS(setColor)(hex);
                        }}
                      >
                        <Preview hideInitialColor style={styles.pickerPreview} />
                        <Panel1 style={styles.pickerPanel} />
                        <HueSlider style={styles.pickerSlider} />
                        <Swatches style={styles.pickerSwatches} colors={['#FFD700', '#C0C0C0', '#CD7F32', '#FF4500', '#6C63FF', '#00FA9A']} />
                      </ColorPicker>
                    </View>
                  )}
                </View>

              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.createButton} onPress={handleSave} disabled={!name}>
                <Text style={styles.createButtonText}>Создать</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    height: '90%', // Модалка занимает 90% экрана снизу
  },
  container: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_COLOR,
  },
  closeBtn: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  /* Preview Styles */
  previewSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewBox: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  starIcon: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  starTextContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, // Небольшой сдвиг, чтобы текст был визуально в центре звезды
  },
  starText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000', // Черный текст на цветной звезде читается лучше, либо белый с тенью
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '50%',
    textAlign: 'center',
  },
  starSubText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  /* Form Styles */
  formSection: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: DARK_BG,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: TEXT_COLOR,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  /* Color Picker Trigger */
  colorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  colorPreviewBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorValueText: {
    color: TEXT_COLOR,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  /* Full Picker Container */
  colorPickerContainer: {
    marginTop: 15,
    backgroundColor: DARK_BG,
    borderRadius: 12,
    padding: 15,
  },
  pickerPreview: {
    height: 30,
    borderRadius: 8,
    marginBottom: 15,
  },
  pickerPanel: {
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
  },
  pickerSlider: {
    height: 30,
    borderRadius: 8,
    marginBottom: 15,
  },
  pickerSwatches: {
    height: 30,
  },
  /* Footer */
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  createButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
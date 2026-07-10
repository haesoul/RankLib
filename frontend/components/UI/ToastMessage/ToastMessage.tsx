import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface SuccessToastProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

const DARK_ORANGE = '#D35400'; // Темно-оранжевый (Тыквенный)
const DEEP_BG = '#1E1E1E'; // Фон подложки (если нужно)

export const SuccessMessage: React.FC<SuccessToastProps> = ({ 
  visible, 
  onClose, 
  message = "Успешно сохранено!" 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Появление: Прозрачность 0->1 и Масштаб 0.8->1
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Исчезновение
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

//   if (!visible && fadeAnim?._value === 0) return null; // Оптимизация рендера

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          <View style={styles.content}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#fff" />
            <Text style={styles.text}>{message}</Text>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.buttonText}>ОК</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center', // По центру экрана
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Затенение фона
  },
  container: {
    width: Dimensions.get('window').width * 0.75,
    backgroundColor: DARK_ORANGE,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.2)', // Чуть темнее основного цвета
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  }
});
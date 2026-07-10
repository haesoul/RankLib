import { useMessage } from '@/context/MessageContext';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const MESSAGE_COLORS = {
  info:    { bg: '#27272a', accent: '#3B82F6', icon: 'ℹ️', buttonBg: '#3B82F6' },
  error:   { bg: '#27272a', accent: '#EF4444', icon: '⚠️', buttonBg: '#EF4444' },
  warn:    { bg: '#27272a', accent: '#F59E0B', icon: '⚡', buttonBg: '#F59E0B' },
  success: { bg: '#27272a', accent: '#10B981', icon: '✅', buttonBg: '#10B981' },
};

export default function MessageToast() {
  const { message, messageType, clearMessage } = useMessage();
  
  // Анимации: Прозрачность и Масштаб (для эффекта появления "Pop")
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const [displayMessage, setDisplayMessage] = useState(message);
  const [displayType, setDisplayType] = useState(messageType);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (message) {
      // 1. Новое сообщение
      setDisplayMessage(message);
      setDisplayType(messageType);

      // Анимация появления (Fade In + Scale Up)
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Таймер на 5 секунд
      timer = setTimeout(() => {
        handleClose();
      }, 5000);

    } else {
      // Если message очистили извне
      handleClose();
    }

    return () => clearTimeout(timer);
  }, [message]);

  const handleClose = () => {
    // Анимация исчезновения (Fade Out + Scale Down)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
       // После завершения анимации "убиваем" данные, чтобы компонент размонтировался
       if (message) clearMessage();
       // Важно сбросить displayMessage, иначе при следующем рендере может мелькнуть старое
       if (!message) setDisplayMessage(null);
    });
  };

  if (!displayMessage) return null;

  const theme = MESSAGE_COLORS[displayType || 'info'];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Затемненный фон (Backdrop) */}
      <Animated.View style={[styles.backdrop, { opacity }]} />

      {/* Само модальное окно */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity,
            transform: [{ scale }],
            borderColor: 'rgba(255,255,255,0.1)',
          },
        ]}
      >
        <View style={styles.content}>
          {/* Иконка */}
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>{theme.icon}</Text>
          </View>
          
          <Text style={[styles.title, { color: theme.accent }]}>
             {displayType === 'error' ? 'Ошибка' : displayType === 'success' ? 'Успешно' : displayType === 'warn' ? 'Внимание' : 'Информация'}
          </Text>
          <Text style={styles.message}>
            {displayMessage}
          </Text>
        </View>

        {/* Кнопка внизу во всю ширину */}
        <TouchableOpacity 
          onPress={clearMessage} 
          activeOpacity={0.8}
          style={[styles.button, { backgroundColor: theme.buttonBg }]}
        >
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
        
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, // Растягиваем на весь экран
    zIndex: 9999,
    justifyContent: 'center', // Центрируем по вертикали
    alignItems: 'center',     // Центрируем по горизонтали
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', // Полупрозрачный черный фон
  },
  modalContainer: {
    width: width * 0.85, // 85% от ширины экрана
    maxWidth: 340,
    backgroundColor: '#18181b', // Zinc-900
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden', // Чтобы кнопка снизу обрезалась по радиусу
    
    // Тени
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#A1A1AA', // Zinc-400
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500'
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    
  },
});
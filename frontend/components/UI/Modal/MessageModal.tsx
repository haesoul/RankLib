import { Colors } from '@/CONSTANTS';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';

interface MiniToastProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const MiniToast = ({ visible, message, onClose, duration = 3000 }: MiniToastProps) => {
  
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (visible) {
      // Анимация появления сверху
      Animated.spring(translateY, {
        toValue: 50, // Позиция от верха экрана
        useNativeDriver: true,
        speed: 12,
      }).start();

      // Таймер авто-закрытия
      timer = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => clearTimeout(timer);
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal transparent visible={visible} animationType="none" pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.toastContainer, 
          { 
            backgroundColor: Colors.background, 
            borderColor: Colors.inputBackground,
            transform: [{ translateY }] 
          }
        ]}
      >
        <Text style={[styles.toastText, { color: Colors.text }]}>{message}</Text>
        <TouchableOpacity style={styles.okButton} onPress={handleClose}>
          <Text style={[styles.okText, { color: Colors.primary }]}>OK</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toastText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  okButton: {
    marginLeft: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  okText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
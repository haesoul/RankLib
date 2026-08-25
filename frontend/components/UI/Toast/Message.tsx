import { useMessage } from '@/context/MessageContext';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const {t} = useTranslation();
  const { message, messageType, clearMessage } = useMessage();
  
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const [displayMessage, setDisplayMessage] = useState(message);
  const [displayType, setDisplayType] = useState(messageType);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (message) {
      setDisplayMessage(message);
      setDisplayType(messageType);

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

      timer = setTimeout(() => {
        handleClose();
      }, 5000);

    } else {
      handleClose();
    }

    return () => clearTimeout(timer);
  }, [message]);

  const handleClose = () => {
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
       if (message) clearMessage();
       if (!message) setDisplayMessage(null);
    });
  };

  if (!displayMessage) return null;

  const theme = MESSAGE_COLORS[displayType || 'info'];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity }]} />

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
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>{theme.icon}</Text>
          </View>
          
          <Text style={[styles.title, { color: theme.accent }]}>
             {displayType === 'error' ? t("common.error") : displayType === 'success' ? t("common.success") : displayType === 'warn' ? t("common.warning") : t("common.info")}
          </Text>
          <Text style={styles.message}>
            {displayMessage}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={clearMessage} 
          activeOpacity={0.8}
          style={[styles.button, { backgroundColor: theme.buttonBg }]}
        >
          <Text style={styles.buttonText}>{t("common.ok")}</Text>
        </TouchableOpacity>
        
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center', 
    alignItems: 'center',    
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', 
  },
  modalContainer: {
    width: width * 0.85, 
    maxWidth: 340,
    backgroundColor: '#18181b', 
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden', 
    
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
    color: '#A1A1AA', 
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
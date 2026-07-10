// Modal.tsx (исправленный)
import { Colors } from '@/CONSTANTS';
import React, { useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ModalProps = {
  visible: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  contentStyle?: ViewStyle | any;
  dismissable?: boolean;
  height?: number | string;
  style?: any
};

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  contentStyle,
  dismissable = true,
  height = 'auto',
  style
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;


  const animRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const [mounted, setMounted] = React.useState(visible);
  const [interactive, setInteractive] = React.useState(false);

  useEffect(() => {
    if (visible) {
    animRef.current?.stop();

    setMounted(true);
    setInteractive(false);
    translateY.setValue(SCREEN_HEIGHT);
    opacity.setValue(0);

    const openAnim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8, 
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

      animRef.current = openAnim;
      openAnim.start(() => {
        animRef.current = null;
        setInteractive(true);
      });

    } else {
      animRef.current?.stop();
      setInteractive(false);

      const closeAnim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animRef.current = closeAnim;
      closeAnim.start(() => {
        animRef.current = null;
        setMounted(false);
      });
    }
    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [visible, opacity, translateY]);

  if (!mounted) return null;
  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissable && onClose) {
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (dismissable) onClose && onClose();
          }}
        >
          <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[styles.backdrop, { opacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.sheetContainer, { transform: [{ translateY }] }, contentStyle]}
        >
          <View
            style={[
              styles.sheet,
              typeof height === 'number' ? { minHeight: height } : undefined,
              style,
            ]}
          >
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 0,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    zIndex: 1, 
  },
  sheet: {
    backgroundColor: Colors.surfaceDarker,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
});

export default Modal;

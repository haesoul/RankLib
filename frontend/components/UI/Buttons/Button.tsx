import { Colors } from '@/CONSTANTS';
import React from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle
} from 'react-native';

type ButtonProps = {
  title?: string | React.ReactNode;
  onPress?: (e?: GestureResponderEvent) => void;
  style?: ViewStyle | any;
  textStyle?: TextStyle | any;
  disabled?: boolean;
  onPressIn?: (e?: GestureResponderEvent) => void;
  onPressOut?: (e?: GestureResponderEvent) => void;
  children?: React.ReactNode;
  onLongPress?: (e?: GestureResponderEvent) => void;
  destructive?: boolean;
  restyle?: ViewStyle | any;
  pickingImage?: boolean;
};

const Button: React.FC<ButtonProps> = ({
  title = 'Button',
  children,
  onPress,
  onLongPress,
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  style,
  textStyle,
  disabled = false,
  destructive = false,
  restyle,
  pickingImage = false
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = (e?: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 0.85, 
      useNativeDriver: true,
      speed: 20,
      bounciness: 15,
    }).start();
    if (onPressInProp) onPressInProp(e);
  };

  const handlePressOut = (e?: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10,  
      bounciness: 20,
    }).start();
    if (onPressOutProp) onPressOutProp(e);
  };


  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      pressRetentionOffset={{ top: 20, left: 20, bottom: 20, right: 20 }}
      delayLongPress={500}
      style={({ pressed }) => [
        restyle ? restyle : styles.container,
        disabled ? styles.disabledContainer : null,
        style,
        destructive && styles.destructiveButton, 
      ]}
    >
      <Animated.View
        style={[
          { transform: [{ scale }],   },
          pickingImage && !children && typeof title !== 'string' && { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }
        ]}
      >
        {children ? (
          children
        ) : typeof title === 'string' ? (
          <Text style={[styles.title, disabled ? styles.disabledTitle : null, textStyle, destructive && styles.destructiveText]}>
            {title}
          </Text>
        ) : (
          title
        )}

      </Animated.View>
    </Pressable>
  );
};
export default Button;


const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    margin: 3
  },
  disabledContainer: {
    backgroundColor: '#1e1e1e',
    opacity: 0.7,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledTitle: {
    color: '#7a7a7a',
  },
  destructiveButton: {
    backgroundColor: '#3b0b0b',
  },
  destructiveText: {
    color: '#ffb3b3',
  },
});


















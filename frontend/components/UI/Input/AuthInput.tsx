import { Colors } from '@/CONSTANTS';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

interface Props extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  delay?: number;
  style?: any;
}

export const AuthInput = ({ iconName, isPassword, delay = 0, style, ...props }: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const borderWidth = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderWidth.value = withSpring(2, {
      damping: 20,
      stiffness: 300,
    });
    scale.value = withSpring(1.01, {
      damping: 15,
      stiffness: 200,
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderWidth.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
    });
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
    });
  };

  return (
    <KeyboardAvoidingView>
      <Animated.View 
        entering={FadeInDown.delay(delay).duration(600).springify().damping(20).stiffness(90)}
        style={[
          styles.container, 
          isFocused && styles.focusedContainer,
          animatedContainerStyle,
          style
        ]}
      >
        <Ionicons 
          name={iconName} 
          size={20} 
          color={isFocused ? Colors.text : Colors.textSecondary} 
          style={styles.icon} 
        />
        
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          {...props}
        />

        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            style={styles.eyeButton}
          >
            <Ionicons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  focusedContainer: {
    borderColor: Colors.accent,
    backgroundColor: '#333',
    shadowColor: Colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
});

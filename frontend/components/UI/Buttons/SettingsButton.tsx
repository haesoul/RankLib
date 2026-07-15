import { Colors, Radius } from '@/CONSTANTS';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export type SettingsButtonVariant = 'default' | 'danger' | 'primary';

interface SettingsButtonProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconsColor?: string;
  rightIcon?: IconName;
  rightElement?: React.ReactNode;
  onPress: () => void;
  variant?: SettingsButtonVariant;
  disabled?: boolean;
}

const variantStyles: Record<SettingsButtonVariant, { bg: string; iconColor: string; textColor: string; border: string }> = {
  default: {
    bg: Colors.glass,
    iconColor: Colors.textSecondary,
    textColor: Colors.textOffWhite,
    border: Colors.glassBorder,
  },
  primary: {
    bg: Colors.primaryTransparent,
    iconColor: Colors.primary,
    textColor: Colors.textOffWhite,
    border: 'rgba(139, 92, 246, 0.25)',
  },
  danger: {
    bg: 'rgba(255, 71, 87, 0.08)',
    iconColor: Colors.error,
    textColor: Colors.error,
    border: 'rgba(255, 71, 87, 0.2)',
  },
};

export default function SettingsButton({
  title,
  subtitle,
  icon,
  iconsColor,
  rightIcon = 'chevron-right',
  rightElement,
  onPress,
  variant = 'default',
  disabled = false,
}: SettingsButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const { bg, iconColor, textColor, border } = variantStyles[variant];

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }),
      Animated.timing(opacity, { toValue: 0.85, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.button, { backgroundColor: bg, borderColor: border }]}
      >
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
            <MaterialIcons name={icon} size={20} color={iconsColor ? iconsColor : iconColor} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {/* <MaterialIcons name={rightIcon} size={18} color={Colors.textSecondary} style={{ opacity: 0.5 }} /> */}
        {rightElement ? (
          rightElement
        ) : (
          <MaterialIcons 
            name={rightIcon} 
            size={18} 
            color={Colors.textSecondary} 
            style={{ opacity: 0.5 }} 
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

import { Colors } from '@/CONSTANTS';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

const AnimatedSwitch = ({ active, onPress }: { active: boolean, onPress: () => void }) => {
  const animatedValue = React.useRef(new Animated.Value(active ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: active ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      useNativeDriver: false, 
    }).start();
  }, [active]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.surfaceMuted || '#333', Colors.primary], 
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24], 
  });

  const offOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const onOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.switchTrack, { backgroundColor }]}>
        <Animated.View style={[styles.switchThumb, { transform: [{ translateX }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconContainer, { opacity: offOpacity }]}>
            <MaterialIcons name="lock-outline" size={14} color="#777" />
          </Animated.View>
          
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconContainer, { opacity: onOpacity }]}>
            <MaterialIcons name="auto-awesome" size={14} color="#4CAF50" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default AnimatedSwitch;
import { SmartImage } from '@/components/Basic/SmartImage/SmartImage';
import { Colors } from '@/CONSTANTS';
import { ClassOfGrading } from '@/realm/models';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';

type ClassCardProps = {
  item: ClassOfGrading;
  onPress: (item: ClassOfGrading) => void;
  index: number;
};

const ClassCard: React.FC<ClassCardProps> = ({ item, onPress, index }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    console.log(item.photo)
  }, [])
  const { height: screenHeight } = useWindowDimensions();
  
  const CARD_HEIGHT = screenHeight * 0.135;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index * 80, 600),
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 8,
        delay: Math.min(index * 80, 600),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };
  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }], height: CARD_HEIGHT }}>
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, {height: CARD_HEIGHT}]}
      >
        <SmartImage
          source={{ uri: item.photo }}
          style={styles.image}
        />
        <View style={styles.info}>
          <Text style={styles.className}>{item.name}</Text>
        </View>
        <View style={styles.arrowContainer}>
           <Text style={styles.arrow}>〉</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    width: '100%',
  },
  image: {
    height: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  className: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5F5F5",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  arrowContainer: {
    paddingHorizontal: 5,
  },
  arrow: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ClassCard;
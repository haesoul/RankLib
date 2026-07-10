import { ClassOfGrading } from '@/realm/models';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type ClassCardProps = {
  item: ClassOfGrading;
  onPress: (item: ClassOfGrading) => void;
  index: number;
};

const ClassCard: React.FC<ClassCardProps> = ({ item, onPress, index }) => {
  const count = item.objects.length;
  const objectsLabel = item.objectsName ?? 'items';

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-15)).current;

  const { height: screenHeight } = useWindowDimensions();
  const CARD_HEIGHT = screenHeight * 0.145;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 7,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const imageUri = item.photo || "https://via.placeholder.com/150/0F0D1E/FFFFFF?text=No+Image";

  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }] }}>
      {/* 1. ВНЕШНЯЯ РАМКА: Исчезает в прозрачность справа */}
      <LinearGradient
        colors={['#6366F1', '#A855F7', 'transparent']} // Сине-фиолетовый переходит в прозрачность
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.borderWrapper}
      >
        <Pressable
          onPress={() => onPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.mainPressable, { height: CARD_HEIGHT }]}
        >
          {/* 2. ВНУТРЕННИЙ ФОН: Неоновый градиент с затуханием вправо */}
          <LinearGradient
            colors={['#1A1438', '#110D26', '#090714']} 
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.innerContent}
          >
            {/* Эффект свечения за фото (Blur/Neon Glow) */}
            <LinearGradient
               colors={['rgba(99, 102, 241, 0.25)', 'transparent']}
               style={styles.leftGlow}
            />

            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <View style={styles.info}>
              <Text style={styles.className} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.subtitle}>
                {count} {objectsLabel}
              </Text>
            </View>


          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  borderWrapper: {
    borderRadius: 26,
    padding: 1.2, // Ультра-тонкая рамка
    marginBottom: 16,
    // Мощное неоновое свечение (iOS)
    shadowColor: '#6366F1',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  mainPressable: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden', // Чтобы градиенты не вылезали за скругления
  },
  innerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%', // Свечение на левой половине
  },
  imageContainer: {
    // Тень под самой картинкой для "отрыва" от фона
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#0F0D1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', // Едва заметный кант фото
  },
  info: {
    flex: 1,
    marginLeft: 22,
    justifyContent: 'center',
  },
  className: {
    fontSize: 24,
    fontWeight: '200',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '200',
    marginTop: 2,
  },
  arrowContainer: {
    opacity: 0.3, // Делаем стрелку менее акцентной, как в "гейм" стиле
    paddingRight: 4,
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '200',
  },
});

export default ClassCard;
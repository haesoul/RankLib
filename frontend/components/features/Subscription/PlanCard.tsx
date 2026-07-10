import { SubscriptionPlan } from "@/services/types/subscription";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Extrapolation, FadeInDown, interpolate, SharedValue, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";


interface PlanCardProps {
  item: SubscriptionPlan; 
  index: number;
  scrollX: SharedValue<number>;
  onSelect: (id: string) => void;
  isSelected: boolean;
}
const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

const PlanCard: React.FC<PlanCardProps> = ({ item, index, scrollX, onSelect, isSelected }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING * 2),
      index * (CARD_WIDTH + SPACING * 2),
      (index + 1) * (CARD_WIDTH + SPACING * 2),
    ];

    const scaleValue = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacityValue = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scale.value * scaleValue }],
      opacity: opacityValue,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    onSelect(item.id);
  };
  return (
    <AnimatedPressable
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.cardContainer, animatedStyle]}
    >
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isSelected && styles.cardSelectedBorder]}
      >
        <View style={styles.cardHeader}>
            <View style={styles.chip} />
            {item.isPopular && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                </View>
            )}
        </View>

        <View style={styles.cardContent}>
            <Text style={styles.planTitle}>{item.title}</Text>
            <View style={styles.priceRow}>
                <Text style={styles.price}>{item.price}</Text>
                <Text style={styles.period}>{item.period}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.featuresContainer}>
                {item.features && item.features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.featureText}>{feature}</Text>
                    </View>
                ))}
            </View>
        </View>
        
        <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'transparent']}
            style={styles.shineOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        />
      </LinearGradient>
      
      {isSelected && (
          <Animated.View entering={FadeInDown.springify()} style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
      )}
    </AnimatedPressable>
  );
};


export default PlanCard


export const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.82;
export const SPACING = 13; 

export const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10, 
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Тонкая обводка для "стеклянного" эффекта
    overflow: 'hidden', // Чтобы градиент не вылезал
  },
  cardSelectedBorder: {
    borderColor: '#D4AF37', // Золотая обводка при выборе
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  // Имитация чипа банковской карты
  chip: {
    width: 50,
    height: 35,
    borderRadius: 6,
    backgroundColor: '#D4AF37', // Базовое золото
    opacity: 0.9,
    // Можно добавить внутренний градиент или линии через вложенные View, если нужно детальнее
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  popularBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  planTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2, // Широкий трекинг для премиальности
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  period: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 20,
  },
  featuresContainer: {
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37', // Золотые буллиты
    marginRight: 10,
  },
  featureText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  // Блик поверх карты
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    zIndex: -1,
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4AF37', // Золотой круг
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  checkmark: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
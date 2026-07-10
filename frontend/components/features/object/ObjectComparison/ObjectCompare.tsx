import { GradeObject } from '@/realm/models';
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';

// --- Константы и Цвета ---
const { width } = Dimensions.get('window');
const COLORS = {
  background: '#121212',
  card: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  leftAccent: '#00E5FF', // Циан для левого объекта
  rightAccent: '#FF2E63', // Маджента для правого объекта
  draw: '#444444',
};

// --- Интерфейсы ---
interface ComparisonProps {
  objectA: GradeObject;
  objectB: GradeObject;
}

interface ProcessedCategory {
  id: string;
  name: string;
  rankA: number;
  rankB: number;
}

// --- Компонент одной строки сравнения (Bar Chart) ---
const ComparisonRow = ({
  label,
  valueA,
  valueB,
  index,
}: {
  label: string;
  valueA: number;
  valueB: number;
  index: number;
}) => {
  const progressA = useSharedValue(0);
  const progressB = useSharedValue(0);
  
  // Максимальное значение для нормализации (например, 10 или 100)
  const MAX_RANK = 10; 

  useEffect(() => {
    progressA.value = withDelay(
      index * 100,
      withTiming(valueA / MAX_RANK, { duration: 1000, easing: Easing.out(Easing.exp) })
    );
    progressB.value = withDelay(
      index * 100,
      withTiming(valueB / MAX_RANK, { duration: 1000, easing: Easing.out(Easing.exp) })
    );
  }, [valueA, valueB, index]);

  const styleA = useAnimatedStyle(() => ({
    width: `${progressA.value * 100}%`,
  }));

  const styleB = useAnimatedStyle(() => ({
    width: `${progressB.value * 100}%`,
  }));

  const isWinA = valueA > valueB;
  const isWinB = valueB > valueA;

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()} 
      style={styles.rowContainer}
    >
      <Text style={styles.categoryTitle}>{label}</Text>
      
      <View style={styles.barContainer}>
        {/* Левая часть (Объект A) - выравнивание flex-end чтобы бар рос к центру */}
        <View style={styles.halfBarWrapperLeft}>
          <Text style={[styles.scoreText, isWinA && styles.winnerText, { marginRight: 8 }]}>
            {valueA.toFixed(1)}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: COLORS.leftAccent, right: 0 }, styleA]} />
          </View>
        </View>

        {/* Разделитель */}
        <View style={styles.divider} />

        {/* Правая часть (Объект B) */}
        <View style={styles.halfBarWrapperRight}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: COLORS.rightAccent, left: 0 }, styleB]} />
          </View>
          <Text style={[styles.scoreText, isWinB && styles.winnerText, { marginLeft: 8 }]}>
            {valueB.toFixed(1)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// --- Основной Компонент ---
export const Comparison: React.FC<ComparisonProps> = ({ objectA, objectB }) => {
  if (!objectA?.isValid() || !objectB?.isValid()) {
    return (
      <View style={styles.container}>
        <Text style={{color: 'white', textAlign: 'center', marginTop: 50}}>
          Объекты недоступны или были удалены
        </Text>
      </View>
    );
  }
  // Хелпер для объединения категорий обоих объектов
  const comparisonData = useMemo(() => {
    const map = new Map<string, ProcessedCategory>();

    // Функция для безопасного добавления
    const processCategories = (obj: GradeObject, isA: boolean) => {
      // Преобразуем Realm List в массив
      const categories = obj.categories_of_object.map((c) => c);
      
      categories.forEach((catObj) => {
        // Получаем ID категории (родительской)
        const catId = catObj.category._id.toHexString();
        const catName = catObj.category.name;
        const rank = catObj.rank || 0;

        if (!map.has(catId)) {
          map.set(catId, {
            id: catId,
            name: catName,
            rankA: 0,
            rankB: 0,
          });
        }
        
        const entry = map.get(catId)!;
        if (isA) entry.rankA = rank;
        else entry.rankB = rank;
      });
    };

    processCategories(objectA, true);
    processCategories(objectB, false);

    return Array.from(map.values());
  }, [objectA, objectB]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER: VS Block */}
        <View style={styles.headerContainer}>
          {/* Object A */}
          <View style={styles.headerItem}>
            <View style={[styles.imageWrapper, { borderColor: COLORS.leftAccent }]}>
              {objectA.photo ? (
                <Image source={{ uri: objectA.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholder]} />
              )}
            </View>
            <Text style={styles.objName} numberOfLines={2}>{objectA.name}</Text>
            <Text style={[styles.totalScore, { color: COLORS.leftAccent }]}>
              {objectA.overall_rank?.toFixed(1) || '0.0'}
            </Text>
          </View>

          {/* VS Badge */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Object B */}
          <View style={styles.headerItem}>
            <View style={[styles.imageWrapper, { borderColor: COLORS.rightAccent }]}>
               {objectB.photo ? (
                <Image source={{ uri: objectB.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholder]} />
              )}
            </View>
            <Text style={styles.objName} numberOfLines={2}>{objectB.name}</Text>
            <Text style={[styles.totalScore, { color: COLORS.rightAccent }]}>
              {objectB.overall_rank?.toFixed(1) || '0.0'}
            </Text>
          </View>
        </View>

        {/* COMPARISON LIST */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Детальное сравнение</Text>
          {comparisonData.map((item, index) => (
            <ComparisonRow
              key={item.id}
              label={item.name}
              valueA={item.rankA}
              valueB={item.rankB}
              index={index}
            />
          ))}
        </View>

        {/* SUMMARY / NOTES (Optional) */}
        {objectA.description || objectB.description ? (
            <View style={styles.notesContainer}>
                <Text style={styles.sectionTitle}>Заметки</Text>
                <View style={styles.noteBox}>
                    <Text style={[styles.noteLabel, {color: COLORS.leftAccent}]}>{objectA.name}</Text>
                    <Text style={styles.noteText}>{objectA.description || "Нет описания"}</Text>
                </View>
                <View style={styles.noteBox}>
                    <Text style={[styles.noteLabel, {color: COLORS.rightAccent}]}>{objectB.name}</Text>
                    <Text style={styles.noteText}>{objectB.description || "Нет описания"}</Text>
                </View>
            </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
};

// --- Стилизация ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerItem: {
    flex: 1,
    alignItems: 'center',
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#333',
  },
  objName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    height: 40, // Фиксированная высота для выравнивания
  },
  totalScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  vsText: {
    color: '#FFF',
    fontWeight: '900',
    fontStyle: 'italic',
  },
  
  // List Styles
  listContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    textAlign: 'center',
  },
  rowContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  halfBarWrapperLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  halfBarWrapperRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  divider: {
    width: 2,
    height: '100%',
    backgroundColor: '#333',
    marginHorizontal: 10,
  },
  scoreText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    fontVariant: ['tabular-nums'], // Чтобы цифры не прыгали
  },
  winnerText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Notes
  notesContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  noteBox: {
      backgroundColor: COLORS.card,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10
  },
  noteLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 5,
      opacity: 0.8
  },
  noteText: {
      color: COLORS.textPrimary,
      fontSize: 14,
      lineHeight: 20
  }
});
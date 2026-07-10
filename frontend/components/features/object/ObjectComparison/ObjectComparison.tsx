import { CategoryOfObject, GradeObject } from '@/realm/models';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const CARD_WIDTH = width * 0.85; // Карточка занимает 85% экрана
const SPACING = (width - CARD_WIDTH) / 2; // Отступы по бокам для центрирования
const SPACER_ITEM_SIZE = (width - CARD_WIDTH) / 2;


/**
 * Компонент для отображения одной строки категории с рангом
 */
const CategoryRow = ({ item }: { item: CategoryOfObject }) => {
  const rank = item.rank || 0;
  // Цвет ранга: зеленый для высоких, желтый для средних, красный для низких (пример)
  const rankColor = rank >= 8 ? '#4CAF50' : rank >= 5 ? '#FFC107' : '#FF5252';

  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {item.category?.name || 'Без категории'}
        </Text>
        {/* Если есть подкатегории, можно вывести количество или детали */}
        <Text style={styles.subText}>
           {item.subcategories_of_category.length} подкатегорий
        </Text>
      </View>
      
      <View style={styles.rankContainer}>
        <Text style={[styles.rankValue, { color: rankColor }]}>
          {rank.toFixed(1)}
        </Text>
        <View style={styles.progressBarBg}>
           <View 
             style={[
               styles.progressBarFill, 
               { width: `${Math.min(rank * 10, 100)}%`, backgroundColor: rankColor }
             ]} 
           />
        </View>
      </View>
    </View>
  );
};

/**
 * Карточка одного объекта
 */
const ComparisonCard = ({
  item,
  index,
  scrollX,
}: {
  item: GradeObject;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) => {
  // Анимация масштабирования и прозрачности при скролле
  const rStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Обработка пути к фото (FileSystem)
  const imageSource = item.photo
    ? { uri: item.photo.startsWith('file://') ? item.photo : `file://${item.photo}` }
    : { uri: 'https://via.placeholder.com/150' }; // Заглушка

  // Сортируем категории по рангу (опционально), чтобы лучшее было сверху
  const sortedCategories = item.categories_of_object
    ? Array.from(item.categories_of_object).sort((a, b) => (b.rank || 0) - (a.rank || 0))
    : [];

  return (
    <Animated.View style={[styles.cardContainer, rStyle]}>
      {/* --- Header Карточки --- */}
      <View style={styles.cardHeader}>
        <Image source={imageSource} style={styles.avatar} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.objectName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.objectClass}>
            {item.class_of_object?.name || 'Класс не указан'}
          </Text>
        </View>
        
        {/* Общий ранк справа сверху */}
        <View style={styles.totalRankBadge}>
            <Text style={styles.totalRankText}>{item.overall_rank?.toFixed(1) || '-'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* --- Body Карточки (Вертикальный скролл) --- */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.innerScroll}
        nestedScrollEnabled={true} // Важно для работы внутри горизонтального скролла на Android
      >
        <Text style={styles.sectionTitle}>Детализация рангов</Text>
        
        {sortedCategories.map((cat, idx) => (
          <CategoryRow key={cat._id.toString() || idx} item={cat} />
        ))}

        {sortedCategories.length === 0 && (
           <Text style={styles.emptyText}>Нет категорий для сравнения</Text>
        )}
        
        {/* Дополнительное пространство снизу */}
        <View style={{ height: 20 }} />
      </Animated.ScrollView>
    </Animated.View>
  );
};

/**
 * Основной экран сравнения
 */
export const ObjectComparison = ({ objects }: { objects: GradeObject[] }) => {
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Добавляем "пустышки" по краям, чтобы первый элемент был по центру
  // В данном случае используем contentContainerStyle inset, но для snapToInterval
  // удобнее работать с прямым маппингом.
  
  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={objects}
        keyExtractor={(item) => item._id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH} // Карточка "прилипает" к экрану
        decelerationRate="fast" // Быстрая остановка скролла
        contentContainerStyle={{
          paddingHorizontal: SPACING, // Центрирование первого и последнего элемента
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          return (
            <ComparisonCard 
                item={item} 
                index={index} 
                scrollX={scrollX} 
            />
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Глубокий темный фон
    justifyContent: 'center',
    paddingVertical: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: '100%', // Высота карточки внутри контейнера
    backgroundColor: '#1E1E1E', // Чуть светлее фона (Material Dark Surface)
    borderRadius: 24,
    marginRight: 0, // Отступы регулируются FlatList contentContainer
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    // Тени
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  // --- Header Styles ---
  cardHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#252525',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#333',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  objectName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  objectClass: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  totalRankBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555'
  },
  totalRankText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    width: '100%',
  },
  // --- Inner Scroll Styles ---
  innerScroll: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  // --- Category Row Styles ---
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#252525',
    padding: 12,
    borderRadius: 12,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#777',
  },
  rankContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  rankValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  }
});

export default ObjectComparison;
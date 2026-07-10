import { ClassOfGrading, GradeObject } from '@/realm/models';
import { Ionicons } from '@expo/vector-icons';
import { Realm, useObject } from '@realm/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



const { width } = Dimensions.get('window');

// Цвета для рангов
const RANK_COLORS = {
  1: { border: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)', text: '#FFD700' }, // Gold
  2: { border: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)', text: '#C0C0C0' }, // Silver
  3: { border: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)', text: '#CD7F32' }, // Bronze
  default: { border: '#3A3A45', bg: '#1E1E24', text: '#A0A0A5' } // Common
};

export default function ClassCardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {t, i18n} = useTranslation()

  // Получаем сам класс
  const classData = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));

  // Логика сортировки и фильтрации ТОП-9
  const topObjects = useMemo(() => {
    if (!classData || !classData.objects) return [];
    
    // Сортируем по overall_rank (desc), берем топ 9
    return classData.objects
      .sorted("overall_rank", true)
      .slice(0, 100);
  }, [classData]);

  if (!classData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('class.not_found')}</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: GradeObject; index: number }) => {
    const rankPosition = index + 1;
    const isTop3 = rankPosition <= 3;
    const colors = RANK_COLORS[rankPosition as keyof typeof RANK_COLORS] || RANK_COLORS.default;

    return (
      <TouchableOpacity 
        style={[
          styles.cardItem, 
          { 
            borderColor: colors.border,
            backgroundColor: isTop3 ? colors.bg : '#1E1E24',
            borderWidth: isTop3 ? 2 : 1,
            transform: isTop3 ? [{ scale: 1.02 }] : []
          }
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.rankBadgeContainer}>
            <Text style={[
              index >= 99 && styles.rankNumberLowest,
              index >= 9 && styles.rankNumberLower,
              index <= 8 && styles.rankNumber,
              { color: colors.text }]}>
                #{rankPosition}
            </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
             {item.photo ? (
                <ImageBackground 
                  source={{ uri: item.photo }} 
                  style={styles.avatar} 
                  imageStyle={{ borderRadius: 8 }}
                />
             ) : (
               <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                 <Ionicons name="cube-outline" size={20} color="#666" />
               </View>
             )}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.objectName} numberOfLines={1}>
              {item.name || "Unknown Object"}
            </Text>
            <Text style={styles.objectSubDetails}>
              {item.object_name || "No details"}
            </Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>RATING</Text>
          <Text style={[styles.scoreValue, { color: colors.text }]}>
            {item.overall_rank ? parseFloat(item.overall_rank.toFixed(2)) : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.headerContainer}>
        <ImageBackground
          source={classData.photo ? { uri: classData.photo } : undefined}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.48)', '#000000']}
            style={styles.headerGradient}
          >
            <SafeAreaView style={styles.headerSafeArea}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={styles.className}>{classData.name}</Text>
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>TOP {topObjects.length} {classData.objectsName?.toUpperCase()}</Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Список лидеров */}
      <FlatList
        data={topObjects}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={() => (
          <Text style={styles.listHeader}>Highest Rated {classData.objectsName ?? "Objects"}</Text>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No objects rated yet.</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D10', // Очень темный фон
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
  // Header Styles
  headerContainer: {
    height: 250,
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A35',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  titleContainer: {
    gap: 8,
  },
  className: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  tagContainer: {
    backgroundColor: '#6C5CE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  
  // List Styles
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listHeader: {
    color: '#8A8A90',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },

  // Card Styles
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    // Тени для объема
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  rankBadgeContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  rankNumberLower: {
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'], 
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  rankNumberLowest: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'], 
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    padding: 2, // отступ для рамки
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  objectName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  objectSubDetails: {
    color: '#8A8A90',
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 50,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  scoreLabel: {
    color: '#555',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
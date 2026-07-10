import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { Category, LeaderboardEntry } from '@/realm/models'; // Убедитесь, что пути верные
import { Ionicons } from '@expo/vector-icons';
import { Realm, useObject, useQuery } from '@realm/react';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { captureRef } from 'react-native-view-shot';


const { width } = Dimensions.get('window');

const CARD_PADDING = 10;
const ITEM_SPACING = 6;
const ITEM_SIZE = (width - 42 - (ITEM_SPACING * 2)) / 3;

const RANK_STYLES = {
  1: { color: '#FFD700', bg: 'rgba(255, 215, 0, 0.2)', shadow: '#FFD700' },
  2: { color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.2)', shadow: '#C0C0C0' },
  3: { color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.2)', shadow: '#CD7F32' },
  default: { color: '#555', bg: '#25252A', shadow: 'transparent' }
};

export default function CategoryLeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isSuccess, setIsSuccess] = useState(false)
  const viewRef = useRef(null);

  const {t, i18n} = useTranslation()
  const category = useObject(Category, new Realm.BSON.ObjectId(id));

  const entries = useQuery(LeaderboardEntry);

  const topEntries = useMemo(() => {
    if (!category) return [];
    
    return entries
      .filtered("category._id == $0", category._id)
      .sorted("rankValue", true) 
      .slice(0, 9);
  }, [category, entries]);

  if (!category) return null;

  const gridItems = [...topEntries];
  while (gridItems.length < 9) {
    // @ts-ignore
    gridItems.push(null);
  }

  const heroImage = topEntries[0]?.object?.photo;
  const onCapture = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      const asset = await MediaLibrary.createAssetAsync(uri);
      setIsSuccess(true)

      setTimeout(() => setIsSuccess(false), 3000)
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <ScrollView 
      style={styles.screen} 
      contentContainerStyle={styles.scrollContent}
    >

      <View style={styles.captureCard} collapsable={false} ref={viewRef}>
        
        <View style={styles.cardHeader}>
          <ImageBackground
            source={heroImage ? { uri: heroImage } : undefined}
            style={styles.headerBg}
            imageStyle={{ opacity: 0.5 }} 
            blurRadius={0} 
          >
            <LinearGradient
              colors={['rgba(18,18,20,0.8)', '#121214']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>

                <View style={styles.statRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{category.class_of_category.name.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.subTitleText}>{t('grading.top9').toUpperCase()} {category.class_of_category.objectsName?.toUpperCase() ?? 'OBJECTS'} BY</Text>
                
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name.toUpperCase()}
                </Text>

              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View style={styles.gridContainer}>
          {gridItems.map((entry, index) => {
            const rank = index + 1;
            const styleConf = RANK_STYLES[rank as keyof typeof RANK_STYLES] || RANK_STYLES.default;
            
            if (!entry) {
              return (
                <View key={`empty-${index}`} style={[styles.gridItem, styles.emptyItem]}>
                   <Ionicons name="add" size={24} color="#333" />
                </View>
              );
            }

            const gradeObject = entry.object;

            return (
              <View 
                key={entry._id.toString()} 
                style={[
                  styles.gridItem, 
                  { 
                    borderColor: styleConf.color,
                    backgroundColor: styleConf.bg,
                    borderWidth: rank <= 3 ? 1 : 0
                  }
                ]}
              >
                <ImageBackground
                  source={gradeObject.photo ? { uri: gradeObject.photo } : undefined}
                  style={styles.itemImage}
                  resizeMode="cover"
                >
                  {!gradeObject.photo && (
                    <View style={styles.noPhoto}>
                      <Ionicons name="cube" size={20} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.itemGradient}
                  />

                  <View style={[styles.rankBadge, { backgroundColor: styleConf.color }]}>
                    <Text style={styles.rankText}>{rank}</Text>
                  </View>
                  
                  <View style={styles.scoreBadge}>
                      <Text style={styles.scoreText}>{entry.rankValue ? parseFloat(entry.rankValue.toFixed(2)) : ''}</Text>
                  </View>

                  <View style={styles.nameContainer}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {gradeObject.name}
                    </Text>
                  </View>
                </ImageBackground>
              </View>
            );
          })}
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>GENERATED BY RANKLIB</Text>
        </View>

      </View>
      <Button title={t('common.png_export')} onPress={onCapture}/>
      <SuccessMessage visible={isSuccess} onClose={() => setIsSuccess(false)} message={t('common.success_export')}/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  // === Карточка ===
  captureCard: {
    width: width - 20,
    backgroundColor: '#121214',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  // HEADER (Изменен под Категории)
  cardHeader: {
    height: 110, // Чуть выше, чтобы вместить две строки текста
    width: '100%',
    backgroundColor: '#1E1E24',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#25252A' // Fallback color
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  subTitleText: {
    color: '#AAA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  categoryName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'black',
    textShadowRadius: 10,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 10,
    letterSpacing: 0.5
  },

  // GRID 3x3 (Без изменений)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: CARD_PADDING,
    gap: ITEM_SPACING,
    justifyContent: 'center',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1F1F25',
    position: 'relative',
  },
  emptyItem: {
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  noPhoto: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A30',
  },
  itemGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%', // Чуть выше градиент для читаемости
  },
  
  // Элементы внутри ячейки
  rankBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  rankText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  scoreBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  scoreText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowRadius: 5,
  },
  nameContainer: {
    padding: 6,
    width: '100%',
  },
  itemName: {
    color: '#EEE',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // FOOTER
  cardFooter: {
    paddingVertical: 8,
    backgroundColor: '#0E0E10',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  footerText: {
    color: '#444',
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: "500"
  }
});
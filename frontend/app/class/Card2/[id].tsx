import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { ClassOfGrading, GradeObject } from '@/realm/models'; // Проверь путь к моделям
import { Ionicons } from '@expo/vector-icons';
import { Realm, useObject, useQuery } from '@realm/react';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams } from 'expo-router';
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

const SPACING = 4;
const PADDING = 14;
const ITEM_SIZE = (width - (PADDING * 2) - (SPACING * 2)) / 3;

const RANK_COLORS = {
  1: { border: '#FFD700', text: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' }, // Gold
  2: { border: '#C0C0C0', text: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)' }, // Silver
  3: { border: '#CD7F32', text: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' }, // Bronze
  default: { border: '#333', text: '#FFF', bg: '#1E1E24' }
};

export default function ClassCardScreen() {
  const { id, tagIds } = useLocalSearchParams<{ id: string, tagIds?: string }>();

  const classData = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));

  const [isSuccess, setIsSuccess] = useState(false)
  const viewRef = useRef(null);
  const {t, i18n} = useTranslation()


  const filterTagIds = useMemo(() => {
    return tagIds ? JSON.parse(tagIds).map((tid: any) => new Realm.BSON.ObjectId(tid)) : [];
  }, [tagIds]);

  const objects = useQuery(
    GradeObject,
    (collection) => {
      if (!classData) return collection.filtered("1 == 0");
      let filtered = collection.filtered("class_of_object._id == $0", classData?._id);

      if (filterTagIds.length > 0) {
        for (const oid of filterTagIds) {
          filtered = filtered.filtered("ANY tags._id == $0", oid);
        }
      }
      return filtered.sorted("overall_rank", true)
    },
    [classData, filterTagIds]
  );
  const topNineObjects = useMemo(() => {
    return objects.slice(0, 9);
  }, [objects]);
  const topObjects = useMemo(() => {
    if (!classData || !classData.objects) return [];
    
    return classData.objects
      .sorted("overall_rank", true)
      .slice(0, 9);
  }, [classData]);

  const gridItems = useMemo(() => {
    const items = [...topNineObjects];
    while (items.length < 9) {
      // @ts-ignore
      items.push(null);
    }
    return items;
  }, [topNineObjects]);

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
  if (!classData) return null;

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        

        <View style={styles.captureContainer} ref={viewRef}>
          
          <View style={styles.headerContainer}>
            <ImageBackground
              source={classData.photo ? { uri: classData.photo } : undefined}
              style={styles.headerImage}
              resizeMode="cover"
            >
              {!classData.photo && <View style={styles.headerPlaceholder} />}

              <LinearGradient
                colors={['transparent', 'rgba(13,13,16,0.8)', '#0D0D10']}
                style={styles.headerGradient}
              >
                <View style={styles.headerTexts}>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{t('grading.top9').toUpperCase()} {classData.objectsName?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.className} numberOfLines={2}>
                    {classData.name.toUpperCase()}
                  </Text>
                  <Text style={styles.subTitle}>
                    {classData.objects.length} {classData.objectsName} TRACKED
                  </Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={styles.gridWrapper}>
            {gridItems.map((item, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const colors = RANK_COLORS[rank as keyof typeof RANK_COLORS] || RANK_COLORS.default;
              
              if (!item) {
                return (
                  <View key={`empty-${index}`} style={[styles.gridItem, styles.emptyGridItem]}>
                    <Ionicons name="add" size={24} color="#333" />
                  </View>
                );
              }

              return (
                <View 
                  key={item._id.toString()} 
                  style={[
                    styles.gridItem,
                    { 
                      borderColor: isTop3 ? colors.border : '#333',
                      // borderWidth: isTop3 ? 2 : 1,
                      borderWidth: 2,
                      backgroundColor: colors.bg
                    }
                  ]}
                >
                  <ImageBackground
                    source={item.photo ? { uri: item.photo } : undefined}
                    style={styles.itemImage}
                    resizeMode="cover"
                  >
                    {!item.photo && (
                      <View style={styles.noPhotoCenter}>
                        <Text style={styles.noPhotoText}>?</Text>
                      </View>
                    )}
                    
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.9)']}
                      style={styles.itemGradient}
                    />

                    <View style={[styles.rankBadge, { backgroundColor: colors.border }]}>
                      <Text style={[styles.rankText, { color: isTop3 ? '#000' : '#FFF' }]}>
                        #{rank}
                      </Text>
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemScore} numberOfLines={1}>
                        {item.overall_rank ? parseFloat(item.overall_rank.toFixed(2)) : ''}
                      </Text>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>

                  </ImageBackground>
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
             <Text style={styles.footerText}>RANKLIB LEADERBOARD</Text>
          </View>

        </View>
        <Button title={t('common.png_export')} onPress={onCapture}/>
        <SuccessMessage visible={isSuccess} onClose={() => setIsSuccess(false)} message={t('common.success_export')}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 0
  },
  scrollContent: {
    // paddingBottom: 40,
    padding: 0
  },
  

  captureContainer: {
    backgroundColor: '#0D0D10', 
    marginTop: 100,
    borderRadius: 12,
    overflow: 'hidden',
    // height: 100
  },

  headerContainer: {
    aspectRatio: 2 / 1,
    width: '100%',
    marginBottom: 10,
  },
  headerImage: {
    aspectRatio: 2 / 1,
    width: '100%',
  },
  headerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2A2A35',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  headerTexts: {
    gap: 4,
  },
  badgeContainer: {
    backgroundColor: '#6C5CE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  className: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 10,
  },
  subTitle: {
    color: '#A0A0B0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: SPACING,
    justifyContent: 'center', 
  },
  gridItem: {
    width: ITEM_SIZE,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E24',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyGridItem: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#333',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  noPhotoCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25252A',
    width: '100%',
    height: '100%',
  },
  noPhotoText: {
    color: '#555',
    fontSize: 30,
    fontWeight: 'bold',
  },
  itemGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  
  rankBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
    zIndex: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  itemInfo: {
    padding: 6,
    paddingBottom: 8,
  },
  itemScore: {
    color: '#FFD700', // Gold color for score
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
    textShadowColor: 'black',
    textShadowRadius: 2,
  },
  itemName: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'black',
    textShadowRadius: 2,
  },

  // --- FOOTER ---
  footer: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
    marginHorizontal: 20,
    
  },
  footerText: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: 'bold',
  }
});
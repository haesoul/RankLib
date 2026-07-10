import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { ClassOfGrading, GradeObject } from '@/realm/models';
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
import { captureRef } from "react-native-view-shot";

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

export default function ClassCardScreen() {
  const { id, tagIds } = useLocalSearchParams<{ id: string, tagIds?: string }>();
  const [isSuccess, setIsSuccess] = useState(false)
  const viewRef = useRef(null);

  const {t, i18n} = useTranslation()
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
  const classData = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));

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


  if (!classData) return null;

  const gridItems = [...topNineObjects];
  while (gridItems.length < 9) {
    // @ts-ignore - заглушка
    gridItems.push(null);
  }

  return (
    <ScrollView 
      style={styles.screen} 
      contentContainerStyle={styles.scrollContent}
    >

      <View style={styles.captureCard} collapsable={false} ref={viewRef}>
        
        <View style={styles.cardHeader}>
          <ImageBackground
            source={classData.photo ? { uri: classData.photo } : undefined}
            style={styles.headerBg}
            imageStyle={{ opacity: 0.6 }}
          >
            <LinearGradient
              colors={['transparent', '#121214']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <Text style={styles.className} numberOfLines={1}>
                  {classData.name.toUpperCase()}
                </Text>
                <View style={styles.statRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{t('grading.top9').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.subText}>{classData.objectsName?.toUpperCase()}</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>


        <View style={styles.gridContainer}>
          {gridItems.map((item, index) => {
            const rank = index + 1;
            const styleConf = RANK_STYLES[rank as keyof typeof RANK_STYLES] || RANK_STYLES.default;
            
            if (!item) {
              return (
                <View key={`empty-${index}`} style={[styles.gridItem, styles.emptyItem]}>
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
                    borderColor: styleConf.color,
                    backgroundColor: styleConf.bg,
                    borderWidth: rank <= 3 ? 1 : 0
                  }
                ]}
              >
                <ImageBackground
                  source={item.photo ? { uri: item.photo } : undefined}
                  style={styles.itemImage}
                  resizeMode="cover"
                >
                  {!item.photo && (
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
                     <Text style={styles.scoreText}>
                        {item.overall_rank ? parseFloat(item.overall_rank.toFixed(2)) : ''}
                      </Text>
                  </View>

                  <View style={styles.nameContainer}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
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
  
  // === Стили самой карточки (для экспорта) ===
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

  // HEADER
  cardHeader: {
    height: 100,
    width: '100%',
    backgroundColor: '#1E1E24',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBg: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  className: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'black',
    textShadowRadius: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 10,
  },
  subText: {
    color: '#AAA',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '500'
  },

  // GRID 3x3
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
    height: '50%',
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
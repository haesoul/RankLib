import { CategoryOfObject, GradeObject } from '@/realm/models';
import { Realm, useObject } from '@realm/react';
// import { useFonts } from 'expo-font';
import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { Colors } from '@/CONSTANTS';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
const SCREEN_WIDTH = Dimensions.get('window').width;

const GradeObjectCard = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false)


  const {t, i18n} = useTranslation()
  const viewRef = useRef(null);
  const objectIdValue = useMemo(() => {
      try {
      return new Realm.BSON.ObjectId(id);
      } catch {
      return null;
      }
  }, [id]);
  const data = objectIdValue
  ? useObject<GradeObject>('GradeObject', objectIdValue)
  : null;
  if (!data) return;

  const topCategories = useMemo(() => {
      const allCategories: CategoryOfObject[] = data.categories_of_object.slice();
      
      const sorted = allCategories.sort((a, b) => {
      const rankA = a.rank ?? 0;
      const rankB = b.rank ?? 0;
      return rankB - rankA; 
      });

      return sorted.slice(0, 9);
  }, [data.categories_of_object]);


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
  const getRankColor = (rank: number | null | undefined) => {
    const r = rank || 0;
    if (r >= 9) return '#FFD700'; 
    if (r >= 7) return '#C084FC'; 
    if (r >= 5) return '#60A5FA';
    return '#9CA3AF';
  };

  return (
    <>
      <View style={styles.cardContainer} ref={viewRef}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            {data.photo ? (
              <Image source={{ uri: data.photo }} style={styles.objectImage} />
            ) : (
              <View style={[styles.objectImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>NO IMG</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.objectName} numberOfLines={2}>
              {data.name}
            </Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankLabel}>OVR RANK</Text>
              <Text style={[styles.rankValue, { color: getRankColor(data.overall_rank) }]}>
                {data.overall_rank?.toFixed(1) ?? "N/A"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.descriptionContainer}>
          {data.description && (
            <Text style={styles.description} numberOfLines={10}>
              {data.description}
            </Text>
          )}
        </View>
        <View style={styles.statsWrapper}>
          <Text style={styles.statsTitle}>TOP ATTRIBUTES</Text>
          
          <View style={styles.gridContainer}>
            {topCategories.map((catObj, index) => (
              <View key={catObj._id.toString()} style={styles.gridItem}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{index + 1}</Text>
                </View>
                
                <Text style={styles.categoryName} numberOfLines={1}>
                  {catObj.category?.name ?? "Unknown"}
                </Text>
                
                <Text style={styles.categoryRank}>
                  {catObj.rank?.toFixed(1) ?? "-"}
                </Text>
              </View>
            ))}
            
            {Array.from({ length: Math.max(0, 9 - topCategories.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={[styles.gridItem, styles.emptyItem]} />
            ))}
          </View>
        </View>
        
      </View>
      <Button title={t('common.png_export')} onPress={onCapture}/>
      <SuccessMessage visible={isSuccess} onClose={() => setIsSuccess(false)} message={t('common.success_export')}/>
    </>
  );
};
export default GradeObjectCard
const styles = StyleSheet.create({
  // Основная карточка
  cardContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2C2D35',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginTop: 50
  },

  // Хедер
  header: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  descriptionContainer: {
    marginBottom: 8
  },
  imageContainer: {
    marginRight: 15,
    shadowColor: '#60A5FA', 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  objectImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#2A2B36',
    borderWidth: 2,
    borderColor: '#3E4050',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  objectName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800', // Extra Bold для игрового стиля
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  rankLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    marginRight: 6,
    fontWeight: '600',
  },
  rankValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    // color: '#6B7280',
    color: '#bebebeff', 
    fontSize: 12,
    fontStyle: 'italic', 
    lineHeight: 14,  
    
  },
  // description: {
  //   color: '#D1D5DB',          
  //   fontSize: 12,            
  //   // fontStyle: 'italic',    
  //   fontFamily: 'serif',       
  //   lineHeight: 16,          
  //   // letterSpacing: 0.1,     
  // },


  // Блок статистики (категорий)
  statsWrapper: {
    backgroundColor: '#1F2029', // Чуть светлее фона карточки, чтобы выделить блок
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2F303A',
  },
  statsTitle: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8, // Gap работает в новых версиях RN, если старая - используйте margin
  },
  gridItem: {
    // Ширина примерно 30% минус отступы, чтобы влезло 3 в ряд
    width: '31%', 
    backgroundColor: '#262730',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#343540',
  },
  emptyItem: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  positionBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: '#3B82F6', // Акцентный цвет (синий неон)
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1F2029',
  },
  positionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryName: {
    color: '#D1D5DB',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  categoryRank: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'], // Моноширинные цифры для ровности
  }
});
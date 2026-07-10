import Button from '@/components/UI/Buttons/Button';
import { SuccessMessage } from '@/components/UI/ToastMessage/ToastMessage';
import { Colors } from '@/CONSTANTS';
import { GradeObject, RankType } from '@/realm/models';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useObject } from '@realm/react';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { BSON } from 'realm';


const RankBadge = ({ rankType, currentRank }: { rankType?: RankType; currentRank: number }) => {
  const badgeColor = rankType?.color || '#7f8c8d'; 
  const badgeName = rankType?.name || 'Unranked';

  const isShortName = badgeName.length <= 3;

  return (
    <View collapsable={false} style={styles.badgeContainer}>
      <View 
        collapsable={false}
        style={[
          styles.badgeDiamond, 
          { backgroundColor: badgeColor, zIndex: 1 } 
        ]} 
      />
      
      <View style={[styles.badgeContent, { zIndex: 5, elevation: 11 }]}>
        {isShortName ? (
          <>
            <Text style={styles.badgeNameHuge}>{badgeName.toUpperCase()}</Text>
          </>
        ) : (
          <>
            <FontAwesome5 name="crown" size={18} color="#fff" style={styles.badgeIcon} />
            <Text 
              style={styles.badgeName} 
              numberOfLines={1} 
              adjustsFontSizeToFit={true}
              minimumFontScale={0.6}
            >
              {badgeName.toUpperCase()}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};
export default function ObjectCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false)

  const {t, i18n} = useTranslation()
  const viewRef = useRef(null);
  const objectId = useMemo(() => {
    try {
        return new BSON.ObjectId(id);
    } catch(e) { 
        return null; 
    }
  }, [id]);

  const gradeObject = useObject(GradeObject, objectId);


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
  if (!objectId || !gradeObject) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white' }}>Объект не найден</Text>
      </View>
    );
  }


  const activeRankType = useMemo(() => {
    const types = gradeObject.class_of_object?.rankTypes;
    if (!types || types.length === 0) return undefined;
    
    const rank = gradeObject.overall_rank || 0;
    
    const sortedValidTypes = types
        .filter(rt => rt.fromRank <= rank)
        .sort((a, b) => b.fromRank - a.fromRank);

    return sortedValidTypes.length > 0 ? sortedValidTypes[0] : undefined;
  }, [gradeObject]);

  // 2. Получаем Топ-9 категорий
  const topCategories = useMemo(() => {
    return gradeObject.categories_of_object
      .sorted('rank', true) 
      .slice(0, 9);
  }, [gradeObject]);

  return (
    <SafeAreaView style={styles.mainContainer}>
        <Stack.Screen options={{ 
            headerTitle: gradeObject.name, 
            headerStyle: { backgroundColor: '#0f0c29' },
            headerTintColor: '#fff' 
        }} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.cardWrapper} ref={viewRef}>
            
            <View style={styles.headerRow}>
                <View style={styles.imageWrapper}>
                {gradeObject.photo ? (
                    <Image source={{ uri: gradeObject.photo }} style={styles.objectImage} />
                ) : (
                    <View style={[styles.objectImage, styles.placeholderImage]}>
                        <MaterialCommunityIcons name="image-off" size={40} color="#555" />
                    </View>
                )}
                </View>

                <View style={styles.infoWrapper}>
                <Text style={styles.objectName}>{gradeObject.name}</Text>
                <Text style={styles.className}>{gradeObject.class_of_object.name}</Text>
                
                <View style={styles.rankRow}>
                    <Text style={styles.rankLabel}>OVR:</Text>
                    <Text style={styles.rankValue}>{gradeObject.overall_rank ? parseFloat(gradeObject.overall_rank.toFixed(2)) : ''}</Text>
                </View>
                </View>

                <View style={styles.badgeWrapper}>
                <RankBadge 
                    rankType={activeRankType} 
                    currentRank={gradeObject.overall_rank || 0} 
                />
                </View>
            </View>

            {gradeObject.description && (
                <Text style={styles.description} numberOfLines={10}>
                {gradeObject.description}
                </Text>
            )}
            {/* </LinearGradient> */}

            <View style={styles.categoriesSection}>
            {/* <Text style={styles.sectionTitle}>PERFORMANCE MATRIX</Text> */}
            
            <View style={styles.gridContainer}>
                {topCategories.map((catOfObj, index) => {
                const rankVal = catOfObj.rank || 0;
                let barColor = '#e74c3c';
                if (rankVal >= 8) barColor = '#2ecc71';
                else if (rankVal >= 5) barColor = '#f1c40f';

                return (
                    <View key={catOfObj._id.toString()} style={styles.gridItem}>
                    {/* <LinearGradient
                        colors={['#1e1e2f', '#2a2a40']}
                        style={styles.gridItemGradient}
                    > */}
                        <View style={styles.indexBadge}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                        </View>

                        <Text style={styles.categoryName} numberOfLines={2}>
                        {catOfObj.category.name}
                        </Text>

                        <View style={styles.scoreContainer}>
                        <Text style={[styles.scoreText, { color: barColor }]}>
                            {rankVal.toFixed(1)}
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View 
                            style={[
                                styles.progressBarFill, 
                                { width: `${Math.min(rankVal * 10, 100)}%`, backgroundColor: barColor }
                            ]} 
                            />
                        </View>
                        </View>
                    {/* </LinearGradient> */}
                    </View>
                );
                })}
            </View>
            </View>
          </View>
          <Button title={t('common.png_export')} onPress={onCapture}/>
          <SuccessMessage visible={isSuccess} onClose={() => setIsSuccess(false)} message={t('common.success_export')}/>
        </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    width: '100%'
  },
  cardWrapper: {
    backgroundColor: '#161625',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    width: '100%'
  },
  container: {
    flex: 1,
    backgroundColor: '#0f0c29', 
    width: '100%'
  },
  scrollContent: {
    paddingBottom: 40,
    width: '100%'
  },
  
  headerCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    width: '100%'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%'
  },
  imageWrapper: {
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  objectImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  objectName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
  },
  className: {
    fontSize: 12,
    color: '#aab',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rankLabel: {
    fontSize: 12,
    color: '#889',
    marginRight: 4,
    fontWeight: '700',
  },
  rankValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff', 
  },
  description: {
    marginTop: 6,
    color: '#c9c9c9',
    fontSize: 11,
    fontFamily: 'Inter-Light',
    fontStyle: 'italic',
    lineHeight: 16,
    letterSpacing: 0.15,
  },
badgeWrapper: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -5, 
  },
  badgeContainer: {
    width: 70, 
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDiamond: {
    position: 'absolute',
    top: 8, 
    left: 8, 
    width: 54,
    height: 54,
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    // paddingBottom: 2,
  },

  // --- СТИЛИ ДЛЯ ОБЫЧНОГО РЕЖИМА ---
  badgeIcon: {
    marginBottom: -2,
    marginTop: -2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
  },
  badgeRankValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowRadius: 2,
    lineHeight: 18,
  },
  badgeName: {
    color: '#fff',
    fontSize: 10, 
    fontWeight: 'bold',
    maxWidth: 64,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowRadius: 1,
  },

  badgeNameHuge: {
    color: '#fff',
    fontSize: 36, 
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    lineHeight: 36,
    // marginTop: -4, 
  },
  badgeRankValueSmall: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },

  categoriesSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#6e6e8e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 7,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    aspectRatio: 4 / 3,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gridItemGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryName: {
    color: '#ddd',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 14,
  },
  scoreContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
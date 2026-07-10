import ObjectCard from "@/components/features/object/Card/ObjectCard";
import { Category, ClassOfGrading, GradeObject, LeaderboardEntry } from "@/realm/models";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useObject, useQuery, useRealm } from "@realm/react";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Realm from "realm";

import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import { Colors } from "@/CONSTANTS";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";

interface Props {
  id: string; 
  onPressObject?: (obj: GradeObject) => void;
}
const HEX24 = /^[0-9a-fA-F]{24}$/;
export default function ShowAllObjectsOfClass({ id, onPressObject }: Props) {
  const realm = useRealm()
  const router = useRouter()

  const translateY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const [tagsFilter, setTagsFilter] = React.useState<string[]>([]);
  const listRef = useAnimatedRef<Animated.FlatList<GradeObject>>();

  const [filterType, setFilterType] = useState<"tags" | "cats" | "search" | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [top10ByCat, setTop10ByCat] = useState<GradeObject[] | null>(null);
  const [searchInput, setSearchInput] = useState('')
  // const [searchObjects, setSearchObjects] = useState<GradeObject[] | null>(null)
  const [searchObjects, setSearchObjects] = useState<Realm.Results<GradeObject> | null>(null)
  // const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const [objectViewType, setObjectViewType] = useState<2 | 3>(2)
  const [isLoaded, setIsLoaded] = useState(false);
  const {t, i18n} = useTranslation()

  const classObj = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id))

  const tagsInClass = classObj?.tags ?? []

  const tagOids = React.useMemo(() => {
    return tagsFilter.map((id) => new Realm.BSON.ObjectId(id));
  }, [tagsFilter]);

  const objects = useQuery(
    GradeObject,
    (collection) => {
      
      let filtered = collection.filtered("class_of_object._id == $0", classObj?._id);

      if (tagOids.length > 0) {
        for (const oid of tagOids) {
          filtered = filtered.filtered("ANY tags._id == $0", oid);
        }
      }
      return filtered.sorted("overall_rank", true);
    },
    [classObj, tagOids]
  );
  

  const top10RankMap = React.useMemo(() => {
    if (!top10ByCat) return null;
    const map = new Map<string, number>();
    top10ByCat.forEach((obj, i) => map.set(obj._id.toHexString(), i + 1));
    return map;
  }, [top10ByCat]);

  useEffect(() => {
    const load = async () => {
      const type = await AsyncStorage.getItem('objectViewType');
      const result = Number(type);

      if (result === 2 || result === 3) setObjectViewType(result);
      else setObjectViewType(2);

      // 👇 Даем UI "вздохнуть"
      setTimeout(() => setIsLoaded(true), 0);
    };

    load();
  }, []);

  useEffect(() => {
    const save = async () => {
      await AsyncStorage.setItem('objectViewType', objectViewType.toString());
    };
    save();
  }, [objectViewType]);

  // useEffect(() => {
  //   if (selectedObjects.size > 1 && !isMultiSelectMode) {
  //     setIsMultiSelectMode(true)
  //   } 
  //   if (selectedObjects.size === 0 && isMultiSelectMode) {
  //     setIsMultiSelectMode(false)
  //   }
  // }, [selectedObjects])
  useEffect(() => {
    if (selectedCat) {
      const topEntries = realm.objects(LeaderboardEntry)
        .filtered("classOfGrading == $0 AND category == $1", classObj, selectedCat)
        .sorted("rankValue", true)
        .slice(0, 10);

    const topObjects = topEntries.map(entry => entry.object);

      setTop10ByCat(topObjects);
    } else {
      setTop10ByCat(null);
    }
  }, [selectedCat, classObj, realm]);

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchObjects(null);
      return;
    }

    const results = realm.objects<GradeObject>('GradeObject')
      .filtered(
        'class_of_object._id == $0 AND name CONTAINS[c] $1',
        classObj?._id,
        searchInput
      );

    setSearchObjects(results);
  }, [searchInput, classObj, realm]);


  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });
  const toggleTag = (tagIdHex: string) => {
    setTagsFilter(prev => 
      prev.includes(tagIdHex) 
        ? prev.filter(t => t !== tagIdHex) 
        : [...prev, tagIdHex]
    );
  };

  
  const getData = (): GradeObject[] => {
    if (filterType === "cats" && top10ByCat !== null) {
      return top10ByCat;
    } else if (filterType === "search" && searchObjects !== null) {
      return Array.from(searchObjects);
    } else {
      return objects as unknown as GradeObject[];
    }
  };
  const isSelected = (idHex: string) => selectedObjects.has(idHex);

  const toggleObjectSelection = (idHex: string) => {
    setSelectedObjects(prev => {
      const next = new Set(prev);
      if (next.has(idHex)) next.delete(idHex);
      else next.add(idHex);

      if (next.size === 0) setIsMultiSelectMode(false);
      if (next.size > 0 && !isMultiSelectMode) setIsMultiSelectMode(true);
      return next;
    });
  };

  if (!classObj) return <Text style={styles.error}>{t('class.not_found')}</Text>;

  if (!isLoaded || objectViewType === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <View style={[styles.container, {padding: 10}]}>
      {!selectedCat && <Text style={styles.header}>📂 {classObj.name}: {filterType === "search" && searchInput !== "" ? (searchObjects?.length ?? 0) : objects.length}</Text>}
      {selectedCat && <Text style={styles.header}>📂 {t('grading.top10')} {selectedCat.name}</Text>}

        <View style={styles.rowContent}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Button title={t('categories.categories')} 
              onPress={() => {
                filterType === "cats" ? setFilterType(null) : setFilterType("cats");
                setTagsFilter([]);
              }} 
              style={[styles.tagContainer, filterType === "cats" ? styles.catActive : styles.catInactive]}
            />
            <Button title={t('tags.tags')} onPress={() => {
              filterType === "tags" ? setFilterType(null) : setFilterType("tags");
              setSelectedCat(null);  
            }} 
              style={[styles.tagContainer, filterType === "tags" ? styles.catActive : styles.catInactive]} 
            />
            <Button title={t('common.search')} onPress={() => {
              filterType === "search" ? setFilterType(null) : setFilterType("search");
              setSelectedCat(null);  
            }} 
              style={[styles.tagContainer, filterType === "search" ? styles.catActive : styles.catInactive]} 
            />
          </ScrollView>
            

            <Button 
              style={{paddingHorizontal: 0, width: 45, height: 45}}
              onPress={() => setObjectViewType(objectViewType === 2 ? 3 : 2)}
              >
                {objectViewType === 2 && <MaterialCommunityIcons name="view-grid" size={24} color="white" />}
                {objectViewType === 3 && <MaterialCommunityIcons name="view-module" size={24} color="white" />}
            </Button>


        </View>
        <View style={styles.rowContent}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterType === "tags" && tagsInClass?.map((tag, index) => {
              const tagId = tag._id.toHexString(); 
              const isSelected = tagsFilter.includes(tagId);

              return (
                <TouchableOpacity
                  key={tagId}
                  onPress={() => toggleTag(tagId)}
                  style={[
                    styles.tagContainer,
                    isSelected ? styles.tagActive : styles.tagInactive
                  ]}
                >
                  <Text style={[isSelected ? styles.textActive : styles.textInactive]}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {filterType === "cats" && 
              classObj.categories?.map((cat, index) => {
                
                return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedCat(() => cat.name === selectedCat?.name ? null : cat)}
                  style={[
                    styles.tagContainer,
                    selectedCat !== null && selectedCat.name === cat.name ? styles.tagActive : styles.tagInactive
                  ]}
                >
                  <Text style={[selectedCat !== null && selectedCat.name === cat.name ? styles.textActive : styles.textInactive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
                )
              
              })
            }
            {filterType === "search" && (
              <View style={{minWidth: '100%'}}>
                <Input 
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder={t('common.search')}
                  style={{minWidth: '90%'}}
                />
              </View>
            )
            }
          
          </ScrollView>
        </View>
        <Animated.View style={[{ flex: 1, backgroundColor: 'transparent' }, animatedStyle]}>
          <Animated.FlatList
            data={getData()}
            ref={listRef}
            keyExtractor={(item) => item._id.toHexString()}
            numColumns={objectViewType}
            columnWrapperStyle={{ justifyContent: "flex-start", margin: 0 }}
            extraData={objects}
            overScrollMode="auto" 
            bounces={true}
            onScroll={scrollHandler}
            onLayout={(e) => { containerHeight.value = e.nativeEvent.layout.height; }}
            scrollEventThrottle={16}
            key={`list-${objectViewType}`}
            decelerationRate={0.998} 
            initialNumToRender={3}
            maxToRenderPerBatch={9} 
            windowSize={4}
            removeClippedSubviews={Platform.OS === 'android'}            
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            renderItem={({ item, index }) => {
              const idHex = item._id.toHexString(); 
              const selected = isSelected(idHex); 

              // let topNumber = 0;
              // if (top10ByCat !== null) {
              //   topNumber = top10ByCat.findIndex(obj => obj._id.equals(item._id)) + 1;
              // }
              const topNumber = top10RankMap?.get(idHex) ?? 0;
              return (
                <ObjectCard 
                  item={item} 
                  index={index} 
                  isSelected={selected}
                  onPress={() => {
                    if (isMultiSelectMode) {
                      toggleObjectSelection(idHex);
                    } else {
                      onPressObject?.(item);
                    }
                  }} 
                  onLongPress={() => {
                    if (!isMultiSelectMode) setIsMultiSelectMode(true);
                    toggleObjectSelection(idHex);
                  }}
                  topNumber={topNumber}
                  type={objectViewType}
                />
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('class.no_objects')}</Text>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </Animated.View>
        {isMultiSelectMode && (
          <View style={styles.footerActions}>
            <Button 
              style={styles.compareButton} 
              onPress={() => {
                // selectedObjects — это уже массив строк
                router.push({
                  pathname: "/object/Comparison/Comparison",
                  params: { ids: Array.from(selectedObjects) }
                });
              }}
            >
              <Text style={styles.baseText}>
                {t('object.compare')} ({selectedObjects.size})
              </Text>
            </Button>
            
            <Button onPress={() => {
              setSelectedObjects(new Set());
              setIsMultiSelectMode(false);
            }}>
              <Text style={{color: '#777', textAlign: 'center', marginTop: 10}}>
                {t('common.cancel')}
              </Text>
            </Button>
          </View>
        )}
      </View>
  );
}
const { width } = Dimensions.get("window");
const CARD_MARGIN = 0;
const CARD_WIDTH = (width - 24 * 2 - CARD_MARGIN * 2) / 2; 


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 18, 
    backgroundColor: Colors.background,
    height: '100%'
  },

  header: {
    fontSize: 22,
    fontWeight: "800",
    // marginBottom: 16,
    textAlign: "center",
    color: "#F5F5F5",
  },

  loading: { 
    textAlign: "center", 
    marginTop: 20, 
    fontSize: 16, 
    color: "#B5B5B5" 
  },

  error: { 
    textAlign: "center", 
    marginTop: 20, 
    fontSize: 16, 
    color: "#FF4C4C" 
  },

  empty: { 
    textAlign: "center", 
    marginTop: 40, 
    fontSize: 15, 
    color: "#777" 
  },

  card: {
    width: CARD_WIDTH,
    height: 220, 
    backgroundColor: "#141414",
    borderRadius: 12,  
    padding: 12,
    marginBottom: 16,
    marginHorizontal: CARD_MARGIN / 2,
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 130,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#222', 
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  rank: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    
  },
  tagRowContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagContainer: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,

  },
  tagInactive: {
    backgroundColor: '#989ba0ff',
    borderColor: '#E5E7EB',  
  },
  tagActive: {
    backgroundColor: '#3B82F6', 
    borderColor: '#3B82F6',
  },
  baseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#374151',
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF', 
    fontWeight: '600',
  },
  catInactive: {
    // backgroundColor: '#3e3f41ff',
  },

  catActive: {
    backgroundColor: '#011a44ff', 
    borderColor: '#5680c4ff',
  },


  footerActions: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  compareButton: {
    backgroundColor: '#FFD700', // Золотой/Желтый для привлечения внимания
    borderRadius: 12,
  },
});

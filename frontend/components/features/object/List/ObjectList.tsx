import ObjectCard from "@/components/features/object/Card/ObjectCard";
import { Category, ClassOfGrading, GradeObject, LeaderboardEntry } from "@/realm/models";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useObject, useQuery, useRealm } from "@realm/react";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Realm from "realm";

import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import WarnModal from "@/components/UI/Modal/WarnModal";
import { Colors } from "@/CONSTANTS";
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'; // <-- Добавили MaterialIcons
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";

interface Props {
  id: string; 
  onPressObject?: (obj: GradeObject) => void;
}

function indexFromPoint(x: number, y: number, cols: number, colPitch: number, rowPitch: number): number {
  'worklet';
  if (colPitch <= 0 || rowPitch <= 0 || cols <= 0) return -1;
  const col = Math.min(Math.max(Math.floor(x / colPitch), 0), cols - 1);
  const row = Math.max(Math.floor(y / rowPitch), 0);
  return row * cols + col;
}

export default function ShowAllObjectsOfClass({ id, onPressObject }: Props) {
  const realm = useRealm();
  const router = useRouter();
  const { t } = useTranslation();

  const translateY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const [tagsFilter, setTagsFilter] = React.useState<string[]>([]);
  const listRef = useAnimatedRef<Animated.FlatList<GradeObject>>();

  const [filterType, setFilterType] = useState<"tags" | "cats" | "search" | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [top10ByCat, setTop10ByCat] = useState<GradeObject[] | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchObjects, setSearchObjects] = useState<Realm.Results<GradeObject> | null>(null);
  
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [objectViewType, setObjectViewType] = useState<2 | 3>(2);
  const [isLoaded, setIsLoaded] = useState(false);

  const classObj = useObject(ClassOfGrading, new Realm.BSON.ObjectId(id));


  // --- Drag-to-multiselect ---
  const item0Ref = useRef<View>(null);
  const item1Ref = useRef<View>(null);
  const itemRowRef = useRef<View>(null);
  const colPitch = useSharedValue(0);
  const rowPitch = useSharedValue(0);
  const dragAnchorIndex = useSharedValue(-1);
  const lastDragIndex = useSharedValue(-1);
  const dragBaseSelection = useRef<Set<string>>(new Set());



  useEffect(() => {
    colPitch.value = 0;
    rowPitch.value = 0;
  }, [objectViewType]);


  const measurePitches = () => {
    if (item0Ref.current && item1Ref.current) {
      item0Ref.current.measure((_x0, _y0, w0, _h0, pageX0) => {
        item1Ref.current?.measure((_x1, _y1, _w1, _h1, pageX1) => {
          colPitch.value = objectViewType > 1 ? Math.abs(pageX1 - pageX0) : w0;
        });
      });
    }
    if (item0Ref.current && itemRowRef.current) {
      item0Ref.current.measure((_x0, _y0, _w0, _h0, _pageX0, pageY0) => {
        itemRowRef.current?.measure((_x1, _y1, _w1, _h1, _pageX1, pageY1) => {
          rowPitch.value = Math.abs(pageY1 - pageY0);
        });
      });
    }
  };


  
  const tagsInClass = classObj?.tags ?? [];

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
      .filtered('class_of_object._id == $0 AND name CONTAINS[c] $1', classObj?._id, searchInput);
    setSearchObjects(results);
  }, [searchInput, classObj, realm]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollOffset.value = event.contentOffset.y; },
  });

  const toggleTag = (tagIdHex: string) => {
    setTagsFilter(prev => prev.includes(tagIdHex) ? prev.filter(t => t !== tagIdHex) : [...prev, tagIdHex]);
  };

  const getData = (): GradeObject[] => {
    if (filterType === "cats" && top10ByCat !== null) return top10ByCat;
    if (filterType === "search" && searchObjects !== null) return Array.from(searchObjects);
    return objects as unknown as GradeObject[];
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

  const applyDragRange = (anchorIndex: number, currentIndex: number) => {
    const data = getData();
    if (!data.length || anchorIndex < 0) return;
    const a = Math.min(anchorIndex, data.length - 1);
    const c = Math.min(Math.max(currentIndex, 0), data.length - 1);
    const from = Math.min(a, c);
    const to = Math.max(a, c);
    const rangeIds = data.slice(from, to + 1).map((obj) => obj._id.toHexString());

    const next = new Set(dragBaseSelection.current);
    rangeIds.forEach((idHex) => next.add(idHex));
    setSelectedObjects(next);
    if (!isMultiSelectMode) setIsMultiSelectMode(true);
  };

  const startDragSelection = (anchorIndex: number) => {
    if (!getData().length) return;
    dragBaseSelection.current = new Set(selectedObjects);
    applyDragRange(anchorIndex, anchorIndex);
  };

  const deleteSelectedObjects = () => {
    realm.write(() => {
      selectedObjects.forEach((idHex) => {
        const obj = realm.objects(GradeObject).filtered("_id == $0", new Realm.BSON.ObjectId(idHex))[0];
        if (obj) {
          realm.delete(obj);
        }
      });
    });
    setSelectedObjects(new Set());
    setIsMultiSelectMode(false);
    setOpenDeleteModal(false);
  };


  const dragSelectGesture = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart((event) => {
      const y = event.y + scrollOffset.value;
      const idx = indexFromPoint(event.x, y, objectViewType, colPitch.value, rowPitch.value);
      dragAnchorIndex.value = idx;
      lastDragIndex.value = idx;
      runOnJS(startDragSelection)(idx);
    })
    .onUpdate((event) => {
      if (dragAnchorIndex.value < 0) return;
      const y = event.y + scrollOffset.value;
      const idx = indexFromPoint(event.x, y, objectViewType, colPitch.value, rowPitch.value);
      if (idx === lastDragIndex.value) return;
      lastDragIndex.value = idx;
      runOnJS(applyDragRange)(dragAnchorIndex.value, idx);
    })
    .onEnd(() => {
      dragAnchorIndex.value = -1;
      lastDragIndex.value = -1;
    });


  if (!classObj) return <Text style={styles.error}>{t('class.not_found')}</Text>;

  if (!isLoaded || objectViewType === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  

  return (
    <View style={[styles.container, { padding: 10 }]}>
      {!selectedCat && <Text style={styles.header}>📂 {classObj.name}: {filterType === "search" && searchInput !== "" ? (searchObjects?.length ?? 0) : objects.length}</Text>}
      {selectedCat && <Text style={styles.header}>📂 {t('grading.top10')} {selectedCat.name}</Text>}

      <View style={styles.rowContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Button title={t('categories.categories')} 
            onPress={() => { filterType === "cats" ? setFilterType(null) : setFilterType("cats"); setTagsFilter([]); }} 
            style={[styles.tagContainer, filterType === "cats" ? styles.catActive : styles.catInactive]}
          />
          <Button title={t('tags.tags')} onPress={() => { filterType === "tags" ? setFilterType(null) : setFilterType("tags"); setSelectedCat(null); }} 
            style={[styles.tagContainer, filterType === "tags" ? styles.catActive : styles.catInactive]} 
          />
          <Button title={t('common.search')} onPress={() => { filterType === "search" ? setFilterType(null) : setFilterType("search"); setSelectedCat(null); }} 
            style={[styles.tagContainer, filterType === "search" ? styles.catActive : styles.catInactive]} 
          />
        </ScrollView>
        <Button style={{ paddingHorizontal: 0, width: 45, height: 45 }} onPress={() => setObjectViewType(objectViewType === 2 ? 3 : 2)}>
          {objectViewType === 2 && <MaterialCommunityIcons name="view-grid" size={24} color="white" />}
          {objectViewType === 3 && <MaterialCommunityIcons name="view-module" size={24} color="white" />}
        </Button>
      </View>

      <View style={styles.rowContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterType === "tags" && tagsInClass?.map((tag) => {
            const tagId = tag._id.toHexString(); 
            const selected = tagsFilter.includes(tagId);
            return (
              <TouchableOpacity key={tagId} onPress={() => toggleTag(tagId)} style={[styles.tagContainer, selected ? styles.tagActive : styles.tagInactive]}>
                <Text style={[selected ? styles.textActive : styles.textInactive]}>{tag.name}</Text>
              </TouchableOpacity>
            );
          })}
          {filterType === "cats" && classObj.categories?.map((cat, index) => (
            <TouchableOpacity key={index} onPress={() => setSelectedCat(() => cat.name === selectedCat?.name ? null : cat)} style={[styles.tagContainer, selectedCat !== null && selectedCat.name === cat.name ? styles.tagActive : styles.tagInactive]}>
              <Text style={[selectedCat !== null && selectedCat.name === cat.name ? styles.textActive : styles.textInactive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
          {filterType === "search" && (
            <View style={{ minWidth: '100%' }}>
              <Input value={searchInput} onChangeText={setSearchInput} placeholder={t('common.search')} style={{ minWidth: '90%' }} />
            </View>
          )}
        </ScrollView>
      </View>
      <GestureDetector gesture={dragSelectGesture}>
        <Animated.View style={[{ flex: 1, backgroundColor: 'transparent' }, animatedStyle]}>
          <Animated.FlatList
            data={getData()}
            ref={listRef}
            keyExtractor={(item) => item._id.toHexString()}
            numColumns={objectViewType}
            columnWrapperStyle={{ justifyContent: "flex-start", margin: 0 }}
            extraData={selectedObjects}
            overScrollMode="auto" 
            bounces={true}
            onScroll={scrollHandler}
            onLayout={(e) => { containerHeight.value = e.nativeEvent.layout.height; }}
            scrollEventThrottle={16}
            key={`list-${objectViewType}`}
            decelerationRate={0.998} 
            renderItem={({ item, index }) => {
              const idHex = item._id.toHexString(); 
              const selected = isSelected(idHex); 
              const topNumber = top10RankMap?.get(idHex) ?? 0;

              const measureRef =
                index === 0 ? item0Ref :
                index === 1 ? item1Ref :
                index === objectViewType ? itemRowRef :
                undefined;

              return (
                <View ref={measureRef} onLayout={measureRef ? measurePitches : undefined} collapsable={false}>
                  <ObjectCard 
                    item={item} 
                    index={index} 
                    isSelected={selected}
                    isMultiSelectMode={isMultiSelectMode}
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
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>{t('class.no_objects')}</Text>}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </Animated.View>
      </GestureDetector>
      {isMultiSelectMode && (
        <View style={styles.footerActions}>
          <View style={styles.footerRow}>
            <Button 
              style={styles.compareButton} 
              onPress={() => {
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
            
            <TouchableOpacity 
              style={styles.deleteIconButton} 
              onPress={() => setOpenDeleteModal(true)}
            >
              <MaterialIcons name="delete-forever" size={26} color="#FF3B30" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={() => { setSelectedObjects(new Set()); setIsMultiSelectMode(false); }}>
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <WarnModal
        visible={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title={t('class.delete_class')} 
        leftOption={{
          label: t('common.close'),
          onPress: () => setOpenDeleteModal(false),
          destructive: false
        }}
        rightOption={{
          label: t('class.delete_class'),
          onPress: deleteSelectedObjects,
          destructive: true,
          textSize: 13
        }}
        isDeletion={true}
      /> 
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
  },

  catActive: {
    backgroundColor: '#011a44ff', 
    borderColor: '#5680c4ff',
  },
  footerActions: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1C',
    backgroundColor: Colors.background,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  compareButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    flex: 1,
    marginRight: 12,
    height: 48,
    justifyContent: 'center',
  },
  deleteIconButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 14,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

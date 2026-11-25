import Button from '@/components/UI/Buttons/Button';
import { MiniToast } from '@/components/UI/Modal/MessageModal';
import VideoPlayer from '@/components/UI/Video/VideoPlayer';
import { Colors } from '@/CONSTANTS';
import { ClassOfGrading } from '@/realm/models';
import { deleteFiles } from '@/utils/deleteFiles';
import { MaterialIcons } from '@expo/vector-icons';
import { useObject } from '@realm/react';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Realm from 'realm';

const { width, height } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_MARGIN = 3;
const TILE_RADIUS = 10;

type Rect = { x: number; y: number; width: number; height: number };

function indexFromPoint(x: number, y: number, cols: number, colPitch: number, rowPitch: number): number {
  'worklet';
  if (colPitch <= 0 || rowPitch <= 0 || cols <= 0) return -1;
  const col = Math.min(Math.max(Math.floor(x / colPitch), 0), cols - 1);
  const row = Math.max(Math.floor(y / rowPitch), 0);
  return row * cols + col;
}

export default function Gallery() {
  const { id } = useLocalSearchParams<{ id: string }>(); // classId
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) {
      console.warn('GalleryScreen: missing id param');
    }
  }, [id]);

  const objectIdValue = useMemo(() => {
    try {
      return new Realm.BSON.ObjectId(id);
    } catch {
      return null;
    }
  }, [id]);

  const classObj = useObject<ClassOfGrading>('ClassOfGrading', objectIdValue as any);

  const isVideo = (it: any) =>
    it?.mediaType === 'video' || (typeof it?.uri === 'string' && /\.(mp4|mov|mkv|webm|m4v)(\?.*)?$/i.test(it.uri));
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };



  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState<number>(0);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageModalText, setMessageModalText] = useState('');
  const [messageModalType, setMessageModalType] = useState<'success' | 'error'>('success');
  const [showHeader, setShowHeader] = useState(true);

  const [overlayMounted, setOverlayMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [sortByFavorites, setSortByFavorites] = useState(false);
  const [sortByHighlighted, setSortByHighlighted] = useState(false);

  const colPitch = useSharedValue(0);
  const rowPitch = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const dragAnchorIndex = useSharedValue(-1);
  const lastDragIndex = useSharedValue(-1);
  const dragBaseSelection = useRef<number[]>([]);

  const heroX = useSharedValue(0);
  const heroY = useSharedValue(0);
  const heroW = useSharedValue(0);
  const heroH = useSharedValue(0);
  const heroRadius = useSharedValue(TILE_RADIUS);
  const heroOpacity = useSharedValue(0);

  const allVideos = useMemo(() => {
    if (!classObj) return [];
    const videos: any[] = [];

    classObj.objects.forEach(obj => {
      obj.media.forEach(mediaItem => {
        if (isVideo(mediaItem)) {
          videos.push(mediaItem);
        }
      });
    });

    const dateMultiplier = sortOrder === 'newest' ? -1 : 1;

    return videos.sort((a, b) => {
      if (sortByHighlighted && a.isHighlighted !== b.isHighlighted) {
        return a.isHighlighted ? -1 : 1;
      }
      if (sortByFavorites && a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (dateA - dateB) * dateMultiplier;
    });
  }, [classObj, classObj?.objects, sortOrder, sortByFavorites, sortByHighlighted]);

  const tileRefs = useRef<Record<number, any>>({});

  const openItem = (index: number, originRect: Rect | null) => {
    if (!allVideos[index]) return;
    setOverlayMounted(true);
    setSelectedIndex(index);
    setVisibleIndex(index);
    setIsTransitioning(false);
  };

  const closeItem = () => {
    setOverlayMounted(false);
    setSelectedIndex(null);
    setIsTransitioning(false);
  };

  const finishClose = () => {
    setOverlayMounted(false);
    setSelectedIndex(null);
    setIsTransitioning(false);
  };

  const collapseTo = (rect: Rect | null) => {
    if (rect) {
      heroX.value = withTiming(rect.x, { duration: 300 });
      heroY.value = withTiming(rect.y, { duration: 300 });
      heroW.value = withTiming(rect.width, { duration: 300 });
      heroH.value = withTiming(rect.height, { duration: 300 }, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
      heroRadius.value = withTiming(TILE_RADIUS, { duration: 300 });
    } else {
      heroOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
    }
  };

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroX.value,
    top: heroY.value,
    width: heroW.value,
    height: heroH.value,
    borderRadius: heroRadius.value,
    opacity: heroOpacity.value,
    overflow: 'hidden',
    backgroundColor: '#000',
  }));

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (isMultiSelectMode) {
            setIsMultiSelectMode(false);
            setSelectedIndexes([]);
            return true;
          }

          if (selectedIndex !== null) {
            closeItem();
            return true;
          }

          return false;
        },
      );

      return () => subscription.remove();
    }, [isMultiSelectMode, selectedIndex, visibleIndex, allVideos]),
  );

  const applyDragRange = (anchorIndex: number, currentIndex: number) => {
    if (!allVideos.length || anchorIndex < 0) return;
    const a = Math.min(anchorIndex, allVideos.length - 1);
    const c = Math.min(Math.max(currentIndex, 0), allVideos.length - 1);
    const from = Math.min(a, c);
    const to = Math.max(a, c);

    const rangeIndexes: number[] = [];
    for (let i = from; i <= to; i++) rangeIndexes.push(i);

    setSelectedIndexes(Array.from(new Set([...dragBaseSelection.current, ...rangeIndexes])));
  };

  const startDragSelection = (anchorIndex: number) => {
    if (!allVideos.length) return;
    dragBaseSelection.current = selectedIndexes;
    setIsMultiSelectMode(true);
    setSelectedIndex(null);
    applyDragRange(anchorIndex, anchorIndex);
  };

  const dragSelectGesture = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart((event) => {
      const y = event.y + scrollOffset.value;
      const idx = indexFromPoint(event.x, y, NUM_COLUMNS, colPitch.value, rowPitch.value);
      dragAnchorIndex.value = idx;
      lastDragIndex.value = idx;
      runOnJS(startDragSelection)(idx);
    })
    .onUpdate((event) => {
      if (dragAnchorIndex.value < 0) return;
      const y = event.y + scrollOffset.value;
      const idx = indexFromPoint(event.x, y, NUM_COLUMNS, colPitch.value, rowPitch.value);
      if (idx === lastDragIndex.value) return;
      lastDragIndex.value = idx;
      runOnJS(applyDragRange)(dragAnchorIndex.value, idx);
    })
    .onEnd(() => {
      dragAnchorIndex.value = -1;
      lastDragIndex.value = -1;
    });

  const toggleSelectIndex = (index: number) => {
    setSelectedIndexes(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  };

  const tileSize = useMemo(() => {
    const totalMargins = ITEM_MARGIN * (NUM_COLUMNS + 1);
    return Math.floor((width - totalMargins - 10) / NUM_COLUMNS);
  }, []);

  useEffect(() => {
    const exactPitch = tileSize + ITEM_MARGIN * 2;
    colPitch.value = exactPitch;
    rowPitch.value = exactPitch;
  }, [tileSize, colPitch, rowPitch]);

  const gridFlatRef = useRef<FlatList>(null);
  const fullscreenFlatRef = useRef<FlatList>(null);

  const handleShare = async () => {
    if (visibleIndex === null || !allVideos[visibleIndex]) return;
    const currentMedia = allVideos[visibleIndex];
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('common.error'), t('common.sharing_unavailable'));
        return;
      }

      let uriToShare = currentMedia.uri;
      if (uriToShare.startsWith('http')) {
        const fileUri = FileSystem.cacheDirectory + 'temp_share.mp4';
        const { uri } = await FileSystem.downloadAsync(uriToShare, fileUri);
        uriToShare = uri;
      }
      await Sharing.shareAsync(uriToShare);
    } catch (e) {
      console.log(e);
      Alert.alert(t('common.error'), t('common.sharing_failed'));
    }
  };

  const handleDownload = async () => {
    if (visibleIndex === null || !allVideos[visibleIndex]) return;
    const currentMedia = allVideos[visibleIndex];
    let fileUri: string | undefined;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('common.gallery_access'));
        return;
      }

      let uriToSave = currentMedia.uri;
      if (uriToSave.startsWith('http')) {
        fileUri = FileSystem.documentDirectory + `download_${Date.now()}.mp4`;

        const { uri } = await FileSystem.downloadAsync(uriToSave, fileUri);
        uriToSave = uri;
      }

      await MediaLibrary.saveToLibraryAsync(uriToSave);
      setMessageModalText(t('common.saved_to_gallery'));
      setMessageModalType('success');
      setMessageModalVisible(true);
    } catch (e) {
      console.log(e);
      Alert.alert(t('common.error'), t('common.save_failed'));
    } finally {
      if (fileUri) {
        await deleteFiles(fileUri);
      }
    }
  };

  const handleMultiDownload = async () => {
    if (selectedIndexes.length === 0) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t('error', 'Внимание'), t('common.gallery_access'));
        return;
      }

      for (const index of selectedIndexes) {
        const currentMedia = allVideos[index];
        if (!currentMedia) continue;

        let uriToSave = currentMedia.uri;
        let fileUri: string | undefined;

        if (uriToSave.startsWith('http')) {
          fileUri = FileSystem.documentDirectory + `download_${Date.now()}_${index}.mp4`;
          
          const { uri } = await FileSystem.downloadAsync(uriToSave, fileUri);
          uriToSave = uri;
        }

        await MediaLibrary.saveToLibraryAsync(uriToSave);

        if (fileUri) {
          await deleteFiles(fileUri);
        }
      }

      setMessageModalText(t('common.saved_to_gallery'));
      setMessageModalType('success');
      setMessageModalVisible(true);
      
      setSelectedIndexes([]);
      setIsMultiSelectMode(false);
      setSelectedIndex(null);
    } catch (e) {
      console.log(e);
      Alert.alert(t('error', 'Ошибка'), t('common.save_failed'));
    }
  };

  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
    const uri = item.thumbnailUri;
    const isSelected = selectedIndexes.includes(index);
    return (
        <View collapsable={false}>
          <Pressable
            ref={(node) => { tileRefs.current[index] = node; }}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize },
              pressed ? { opacity: 0.85 } : {}
            ]}
            onPress={() => {
              if (isMultiSelectMode) {
                toggleSelectIndex(index);
                return;
              }
              const node = tileRefs.current[index];
              if (node?.measureInWindow) {
                node.measureInWindow((x: number, y: number, w: number, h: number) => {
                  openItem(index, { x, y, width: w, height: h });
                });
              } else {
                openItem(index, null);
              }
            }}
            onLongPress={() => {
              setSelectedIndex(null);
              setIsMultiSelectMode(true);
              toggleSelectIndex(index);
            }}
          >
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <MaterialIcons name="ondemand-video" size={28} color="#555" />
            </View>
          )}
          <View style={styles.playOverlay}>
            <MaterialIcons name="play-circle-outline" size={36} color="#fff" />
          </View>
          {isSelected && (
            <View style={styles.selectionOverlay} pointerEvents="none">
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionText}>{selectedIndexes.indexOf(index) + 1}</Text>
              </View>
            </View>
          )}
          {formatDuration(item.length) && (
            <View style={styles.lengthBadge} pointerEvents="none">
              <Text style={styles.lengthBadgeText}>{formatDuration(item.length)}</Text>
            </View>
          )}

          {(item.isFavorite || item.isHighlighted) && (
            <View style={styles.badgeRow} pointerEvents="none">
              {item.isHighlighted && (
                <MaterialIcons name="star" size={14} color="#FFD700" style={styles.badgeIcon} />
              )}
              {item.isFavorite && (
                <MaterialIcons name="favorite" size={13} color={Colors.accent} style={styles.badgeIcon} />
              )}
            </View>
          )}
          </Pressable>
        </View>
    );
  };

  const renderFullScreenItem = ({ item, index }: { item: any; index: number }) => {
    const active = visibleIndex === index;
    const isNear = Math.abs(index - visibleIndex) <= 1;

    return (
        <View style={styles.fullscreenContainer}>
          {isNear ? (
            <VideoPlayer
              uri={item.uri}
              poster={item.thumbnailUri}
              isActive={active}
              onControlsVisibilityChange={setShowHeader}
            />
          ) : (
            <Image
              source={{ uri: item.thumbnailUri || item.uri }}
              style={styles.fullscreenMedia}
              resizeMode="contain"
            />
          )}
          {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
        </View>
    );
  };

  const keyExtractor = (item: any, idx: number) =>
    item?.id ? String(item.id) : item?.uri ? item.uri + idx : String(idx);

  if (!id) {
    return (
      <View style={styles.safe}>
        <View style={styles.center}>
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>{t('gallery.not_found')}</Text>
        </View>
      </View>
    );
  }

  const onViewRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      const firstVisible = viewableItems[0];
      if (typeof firstVisible.index === 'number') {
        setVisibleIndex(firstVisible.index);
      }
    }
  });
  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 80 });

  if (!classObj) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Button onPress={() => router.back()} style={{ width: 50, paddingHorizontal: 0 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Button>
          </View>

          <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
            {!isMultiSelectMode && (
              <Text style={[styles.title, { flex: 0 }]} numberOfLines={1}>
                {classObj?.name ? `${classObj.name}` : 'Videos'}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
            {isMultiSelectMode && (
              <>
                <Button 
                  onPress={() => { 
                    setSelectedIndexes([]); 
                    setIsMultiSelectMode(false); 
                    setSelectedIndex(null);
                  }} 
                  style={{ paddingHorizontal: 8 }}
                >
                  <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                </Button>
                <Button onPress={handleMultiDownload} style={{ width: 44, paddingHorizontal: 0, marginLeft: 4 }}>
                  <MaterialIcons name="file-download" size={22} color="#fff" />
                </Button>
              </>
            )}
          </View>
        </View>
        {!isMultiSelectMode && (
          <View style={styles.filterBar}>
            <TouchableOpacity
              onPress={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              style={styles.filterButton}
            >
              <MaterialIcons
                name={sortOrder === 'newest' ? 'arrow-downward' : 'arrow-upward'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSortByFavorites((prev) => !prev)}
              style={[styles.filterButton, sortByFavorites && styles.filterButtonActive]}
            >
              <MaterialIcons
                name={sortByFavorites ? 'favorite' : 'favorite-border'}
                size={20}
                color={sortByFavorites ? Colors.accent : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSortByHighlighted((prev) => !prev)}
              style={[styles.filterButton, sortByHighlighted && styles.filterButtonActive]}
            >
              <MaterialIcons
                name={sortByHighlighted ? 'star' : 'star-border'}
                size={20}
                color={sortByHighlighted ? '#FFD700' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        )}
        <GestureDetector gesture={dragSelectGesture}>
          <View style={{ flex: 1 }}>
            <FlatList
              ref={gridFlatRef}
              data={allVideos}
              extraData={allVideos.length}
              renderItem={renderGridItem}
              keyExtractor={keyExtractor}
              numColumns={NUM_COLUMNS}
              contentContainerStyle={styles.listContainer}
              onScroll={(e) => { scrollOffset.value = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>{t('gallery.empty_text')}</Text>
                </View>
              }
              removeClippedSubviews={true}
              windowSize={9}
            />
          </View>
        </GestureDetector>

        {overlayMounted && (
          <View style={StyleSheet.absoluteFill}>
            <StatusBar hidden={!showHeader} animated={true} />
            <View style={styles.modalSafe} pointerEvents={isTransitioning ? 'none' : 'auto'}>

              {showHeader && (
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeItem} style={styles.iconButtonWrapper}>
                    <MaterialIcons name="close" size={28} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.modalHeaderActions}>
                    <TouchableOpacity onPress={handleDownload} style={styles.iconButtonWrapper}>
                      <MaterialIcons name="file-download" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={[styles.iconButtonWrapper, { marginLeft: 16 }]}>
                      <MaterialIcons name="share" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <FlatList
                ref={fullscreenFlatRef}
                data={allVideos}
                horizontal
                pagingEnabled
                initialScrollIndex={selectedIndex ?? 0}
                keyExtractor={keyExtractor}
                renderItem={renderFullScreenItem}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={viewConfigRef.current}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                initialNumToRender={1}
                windowSize={3}
                maxToRenderPerBatch={1}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Text style={styles.emptyText}>{t('gallery.empty_text')}</Text>
                  </View>
                }
              />
            </View>

          </View>
        )}
        
        <MiniToast
          visible={messageModalVisible}
          onClose={() => setMessageModalVisible(false)}
          message={messageModalText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background,  top: 0},
  header: {
    paddingTop: Constants.statusBarHeight,
    height: 56 + Constants.statusBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.backgroundSecondary,
    backgroundColor: Colors.background,
  },
  headerRight: { width: 40 },
  title: { flex: 1, color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, color: '#999', textAlign: "center", fontSize: 18, fontWeight: '600'  },
  listContainer: { padding: 0 },
  tile: {
    margin: ITEM_MARGIN,
    borderRadius: TILE_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' },
  playOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  modalSafe: { flex: 1, backgroundColor: '#000' },

  modalHeader: {
    position: 'absolute',
    top: Constants.statusBarHeight || 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButtonWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullscreenContainer: { width, height: height, alignItems: 'center', justifyContent: 'center', top: 0, left: 0, marginBottom: 10 },
  fullscreenMedia: { width: width, height: height, left: 0 },
  caption: { color: '#fff', marginTop: 12, paddingHorizontal: 20, textAlign: 'center', marginBottom: 10 },

  selectionOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'flex-end', justifyContent: 'flex-start',
    padding: 6,
  },
  selectionBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff',
  },
  selectionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  buttonText: { color: "#F5F5F5", fontSize: 14, fontWeight: "600", textAlign: "center" },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.backgroundSecondary,
    backgroundColor: Colors.background,
  },
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  lengthBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  lengthBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  badgeRow: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginLeft: 3,
  },
});
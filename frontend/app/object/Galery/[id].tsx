import Button from '@/components/UI/Buttons/Button';
import { MiniToast } from '@/components/UI/Modal/MessageModal';
import WarnModal from '@/components/UI/Modal/WarnModal';
import VideoPlayer from '@/components/UI/Video/VideoPlayer';
import { Colors } from '@/CONSTANTS';
import { GradeObject } from '@/realm/models';
import { addMedia, deleteSelectedMedia } from '@/tools/objectService';
import { MaterialIcons } from '@expo/vector-icons';
import { useObject, useRealm } from '@realm/react';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Realm from 'realm';

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_MARGIN = 3;

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const realm = useRealm();
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

  const gradeObject = objectIdValue
    ? useObject<GradeObject>('GradeObject', objectIdValue)
    : null;

  const obj = gradeObject;
  const media = obj ? Array.from(obj.media) : [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState<number>(0);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [deleteMediaModal, setDeleteMediaModal] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageModalText, setMessageModalText] = useState('');
  const [messageModalType, setMessageModalType] = useState<'success' | 'error'>('success');
  const [showHeader, setShowHeader] = useState(true);

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

  const gridFlatRef = useRef<FlatList>(null);
  const fullscreenFlatRef = useRef<FlatList>(null);

  const isVideo = (it: any) =>
    it?.mediaType === 'video' || (typeof it?.uri === 'string' && /\.(mp4|mov|mkv|webm|m4v)(\?.*)?$/i.test(it.uri));

  const handleShare = async () => {
    if (visibleIndex === null || !media[visibleIndex]) return;
    const currentMedia = media[visibleIndex];
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('error', 'Ошибка'), t('sharing_unavailable', 'Шаринг недоступен на этом устройстве'));
        return;
      }
      
      let uriToShare = currentMedia.uri;
      if (uriToShare.startsWith('http')) {
        const fileUri = FileSystem.cacheDirectory + 'temp_share.jpg';
        const { uri } = await FileSystem.downloadAsync(uriToShare, fileUri);
        uriToShare = uri;
      }
      await Sharing.shareAsync(uriToShare);
    } catch (e) {
      console.log(e);
      Alert.alert(t('error', 'Ошибка'), t('sharing_failed', 'Не удалось поделиться'));
    }
  };

  const handleDownload = async () => {
    if (visibleIndex === null || !media[visibleIndex]) return;
    const currentMedia = media[visibleIndex];
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error', 'Внимание'), t('permission_needed', 'Дай доступ к галерее, иначе как я сохраню?!'));
        return;
      }

      let uriToSave = currentMedia.uri;
      if (uriToSave.startsWith('http')) {
        const fileUri = FileSystem.documentDirectory + `download_${Date.now()}.jpg`;
        const { uri } = await FileSystem.downloadAsync(uriToSave, fileUri);
        uriToSave = uri;
      }

      await MediaLibrary.saveToLibraryAsync(uriToSave);
      // Alert.alert(t('success', 'Успешно'), t('saved_to_gallery', 'Сохранено в галерею!'));
      setMessageModalText(t('saved_to_gallery', 'Сохранено в галерею!'));
      setMessageModalType('success');
      setMessageModalVisible(true);
    } catch (e) {
      console.log(e);
      Alert.alert(t('error', 'Ошибка'), t('save_failed', 'Не удалось сохранить фото'));
    }
  };

  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
    const uri = item.thumbnailUri || item.uri;
    const isSelected = selectedIndexes.includes(index);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tile, { width: tileSize, height: tileSize }]}
        onPress={() => {
          !isMultiSelectMode && setSelectedIndex(index);
          isMultiSelectMode && toggleSelectIndex(index);
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
            <MaterialIcons name="insert-photo" size={28} color="#555" />
          </View>
        )}

        {isVideo(item) && (
          <View style={styles.playOverlay}>
            <MaterialIcons name="play-circle-outline" size={36} color="#fff" />
          </View>
        )}
        {isSelected && (
          <View style={styles.selectionOverlay} pointerEvents="none">
            <View style={styles.selectionBadge}>
              <Text style={styles.selectionText}>{selectedIndexes.indexOf(index) + 1}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFullScreenItem = ({ item, index }: { item: any; index: number }) => {
    const active = visibleIndex === index;

    if (isVideo(item)) {
      return (
          <View style={styles.fullscreenContainer}>
            <VideoPlayer 
              uri={item.uri} 
              poster={item.thumbnailUri} 
              isActive={active} 
              onControlsVisibilityChange={setShowHeader} 
            />
            {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
          </View>
      );
    }
    return (
      <View style={styles.fullscreenContainer}>
        <Image source={{ uri: item.uri }} style={styles.fullscreenMedia} resizeMode="contain" />
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

  if (!obj) return;
  
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Button onPress={() => router.back()} style={{width: 50, paddingHorizontal: 0}}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Button>
          <ScrollView><Text style={styles.title}>{obj?.name ?? 'Gallery'}</Text></ScrollView>
          <View style={styles.headerRight} />

          {isMultiSelectMode ? (
            <>
              <Button onPress={() => { setSelectedIndexes([]); setIsMultiSelectMode(false); setSelectedIndex(null);}} style={{ width: 70, paddingHorizontal: 0 }}>
                <Text style={styles.buttonText}>{t('common.cancel')}</Text>
              </Button>
              <Button onPress={() => setDeleteMediaModal(true)} style={{ width: 50, marginLeft: 8, paddingHorizontal: 0 }}>
                <MaterialIcons name="delete" size={22} color="#fff" />
              </Button>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => addMedia({ realm, obj })} style={{width: 50, paddingHorizontal: 0, left: 45}}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerRight} />
            </>
          )}
        </View>

        <FlatList
          ref={gridFlatRef}
          data={obj.media}
          extraData={obj.media?.length}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('gallery.empty_text')}</Text>
            </View>
          }
          removeClippedSubviews={true}
          windowSize={9}
        />

        <RNModal 
          visible={selectedIndex !== null} 
          onRequestClose={() => setSelectedIndex(null)} 
          animationType="fade" 
          statusBarTranslucent={true}
          >
          <StatusBar hidden={!showHeader} animated={true} />
          <View style={styles.modalSafe}>
            
          {showHeader && (
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedIndex(null)} style={styles.iconButtonWrapper}>
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
              data={media}
              horizontal
              pagingEnabled
              key={`fullscreen-${selectedIndex}`} 
              initialScrollIndex={selectedIndex} 
              keyExtractor={keyExtractor}
              renderItem={renderFullScreenItem}
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewRef.current}
              viewabilityConfig={viewConfigRef.current}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>{t('gallery.empty_text')}</Text>
                </View>
              }
            />
          </View>
        </RNModal>
        
        <WarnModal 
          visible={deleteMediaModal} 
          onClose={() => setDeleteMediaModal(false)} 
          title={t('common.deletion')} 
          leftOption={{
            label: t('common.cancel'),
            onPress: () => setDeleteMediaModal(false),
          }}
          rightOption={{
            label: t('common.delete'),
            onPress: () => {
              deleteSelectedMedia({
                realm, 
                obj,
                media, 
                selectedIndexes, 
                setSelectedIndexes, 
                setSelectedIndex, 
                setIsMultiSelectMode, 
                setVisibleIndex 
              })
            },
            destructive: true
          }}
        />
        <MiniToast
          visible={messageModalVisible} 
          onClose={() => setMessageModalVisible(false)} 
          message={messageModalText} 
          // type={messageModalType}
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
    borderRadius: 10,
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
});
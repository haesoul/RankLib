import { Ionicons } from '@expo/vector-icons';
import { useObject, useRealm } from '@realm/react';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BSON } from 'realm';

import Button from '@/components/UI/Buttons/Button';
import Input from '@/components/UI/Input/Input';
import CustomModal from '@/components/UI/Modal/Modal';
import WarnModal from '@/components/UI/Modal/WarnModal';
import PickImage from '@/components/UI/PickImage/PickImage';
import { Colors } from '@/CONSTANTS';
import { useTranslation } from 'react-i18next';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  background: '#09090b',
  surface: '#18181b',
  surfaceHighlight: '#27272a',
  primary: '#8b5cf6', 
  text: '#f4f4f5',
  textDim: '#a1a1aa',
  danger: '#ef4444',
  quote: '#71717a', 
};


interface NoteRealm {
  text: string;
  pinned: boolean;
  createdAt: Date;
  photoUri?: string | null;
  isValid: () => boolean;
}



const formatDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);


const NoteCard = React.memo(
  ({
    item,
    onPress,
  }: {
    item: NoteRealm;
    onPress: (note: NoteRealm) => void;
  }) => {
    const {t, i18n} = useTranslation()
    return (
      <Button
        style={[styles.card, item.pinned && styles.cardPinned ]}
        onPress={() => onPress(item)}
        // activeOpacity={0.9}
      >
        <Ionicons name="options" size={60} color={THEME.surfaceHighlight} style={styles.bgIcon} />

        <View style={styles.cardHeader}>
           <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formatDate(item.createdAt, i18n.language)}</Text>
           </View>
           {item.pinned && (
             <Ionicons name="bookmark" size={20} color={THEME.primary} />
           )}
        </View>

        <Text style={styles.quoteText} numberOfLines={4}>
          {item.text || '...'}
        </Text>
      </Button>
    );
  }
);


const GradeObjectNotesScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const realm = useRealm();
  
  const [selectedNote, setSelectedNote] = useState<NoteRealm | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  
  const [newText, setNewText] = useState('');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false)

  const {t, i18n} = useTranslation()

  const objectId = useMemo(() => {
    try { return id ? new BSON.ObjectId(id) : null; } catch { return null; }
  }, [id]);
  
  const gradeObject = useObject<any>('GradeObject', objectId);

  const notes = useMemo(() => {
    if (!gradeObject?.notes) return [];
    return gradeObject.notes.sorted('pinned', true).sorted('createdAt', true); 
  }, [gradeObject?.notes]);


  const handleCreate = () => {
    if (!realm || !gradeObject) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    realm.write(() => {
      gradeObject.notes.push({
        text: newText,
        photoUri: newPhoto,
        createdAt: new Date(),
        pinned: false,
      });
    });
    setNewText('');
    setNewPhoto(null);
    setIsCreateVisible(false);
  };

  const handleSaveEdit = () => {
    if (!selectedNote || !realm) return;
    
    realm.write(() => {
      selectedNote.text = editText;
      selectedNote.photoUri = editPhoto;
    });
    
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!selectedNote || !realm) return;

    setIsDetailVisible(false);
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      realm.write(() => {
          realm.delete(selectedNote);
      });
      setSelectedNote(null);
    }, 300);

  };

  const handleTogglePin = () => {
    if (!selectedNote || !realm) return;
    realm.write(() => {
      selectedNote.pinned = !selectedNote.pinned;
    });
  };

  const openDetail = (note: NoteRealm) => {
    setSelectedNote(note);
    setEditText(note.text);
    setEditPhoto(note.photoUri || null);
    setIsEditing(false);
    setIsDetailVisible(true);
  };

  if (!gradeObject) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
           title: '', 
           headerStyle: { backgroundColor: THEME.background },
           headerTintColor: THEME.text,
           headerShadowVisible: false,
        }} 
      />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{t('notes.notes')}</Text>
        <Text style={styles.headerSubtitle}>{gradeObject.name}</Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <NoteCard item={item} onPress={openDetail} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color={THEME.surfaceHighlight} />
            <Text style={styles.emptyText}>{t('notes.no_notes')}</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
         <Button onPress={() => setIsCreateVisible(true)} style={styles.iconBtn}>
            <Text style={{fontWeight: 'bold', fontSize: 16, color: '#fff'}}>{t('notes.creating')}</Text>
         </Button>
      </View>

      <CustomModal visible={isCreateVisible} onClose={() => setIsCreateVisible(false)}>
        <Text style={styles.modalTitle}>{t('notes.creating')}</Text>
        <PickImage photo={newPhoto} onChange={setNewPhoto} />
        <View style={{height: 16}} />
        <Input 
            value={newText} 
            onChangeText={setNewText} 
            multiline 
            style={{minHeight: 100}}
        />
        <View style={{height: 16}} />
        <Button onPress={handleCreate}>
           <Text style={styles.title}>{t('notes.create')}</Text>
        </Button>
      </CustomModal>

      <RNModal
        visible={isDetailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDetailVisible(false)}
      >
        <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setIsDetailVisible(false)} style={styles.iconBtn}>
                    <Ionicons name="chevron-down" size={28} color={THEME.text} />
                </TouchableOpacity>
                
                <View style={styles.detailActions}>
                    {!isEditing && (
                        <TouchableOpacity onPress={handleTogglePin} style={styles.iconBtn}>
                            <Ionicons 
                                name={selectedNote?.pinned ? "bookmark" : "bookmark-outline"} 
                                size={24} 
                                color={selectedNote?.pinned ? THEME.primary : THEME.text} 
                            />
                        </TouchableOpacity>
                    )}
                  
                    <TouchableOpacity 
                        onPress={() => {
                             if (isEditing) handleSaveEdit();
                             else setIsEditing(true);
                        }} 
                        style={[styles.iconBtn, isEditing && { backgroundColor: THEME.primary }]}
                    >
                        <Ionicons 
                            name={isEditing ? "checkmark" : "pencil"} 
                            size={22} 
                            color={isEditing ? "#FFF" : THEME.text} 
                        />
                    </TouchableOpacity>

                    {!isEditing && (
                        <TouchableOpacity onPress={() => setOpenDeleteModal(true)} style={[styles.iconBtn, { marginLeft: 8}]}>
                            <Ionicons name="trash-outline" size={24} color={THEME.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.detailScrollContent}>
                    {isEditing ? (
                        <View style={{ marginBottom: 20 }}>
                            <PickImage photo={editPhoto} onChange={setEditPhoto} />
                        </View>
                    ) : (
                        selectedNote?.photoUri && (
                            <Image 
                                source={{ uri: selectedNote.photoUri }} 
                                style={styles.detailImage} 
                                resizeMode="cover" 
                            />
                        )
                    )}

                    {!isEditing && selectedNote && (
                         <Text style={styles.detailDate}>{formatDate(selectedNote.createdAt, i18n.language)}</Text>
                    )}

                    {isEditing ? (
                         <Input
                            value={editText}
                            onChangeText={setEditText}
                            multiline
                            style={{ fontSize: 18, lineHeight: 28, minHeight: 200, textAlignVertical: 'top' }}
                         />
                    ) : (
                        <Text style={styles.detailText}>
                            {selectedNote?.text}
                        </Text>
                    )}
                    
                    <View style={{height: 100}} /> 
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      </RNModal>
      <WarnModal 
        visible={openDeleteModal} 
        onClose={() => setOpenDeleteModal(false)} 
        title={t('notes.delete_title')}
        message={t('notes.delete_message')}

        leftOption={{
          label: t('common.cancel'),
          onPress: () => setOpenDeleteModal(false),
        }}

        rightOption={{
          label: t('common.delete'),
          onPress: handleDelete,
          destructive: true,
        }}
        >

      </WarnModal>

    </SafeAreaView>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: '600'
  },
  headerSubtitle: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.surfaceHighlight,
  },
  cardPinned: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  bgIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.1,
    transform: [{rotate: '15deg'}]
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginRight: 180
  },
  dateBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  quoteText: {
    color: Colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  attachmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
     
  },
  readMore: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  detailContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  detailActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
  },
  iconBtn: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: Colors.surface,
  },
  detailScrollContent: {
      padding: 20,
  },
  detailImage: {
      width: '100%',
      height: 300,
      borderRadius: 16,
      marginBottom: 24,
      backgroundColor: Colors.surface,
  },
  detailDate: {
      color: Colors.primary,
      fontWeight: 'bold',
      marginBottom: 12,
      opacity: 0.8
  },
  detailText: {
      color: THEME.text,
      fontSize: 20,
      lineHeight: 32,
      fontWeight: '400',
      alignItems: 'center'
  },

  // Misc
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 80,
      opacity: 0.5
  },
  emptyText: {
      color: Colors.textSecondary,
      fontSize: 16,
      marginTop: 16,
      fontWeight: '500'
  },
  fabContainer: {
      position: 'absolute',
      bottom: 30,
      left: 20, 
      right: 20,

  },
  modalTitle: {
      color: Colors.text,
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 20, 
      textAlign: 'center',
      
  },
    title: {
    fontSize: 20, 
    fontWeight: "400",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
});

export default GradeObjectNotesScreen;
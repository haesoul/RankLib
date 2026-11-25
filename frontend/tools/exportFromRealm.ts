/**
 * ИСПРАВЛЕННАЯ СИНХРОНИЗАЦИЯ REALM → DJANGO
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. MediaItem/Note: передаем стабильные ID отдельных серверных записей
 * 2. Фото и миниатюры обновляют нужные поля существующей записи
 * 3. Proof: передаем правильные ID CategoryOfObject/SubCategoryOfObject
 * 4. Правильные MIME типы для всех файлов
 * 5. Подсчет размера файлов
 */

import { API_URL } from "@/CONSTANTS";
import { api, getAuthHeaders, refreshToken } from "@/services/API/auth";
import * as FileSystem from "expo-file-system";
import { Realm } from "realm";
import { Platform } from "react-native";

interface SyncResult {
  success: boolean;
  message?: string;
  stats?: {
    total_items: number;
    created_items: number;
    updated_items: number;
    files_uploaded: number;
    total_size_mb: number;
  };
}

interface ProgressCallback {
  (phase: string, current: number, total: number): void;
}

interface FileUploadTask {
  uri: string;
  /** ID of the target row: MediaItem/Note ID for embedded records, otherwise model ID. */
  objectId: string;
  modelName: string;
  fieldName: string;
  mediaType?: string;
  mimeType?: string;
  caption?: string;
}

// ===== БЕЗОПАСНЫЕ ХЕЛПЕРЫ =====

function safeList<T>(list: any): T[] {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  try {
    return Array.from(list);
  } catch {
    return [];
  }
}

function safeId(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj._id && typeof obj._id.toHexString === 'function') {
    return obj._id.toHexString();
  }
  if (obj._id) return String(obj._id);
  return null;
}

function isLocalFile(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^(file|content|ph|assets-library):\/\//i.test(uri) || uri.includes('DocumentDirectory');
}

function stableEmbeddedId(parentId: string, kind: string, index: number): string {
  const value = `${parentId}:${kind}:${index}`;
  const hash32 = (seed: number) => {
    let hash = seed >>> 0;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  };
  return hash32(0x811c9dc5) + hash32(0x9e3779b9) + hash32(0x85ebca6b);
}

function getMimeType(uri: string): string {
  const cleanUri = uri.split(/[?#]/, 1)[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'm4v': 'video/x-m4v',
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

// ===== ФАЗА 1: ЭКСПОРТ МЕТАДАННЫХ (БЕЗ ФАЙЛОВ) =====

async function exportMetadata(
  realm: Realm,
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log('=== ФАЗА 1: ЭКСПОРТ МЕТАДАННЫХ ===');
    
    const classes = realm.objects('ClassOfGrading');
    const allTags = realm.objects('Tag');
    const allRankTypes = realm.objects('RankType');

    // Embedded Realm records do not have primary keys. Persist a stable cloud ID
    // so reordering media/notes on the server never changes their identity.
    realm.write(() => {
      for (const cls of safeList(classes)) {
        for (const obj of safeList((cls as any).objects)) {
          const objectId = safeId(obj);
          if (!objectId) continue;
          safeList((obj as any).media).forEach((media: any, index: number) => {
            if (!/^[a-f0-9]{24}$/i.test(media.syncId || '')) media.syncId = stableEmbeddedId(objectId, 'media', index);
          });
          safeList((obj as any).notes).forEach((note: any, index: number) => {
            if (!/^[a-f0-9]{24}$/i.test(note.syncId || '')) note.syncId = stableEmbeddedId(objectId, 'note', index);
          });
        }
      }
    });

    console.log(`Found ${classes.length} classes`);
    console.log(`Found ${allTags.length} tags`);
    console.log(`Found ${allRankTypes.length} rank types`);
    
    // Экспорт тегов
    const tagsData = safeList(allTags).map((tag: any) => ({
      _id: safeId(tag) || '',
      name: tag.name || '',
      parentTag: tag.parentTag ? safeId(tag.parentTag) : null,
      createdAt: tag.createdAt?.toISOString() || new Date().toISOString(),
    }));
    
    // Экспорт типов рангов
    const rankTypesData = safeList(allRankTypes).map((rt: any) => ({
      _id: safeId(rt) || '',
      name: rt.name || '',
      fromRank: rt.fromRank != null ? rt.fromRank : 0.0,
      color: rt.color || '#000000',
      createdAt: rt.createdAt?.toISOString() || new Date().toISOString(),
    }));
    
    // Экспорт классов БЕЗ файлов
    const classesData = safeList(classes).map((cls: any, index: number) => {
      if (onProgress) {
        onProgress('metadata', index + 1, classes.length);
      }
      
      return {
        _id: safeId(cls) || '',
        name: cls.name || '',
        photo: isLocalFile(cls.photo) ? null : cls.photo,
        priority: cls.priority != null ? cls.priority : 1,
        objectName: cls.objectName || 'Object',
        objectsName: cls.objectsName || 'Objects',
        noteName: cls.noteName || 'Note',
        notesName: cls.notesName || 'Notes',
        
        // Категории
        categories: safeList(cls.categories).map((cat: any) => ({
          _id: safeId(cat) || '',
          name: cat.name || '',
          priority: cat.priority != null ? cat.priority : 1,
          weight: cat.weight != null ? Math.trunc(cat.weight) : 1,
          subcategories: safeList(cat.subcategories).map((sub: any) => ({
            _id: safeId(sub) || '',
            name: sub.name || '',
            priority: sub.priority != null ? sub.priority : 1,
            weight: sub.weight != null ? Math.trunc(sub.weight) : 1,
          })),
        })),
        
        // Объекты
        objects: safeList(cls.objects).map((obj: any) => ({
          _id: safeId(obj) || '',
          name: obj.name || '',
          photo: isLocalFile(obj.photo) ? null : obj.photo,
          object_name: obj.object_name || '',
          note_name: obj.note_name || '',
          galery_name: obj.galery_name || '',
          description: obj.description || '',
          overall_rank: obj.overall_rank,
          
          // Теги объекта
          tags: safeList(obj.tags).map((tag: any) => ({
            _id: safeId(tag) || '',
          })),
          
          // Embedded Realm records get stable IDs on the server side.
          media: safeList(obj.media).map((media: any, mediaIndex: number) => ({
            _id: media.syncId || stableEmbeddedId(safeId(obj) || '', 'media', mediaIndex),
            uri: isLocalFile(media.uri) ? null : media.uri || null,
            mediaType: media.mediaType || 'photo',
            mimeType: media.mimeType || null,
            thumbnailUri: isLocalFile(media.thumbnailUri) ? null : media.thumbnailUri || null,
            caption: media.caption || '',
            length: media.length ?? null,
            isFavorite: !!media.isFavorite,
            isHighlighted: !!media.isHighlighted,
            createdAt: media.createdAt?.toISOString?.() || new Date().toISOString(),
          })),

          notes: safeList(obj.notes).map((note: any, noteIndex: number) => ({
            _id: note.syncId || stableEmbeddedId(safeId(obj) || '', 'note', noteIndex),
            text: note.text || '',
            author: note.author || '',
            pinned: !!note.pinned,
            photoUri: isLocalFile(note.photoUri) ? null : note.photoUri || null,
            createdAt: note.createdAt?.toISOString?.() || new Date().toISOString(),
          })),

          // Рейтинги категорий БЕЗ доказательств
          categories_of_object: safeList(obj.categories_of_object).map((rating: any) => ({
            _id: safeId(rating) || '',
            category: { _id: safeId(rating.category) || '' },
            rank: rating.rank,
            proof: rating.proof
              ? {
                  image: isLocalFile(rating.proof.image) ? null : rating.proof.image || null,
                  text: rating.proof.text || '',
                }
              : null,
            subcategories_of_category: safeList(rating.subcategories_of_category).map(
              (subrating: any) => ({
                _id: safeId(subrating) || '',
                subcategory: { _id: safeId(subrating.subcategory) || '' },
                rank: subrating.rank,
                color: subrating.color || null,
                proof: subrating.proof
                  ? {
                      image: isLocalFile(subrating.proof.image) ? null : subrating.proof.image || null,
                      text: subrating.proof.text || '',
                    }
                  : null,
              })
            ),
          })),
        })),
        
        // Связи с тегами и типами рангов
        tags: safeList(cls.tags).map((tag: any) => ({
          _id: safeId(tag) || '',
        })),
        rankTypes: safeList(cls.rankTypes).map((rt: any) => ({
          _id: safeId(rt) || '',
        })),
      };
    });
    
    return {
      success: true,
      data: {
        ClassOfGrading: classesData,
        Tag: tagsData,
        RankType: rankTypesData,
      },
    };
  } catch (error: any) {
    console.error('Metadata export error:', error);
    return {
      success: false,
      error: error.message || 'Unknown metadata export error',
    };
  }
}

// ===== ФАЗА 2: СКАНИРОВАНИЕ ФАЙЛОВ =====

async function scanLocalFiles(
  realm: Realm,
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  files?: FileUploadTask[];
  totalSize?: number;
  error?: string;
}> {
  try {
    console.log('=== ФАЗА 2: СКАНИРОВАНИЕ ФАЙЛОВ ===');
    
    const files: FileUploadTask[] = [];
    const classes = realm.objects('ClassOfGrading');
    let totalSize = 0;
    
    for (const cls of safeList(classes)) {
      const c: any = cls;
      const classId = safeId(c);
      
      // Фото класса
      if (isLocalFile(c.photo) && classId) {
        const fileInfo = await FileSystem.getInfoAsync(c.photo);
        if (!fileInfo.exists) throw new Error(`Class photo is missing: ${c.photo}`);
        files.push({
            uri: c.photo,
            objectId: classId,
            modelName: 'ClassOfGrading',
            fieldName: 'photo',
        });
        totalSize += (fileInfo.size || 0);
      }
      
      // Объекты
      for (const obj of safeList(c.objects)) {
        const o: any = obj;
        const objId = safeId(o);
        
        if (!objId) continue;
        
        // Фото объекта
        if (isLocalFile(o.photo)) {
          const fileInfo = await FileSystem.getInfoAsync(o.photo);
          if (!fileInfo.exists) throw new Error(`Object photo is missing: ${o.photo}`);
          files.push({
              uri: o.photo,
              objectId: objId,
              modelName: 'GradeObject',
              fieldName: 'photo',
          });
          totalSize += (fileInfo.size || 0);
        }
        
        // MediaItem: use the stable MediaItem ID, not the parent GradeObject ID.
        const mediaItems = safeList(o.media);
        for (let mediaIndex = 0; mediaIndex < mediaItems.length; mediaIndex++) {
          const m: any = mediaItems[mediaIndex];
          const mediaId = m.syncId || stableEmbeddedId(objId, 'media', mediaIndex);

          if (isLocalFile(m.uri)) {
            const fileInfo = await FileSystem.getInfoAsync(m.uri);
            if (!fileInfo.exists) throw new Error(`Media file is missing: ${m.uri}`);
            const mimeType = m.mimeType || getMimeType(m.uri);
              files.push({
                uri: m.uri,
                objectId: mediaId,
                modelName: 'MediaItem',
                fieldName: 'uri',
                mediaType: m.mediaType || (mimeType.startsWith('video/') ? 'video' : 'photo'),
                mimeType,
                caption: m.caption || '',
            });
            totalSize += fileInfo.size || 0;
          }

          if (isLocalFile(m.thumbnailUri)) {
            const fileInfo = await FileSystem.getInfoAsync(m.thumbnailUri);
            if (!fileInfo.exists) throw new Error(`Media thumbnail is missing: ${m.thumbnailUri}`);
            files.push({
                uri: m.thumbnailUri,
                objectId: mediaId,
                modelName: 'MediaItem',
                fieldName: 'thumbnailUri',
                mediaType: 'photo',
                mimeType: getMimeType(m.thumbnailUri),
                caption: m.caption || '',
            });
            totalSize += fileInfo.size || 0;
          }
        }

        // Note photo updates the existing Note row identified by the same stable ID.
        const notes = safeList(o.notes);
        for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
          const n: any = notes[noteIndex];
          if (isLocalFile(n.photoUri)) {
            const fileInfo = await FileSystem.getInfoAsync(n.photoUri);
            if (!fileInfo.exists) throw new Error(`Note photo is missing: ${n.photoUri}`);
            files.push({
                uri: n.photoUri,
                objectId: n.syncId || stableEmbeddedId(objId, 'note', noteIndex),
                modelName: 'Note',
                fieldName: 'photoUri',
            });
            totalSize += fileInfo.size || 0;
          }
        }

        // Proof images - CategoryOfObject
        for (const rating of safeList(o.categories_of_object)) {
          const r: any = rating;
          const ratingId = safeId(r);
          
          if (r.proof && isLocalFile(r.proof.image) && ratingId) {
            const fileInfo = await FileSystem.getInfoAsync(r.proof.image);
            if (!fileInfo.exists) throw new Error(`Rating proof is missing: ${r.proof.image}`);
            files.push({
                uri: r.proof.image,
                objectId: ratingId, // ID CategoryOfObject
                modelName: 'CategoryOfObject',
                fieldName: 'proof_image',
            });
            totalSize += (fileInfo.size || 0);
          }
          
          // Proof images - SubCategoryOfObject
          for (const subrating of safeList(r.subcategories_of_category)) {
            const sr: any = subrating;
            const subratingId = safeId(sr);
            
            if (sr.proof && isLocalFile(sr.proof.image) && subratingId) {
              const fileInfo = await FileSystem.getInfoAsync(sr.proof.image);
              if (!fileInfo.exists) throw new Error(`Subrating proof is missing: ${sr.proof.image}`);
              files.push({
                  uri: sr.proof.image,
                  objectId: subratingId, // ID SubCategoryOfObject
                  modelName: 'SubCategoryOfObject',
                  fieldName: 'proof_image',
              });
              totalSize += (fileInfo.size || 0);
            }
          }
        }
      }
    }
    
    console.log(`Found ${files.length} files to upload (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    
    return {
      success: true,
      files,
      totalSize,
    };
  } catch (error: any) {
    console.error('File scanning error:', error);
    return {
      success: false,
      error: error.message || 'Unknown file scanning error',
    };
  }
}

// ===== ФАЗА 3: ОТПРАВКА МЕТАДАННЫХ =====

async function sendMetadata(
  data: any,
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  message?: string;
  stats?: any;
}> {
  try {
    console.log('=== ФАЗА 3: ОТПРАВКА МЕТАДАННЫХ ===');
    
    if (onProgress) {
      onProgress('upload_metadata', 0, 1);
    }
    
    const response = await api.post('api/integration/sync/import/', {
      data,
      merge: true,
      validate_only: false,
    });
    
    if (onProgress) {
      onProgress('upload_metadata', 1, 1);
    }
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Server returned error');
    }
    
    console.log('✅ Metadata uploaded successfully');
    
    return {
      success: true,
      message: response.data.message,
      stats: response.data.stats,
    };
  } catch (error: any) {
    console.error('Metadata upload error:', error);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    return {
      success: false,
      message: error.message || 'Unknown upload error',
    };
  }
}

// ===== ФАЗА 4: ПОСЛЕДОВАТЕЛЬНАЯ ЗАГРУЗКА ФАЙЛОВ =====

async function uploadFilesSequentially(
  files: FileUploadTask[],
  _authToken: string,
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  totalSize: number;
  errors?: string[];
}> {
  console.log(`=== ФАЗА 4: ФОНОВАЯ ЗАГРУЗКА ${files.length} ФАЙЛОВ ===`);

  let uploaded = 0;
  let failed = 0;
  let totalSize = 0;
  const errors: string[] = [];
  // Read the current token for every sync run. The Profile screen may hold an
  // older token after the axios interceptor silently refreshed it.
  const storedAuthHeaders = await getAuthHeaders();
  let authorization = storedAuthHeaders.Authorization;
  if (!authorization) {
    return { success: false, uploaded: 0, failed: files.length, totalSize: 0, errors: ['No active access token'] };
  }
  const uploadUrl = `${API_URL.replace(/\/+$/, '')}/api/integration/sync/upload-file/`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        throw new Error(`File not found: ${file.uri}`);
      }

      const filename = file.uri.split(/[/?#]/).filter(Boolean).pop() || 'upload.bin';
      const mimeType = file.mimeType || getMimeType(file.uri);
      let lastError: Error | null = null;
      let completed = false;
      for (let attempt = 0; attempt < 3 && !completed; attempt++) {
        try {
          const response = await FileSystem.uploadAsync(uploadUrl, file.uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            ...(Platform.OS === 'ios'
              ? { sessionType: FileSystem.FileSystemSessionType.BACKGROUND }
              : {}),
            fieldName: 'file',
            mimeType,
            headers: {
              Authorization: authorization,
              'ngrok-skip-browser-warning': '69420',
            },
            parameters: {
              object_id: file.objectId,
              model_name: file.modelName,
              field_name: file.fieldName,
              media_type: file.mediaType || 'photo',
              mime_type: mimeType,
              caption: file.caption || '',
              filename,
            },
          });

          let body: any = {};
          try { body = response.body ? JSON.parse(response.body) : {}; } catch { /* response may be empty */ }
          if (response.status === 401 && attempt < 2) {
            const refreshedAccess = await refreshToken();
            authorization = `Bearer ${refreshedAccess}`;
            continue;
          }
          if (response.status < 200 || response.status >= 300 || body.success !== true) {
            throw new Error(body.error || body.message || `Upload endpoint returned an invalid response (HTTP ${response.status})`);
          }
          completed = true;
        } catch (attemptError: any) {
          lastError = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        }
      }
      if (!completed) throw lastError || new Error('Upload failed');

      uploaded++;
      totalSize += fileInfo.size || 0;
      console.log(`✅ Uploaded ${i + 1}/${files.length}: ${filename}`);
    } catch (error: any) {
      failed++;
      const errorMsg = `Failed to upload ${file.uri}: ${error?.message || String(error)}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    } finally {
      onProgress?.('upload_files', i + 1, files.length);
    }
  }

  return {
    success: failed === 0,
    uploaded,
    failed,
    totalSize,
    errors: errors.length ? errors : undefined,
  };
}

// ===== ГЛАВНАЯ ФУНКЦИЯ ЭКСПОРТА =====

export async function exportRealmToServer(
  realm: Realm,
  authToken: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  try {
    console.log('=== НАЧАЛО ЭКСПОРТА ===');
    
    // ФАЗА 1: Экспорт метаданных
    console.log('\n[1/4] Экспорт метаданных...');
    const metadataResult = await exportMetadata(realm, onProgress);
    
    if (!metadataResult.success) {
      return {
        success: false,
        message: `Metadata export failed: ${metadataResult.error}`,
      };
    }
    
    // ФАЗА 2: Сканирование файлов
    console.log('\n[2/4] Сканирование файлов...');
    const filesResult = await scanLocalFiles(realm, onProgress);
    
    if (!filesResult.success) {
      return {
        success: false,
        message: `File scanning failed: ${filesResult.error}`,
      };
    }
    
    // ФАЗА 3: Отправка метаданных
    console.log('\n[3/4] Отправка метаданных на сервер...');
    const uploadMetadataResult = await sendMetadata(metadataResult.data, onProgress);
    
    if (!uploadMetadataResult.success) {
      return {
        success: false,
        message: `Metadata upload failed: ${uploadMetadataResult.message}`,
      };
    }
    
    // ФАЗА 4: Загрузка файлов
    console.log('\n[4/4] Загрузка файлов...');
    const uploadFilesResult = await uploadFilesSequentially(
      filesResult.files || [],
      authToken,
      onProgress
    );
    
    // Финальная статистика
    const finalStats = {
      total_items: uploadMetadataResult.stats?.total_items || 0,
      created_items: uploadMetadataResult.stats?.created_items || 0,
      updated_items: uploadMetadataResult.stats?.updated_items || 0,
      files_uploaded: uploadFilesResult.uploaded,
      total_size_mb: parseFloat((uploadFilesResult.totalSize / 1024 / 1024).toFixed(2)),
    };
    
    if (uploadFilesResult.failed > 0) {
      console.warn(`⚠️ ${uploadFilesResult.failed} files failed to upload`);
      return {
        success: false,
        message: `Metadata synced, but ${uploadFilesResult.failed} file upload(s) failed. Retry the sync to upload them.`,
        stats: finalStats,
      };
    }
    
    console.log('✅ ЭКСПОРТ ЗАВЕРШЕН УСПЕШНО');
    
    return {
      success: true,
      message: 'Синхронизация завершена успешно',
      stats: finalStats,
    };
  } catch (error: any) {
    console.error('=== ОШИБКА ЭКСПОРТА ===', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

export async function performFullSyncWithProgress(
  realm: Realm,
  authToken: string,
  onProgress?: (phase: string, current: number, total: number, percentage: number) => void
) {
  console.log('🔄 Starting full sync with progress...');
  
  const progressCallback: ProgressCallback = (phase, current, total) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    console.log(`[${phase}] ${current}/${total} (${percentage}%)`);
    
    if (onProgress) {
      onProgress(phase, current, total, percentage);
    }
  };
  
  const result = await exportRealmToServer(realm, authToken, progressCallback);
  
  if (!result.success) {
    console.error('❌ Sync failed:', result.message);
    return {
      success: false,
      error: result.message,
    };
  }
  
  console.log('✅ Sync successful:', result.stats);
  
  return {
    success: true,
    stats: result.stats,
  };
}

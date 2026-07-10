/**
 * ИСПРАВЛЕННАЯ СИНХРОНИЗАЦИЯ REALM → DJANGO
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. MediaItem: передаем ID GradeObject вместо несуществующего ID MediaItem
 * 2. Note: передаем ID GradeObject для создания заметок с фото
 * 3. Proof: передаем правильные ID CategoryOfObject/SubCategoryOfObject
 * 4. Правильные MIME типы для всех файлов
 * 5. Подсчет размера файлов
 */

import { api } from "@/services/API/auth";
import * as FileSystem from "expo-file-system";
import { Realm } from "realm";

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
  return uri.includes('file://') || uri.includes('DocumentDirectory');
}

function getMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
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
        priority: cls.priority != null ? cls.priority : 0,
        objectName: cls.objectName || 'Object',
        objectsName: cls.objectsName || 'Objects',
        noteName: cls.noteName || 'Note',
        notesName: cls.notesName || 'Notes',
        
        // Категории
        categories: safeList(cls.categories).map((cat: any) => ({
          _id: safeId(cat) || '',
          name: cat.name || '',
          priority: cat.priority != null ? cat.priority : 0,
          weight: cat.weight != null ? cat.weight : 1.0,
          subcategories: safeList(cat.subcategories).map((sub: any) => ({
            _id: safeId(sub) || '',
            name: sub.name || '',
            priority: sub.priority != null ? sub.priority : 0,
            weight: sub.weight != null ? sub.weight : 1.0,
          })),
        })),
        
        // Объекты
        objects: safeList(cls.objects).map((obj: any) => ({
          _id: safeId(obj) || '',
          name: obj.name || '',
          photo: isLocalFile(obj.photo) ? null : obj.photo,
          object_name: obj.object_name || '',
          description: obj.description || '',
          overall_rank: obj.overall_rank,
          
          // Теги объекта
          tags: safeList(obj.tags).map((tag: any) => ({
            _id: safeId(tag) || '',
          })),
          
          // Медиа - ПУСТОЙ массив (загрузим отдельно)
          media: [],
          
          // Заметки БЕЗ фото
          notes: safeList(obj.notes).map((note: any) => ({
            text: note.text || '',
            author: note.author || '',
            pinned: note.pinned || false,
            photoUri: isLocalFile(note.photoUri) ? null : note.photoUri,
            createdAt: note.createdAt?.toISOString() || new Date().toISOString(),
          })),
          
          // Рейтинги категорий БЕЗ доказательств
          categories_of_object: safeList(obj.categories_of_object).map((rating: any) => ({
            _id: safeId(rating) || '',
            category: { _id: safeId(rating.category) || '' },
            rank: rating.rank,
            proof: rating.proof && !isLocalFile(rating.proof.image)
              ? {
                  image: rating.proof.image,
                  text: rating.proof.text || '',
                }
              : null,
            subcategories_of_category: safeList(rating.subcategories_of_category).map(
              (subrating: any) => ({
                _id: safeId(subrating) || '',
                subcategory: { _id: safeId(subrating.subcategory) || '' },
                rank: subrating.rank,
                color: subrating.color || null,
                proof: subrating.proof && !isLocalFile(subrating.proof.image)
                  ? {
                      image: subrating.proof.image,
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
        if (fileInfo.exists) {
          files.push({
            uri: c.photo,
            objectId: classId,
            modelName: 'ClassOfGrading',
            fieldName: 'photo',
          });
          totalSize += (fileInfo.size || 0);
        }
      }
      
      // Объекты
      for (const obj of safeList(c.objects)) {
        const o: any = obj;
        const objId = safeId(o);
        
        if (!objId) continue;
        
        // Фото объекта
        if (isLocalFile(o.photo)) {
          const fileInfo = await FileSystem.getInfoAsync(o.photo);
          if (fileInfo.exists) {
            files.push({
              uri: o.photo,
              objectId: objId,
              modelName: 'GradeObject',
              fieldName: 'photo',
            });
            totalSize += (fileInfo.size || 0);
          }
        }
        
        // MediaItem - ИСПРАВЛЕНО: передаем ID GradeObject!
        for (const media of safeList(o.media)) {
          const m: any = media;
          
          // URI медиа
          if (isLocalFile(m.uri)) {
            const fileInfo = await FileSystem.getInfoAsync(m.uri);
            if (fileInfo.exists) {
              const mimeType = getMimeType(m.uri);
              const mediaType = mimeType.startsWith('video/') ? 'video' : 'photo';
              
              files.push({
                uri: m.uri,
                objectId: objId, // ID GradeObject, а не MediaItem!
                modelName: 'MediaItem',
                fieldName: 'uri',
                mediaType: mediaType,
                mimeType: mimeType,
                caption: m.caption || '',
              });
              totalSize += (fileInfo.size || 0);
            }
          }
          
          // Thumbnail URI
          if (isLocalFile(m.thumbnailUri)) {
            const fileInfo = await FileSystem.getInfoAsync(m.thumbnailUri);
            if (fileInfo.exists) {
              files.push({
                uri: m.thumbnailUri,
                objectId: objId, // ID GradeObject!
                modelName: 'MediaItem',
                fieldName: 'thumbnailUri',
                mediaType: 'photo',
                mimeType: 'image/jpeg',
              });
              totalSize += (fileInfo.size || 0);
            }
          }
        }
        
        // Заметки с фото - ИСПРАВЛЕНО: передаем ID GradeObject!
        for (const note of safeList(o.notes)) {
          const n: any = note;
          
          if (isLocalFile(n.photoUri)) {
            const fileInfo = await FileSystem.getInfoAsync(n.photoUri);
            if (fileInfo.exists) {
              files.push({
                uri: n.photoUri,
                objectId: objId, // ID GradeObject!
                modelName: 'Note',
                fieldName: 'photoUri',
              });
              totalSize += (fileInfo.size || 0);
            }
          }
        }
        
        // Proof images - CategoryOfObject
        for (const rating of safeList(o.categories_of_object)) {
          const r: any = rating;
          const ratingId = safeId(r);
          
          if (r.proof && isLocalFile(r.proof.image) && ratingId) {
            const fileInfo = await FileSystem.getInfoAsync(r.proof.image);
            if (fileInfo.exists) {
              files.push({
                uri: r.proof.image,
                objectId: ratingId, // ID CategoryOfObject
                modelName: 'CategoryOfObject',
                fieldName: 'proof_image',
              });
              totalSize += (fileInfo.size || 0);
            }
          }
          
          // Proof images - SubCategoryOfObject
          for (const subrating of safeList(r.subcategories_of_category)) {
            const sr: any = subrating;
            const subratingId = safeId(sr);
            
            if (sr.proof && isLocalFile(sr.proof.image) && subratingId) {
              const fileInfo = await FileSystem.getInfoAsync(sr.proof.image);
              if (fileInfo.exists) {
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
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  totalSize: number;
  errors?: string[];
}> {
  try {
    console.log(`=== ФАЗА 4: ЗАГРУЗКА ${files.length} ФАЙЛОВ ===`);
    
    let uploaded = 0;
    let failed = 0;
    let totalSize = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Проверка существования файла
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          console.warn(`File not found: ${file.uri}`);
          failed++;
          errors.push(`File not found: ${file.uri}`);
          continue;
        }
        
        // Подготовка FormData
        const formData = new FormData();
        
        const filename = file.uri.split('/').pop() || 'file.bin';
        const mimeType = file.mimeType || getMimeType(file.uri);
        
        formData.append('file', {
          uri: file.uri,
          name: filename,
          type: mimeType,
        } as any);
        
        formData.append('object_id', file.objectId);
        formData.append('model_name', file.modelName);
        formData.append('field_name', file.fieldName);
        
        // Дополнительные параметры для MediaItem
        if (file.modelName === 'MediaItem') {
          if (file.mediaType) {
            formData.append('media_type', file.mediaType);
          }
          if (file.mimeType) {
            formData.append('mime_type', file.mimeType);
          }
          if (file.caption) {
            formData.append('caption', file.caption);
          }
        }
        
        // Отправка файла
        await api.post('api/integration/sync/upload-file/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data, headers) => {
            // Не позволяем Axios обрабатывать FormData
            return data;
          },
        });
        
        uploaded++;
        totalSize += (fileInfo.size || 0);
        
        if (onProgress) {
          onProgress('upload_files', i + 1, files.length);
        }
        
        console.log(`✅ Uploaded ${i + 1}/${files.length}: ${filename}`);
      } catch (error: any) {
        failed++;
        const errorMsg = `Failed to upload ${file.uri}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        
        // Не прерываем процесс при ошибке одного файла
        if (onProgress) {
          onProgress('upload_files', i + 1, files.length);
        }
      }
    }
    
    console.log(`\n✅ File upload completed: ${uploaded} uploaded, ${failed} failed`);
    if (failed > 0) {
      console.warn(`⚠️ ${failed} files failed to upload`);
    }
    
    return {
      success: failed === 0,
      uploaded,
      failed,
      totalSize,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    return {
      success: false,
      uploaded: 0,
      failed: files.length,
      totalSize: 0,
      errors: [error.message],
    };
  }
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
        success: true, // Частичный успех
        message: `Sync completed with ${uploadFilesResult.failed} file upload errors`,
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

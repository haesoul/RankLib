import { API_URL } from '@/CONSTANTS';
import axios, { AxiosResponse } from 'axios';

// ==============================================================================
// TYPES & INTERFACES (Based on serializers.py & models.ts)
// ==============================================================================

/**
 * Основная структура данных Realm для синхронизации.
 * Ключи соответствуют именам моделей в RealEventDataSerializer.
 */
export interface RealmDataPayload {
  ClassOfGrading?: any[];
  Category?: any[];
  SubCategory?: any[];
  GradeObject?: any[];
  CategoryOfObject?: any[];
  SubCategoryOfObject?: any[];
  MediaItem?: any[];
  Note?: any[];
  Proof?: any[];
  Tag?: any[];
  RankType?: any[];
  ObjectTag?: any[];
  ClassTag?: any[];
  ClassRankType?: any[];
}

/**
 * Карта файлов для отправки: { objectId: base64String }
 */
export interface FileUploadMap {
  [objectId: string]: string;
}

// --- Request Interfaces ---

export interface ExportRequestParams {
  include_media?: boolean;
  include_notes?: boolean;
  include_proofs?: boolean;
  download_files?: boolean;
}

export interface ImportRequestBody {
  data: RealmDataPayload;
  files?: FileUploadMap; // Файлы из FS в base64
  merge?: boolean;
  validate_only?: boolean;
}

export interface ValidateRequestBody {
  data: RealmDataPayload;
}

export interface BulkExportRequestBody {
  object_ids?: string[];
  category_ids?: string[];
  class_ids?: string[];
  with_relationships?: boolean;
  download_files?: boolean;
}

// --- Response Interfaces ---

export interface SyncStatusResponse {
  success: boolean;
  status: {
    last_sync_at: string | null;
    sync_enabled: boolean;
    pending_changes: number;
  };
  statistics: {
    total_classes: number;
    total_objects: number;
    total_categories: number;
    total_ratings: number;
  };
  timestamp: string;
}

export interface ExportResponse {
  success: boolean;
  data: RealmDataPayload; // Данные для записи в Realm
  timestamp: string;
  size_bytes: number;
  files_included: boolean;
}

export interface ImportResponse {
  success: boolean;
  message: string;
  stats?: {
    total_items: number;
    created_items: number;
    updated_items: number;
    files_uploaded: number;
    errors: string[];
  };
  validation?: ValidationReport;
  timestamp: string;
}

export interface ValidationReport {
  is_valid: boolean;
  total_records: number;
  valid_records: number;
  errors: Array<{ type: string; id: string; message: string }>;
  warnings: string[];
}

export interface CheckpointData {
  workspace_id: string;
  total_classes: number;
  total_objects: number;
  total_categories: number;
  total_ratings: number;
  data_size_bytes: number;
  created_at: string;
}

export interface CheckpointResponse {
  success: boolean;
  checkpoint?: CheckpointData; // Для POST запроса
  // Для GET запроса данные приходят напрямую, поэтому нужен Union или обработка
}

// ==============================================================================
// API SERVICE
// ==============================================================================

/**
 * Конфигурация заголовков.
 * Если используется токен авторизации, его нужно добавлять через интерцептор или здесь.
 */
const getHeaders = async () => {
  // Пример получения токена (адаптируйте под вашу логику хранения токена)
  // const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    // 'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const IntegrationAPI = {
  /**
   * 1. ЭКСПОРТ ДАННЫХ (из Django в Realm)
   * POST /api/sync/export/
   */
  exportData: async (params: ExportRequestParams = {}): Promise<ExportResponse> => {
    const headers = await getHeaders();
    // Django View ожидает параметры в query string, но метод POST
    // DRF @action(detail=False) обычно работает с POST/GET, в urls.py endpoint настроен.
    // В views.py: @action(detail=False, methods=['post'], url_path='export')
    // Параметры читаются из request.query_params
    
    const response = await axios.post<ExportResponse>(
      `${API_URL}api/sync/export/`,
      {}, // Пустое тело
      { 
        headers, 
        params: params // Axios автоматически добавит их в URL query string
      }
    );
    return response.data;
  },

  /**
   * 2. ИМПОРТ ДАННЫХ (из Realm в Django)
   * POST /api/sync/import/
   */
  importData: async (body: ImportRequestBody): Promise<ImportResponse> => {
    const headers = await getHeaders();
    const response = await axios.post<ImportResponse>(
      `${API_URL}api/sync/import/`,
      body,
      { headers }
    );
    return response.data;
  },

  /**
   * 3. СТАТУС СИНХРОНИЗАЦИИ
   * GET /api/sync/status/
   */
  getSyncStatus: async (): Promise<SyncStatusResponse> => {
    const headers = await getHeaders();
    const response = await axios.get<SyncStatusResponse>(
      `${API_URL}api/sync/status/`,
      { headers }
    );
    return response.data;
  },

  /**
   * 4. ВАЛИДАЦИЯ ДАННЫХ
   * POST /api/sync/validate/
   */
  validateData: async (data: RealmDataPayload): Promise<ValidationReport> => {
    const headers = await getHeaders();
    const response = await axios.post<ValidationReport>(
      `${API_URL}api/sync/validate/`,
      { data },
      { headers }
    );
    return response.data;
  },

  /**
   * 5. МАССОВЫЙ ЭКСПОРТ
   * POST /api/sync/bulk-export/
   */
  bulkExport: async (body: BulkExportRequestBody): Promise<ExportResponse> => {
    const headers = await getHeaders();
    const response = await axios.post<ExportResponse>(
      `${API_URL}api/sync/bulk-export/`,
      body,
      { headers }
    );
    return response.data;
  },

  /**
   * 6.1 ПОЛУЧИТЬ ПОСЛЕДНЮЮ КОНТРОЛЬНУЮ ТОЧКУ
   * GET /api/sync/checkpoint/
   */
  getLastCheckpoint: async (): Promise<CheckpointData> => {
    const headers = await getHeaders();
    const response = await axios.get<CheckpointData>(
      `${API_URL}api/sync/checkpoint/`,
      { headers }
    );
    return response.data;
  },

  /**
   * 6.2 СОЗДАТЬ НОВУЮ КОНТРОЛЬНУЮ ТОЧКУ
   * POST /api/sync/checkpoint/
   */
  createCheckpoint: async (): Promise<CheckpointResponse> => {
    const headers = await getHeaders();
    const response = await axios.post<CheckpointResponse>(
      `${API_URL}api/sync/checkpoint/`,
      {},
      { headers }
    );
    return response.data;
  },
};

// ==============================================================================
// COMPONENT TOOLS & UTILS
// ==============================================================================

/**
 * Обертка для обработки ошибок API в компонентах.
 * Возвращает стандартизированный объект результата.
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const data = await apiCall();
    return { success: true, data };
  } catch (error: any) {
    let errorMessage = 'Unknown error occurred';
    
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error('Sync API Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Хелпер для сбора ID объектов для массового экспорта.
 * Полезен при выборе элементов в UI списка.
 */
export const prepareBulkExportIds = (
  selectedItems: any[], // Массив объектов из Realm или UI
  idField: string = '_id'
): string[] => {
  return selectedItems
    .map(item => (typeof item === 'string' ? item : item[idField]?.toString()))
    .filter(Boolean);
};













// 1. Полная синхронизация (Отправка данных на сервер):

// TypeScript
// import { IntegrationAPI, safeApiCall, RealmDataPayload, FileUploadMap } from './API/integration';
// import { useRealm } from '@realm/react';
// // Импорт функции чтения файла в base64 зависит от используемой библиотеки (expo-file-system или react-native-fs)
// // import { FileSystem } from 'expo-file-system'; 

// const syncToServer = async () => {
//   const realm = useRealm();
  
//   // 1. Сбор данных из Realm
//   const realmData: RealmDataPayload = {
//     ClassOfGrading: Array.from(realm.objects('ClassOfGrading').map(obj => obj.toJSON())),
//     GradeObject: Array.from(realm.objects('GradeObject').map(obj => obj.toJSON())),
//     // ... остальные коллекции
//   };

//   // 2. Сбор файлов (пример логики)
//   const files: FileUploadMap = {};
//   /* for (const obj of realmData.GradeObject) {
//      if (obj.photo && obj.photo.startsWith('file://')) {
//         const base64 = await FileSystem.readAsStringAsync(obj.photo, { encoding: 'base64' });
//         // Важно: ключ должен быть ID объекта или уникальный идентификатор, ожидаемый сервером
//         files[obj._id] = `data:image/jpeg;base64,${base64}`; 
//      }
//   }
//   */

//   // 3. Отправка
//   const result = await safeApiCall(() => 
//     IntegrationAPI.importData({
//       data: realmData,
//       files: files,
//       merge: true
//     })
//   );

//   if (result.success) {
//     console.log('Sync Stats:', result.data?.stats);
//   } else {
//     alert(`Error: ${result.error}`);
//   }
// };
// 2. Получение данных (Export с сервера):

// TypeScript
// import { IntegrationAPI } from './API/integration';

// const downloadFromServer = async () => {
//   try {
//     const response = await IntegrationAPI.exportData({
//       include_media: true,
//       download_files: true // Запросить файлы в Base64
//     });

//     if (response.success) {
//       const serverData = response.data;
      
//       // Здесь логика записи в Realm:
//       // realm.write(() => {
//       //    ...createOrUpdate objects
//       // });

//       // Если есть base64 файлы внутри объектов (например serverData.GradeObject[0].photo_base64),
//       // их нужно сохранить в FS и обновить путь в объекте Realm.
//     }
//   } catch (e) {
//     console.error(e);
//   }
// };
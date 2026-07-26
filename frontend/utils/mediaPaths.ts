import { ClassOfGrading, GradeObject } from '@/realm/models';
import * as FileSystem from 'expo-file-system';
import Realm from 'realm';

// Тип для аргументов: принимаем либо строку, либо BSON.ObjectId, либо сам Realm-объект
type ClassInput = string | Realm.BSON.ObjectId | ClassOfGrading;
type ObjectInput = string | Realm.BSON.ObjectId | GradeObject;

// Вспомогательная функция для извлечения строкового ID
function toId(input: ClassInput | ObjectInput | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if ('toHexString' in input && typeof input.toHexString === 'function') {
    return input.toHexString();
  }
  if ('_id' in input && input._id) {
    return toId(input._id);
  }
  return String(input);
}

export const MediaPaths = {
  /** Базовая директория медиафайлов */
  root: (): string => {
    return `${FileSystem.documentDirectory}media/`;
  },

  // ==========================================
  // КЛАССЫ (ClassOfGrading)
  // ==========================================

  /** Папка конкретного класса: .../media/class/<classId>/ */
  classDir: (classObj: ClassInput): string => {
    return `${MediaPaths.root()}class/${toId(classObj)}/`;
  },

  /** Обложка класса: .../media/class/<classId>/cover.jpg (или с кастомным именем) */
  classCover: (classObj: ClassInput, filename?: string): string => {
    return `${MediaPaths.classDir(classObj)}${filename || 'cover.jpg'}`;
  },

  // ==========================================
  // ОБЪЕКТЫ (GradeObject)
  // ==========================================

  /** Корень объектов класса: .../media/class/<classId>/object/ */
  objectsRootDir: (classObj: ClassInput): string => {
    return `${MediaPaths.classDir(classObj)}object/`;
  },

  /** Папка конкретного объекта: .../media/class/<classId>/object/<objectId>/ */
  objectDir: (classObj: ClassInput, objectObj: ObjectInput): string => {
    return `${MediaPaths.objectsRootDir(classObj)}${toId(objectObj)}/`;
  },

  /** Обложка объекта: .../media/class/<classId>/object/<objectId>/cover.jpg (или с timestamp) */
  objectCover: (classObj: ClassInput, objectObj: ObjectInput, filename?: string): string => {
    const name = filename || 'cover.jpg';
    return `${MediaPaths.objectDir(classObj, objectObj)}${name}`;
  },

  // ==========================================
  // ГАЛЕРЕЯ (MediaItem)
  // ==========================================

  /** Папка галереи объекта: .../media/class/<classId>/object/<objectId>/gallery/ */
  galleryDir: (classObj: ClassInput, objectObj: ObjectInput): string => {
    return `${MediaPaths.objectDir(classObj, objectObj)}gallery/`;
  },

  /** Путь к файлу галереи */
  galleryFile: (classObj: ClassInput, objectObj: ObjectInput, fileName: string): string => {
    return `${MediaPaths.galleryDir(classObj, objectObj)}${fileName}`;
  },

  // ==========================================
  // ЗАМЕТКИ (Note)
  // ==========================================

  /** Папка заметок объекта: .../media/class/<classId>/object/<objectId>/notes/ */
  notesDir: (classObj: ClassInput, objectObj: ObjectInput): string => {
    return `${MediaPaths.objectDir(classObj, objectObj)}notes/`;
  },

  /** Путь к фото в заметке */
  noteFile: (classObj: ClassInput, objectObj: ObjectInput, fileName: string): string => {
    return `${MediaPaths.notesDir(classObj, objectObj)}${fileName}`;
  },

  // ==========================================
  // ПРУФЫ (Proof)
  // ==========================================

  /** Папка пруфов категорий: .../media/class/<classId>/object/<objectId>/proofs/ */
  proofsDir: (classObj: ClassInput, objectObj: ObjectInput): string => {
    return `${MediaPaths.objectDir(classObj, objectObj)}proofs/`;
  },

  /** Путь к фото пруфа */
  proofFile: (classObj: ClassInput, objectObj: ObjectInput, fileName: string): string => {
    return `${MediaPaths.proofsDir(classObj, objectObj)}${fileName}`;
  },
};
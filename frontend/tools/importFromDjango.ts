/**
 * ИМПОРТ ДАННЫХ ИЗ DJANGO В REALM
 *
 * Загружает данные с сервера Django и записывает их в локальную базу Realm
 * Поддерживает:
 * - Загрузку всех типов объектов (классы, категории, объекты, рейтинги)
 * - Загрузку файлов (фото, видео, доказательства)
 * - Прогресс-бар
 * - Обработку ошибок
 * - Очистку старых данных (опционально)
 */

import { API_URL } from "@/CONSTANTS";
import { api } from "@/services/API/auth";
import * as FileSystem from "expo-file-system";
import { Realm } from "realm";
interface ImportResult {
  success: boolean;
  message?: string;
  stats?: {
    total_classes: number;
    total_objects: number;
    total_categories: number;
    total_tags: number;
    total_rank_types: number;
    files_downloaded: number;
    total_size_mb: number;
  };
}

interface ProgressCallback {
  (phase: string, current: number, total: number): void;
}

interface FileDownloadTask {
  url: string;
  localPath: string;
  type: "photo" | "video" | "proof" | "thumbnail";
}

// ===== RAW DATA TYPES FROM SERVER =====

interface RawProof {
  image?: string | null;
  text?: string | null;
}

interface RawSubrating {
  _id: string;
  subcategory: { _id: string };
  rank?: number | null;
  color?: string | null;
  proof?: RawProof | null;
}

interface RawRating {
  _id: string;
  category: { _id: string };
  rank?: number | null;
  proof?: RawProof | null;
  subcategories_of_category?: RawSubrating[];
}

interface RawMedia {
  _id?: string | null;
  uri?: string | null;
  mediaType?: string | null;
  mimeType?: string | null;
  thumbnailUri?: string | null;
  caption?: string | null;
  length?: number | null;
  isFavorite?: boolean | null;
  isHighlighted?: boolean | null;
  createdAt?: string | null;
}

interface RawNote {
  _id?: string | null;
  text?: string | null;
  author?: string | null;
  pinned?: boolean | null;
  photoUri?: string | null;
  createdAt?: string | null;
}

interface RawTagRef {
  _id: string;
}

interface RawObject {
  _id: string;
  name?: string | null;
  photo?: string | null;
  object_name?: string | null;
  note_name?: string | null;
  galery_name?: string | null;
  description?: string | null;
  overall_rank?: number | null;
  media?: RawMedia[];
  notes?: RawNote[];
  tags?: RawTagRef[];
  categories_of_object?: RawRating[];
}

interface RawSubCategory {
  _id: string;
  name?: string | null;
  priority?: number | null;
  weight?: number | null;
}

interface RawCategory {
  _id: string;
  name?: string | null;
  priority?: number | null;
  weight?: number | null;
  subcategories?: RawSubCategory[];
}

interface RawClass {
  _id: string;
  name?: string | null;
  photo?: string | null;
  priority?: number | null;
  objectName?: string | null;
  objectsName?: string | null;
  noteName?: string | null;
  notesName?: string | null;
  categories?: RawCategory[];
  objects?: RawObject[];
  tags?: RawTagRef[];
  rankTypes?: RawTagRef[];
}

interface RawTag {
  _id: string;
  name?: string | null;
  createdAt?: string | null;
  parentTag?: string | null;
}

interface RawRankType {
  _id: string;
  name?: string | null;
  fromRank?: number | null;
  color?: string | null;
  createdAt?: string | null;
}

// ===== БЕЗОПАСНЫЕ ХЕЛПЕРЫ =====

function safeString(value: unknown, defaultValue: string = ""): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

/**
 * Возвращает строку или undefined для nullable Realm полей (string?)
 * Используется вместо safeString там, где Realm ожидает string | undefined
 */
function safeStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function safeDate(value: unknown): Date {
  if (!value) return new Date();
  try {
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

function safeArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  return [];
}

/**
 * Конвертация строкового ID в Realm ObjectId
 */
function toObjectId(id: string): Realm.BSON.ObjectId {
  if (typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error(`Invalid Realm ObjectId: ${String(id)}`);
  }
  return new Realm.BSON.ObjectId(id);
}

function objectIdString(value: any): string {
  if (!value) return "";
  if (typeof value.toHexString === "function") return value.toHexString().toLowerCase();
  return String(value).toLowerCase();
}

function pushIfMissing(list: any, item: any, id: string): void {
  const exists = Array.from(list).some((current: any) => objectIdString(current?._id) === id.toLowerCase());
  if (!exists) list.push(item);
}


function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/media/") ||
    url.startsWith("/static/")
  );
}

/**
 * Превращает относительный /media/... путь в полный URL для скачивания.
 * Полные http/https URL возвращаются без изменений.
 */
function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

/**
 * Генерация локального пути для сохранения файла
 */
function generateLocalPath(url: string, type: string): string {
  const pathOnly = url.split(/[?#]/, 1)[0];
  const rawExtension = pathOnly.split("/").pop()?.split(".").pop()?.toLowerCase() || "jpg";
  const extension = /^[a-z0-9]{1,8}$/.test(rawExtension) ? rawExtension : "jpg";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
  return `${FileSystem.documentDirectory}${type}/${filename}`;
}

// ===== ФАЗА 1: ЗАГРУЗКА ДАННЫХ С СЕРВЕРА =====

async function fetchDataFromServer(onProgress?: ProgressCallback): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log("=== ФАЗА 1: ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ===");

    if (onProgress) {
      onProgress("fetch_data", 0, 1);
    }

    const response = await api.get("api/integration/sync/export/", {
      params: {
        download_files: false,
      },
    });

    if (onProgress) {
      onProgress("fetch_data", 1, 1);
    }

    if (!response.data.success) {
      throw new Error(response.data.message || "Server returned error");
    }

    console.log("✅ Data fetched successfully");
    console.log("Classes:", response.data.data.ClassOfGrading?.length || 0);
    console.log("Tags:", response.data.data.Tag?.length || 0);
    console.log("RankTypes:", response.data.data.RankType?.length || 0);

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error("Data fetch error:", error);

    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }

    return {
      success: false,
      error: error.message || "Unknown fetch error",
    };
  }
}

// ===== ФАЗЫ 2–4: ИМПОРТ МЕТАДАННЫХ В ОДНОЙ ТРАНЗАКЦИИ REALM =====

function importRankTypes(
  realm: Realm,
  rankTypesData: RawRankType[],
  onProgress?: ProgressCallback
): number {
  let imported = 0;
  for (let i = 0; i < rankTypesData.length; i++) {
    const rt = rankTypesData[i];
    realm.create(
      "RankType",
      {
        _id: toObjectId(rt._id),
        name: safeString(rt.name, "Unknown"),
        fromRank: safeNumber(rt.fromRank, 0),
        color: safeStringOrUndefined(rt.color),
        createdAt: safeDate(rt.createdAt),
      },
      Realm.UpdateMode.Modified
    );
    imported++;
    onProgress?.("import_rank_types", i + 1, rankTypesData.length);
  }
  return imported;
}

function importTags(
  realm: Realm,
  tagsData: RawTag[],
  onProgress?: ProgressCallback
): number {
  const pending = [...tagsData];
  let imported = 0;

  // Resolve parent references in topological order, supporting more than one nesting level.
  while (pending.length) {
    let madeProgress = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const tag = pending[i];
      const parentId = tag.parentTag || null;
      const parentTag = parentId
        ? realm.objectForPrimaryKey("Tag", toObjectId(parentId))
        : null;
      if (parentId && !parentTag) continue;

      const id = toObjectId(tag._id);
      const existing: any = realm.objectForPrimaryKey("Tag", id);
      const previousParent = existing?.parentTag;
      if (previousParent && (!parentTag || objectIdString(previousParent._id) !== objectIdString(parentTag._id))) {
        const oldIndex = Array.from(previousParent.subTags).findIndex((child: any) => objectIdString(child._id) === tag._id.toLowerCase());
        if (oldIndex >= 0) previousParent.subTags.splice(oldIndex, 1);
      }

      const savedTag = realm.create(
        "Tag",
        {
          _id: id,
          name: safeString(tag.name, "Unnamed Tag"),
          createdAt: safeDate(tag.createdAt),
          parentTag,
        },
        Realm.UpdateMode.Modified
      );

      if (parentTag) pushIfMissing(parentTag.subTags, savedTag, tag._id);
      pending.splice(i, 1);
      imported++;
      madeProgress = true;
    }
    if (!madeProgress) {
      const unresolved = pending.map((tag) => `${tag._id} -> ${tag.parentTag}`).join(", ");
      throw new Error(`Cannot resolve tag parent references: ${unresolved}`);
    }
  }

  onProgress?.("import_tags", tagsData.length, tagsData.length);
  return imported;
}

function importClasses(
  realm: Realm,
  classesData: RawClass[],
  onProgress?: ProgressCallback
): { classes: number; categories: number; objects: number } {
  let classesImported = 0;
  let categoriesImported = 0;
  let objectsImported = 0;

  for (let i = 0; i < classesData.length; i++) {
    const cls = classesData[i];
    const classId = toObjectId(cls._id);
    const classOfGrading = realm.create(
      "ClassOfGrading",
      {
        _id: classId,
        name: safeString(cls.name, "Unnamed Class"),
        ...(cls.photo && isValidMediaUrl(cls.photo) ? { photo: cls.photo } : {}),
        priority: safeNumber(cls.priority, 1),
        objectName: safeStringOrUndefined(cls.objectName),
        objectsName: safeStringOrUndefined(cls.objectsName),
        noteName: safeStringOrUndefined(cls.noteName),
        notesName: safeStringOrUndefined(cls.notesName),
      },
      Realm.UpdateMode.Modified
    );
    classesImported++;

    for (const cat of safeArray<RawCategory>(cls.categories)) {
      const category = realm.create(
        "Category",
        {
          _id: toObjectId(cat._id),
          name: safeString(cat.name, "Unnamed Category"),
          class_of_category: classOfGrading,
          priority: safeNumber(cat.priority, 1),
          weight: cat.weight == null ? undefined : safeNumber(cat.weight, 1),
        },
        Realm.UpdateMode.Modified
      );
      pushIfMissing(classOfGrading.categories, category, cat._id);
      categoriesImported++;

      for (const sub of safeArray<RawSubCategory>(cat.subcategories)) {
        const subCategory = realm.create(
          "SubCategory",
          {
            _id: toObjectId(sub._id),
            name: safeString(sub.name, "Unnamed SubCategory"),
            category,
            priority: safeNumber(sub.priority, 1),
            weight: sub.weight == null ? undefined : safeNumber(sub.weight, 1),
          },
          Realm.UpdateMode.Modified
        );
        pushIfMissing(category.subcategories, subCategory, sub._id);
      }
    }

    for (const obj of safeArray<RawObject>(cls.objects)) {
      const gradeObject = realm.create(
        "GradeObject",
        {
          _id: toObjectId(obj._id),
          name: safeString(obj.name, "Unnamed Object"),
          ...(obj.photo && isValidMediaUrl(obj.photo) ? { photo: obj.photo } : {}),
          class_of_object: classOfGrading,
          object_name: safeStringOrUndefined(obj.object_name),
          note_name: safeStringOrUndefined(obj.note_name),
          galery_name: safeStringOrUndefined(obj.galery_name),
          description: safeStringOrUndefined(obj.description),
          overall_rank: obj.overall_rank != null ? safeNumber(obj.overall_rank) : null,
        },
        Realm.UpdateMode.Modified
      );
      pushIfMissing(classOfGrading.objects, gradeObject, obj._id);
      objectsImported++;

      if (Array.isArray(obj.media)) {
        // Keep the local file when the server still has an empty placeholder
        // (for example, metadata was saved but a previous upload failed).
        const existingMedia = new Map<string, any>();
        for (const current of gradeObject.media) {
          if (current.syncId) {
            existingMedia.set(current.syncId, {
              uri: current.uri,
              mimeType: current.mimeType,
              thumbnailUri: current.thumbnailUri,
              length: current.length,
              isFavorite: current.isFavorite,
              isHighlighted: current.isHighlighted,
            });
          }
        }
        const media = safeArray<RawMedia>(obj.media);
        gradeObject.media.splice(0, gradeObject.media.length);
        for (const m of media) {
          const syncId = safeStringOrUndefined(m._id);
          const previous = syncId ? existingMedia.get(syncId) : undefined;
          const uri = m.uri && isValidMediaUrl(m.uri) ? m.uri : (previous?.uri || "");
          const thumbnailUri = m.thumbnailUri && isValidMediaUrl(m.thumbnailUri)
            ? m.thumbnailUri
            : previous?.thumbnailUri;
          gradeObject.media.push({
            syncId,
            uri,
            mediaType: safeString(m.mediaType, "photo"),
            mimeType: safeStringOrUndefined(m.mimeType) || previous?.mimeType,
            thumbnailUri,
            caption: safeStringOrUndefined(m.caption),
            createdAt: safeDate(m.createdAt),
            length: m.length == null ? previous?.length : safeNumber(m.length, 0),
            isFavorite: m.isFavorite ?? previous?.isFavorite ?? false,
            isHighlighted: m.isHighlighted ?? previous?.isHighlighted ?? false,
          } as any);
        }
      }

      if (Array.isArray(obj.notes)) {
        const existingNotes = new Map<string, any>();
        for (const current of gradeObject.notes) {
          if (current.syncId) existingNotes.set(current.syncId, { photoUri: current.photoUri });
        }
        const notes = safeArray<RawNote>(obj.notes);
        gradeObject.notes.splice(0, gradeObject.notes.length);
        for (const note of notes) {
          const syncId = safeStringOrUndefined(note._id);
          const previous = syncId ? existingNotes.get(syncId) : undefined;
          gradeObject.notes.push({
            syncId,
            text: safeString(note.text),
            author: safeStringOrUndefined(note.author),
            pinned: note.pinned ?? false,
            photoUri: note.photoUri && isValidMediaUrl(note.photoUri)
              ? note.photoUri
              : previous?.photoUri,
            createdAt: safeDate(note.createdAt),
          } as any);
        }
      }

      for (const rating of safeArray<RawRating>(obj.categories_of_object)) {
        const categoryId = rating.category?._id;
        if (!categoryId) throw new Error(`Rating ${rating._id} has no category reference`);
        const category = realm.objectForPrimaryKey("Category", toObjectId(categoryId));
        if (!category) throw new Error(`Category ${categoryId} not found for object ${obj._id}`);

        const previousRating: any = realm.objectForPrimaryKey("CategoryOfObject", toObjectId(rating._id));
        const proofData = rating.proof
          ? {
              image: rating.proof.image && isValidMediaUrl(rating.proof.image)
                ? rating.proof.image
                : previousRating?.proof?.image,
              text: safeStringOrUndefined(rating.proof.text),
            }
          : null;
        const categoryOfObject = realm.create(
          "CategoryOfObject",
          {
            _id: toObjectId(rating._id),
            category,
            object: gradeObject,
            rank: rating.rank != null ? safeNumber(rating.rank) : null,
            proof: proofData,
          },
          Realm.UpdateMode.Modified
        );
        pushIfMissing(gradeObject.categories_of_object, categoryOfObject, rating._id);

        for (const subrating of safeArray<RawSubrating>(rating.subcategories_of_category)) {
          const subcategoryId = subrating.subcategory?._id;
          if (!subcategoryId) throw new Error(`Subrating ${subrating._id} has no subcategory reference`);
          const subcategory = realm.objectForPrimaryKey("SubCategory", toObjectId(subcategoryId));
          if (!subcategory) throw new Error(`SubCategory ${subcategoryId} not found`);

          const previousSubrating: any = realm.objectForPrimaryKey("SubCategoryOfObject", toObjectId(subrating._id));
          const subProofData = subrating.proof
            ? {
                image: subrating.proof.image && isValidMediaUrl(subrating.proof.image)
                  ? subrating.proof.image
                  : previousSubrating?.proof?.image,
                text: safeStringOrUndefined(subrating.proof.text),
              }
            : null;
          const subCategoryOfObject = realm.create(
            "SubCategoryOfObject",
            {
              _id: toObjectId(subrating._id),
              subcategory,
              category_of_object: categoryOfObject,
              rank: subrating.rank != null ? safeNumber(subrating.rank) : null,
              color: safeStringOrUndefined(subrating.color),
              proof: subProofData,
            },
            Realm.UpdateMode.Modified
          );
          pushIfMissing(categoryOfObject.subcategories_of_category, subCategoryOfObject, subrating._id);
        }
      }

      for (const tagRef of safeArray<RawTagRef>(obj.tags)) {
        const tag = realm.objectForPrimaryKey("Tag", toObjectId(tagRef._id));
        if (!tag) throw new Error(`Tag ${tagRef._id} not found for object ${obj._id}`);
        pushIfMissing(gradeObject.tags, tag, tagRef._id);
      }
    }

    for (const tagRef of safeArray<RawTagRef>(cls.tags)) {
      const tag = realm.objectForPrimaryKey("Tag", toObjectId(tagRef._id));
      if (!tag) throw new Error(`Tag ${tagRef._id} not found for class ${cls._id}`);
      pushIfMissing(classOfGrading.tags, tag, tagRef._id);
    }
    for (const rtRef of safeArray<RawTagRef>(cls.rankTypes)) {
      const rankType = realm.objectForPrimaryKey("RankType", toObjectId(rtRef._id));
      if (!rankType) throw new Error(`RankType ${rtRef._id} not found for class ${cls._id}`);
      pushIfMissing(classOfGrading.rankTypes, rankType, rtRef._id);
    }

    onProgress?.("import_classes", i + 1, classesData.length);
  }

  return { classes: classesImported, categories: categoriesImported, objects: objectsImported };
}

// ===== ФАЗА 5: ЗАГРУЗКА ФАЙЛОВ (ОПЦИОНАЛЬНО) =====

/**
 * Расширенная задача скачивания — хранит исходный URL (как он лежит в Realm)
 * и полный URL для реального HTTP-запроса
 */
interface FileDownloadTaskExt extends FileDownloadTask {
  realmUrl: string; // оригинальный URL из Realm (может быть /media/...)
}

async function downloadFiles(
  realm: Realm,
  onProgress?: ProgressCallback
): Promise<{
  downloaded: number;
  failed: number;
  totalSize: number;
}> {
  console.log("=== ФАЗА 5: ЗАГРУЗКА ФАЙЛОВ ===");

  const filesToDownload: FileDownloadTaskExt[] = [];
  let totalSize = 0;

  const classes = realm.objects("ClassOfGrading");

  for (const cls of classes) {
    const c: any = cls;

    if (c.photo && isValidMediaUrl(c.photo)) {
      filesToDownload.push({
        realmUrl: c.photo,
        url: resolveUrl(c.photo),
        localPath: generateLocalPath(c.photo, "class_photos"),
        type: "photo",
      });
    }

    for (const obj of c.objects) {
      const o: any = obj;

      if (o.photo && isValidMediaUrl(o.photo)) {
        filesToDownload.push({
          realmUrl: o.photo,
          url: resolveUrl(o.photo),
          localPath: generateLocalPath(o.photo, "object_photos"),
          type: "photo",
        });
      }

      for (const media of o.media) {
        const m: any = media;
        if (m.uri && isValidMediaUrl(m.uri)) {
          filesToDownload.push({
            realmUrl: m.uri,
            url: resolveUrl(m.uri),
            localPath: generateLocalPath(
              m.uri,
              m.mediaType === "video" ? "videos" : "photos"
            ),
            type: m.mediaType === "video" ? "video" : "photo",
          });
        }

        if (m.thumbnailUri && isValidMediaUrl(m.thumbnailUri)) {
          filesToDownload.push({
            realmUrl: m.thumbnailUri,
            url: resolveUrl(m.thumbnailUri),
            localPath: generateLocalPath(m.thumbnailUri, "thumbnails"),
            type: "thumbnail",
          });
        }
      }

      for (const note of o.notes) {
        const n: any = note;
        if (n.photoUri && isValidMediaUrl(n.photoUri)) {
          filesToDownload.push({
            realmUrl: n.photoUri,
            url: resolveUrl(n.photoUri),
            localPath: generateLocalPath(n.photoUri, "note_photos"),
            type: "photo",
          });
        }
      }

      for (const rating of o.categories_of_object) {
        const r: any = rating;
        if (r.proof?.image && isValidMediaUrl(r.proof.image)) {
          filesToDownload.push({
            realmUrl: r.proof.image,
            url: resolveUrl(r.proof.image),
            localPath: generateLocalPath(r.proof.image, "proofs"),
            type: "proof",
          });
        }

        for (const subrating of r.subcategories_of_category) {
          const sr: any = subrating;
          if (sr.proof?.image && isValidMediaUrl(sr.proof.image)) {
            filesToDownload.push({
              realmUrl: sr.proof.image,
              url: resolveUrl(sr.proof.image),
              localPath: generateLocalPath(sr.proof.image, "proofs"),
              type: "proof",
            });
          }
        }
      }
    }
  }

  console.log(`Found ${filesToDownload.length} files to download`);

  if (filesToDownload.length === 0) {
    return { downloaded: 0, failed: 0, totalSize: 0 };
  }

  // Создаем директории
  const directories = [
    "class_photos",
    "object_photos",
    "photos",
    "videos",
    "thumbnails",
    "note_photos",
    "proofs",
  ];
  for (const dir of directories) {
    const dirPath = `${FileSystem.documentDirectory}${dir}`;
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  // Карта: realmUrl -> localPath (для обновления Realm после скачивания)
  const urlToLocalPath: Record<string, string> = {};

  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    try {
      console.log(`Downloading [${i + 1}/${filesToDownload.length}]: ${file.url}`);
      const result = await FileSystem.downloadAsync(file.url, file.localPath);

      if (result.status === 200) {
        urlToLocalPath[file.realmUrl] = file.localPath;
        downloaded++;

        const fileInfo = await FileSystem.getInfoAsync(file.localPath);
        if (fileInfo.exists && (fileInfo as any).size) {
          totalSize += (fileInfo as any).size;
        }
      } else {
        failed++;
        console.error(`Failed to download ${file.url}: status ${result.status}`);
      }

    } catch (error: any) {
      failed++;
      console.error(`Error downloading ${file.url}:`, error.message);
    } finally {
      onProgress?.("download_files", i + 1, filesToDownload.length);
    }
  }

  // Обновляем URL в Realm на локальные пути
  if (Object.keys(urlToLocalPath).length > 0) {
    console.log(`Updating ${Object.keys(urlToLocalPath).length} URLs in Realm...`);
    realm.write(() => {
      for (const cls of realm.objects("ClassOfGrading")) {
        const c: any = cls;
        if (c.photo && urlToLocalPath[c.photo]) c.photo = urlToLocalPath[c.photo];

        for (const obj of c.objects) {
          const o: any = obj;
          if (o.photo && urlToLocalPath[o.photo]) o.photo = urlToLocalPath[o.photo];

          for (const media of o.media) {
            const m: any = media;
            if (m.uri && urlToLocalPath[m.uri]) m.uri = urlToLocalPath[m.uri];
            if (m.thumbnailUri && urlToLocalPath[m.thumbnailUri])
              m.thumbnailUri = urlToLocalPath[m.thumbnailUri];
          }

          for (const note of o.notes) {
            const n: any = note;
            if (n.photoUri && urlToLocalPath[n.photoUri])
              n.photoUri = urlToLocalPath[n.photoUri];
          }

          for (const rating of o.categories_of_object) {
            const r: any = rating;
            if (r.proof?.image && urlToLocalPath[r.proof.image])
              r.proof.image = urlToLocalPath[r.proof.image];

            for (const subrating of r.subcategories_of_category) {
              const sr: any = subrating;
              if (sr.proof?.image && urlToLocalPath[sr.proof.image])
                sr.proof.image = urlToLocalPath[sr.proof.image];
            }
          }
        }
      }
    });
    console.log("✅ Realm URLs updated to local paths");
  }

  console.log(
    `✅ Downloaded ${downloaded}/${filesToDownload.length} files (${(
      totalSize /
      1024 /
      1024
    ).toFixed(2)} MB)`
  );
  console.log(`❌ Failed: ${failed}`);

  return { downloaded, failed, totalSize };
}

// ===== ГЛАВНАЯ ФУНКЦИЯ ИМПОРТА =====

export async function importDataFromServer(
  realm: Realm,
  clearExisting: boolean = false,
  downloadFilesFlag: boolean = false,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  try {
    console.log("=== НАЧАЛО ИМПОРТА ===");
    console.log(`Clear existing: ${clearExisting}`);
    console.log(`Download files: ${downloadFilesFlag}`);

    // Fetch and validate before touching the local database. A network failure must never erase data.
    const fetchResult = await fetchDataFromServer(onProgress);
    if (!fetchResult.success) {
      return { success: false, message: `Data fetch failed: ${fetchResult.error}` };
    }

    const data = fetchResult.data || {};
    const rankTypesData = safeArray<RawRankType>(data.RankType);
    const tagsData = safeArray<RawTag>(data.Tag);
    const classesData = safeArray<RawClass>(data.ClassOfGrading);

    let rankTypesCount = 0;
    let tagsCount = 0;
    let importStats = { classes: 0, categories: 0, objects: 0 };

    // Realm.write is synchronous and atomic: any invalid ID/reference rolls back the whole metadata import.
    realm.write(() => {
      if (clearExisting) realm.deleteAll();
      rankTypesCount = importRankTypes(realm, rankTypesData, onProgress);
      tagsCount = importTags(realm, tagsData, onProgress);
      importStats = importClasses(realm, classesData, onProgress);
    });

    let fileStats = { downloaded: 0, failed: 0, totalSize: 0 };
    if (downloadFilesFlag) {
      fileStats = await downloadFiles(realm, onProgress);
    }

    const partialFileFailure = fileStats.failed > 0;
    return {
      success: !partialFileFailure,
      message: partialFileFailure
        ? `Metadata restored, but ${fileStats.failed} file(s) could not be downloaded. Retry import with files enabled.`
        : "Импорт завершен успешно",
      stats: {
        total_classes: importStats.classes,
        total_objects: importStats.objects,
        total_categories: importStats.categories,
        total_tags: tagsCount,
        total_rank_types: rankTypesCount,
        files_downloaded: fileStats.downloaded,
        total_size_mb: parseFloat((fileStats.totalSize / 1024 / 1024).toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error("=== ОШИБКА ИМПОРТА ===", error);
    return { success: false, message: error.message || "Unknown error" };
  }
}

/**
 * Функция с расширенным прогресс-баром
 */
export async function performFullImportWithProgress(
  realm: Realm,
  clearExisting: boolean = false,
  downloadFilesParam: boolean = false,
  onProgress?: (
    phase: string,
    current: number,
    total: number,
    percentage: number
  ) => void
) {
  console.log("🔄 Starting full import with progress...");

  const progressCallback: ProgressCallback = (phase, current, total) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    console.log(`[${phase}] ${current}/${total} (${percentage}%)`);

    if (onProgress) {
      onProgress(phase, current, total, percentage);
    }
  };

  const result = await importDataFromServer(
    realm,
    clearExisting,
    downloadFilesParam,
    progressCallback
  );

  if (!result.success) {
    console.error("❌ Import failed:", result.message);
    return {
      success: false,
      error: result.message,
    };
  }

  console.log("✅ Import successful:", result.stats);

  return {
    success: true,
    stats: result.stats,
  };
}

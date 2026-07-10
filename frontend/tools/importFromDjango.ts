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
  uri?: string | null;
  mediaType?: string | null;
  mimeType?: string | null;
  thumbnailUri?: string | null;
  caption?: string | null;
  createdAt?: string | null;
}

interface RawNote {
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
  try {
    return new Realm.BSON.ObjectId(id);
  } catch {
    return new Realm.BSON.ObjectId();
  }
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
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_URL}${url}`;
}

/**
 * Генерация локального пути для сохранения файла
 */
function generateLocalPath(url: string, type: string): string {
  const extension = url.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}.${extension}`;
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

// ===== ФАЗА 2: ИМПОРТ RANK TYPES =====

async function importRankTypes(
  realm: Realm,
  rankTypesData: RawRankType[],
  onProgress?: ProgressCallback
): Promise<number> {
  console.log(`=== ИМПОРТ ${rankTypesData.length} RANK TYPES ===`);

  let imported = 0;

  for (let i = 0; i < rankTypesData.length; i++) {
    const rt = rankTypesData[i];

    try {
      realm.write(() => {
        realm.create(
          "RankType",
          {
            _id: toObjectId(rt._id),
            name: safeString(rt.name, "Unknown"),
            fromRank: safeNumber(rt.fromRank, 0),
            // color — string? в Realm, передаём undefined если null
            color: safeStringOrUndefined(rt.color),
            createdAt: safeDate(rt.createdAt),
          },
          Realm.UpdateMode.Modified
        );
      });

      imported++;

      if (onProgress) {
        onProgress("import_rank_types", i + 1, rankTypesData.length);
      }
    } catch (error: any) {
      console.error(`Failed to import RankType ${rt._id}:`, error.message);
    }
  }

  console.log(`✅ Imported ${imported}/${rankTypesData.length} rank types`);
  return imported;
}

// ===== ФАЗА 3: ИМПОРТ TAGS =====

async function importTags(
  realm: Realm,
  tagsData: RawTag[],
  onProgress?: ProgressCallback
): Promise<number> {
  console.log(`=== ИМПОРТ ${tagsData.length} TAGS ===`);

  const tagsWithoutParent = tagsData.filter((t) => !t.parentTag);
  const tagsWithParent = tagsData.filter((t) => t.parentTag);

  let imported = 0;

  for (const tag of tagsWithoutParent) {
    try {
      realm.write(() => {
        realm.create(
          "Tag",
          {
            _id: toObjectId(tag._id),
            name: safeString(tag.name, "Unnamed Tag"),
            createdAt: safeDate(tag.createdAt),
            parentTag: null,
            subTags: [],
          },
          Realm.UpdateMode.Modified
        );
      });

      imported++;
    } catch (error: any) {
      console.error(`Failed to import Tag ${tag._id}:`, error.message);
    }
  }

  for (const tag of tagsWithParent) {
    try {
      realm.write(() => {
        const parentTag = tag.parentTag
          ? realm.objectForPrimaryKey("Tag", toObjectId(tag.parentTag!))
          : null;

        realm.create(
          "Tag",
          {
            _id: toObjectId(tag._id),
            name: safeString(tag.name, "Unnamed Tag"),
            createdAt: safeDate(tag.createdAt),
            parentTag: parentTag ?? null,
            subTags: [],
          },
          Realm.UpdateMode.Modified
        );
      });

      imported++;
    } catch (error: any) {
      console.error(`Failed to import Tag ${tag._id}:`, error.message);
    }
  }

  if (onProgress) {
    onProgress("import_tags", tagsData.length, tagsData.length);
  }

  console.log(`✅ Imported ${imported}/${tagsData.length} tags`);
  return imported;
}

// ===== ФАЗА 4: ИМПОРТ КЛАССОВ И ВЛОЖЕННЫХ ДАННЫХ =====

async function importClasses(
  realm: Realm,
  classesData: RawClass[],
  onProgress?: ProgressCallback
): Promise<{
  classes: number;
  categories: number;
  objects: number;
}> {
  console.log(`=== ИМПОРТ ${classesData.length} КЛАССОВ ===`);

  let classesImported = 0;
  let categoriesImported = 0;
  let objectsImported = 0;

  for (let i = 0; i < classesData.length; i++) {
    const cls = classesData[i];

    try {
      realm.write(() => {
        // 1. Создать класс
        const classOfGrading = realm.create(
          "ClassOfGrading",
          {
            _id: toObjectId(cls._id),
            name: safeString(cls.name, "Unnamed Class"),
            // photo — string? → передаём undefined если не remote URL
            photo:
              cls.photo && isValidMediaUrl(cls.photo) ? cls.photo : undefined,
            priority: safeNumber(cls.priority, 0),
            // nullable string? поля — undefined вместо пустой строки
            objectName: safeStringOrUndefined(cls.objectName),
            objectsName: safeStringOrUndefined(cls.objectsName),
            noteName: safeStringOrUndefined(cls.noteName),
            notesName: safeStringOrUndefined(cls.notesName),
            categories: [],
            objects: [],
            tags: [],
            rankTypes: [],
          },
          Realm.UpdateMode.Modified
        );

        classesImported++;

        // 2. Создать категории
        const categories = safeArray<RawCategory>(cls.categories);
        for (const cat of categories) {
          const category = realm.create(
            "Category",
            {
              _id: toObjectId(cat._id),
              name: safeString(cat.name, "Unnamed Category"),
              class_of_category: classOfGrading,
              priority: safeNumber(cat.priority, 0),
              weight: cat.weight != null ? safeNumber(cat.weight, 1) : undefined,
              subcategories: [],
            },
            Realm.UpdateMode.Modified
          );

          // Добавляем категорию в список класса
          classOfGrading.categories.push(category);
          categoriesImported++;

          // 3. Создать подкатегории
          const subcategories = safeArray<RawSubCategory>(cat.subcategories);
          for (const sub of subcategories) {
            const subCategory = realm.create(
              "SubCategory",
              {
                _id: toObjectId(sub._id),
                name: safeString(sub.name, "Unnamed SubCategory"),
                category: category,
                priority: safeNumber(sub.priority, 0),
                weight: sub.weight != null ? safeNumber(sub.weight, 1) : undefined,
              },
              Realm.UpdateMode.Modified
            );

            category.subcategories.push(subCategory);
          }
        }

        // 4. Создать объекты
        const objects = safeArray<RawObject>(cls.objects);
        for (const obj of objects) {
          const gradeObject = realm.create(
            "GradeObject",
            {
              _id: toObjectId(obj._id),
              name: safeString(obj.name, "Unnamed Object"),
              photo:
                obj.photo && isValidMediaUrl(obj.photo) ? obj.photo : undefined,
              class_of_object: classOfGrading,
              object_name: safeStringOrUndefined(obj.object_name),
              description: safeStringOrUndefined(obj.description),
              overall_rank:
                obj.overall_rank != null ? safeNumber(obj.overall_rank) : null,
              categories_of_object: [],
              media: [],
              notes: [],
              tags: [],
            },
            Realm.UpdateMode.Modified
          );

          // Добавляем объект в список класса
          classOfGrading.objects.push(gradeObject);
          objectsImported++;

          // 5. Создать медиа
          // MediaItem — embedded объект: uri обязательное поле, пропускаем если нет валидного uri
          const media = safeArray<RawMedia>(obj.media);
          for (const m of media) {
            // uri обязательное поле в Realm — пропускаем медиа без валидного uri
            const uri = m.uri && isValidMediaUrl(m.uri) ? m.uri : null;
            if (!uri) {
              console.warn(`Skipping media item for object ${obj._id}: no valid uri`);
              continue;
            }

            gradeObject.media.push({
              uri,
              mediaType: safeString(m.mediaType, "photo"),
              mimeType: safeStringOrUndefined(m.mimeType),
              thumbnailUri:
                m.thumbnailUri && isValidMediaUrl(m.thumbnailUri)
                  ? m.thumbnailUri
                  : undefined,
              caption: safeStringOrUndefined(m.caption),
              createdAt: safeDate(m.createdAt),
            } as any);
          }

          // 6. Создать заметки
          const notes = safeArray<RawNote>(obj.notes);
          for (const note of notes) {
            gradeObject.notes.push({
              text: safeString(note.text),
              author: safeStringOrUndefined(note.author),
              pinned: note.pinned ?? false,
              photoUri:
                note.photoUri && isValidMediaUrl(note.photoUri)
                  ? note.photoUri
                  : undefined,
              createdAt: safeDate(note.createdAt),
            } as any);
          }

          // 7. Создать рейтинги категорий
          const ratings = safeArray<RawRating>(obj.categories_of_object);
          for (const rating of ratings) {
            const category = realm.objectForPrimaryKey(
              "Category",
              toObjectId(rating.category._id)
            );

            if (!category) {
              console.warn(
                `Category ${rating.category._id} not found for object ${obj._id}, skipping rating`
              );
              continue;
            }

            const proofData: { image?: string; text?: string } | null =
              rating.proof
                ? {
                    image:
                      rating.proof.image && isValidMediaUrl(rating.proof.image)
                        ? rating.proof.image
                        : undefined,
                    text: safeStringOrUndefined(rating.proof.text),
                  }
                : null;

            const categoryOfObject = realm.create(
              "CategoryOfObject",
              {
                _id: toObjectId(rating._id),
                category: category,
                object: gradeObject,
                rank:
                  rating.rank != null ? safeNumber(rating.rank) : null,
                subcategories_of_category: [],
                proof: proofData,
              },
              Realm.UpdateMode.Modified
            );

            gradeObject.categories_of_object.push(categoryOfObject);

            // 8. Создать рейтинги подкатегорий
            const subratings = safeArray<RawSubrating>(
              rating.subcategories_of_category
            );
            for (const subrating of subratings) {
              const subcategory = realm.objectForPrimaryKey(
                "SubCategory",
                toObjectId(subrating.subcategory._id)
              );

              if (!subcategory) {
                console.warn(
                  `SubCategory ${subrating.subcategory._id} not found, skipping subrating`
                );
                continue;
              }

              const subProofData: { image?: string; text?: string } | null =
                subrating.proof
                  ? {
                      image:
                        subrating.proof.image &&
                        isValidMediaUrl(subrating.proof.image)
                          ? subrating.proof.image
                          : undefined,
                      text: safeStringOrUndefined(subrating.proof.text),
                    }
                  : null;

              const subCategoryOfObject = realm.create(
                "SubCategoryOfObject",
                {
                  _id: toObjectId(subrating._id),
                  subcategory: subcategory,
                  category_of_object: categoryOfObject,
                  rank:
                    subrating.rank != null ? safeNumber(subrating.rank) : null,
                  color: safeStringOrUndefined(subrating.color),
                  proof: subProofData,
                },
                Realm.UpdateMode.Modified
              );

              categoryOfObject.subcategories_of_category.push(
                subCategoryOfObject
              );
            }
          }

          // 9. Связать теги объекта
          const objTags = safeArray<RawTagRef>(obj.tags);
          for (const tagRef of objTags) {
            const tag = realm.objectForPrimaryKey(
              "Tag",
              toObjectId(tagRef._id)
            );
            if (tag) {
              gradeObject.tags.push(tag);
            }
          }
        }

        // 10. Связать теги класса
        const clsTags = safeArray<RawTagRef>(cls.tags);
        for (const tagRef of clsTags) {
          const tag = realm.objectForPrimaryKey("Tag", toObjectId(tagRef._id));
          if (tag) {
            classOfGrading.tags.push(tag);
          }
        }

        // 11. Связать rank types класса
        const rankTypes = safeArray<RawTagRef>(cls.rankTypes);
        for (const rtRef of rankTypes) {
          const rankType = realm.objectForPrimaryKey(
            "RankType",
            toObjectId(rtRef._id)
          );
          if (rankType) {
            classOfGrading.rankTypes.push(rankType);
          }
        }
      });

      if (onProgress) {
        onProgress("import_classes", i + 1, classesData.length);
      }
    } catch (error: any) {
      console.error(`Failed to import Class ${cls._id}:`, error.message);
      console.error(error);
    }
  }

  console.log(
    `✅ Imported ${classesImported} classes, ${categoriesImported} categories, ${objectsImported} objects`
  );

  return {
    classes: classesImported,
    categories: categoriesImported,
    objects: objectsImported,
  };
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

      if (onProgress) {
        onProgress("download_files", i + 1, filesToDownload.length);
      }
    } catch (error: any) {
      failed++;
      console.error(`Error downloading ${file.url}:`, error.message);
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

    // ФАЗА 0: Очистка существующих данных (опционально)
    if (clearExisting) {
      console.log("\n[0/5] Очистка существующих данных...");
      realm.write(() => {
        realm.deleteAll();
      });
      console.log("✅ Database cleared");
    }

    // ФАЗА 1: Загрузка данных с сервера
    console.log("\n[1/5] Загрузка данных с сервера...");
    const fetchResult = await fetchDataFromServer(onProgress);

    if (!fetchResult.success) {
      return {
        success: false,
        message: `Data fetch failed: ${fetchResult.error}`,
      };
    }

    const data = fetchResult.data;

    // ФАЗА 2: Импорт RankTypes
    console.log("\n[2/5] Импорт RankTypes...");
    const rankTypesCount = await importRankTypes(
      realm,
      safeArray<RawRankType>(data.RankType),
      onProgress
    );

    // ФАЗА 3: Импорт Tags
    console.log("\n[3/5] Импорт Tags...");
    const tagsCount = await importTags(
      realm,
      safeArray<RawTag>(data.Tag),
      onProgress
    );

    // ФАЗА 4: Импорт классов и всех вложенных данных
    console.log("\n[4/5] Импорт классов и объектов...");
    const importStats = await importClasses(
      realm,
      safeArray<RawClass>(data.ClassOfGrading),
      onProgress
    );

    // ФАЗА 5: Загрузка файлов (опционально)
    let fileStats = { downloaded: 0, failed: 0, totalSize: 0 };
    if (downloadFilesFlag) {
      console.log("\n[5/5] Загрузка файлов...");
      fileStats = await downloadFiles(realm, onProgress);
    }

    console.log("✅ ИМПОРТ ЗАВЕРШЕН УСПЕШНО");

    return {
      success: true,
      message: "Импорт завершен успешно",
      stats: {
        total_classes: importStats.classes,
        total_objects: importStats.objects,
        total_categories: importStats.categories,
        total_tags: tagsCount,
        total_rank_types: rankTypesCount,
        files_downloaded: fileStats.downloaded,
        total_size_mb: parseFloat(
          (fileStats.totalSize / 1024 / 1024).toFixed(2)
        ),
      },
    };
  } catch (error: any) {
    console.error("=== ОШИБКА ИМПОРТА ===", error);
    return {
      success: false,
      message: error.message || "Unknown error",
    };
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

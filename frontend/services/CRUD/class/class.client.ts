import { ClassOfGrading, LeaderboardEntry } from "@/realm/models";
import { Callbacks } from "@/tools";
import { deleteFiles } from "@/utils/deleteFiles";
import { logStorageTree } from "@/utils/logStorage";
import { MediaPaths } from "@/utils/mediaPaths";
import * as FileSystem from "expo-file-system";
import Realm from "realm";

export interface ClassCreateItem {
  id?: Realm.BSON.ObjectId;
  name: string;
  photo?: string;
  priority?: string | number;
}

interface CreateClassArgs extends Callbacks {
  realm: Realm;
  items: ClassCreateItem[];
}

export const createClass = async ({ realm, items }: CreateClassArgs): Promise<Realm.BSON.ObjectId[]> => {
  const validItems = items.filter((i) => i.name?.trim());
  if (!validItems.length) return [];

  const prepared = await Promise.all(
    validItems.map(async (item) => {
      const classId = item.id ?? new Realm.BSON.ObjectId();
      let destPath: string | undefined;

      if (item.photo) {
        const classDir = MediaPaths.classDir(classId);
        const proposedDest = MediaPaths.classCover(classId);
        try {
          await FileSystem.makeDirectoryAsync(classDir, { intermediates: true });
          await FileSystem.copyAsync({ from: item.photo, to: proposedDest });
          await deleteFiles(item.photo);
          destPath = proposedDest;
        } catch (err) {
          console.error(`Ошибка копирования фото для ${item.name}:`, err);
          await deleteFiles(classDir);
        }
      }

      const parsedPriority = parseInt(String(item.priority ?? "1"));
      const finalPriority = isNaN(parsedPriority) || parsedPriority < 1 ? 1 : parsedPriority;

      return { _id: classId, name: item.name.trim(), photo: destPath, priority: finalPriority };
    })
  );

  try {
    realm.write(() => {
      prepared.forEach((data) => {
        realm.create("ClassOfGrading", { ...data, categories: [], objects: [], tags: [] });
      });
    });
  } catch (err) {
    console.error("Критическая ошибка при сохранении классов:", err);
    throw err;
  }

  await logStorageTree();
  return prepared.map((item) => item._id);
};

export interface UpdateGradingProps {
  name?: string;
  photo?: string; 
  priority?: number;
  objectName?: string;
  objectsName?: string;
  noteName?: string;
  notesName?: string;
}

export const updateClass = async (
  realm: Realm,
  objectToUpdate: ClassOfGrading, 
  updates: UpdateGradingProps
) => {
  if (!objectToUpdate || !updates || Object.keys(updates).length === 0) return;

  const hasPhotoChange = Boolean(
    updates.photo && !updates.photo.startsWith(FileSystem.documentDirectory || "")
  );

  try {
    let destPath: string | undefined;

    if (hasPhotoChange && updates.photo) {
      await FileSystem.makeDirectoryAsync(MediaPaths.classDir(objectToUpdate._id), { intermediates: true });

      const oldPath = objectToUpdate.photo;
      destPath = MediaPaths.classCover(objectToUpdate._id, `cover_${Date.now()}.jpg`);

      await FileSystem.copyAsync({ from: updates.photo, to: destPath });
      await deleteFiles(updates.photo);

      if (oldPath) {
        const cleanOldPath = oldPath.split("?")[0];
        if (cleanOldPath !== destPath) {
          await deleteFiles(cleanOldPath);
        }
      }
    }

    realm.write(() => {
      (Object.keys(updates) as Array<keyof UpdateGradingProps>).forEach((key) => {
        if (key === "photo") return; 

        const value = updates[key];
        const isStringEmpty = typeof value === "string" && value.trim().length === 0;
        const isNullish = value === null || value === undefined;

        if (!isStringEmpty && !isNullish) {
          // @ts-ignore
          objectToUpdate[key] = value;
        }
      });

      if (destPath) {
        objectToUpdate.photo = destPath;
      }
    });
  } catch (error) {
    console.error("Ошибка при обновлении ClassOfGrading:", error);
  }
  await logStorageTree();
};

export async function deleteClass(
  realm: Realm | undefined | null,
  target: ClassOfGrading | ClassOfGrading[] | null | undefined
): Promise<boolean> {
  if (!realm || !target) return false;

  const items = (Array.isArray(target) ? target : [target]).filter(
    (cls): cls is ClassOfGrading => Boolean(cls && cls.isValid())
  );

  if (items.length === 0) return false;

  try {
    const dirsToDelete = items
      .map((cls) => {
        try {
          return MediaPaths.classDir(cls);
        } catch {
          return null;
        }
      })
      .filter((dir): dir is string => Boolean(dir));

    realm.write(() => {
      for (const cls of items) {
        for (const obj of Array.from(cls.objects)) {
          for (const catObj of Array.from(obj.categories_of_object)) {
            for (const subObj of Array.from(catObj.subcategories_of_category)) {
              realm.delete(subObj);
            }
            realm.delete(catObj);
          }
          realm.delete(obj);
        }

        for (const cat of Array.from(cls.categories)) {
          for (const sub of Array.from(cat.subcategories)) {
            realm.delete(sub);
          }
          realm.delete(cat);
        }

        // висящие записи лидерборда по этому классу
        const entries = realm
          .objects<LeaderboardEntry>("LeaderboardEntry")
          .filtered("classOfGrading._id == $0", cls._id);
        realm.delete(entries);

        realm.delete(cls);
      }
    });

    await deleteFiles(dirsToDelete);

    return true;
  } catch (e) {
    console.error("deleteClass error:", e);
    return false;
  } finally {
    await logStorageTree();
  }
}
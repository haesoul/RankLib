import { ClassOfGrading, GradeObject, Tag } from "@/realm/models";
import { onChangeClass } from "@/realm/onChangeClass";
import { Callbacks } from "@/tools";
import { debouncedRecomputeLeaderboard } from "@/tools/objectService";
import { deleteFiles } from "@/utils/deleteFiles";
import { logStorageTree } from "@/utils/logStorage";
import { MediaPaths } from "@/utils/mediaPaths";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import Realm from "realm";


interface CreateObjectArgs extends Callbacks {
  realm: Realm;
  name?: string | null;
  photo?: string | undefined;
  classObj: ClassOfGrading;
  tags?: Tag[] | Realm.List<Tag> | null | undefined;
  overallRank?: number;
  description?: string;
  id?: Realm.BSON.ObjectId;
}

export interface ObjectCreateItem {
  id?: Realm.BSON.ObjectId;
  name: string;
  photo?: string;
  overallRank?: number;
  description?: string;
}

interface CreateObjectArgs extends Callbacks {
  realm: Realm;
  classObj: ClassOfGrading;
  items: ObjectCreateItem[];
  tags?: Tag[] | Realm.List<Tag> | null;
}

export async function createObject({ realm, classObj, items, tags }: CreateObjectArgs): Promise<Realm.BSON.ObjectId[]> {
  const validItems = items.filter((i) => i.name?.trim());
  if (!validItems.length) return [];

  const prepared = await Promise.all(
    validItems.map(async (item) => {
      const objectId = item.id ?? new Realm.BSON.ObjectId();
      let destPath: string | undefined;

      if (item.photo) {
        const objectDir = MediaPaths.objectDir(classObj, objectId);
        const proposedDest = objectDir + "cover.jpg";
        try {
          await FileSystem.makeDirectoryAsync(objectDir, { intermediates: true });
          await FileSystem.copyAsync({ from: item.photo, to: proposedDest });
          await deleteFiles(item.photo);
          destPath = proposedDest;
        } catch (err) {
          console.error(`Ошибка копирования фото для ${item.name}:`, err);
          await deleteFiles(objectDir);
        }
      }

      return {
        id: objectId,
        name: item.name.trim(),
        destPath,
        overallRank: item.overallRank,
        description: item.description,
      };
    })
  );

  const sharedTags = tags ? Array.from(tags) : [];

  realm.write(() => {
    for (const item of prepared) {
      const newObj = realm.create(GradeObject, {
        _id: item.id,
        name: item.name,
        photo: item.destPath ?? undefined,
        class_of_object: classObj,
        categories_of_object: [],
        overall_rank: item.overallRank ?? null,
        description: item.description?.trim() || undefined,
        tags: sharedTags,
      }) as GradeObject;

      classObj.objects.push(newObj);
    }
    onChangeClass(realm, classObj._id ?? null);
  });

  await logStorageTree();
  return prepared.map((p) => p.id);
}
export const to2 = (v: any) =>
  Number.isFinite(v) ? Number(v.toFixed(2)) : null;

export const validateRankInput = (value: number | null) =>
  value != null && value >= 1 && value <= 10;


const recomputeTimers = new Map<string, ReturnType<typeof setTimeout>>();



export async function updateObject(params: {
  realm: Realm | null | undefined;
  object: GradeObject | null | undefined;
  newPhotoUri: string | null;
  newTitle: string;
  overallRankInput: string;
  callbacks?: {
    setNewPhotoUri?: (v: string | null) => void;
    setNewTitle?: (v: string) => void;
    setOverallRankInput?: (v: string) => void;
    setEditing?: (v: boolean) => void;
    setError?: (v: string) => void;
  };
}) {
  const { realm, object, newPhotoUri, newTitle, overallRankInput, callbacks = {} } = params;
  const { setNewPhotoUri, setNewTitle, setOverallRankInput, setEditing, setError } = callbacks;

  if (!realm || !object) return;
  const hasTitleChange = Boolean(newTitle?.trim());
  const hasPhotoChange = Boolean(newPhotoUri && !newPhotoUri.startsWith(FileSystem.documentDirectory || ""));
  const num = parseFloat(overallRankInput.replace(",", "."));
  const hasRankChange = !isNaN(num) && validateRankInput(num);

  if (!hasTitleChange && !hasPhotoChange && !hasRankChange) {
    setEditing?.(false);
    return;
  }

  try {
    let destPath: string | null = null;

    if (hasPhotoChange && newPhotoUri) {
      const classId = object.class_of_object._id;
      const objectId = object._id.toHexString();
      const objectDir = MediaPaths.objectDir(object.class_of_object, object._id);
      
      await FileSystem.makeDirectoryAsync(objectDir, { intermediates: true });

      const oldPath = object.photo; 
      destPath = objectDir + `cover_${Date.now()}.jpg`;

      await FileSystem.copyAsync({ from: newPhotoUri, to: destPath });

      await deleteFiles(newPhotoUri);

      if (oldPath) {
        const cleanOldPath = oldPath.split("?")[0];
        if (cleanOldPath !== destPath) {
          await deleteFiles(cleanOldPath);
        }
      }
    }

    realm.write(() => {
      if (hasTitleChange) {
        object.name = newTitle.trim();
      }
      if (destPath) {
        object.photo = destPath;
      }
      if (hasRankChange) {
        object.overall_rank = Number(num.toFixed(2));
      }
    });

    if (destPath) {
      setNewPhotoUri?.(destPath + "?t=" + Date.now());
    }

    object.categories_of_object.forEach(catObj => {
      if (catObj.category) {
        debouncedRecomputeLeaderboard(realm, object.class_of_object, catObj.category);
      }
    });

    setNewTitle?.("");
    setOverallRankInput?.("");
    setEditing?.(false);
    setError?.("");
  } catch (err: any) {
    console.error("UpdateObject Error:", err);
    Alert.alert("Ошибка", String(err));
  }
  await logStorageTree();
}



export async function deleteObject(
  realm: Realm | undefined | null, 
  target: GradeObject | GradeObject[] | null | undefined
): Promise<boolean> {
  if (!realm || !target) return false;

  const items = (Array.isArray(target) ? target : [target]).filter(
    (obj): obj is GradeObject => Boolean(obj && obj.isValid())
  );

  if (items.length === 0) return false;

  try {
    const dirsToDelete = items
      .map((obj) => {
        try {
          return MediaPaths.objectDir(obj.class_of_object, obj._id);
        } catch {
          return null;
        }
      })
      .filter((dir): dir is string => Boolean(dir));

    realm.write(() => {
      for (const obj of items) {
        for (const catObj of Array.from(obj.categories_of_object)) {
          for (const subObj of Array.from(catObj.subcategories_of_category)) {
            realm.delete(subObj);
          }
          realm.delete(catObj);
        }
        realm.delete(obj);
      }
    });

    await deleteFiles(dirsToDelete);
    
    return true;
  } catch (e) {
    console.error("deleteObject error:", e);
    return false;
  } finally {
    await logStorageTree();
  }
}

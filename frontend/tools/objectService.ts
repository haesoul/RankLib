import { Category, ClassOfGrading, GradeObject, MediaItem, Tag } from "@/realm/models";
import { onChangeClass } from "@/realm/onChangeClass";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from 'expo-image-picker';
import Realm from "realm";
import { recomputeLeaderboard } from "./categoryService";


export function objectDescriptionService(realm: Realm | null | undefined, object: GradeObject | null | undefined, newDescription: string): boolean {
  if (!realm || !object) return false;
  try {
    realm.write(() => {
      object.description = newDescription;
    });
    return true;
  } catch (e) {
    console.error("objectDescriptionService error:", e);
    return false;
  } 
}




const recomputeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedRecomputeLeaderboard(
  realm: Realm,
  classObj: ClassOfGrading,
  category: Category,
  delay = 300
) {
  const key = `${classObj._id.toHexString()}_${category._id.toHexString()}`;
  const existing = recomputeTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    recomputeTimers.delete(key);
    if (!realm.isClosed) {
      recomputeLeaderboard  (realm, classObj, category);
    }
  }, delay);

  recomputeTimers.set(key, timer);
}



interface AppendMedia {
  realm: Realm;
  obj?: GradeObject | null;
}


export const addMedia = async ({ realm, obj }: AppendMedia) => {
  if (!obj) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
    allowsMultipleSelection: true,
  });

  if (result.canceled || !result.assets?.length) return;

  const assets = result.assets;
  const savedItems: MediaItem[] = [];

  try {

    await Promise.all(
      assets.map(async (asset) => {
        if (!asset.uri) return;

        const ext = asset.uri.split('.').pop() ?? 'mp4';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const destPath = FileSystem.documentDirectory + fileName;

        await FileSystem.copyAsync({ from: asset.uri, to: destPath });

        const mediaData = {
          uri: destPath,
          mediaType: asset.type ?? 'video',
          createdAt: new Date(),
          mimeType: asset.mimeType ?? undefined,
          caption: undefined,
          thumbnailUri: destPath,
        } as unknown as MediaItem;

        savedItems.push(mediaData);
      })
    );

    realm.write(() => {
      savedItems.forEach((item) => obj.media.push(item));
    });
  } catch (error) {
    console.error('Error saving media:', error);
  }
};



export function updateGradeObjectRank(gradeObject: GradeObject): number | null {
  const categories = gradeObject.categories_of_object;

  if (!categories || categories.length === 0) {
    gradeObject.overall_rank = null;
    return null;
  }

  const valid = categories.filter(c => typeof c.rank === 'number' && Number.isFinite(c.rank));

  if (valid.length === 0) {
    gradeObject.overall_rank = null;
    return null;
  }

  const priority = gradeObject.class_of_object?.priority || 1;
  const totalWeight = valid.length * priority;
  const weightedSum = valid.reduce((acc, c) => acc + (c.rank! * priority), 0);

  const result = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : null;
  
  gradeObject.overall_rank = result;
  return result;
}


export function toggleObjectTagsService(
  realm: Realm | null | undefined,
  gradeObject: GradeObject | null | undefined,
  tagsToToggle: Tag[] | null | undefined
): boolean {
  if (!realm || !gradeObject || !tagsToToggle) {
    return false;
  }

  try {
    realm.write(() => {
      gradeObject.tags.splice(0, gradeObject.tags.length);
      
      tagsToToggle.forEach((tag) => {
        gradeObject.tags.push(tag);
      });
    });

    return true;
  } catch (error) {
    console.error("Error updating object tags:", error);
    return false;
  }
}

interface deleteMediaProps {
  realm: Realm;
  obj: (GradeObject & Realm.Object<GradeObject, never>) | null
  media: any[];
  selectedIndexes: any[];
  setSelectedIndexes: (m: any[]) => void;
  setSelectedIndex: (n: number | null) => void;
  setIsMultiSelectMode: (set: boolean) => void;
  
  setVisibleIndex: (n: number) => void;
}

export const deleteSelectedMedia = ({realm, obj, media, selectedIndexes, setSelectedIndexes, setSelectedIndex, setIsMultiSelectMode, setVisibleIndex} : deleteMediaProps) => {
  if (!obj || !realm) return;
  if (!selectedIndexes || selectedIndexes.length === 0) return;

  const toDeleteIndexes = [...selectedIndexes].sort((a, b) => b - a); 
  try {
    realm.write(() => {
      for (const idx of toDeleteIndexes) {
        const item = media[idx];
        if (!item) continue;

        try {
          realm.delete(item);
          continue;
        } catch (e) {
        }

        const listIndex = typeof obj.media.indexOf === 'function' ? obj.media.indexOf(item) : -1;
        if (listIndex >= 0 && typeof obj.media.splice === 'function') {
          obj.media.splice(listIndex, 1);
          continue;
        }

        const uri = item?.uri;
        if (uri) {
          const found = obj.media.findIndex((m: any) => m?.uri === uri);
          if (found >= 0 && typeof obj.media.splice === 'function') obj.media.splice(found, 1);
        }
      }
    });
  } catch (err) {
    console.error('deleteSelectedMedia error', err);
  }

  setSelectedIndexes([]);
  setIsMultiSelectMode(false);
  setSelectedIndex(null);
  setVisibleIndex(0);
};











export async function batchCreateObjects({
  realm,
  items,
  classObj,
  tags,
}: {
  realm: Realm;
  items: { name: string; photo?: string }[];
  classObj: ClassOfGrading;
  tags?: Tag[];
}) {
  const validItems = items.filter(i => i.name.trim());
  if (!validItems.length) return;


  const prepared = await Promise.all(
    validItems.map(async (item) => {
      if (!item.photo) return { name: item.name, destPath: undefined };
      const id = new Realm.BSON.ObjectId();
      const destPath = `${FileSystem.documentDirectory}${id.toHexString()}.jpg`;
      await FileSystem.copyAsync({ from: item.photo, to: destPath });
      return { name: item.name, destPath, id };
    })
  );

  realm.write(() => {
    for (const item of prepared) {
      const objectId = (item as any).id ?? new Realm.BSON.ObjectId();
      const newObj = realm.create(GradeObject, {
        _id: objectId,
        name: item.name.trim(),
        photo: item.destPath ?? undefined,
        class_of_object: classObj,
        categories_of_object: [],
        overall_rank: null,
        tags: tags ? [...tags] : [],
      }) as GradeObject;
      classObj.objects.push(newObj);
      onChangeClass(realm, classObj._id ?? null);
    }
  });
}
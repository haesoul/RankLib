import { ClassOfGrading, GradeObject, Tag } from "@/realm/models";
import { onChangeClass } from "@/realm/onChangeClass";
import { Callbacks } from "@/tools";
import { debouncedRecomputeLeaderboard } from "@/tools/objectService";
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
}

export async function createObject({realm, name, photo, classObj, tags, overallRank, description}: CreateObjectArgs) {
    if (!name?.trim()) return;
    const object_id = new Realm.BSON.ObjectId()
    let destPath: string | undefined;

    if (photo) {
        destPath = `${FileSystem.documentDirectory}${object_id.toHexString()}.jpg`;

        await FileSystem.copyAsync({
        from: photo,
        to: destPath,
        });
    }

    realm.write(() => {
        const newObj = realm.create(GradeObject, {
        _id: object_id,
        name: name.trim(),
        photo: destPath ?? undefined,
        class_of_object: classObj,
        categories_of_object: [],
        overall_rank: overallRank ?? null,
        description: description?.trim() || undefined,
        tags: tags ? Array.from(tags) : [],
        }) as GradeObject;

        classObj.objects.push(newObj);
        onChangeClass(realm, classObj._id ?? null);
    });
}
export const to2 = (v: any) =>
  Number.isFinite(v) ? Number(v.toFixed(2)) : null;

export const validateRankInput = (value: number | null) =>
  value != null && value >= 1 && value <= 10;


const recomputeTimers = new Map<string, ReturnType<typeof setTimeout>>();



// saveChangesService
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
  
  if (overallRankInput === "" && newPhotoUri === "" && newTitle === "") return;
  const num = parseFloat(overallRankInput.replace(",", "."));

  if (!realm || !object) return;

  try {
    let destPath: string | null = null;

    if (newPhotoUri && !newPhotoUri.startsWith(FileSystem.documentDirectory || "")) {
      destPath = `${FileSystem.documentDirectory}${object._id.toHexString()}.jpg`;

      if (object.photo && object.photo !== destPath) {
        try {
          await FileSystem.deleteAsync(object.photo, { idempotent: true });
        } catch (e) {
          console.warn("Не удалось удалить старое фото:", e);
        }
      }

      await FileSystem.copyAsync({ from: newPhotoUri, to: destPath });
    }

    realm.write(() => {
      if (newTitle.trim()) object.name = newTitle.trim();
      if (destPath) {
        object.photo = destPath;
        setNewPhotoUri?.(destPath + "?t=" + Date.now());
      }
      if (num && !!validateRankInput(num)) object.overall_rank = Number(num.toFixed(2));
    });

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
    console.error(err);
    Alert.alert("Ошибка", String(err));
  }
}






// deleteObjectService
export function deleteObject(realm: Realm | undefined | null, object: GradeObject | null | undefined): boolean {
  if (!realm || !object) return false;
  try {
    realm.write(() => {
      
      realm.delete(object)


    });
    return true;
  } catch (e) {
    console.error("deleteObjectService error:", e);
    return false;
  }
}


export async function batchCreateObjects({
  realm,
  items,
  classObj,
  tags,
}: {
  realm: Realm;
  items: { name: string; photo?: string; overallRank?: number; description?: string }[];
  classObj: ClassOfGrading;
  tags?: Tag[];
}) {
  const validItems = items.filter(i => i.name.trim());
  if (!validItems.length) return;

  const prepared = await Promise.all(
    validItems.map(async (item) => {
      if (!item.photo) {
        return { name: item.name, destPath: undefined, overallRank: item.overallRank, description: item.description };
      }
      const id = new Realm.BSON.ObjectId();
      const destPath = `${FileSystem.documentDirectory}${id.toHexString()}.jpg`;
      await FileSystem.copyAsync({ from: item.photo, to: destPath });
      return { name: item.name, destPath, id, overallRank: item.overallRank, description: item.description };
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
        overall_rank: item.overallRank ?? null,
        description: item.description?.trim() || undefined,
        tags: tags ? [...tags] : [],
      }) as GradeObject;
      classObj.objects.push(newObj);
    }
    // onChangeClass re-syncs every object of the class anyway, so one call
    // after the whole batch is inserted is enough (was O(n^2) per-item before)
    onChangeClass(realm, classObj._id ?? null);
  });
}
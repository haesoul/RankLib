import { ClassOfGrading } from "@/realm/models";
import { Callbacks } from "@/tools";
import * as FileSystem from "expo-file-system";
import Realm from "realm";

interface CreateClassArgs extends Callbacks {
  realm: Realm;
  name: string | null;
  photo: string | undefined;
  priority: string | null;


}

export const createClass = async ({
  realm,
  name,
  photo,
  priority,

}: CreateClassArgs) => {
  if (!name?.trim()) {
    return;
  }

  let destPath: string | undefined;
  const class_id = new Realm.BSON.ObjectId();

  if (photo) {
    destPath = `${FileSystem.documentDirectory}${class_id.toHexString()}.jpg`;

    await FileSystem.copyAsync({
      from: photo,
      to: destPath,
    });
  }

  const parsedPriority = parseInt(priority ?? "1");

  if (isNaN(parsedPriority) || parsedPriority < 1) {
    console.error("Ошибка", "Приоритет должен быть числом >= 1");
    return;
  }

  try {
    realm.write(() => {
      realm.create<ClassOfGrading>("ClassOfGrading", {
        _id: class_id,
        name: name.trim(),
        photo: destPath,
        priority: parsedPriority,
        categories: [],
        objects: [],
        tags: [],
      });
    });
    return class_id;
  } catch (err) {
    console.error("Не удалось создать класс", err)
  }
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

// updateClassOfGrading
export const updateClass = (
  realm: Realm,
  objectToUpdate: ClassOfGrading, 
  updates: UpdateGradingProps
) => {
  if (!objectToUpdate || !updates || Object.keys(updates).length === 0) return;

  try {
    realm.write(() => {
      (Object.keys(updates) as Array<keyof UpdateGradingProps>).forEach((key) => {
        const value = updates[key];

        const isStringEmpty = typeof value === "string" && value.trim().length === 0;
        const isNullish = value === null || value === undefined;

        if (!isStringEmpty && !isNullish) {
          // @ts-ignore
          objectToUpdate[key] = value;
        }
      });
      
    });
  } catch (error) {
    console.error("Ошибка при обновлении ClassOfGrading:", error);
  }
};

export interface ClassData {
  name: string;
  photo?: string;
  priority?: string;
}

export const createClassesBulk = async (
  realm: Realm,
  classesData: ClassData[]
) => {
  const preparedItems = await Promise.all(
    classesData.map(async (item) => {
      if (!item.name?.trim()) return null;

      const class_id = new Realm.BSON.ObjectId();
      let destPath: string | undefined;

      if (item.photo) {
        destPath = `${FileSystem.documentDirectory}${class_id.toHexString()}.jpg`;
        try {
          await FileSystem.copyAsync({
            from: item.photo,
            to: destPath,
          });
        } catch (err) {
          console.error(`Ошибка копирования фото для ${item.name}:`, err);
        }
      }

      const parsedPriority = parseInt(item.priority ?? "1");
      const finalPriority = isNaN(parsedPriority) || parsedPriority < 1 ? 1 : parsedPriority;

      return {
        _id: class_id,
        name: item.name.trim(),
        photo: destPath,
        priority: finalPriority,
      };
    })
  );

  const validItems = preparedItems.filter((item): item is NonNullable<typeof item> => item !== null);
  if (validItems.length === 0) return [];

  try {
    realm.write(() => {
      validItems.forEach((data) => {
        realm.create("ClassOfGrading", {
          ...data,
          categories: [],
          objects: [],
          tags: [],
        });
      });
    });

    return validItems.map(item => item._id);
  } catch (err) {
    console.error("Критическая ошибка при массовом сохранении в Realm:", err);
    throw err; 
  }
};
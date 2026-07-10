import { Category, ClassOfGrading, SubCategory } from "@/realm/models";
import { Callbacks } from "@/tools";
import { getNextPriority } from "@/tools/categoryService";

// update method is in categort.client.


// addSubcategory
export function createSubCategory(
  classObj: ClassOfGrading,
  realm: Realm,
  catId: Realm.BSON.ObjectId,
  subName: string,
  callbacks: Callbacks = {},
  priority?: number,
  weight?: number
) {
  const { setReloadFlag, onChangeClass, setNewSubName, setTargetCategoryId, showAlert } = callbacks;

  const name = (subName ?? "").trim();
  if (!name) {
    console.log("Ошибка", "Название подкатегории не может быть пустым")
    return;
  }
  if (!classObj || !realm) {
    console.log("Ошибка", "Класс или Realm не найдены")
    return;
  }
  const cat = (classObj.categories || []).find((c: any) => String(c._id) === String(catId));
  if (!cat) {
    console.log('Категория не найдена')
    return;
  }

  if (!weight) {
    weight = 1
  }
  try {
    realm.write(() => {
    let finalPriority =
      typeof priority === "number"
        ? priority
        : getNextPriority(cat.subcategories);
      if (finalPriority === -1) finalPriority = getNextPriority(cat.subcategories);
      const created = realm.create<SubCategory>("SubCategory", {
        _id: new Realm.BSON.ObjectId(),
        name,
        category: cat,
        priority: finalPriority,
        // weight
      });
      (cat.subcategories as unknown as SubCategory[]).push(created);
    });

    setReloadFlag?.();
    onChangeClass?.(realm, classObj._id ?? null);
    setNewSubName?.("");
    setTargetCategoryId?.(null);
  } catch (err) {
    console.error("addSubcategory error:", err);
  }
}

// confirmDeleteSub
export function deleteSubCategory(
  classObj: ClassOfGrading,
  realm: Realm,
  subId: Realm.BSON.ObjectId,
  callbacks: Callbacks = {}
) {
  const { setReloadFlag, onChangeClass, setTargetCategoryId, showAlert } = callbacks;

  if (!classObj || !realm) return;

  let found: SubCategory | null = null;
  for (const c of Array.from(classObj.categories ?? []) as Category[]) {
    const s = (c.subcategories || []).find((ss: any) => String(ss._id) === String(subId));
    if (s) {
      found = s as SubCategory;
      break;
    }
  }

  if (!found) return;

  try {
      const toDelete = realm.objectForPrimaryKey(SubCategory, found!._id);
      if (!toDelete) return;
      realm.write(() => {
      
      if (toDelete) realm.delete(toDelete); 
      });

      setReloadFlag?.();
      onChangeClass?.(realm, classObj._id ?? null);
      setTargetCategoryId?.(null);
  } catch (err) {
      console.error("confirmDeleteSub error:", err);
  }

}
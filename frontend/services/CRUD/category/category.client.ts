import { Category, ClassOfGrading, LeaderboardEntry, SubCategory } from "@/realm/models";
import { Callbacks } from "@/tools";
import { getNextPriority } from "@/tools/categoryService";
import Realm from "realm";

// addCategory
export function createCategory(
  classObj: ClassOfGrading,
  realm: Realm,
  callbacks: Callbacks = {},
  catName: string, 
  priority?: number,
  weight?: number
) {
  const { setReloadFlag, onChangeClass, setNewCategoryName, showAlert } = callbacks;
  const name = (catName ?? "").trim();
  if (!name) {
    return;
  }
  if (!classObj || !realm) {
    console.log("Ошибка", "Класс или Realm не найдены")
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
          : getNextPriority(classObj.categories);
      if (finalPriority === -1) finalPriority = getNextPriority(classObj.categories);

      const created = realm.create<Category>("Category", {
        _id: new Realm.BSON.ObjectId(),
        name,
        class_of_category: classObj,
        subcategories: [],
        priority: finalPriority,
        weight: weight
      });
      (classObj.categories as unknown as Category[]).push(created);
    });

    setReloadFlag?.();
    onChangeClass?.(realm, classObj._id ?? null);
    setNewCategoryName?.("");
  } catch (err) {
    console.log("Ошибка", "Не удалось добавить категорию: " + String(err))
    console.error("addCategory error:", err);
  }
}
// renameCategory
export function updateCatogory(
  classObj: ClassOfGrading, 
  obj: Category | SubCategory, 
  new_name: string | null, 
  new_weight: number | null, 
  new_priority: number | null,
  realm: Realm, 
  callbacks: Callbacks = {}
  ) {
  realm.write(() => {
    if (new_name) obj.name = new_name;
    if (new_weight) obj.weight = new_weight;
    if (new_priority) obj.priority = new_priority
  });
  const { onChangeClass } = callbacks;
  onChangeClass?.(realm, classObj?._id ?? null);
}

// confirmDeleteCategory
export function deleteCategory(
  classObj: ClassOfGrading,
  realm: Realm,
  catId: Realm.BSON.ObjectId,
  callbacks: Callbacks & { currentTargetCategoryId?: Realm.BSON.ObjectId | null } = {}
) {
  const { setReloadFlag, onChangeClass, setTargetCategoryId, showAlert, currentTargetCategoryId, onSuccess } = callbacks;

  if (!classObj || !realm) return;
  try {
    
    
  } catch (err) {
    console.log(err)
  }
  try {
      const cat = (classObj.categories || []).find((c: any) => String(c._id) === String(catId));
      if (!cat) return;

      realm.write(() => {
        for (const s of Array.from(cat.subcategories ?? []) as SubCategory[]) {
          realm.delete(s);
        }
        
        const entries = realm.objects(LeaderboardEntry).filtered("category == $0", cat);
        realm.delete(entries);

        realm.delete(cat);
      });

      setReloadFlag?.();
      onChangeClass?.(realm, classObj._id ?? null);
      onSuccess?.()

      if (currentTargetCategoryId && String(currentTargetCategoryId) === String(catId)) {
      setTargetCategoryId?.(null);
      }
  } catch (err) {
      console.log("Ошибка", "Не удалось удалить категорию: " + String(err))
      console.error("confirmDeleteCategory error:", err);
  }
}


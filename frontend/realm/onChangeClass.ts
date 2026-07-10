import Realm from "realm";
import { CategoryOfObject, ClassOfGrading, SubCategoryOfObject } from "./models";

// export function onChangeClass(realm: Realm, classId?: Realm.BSON.ObjectId | null) {
//   if (!classId) return;

//   const classObj = realm.objectForPrimaryKey<ClassOfGrading>("ClassOfGrading", classId);
//   if (!classObj) return;

//   const templateCategories = Array.from(classObj.categories ?? []);
//   const templateCatIdSet = new Set(templateCategories.map(c => c._id.toHexString()));

//   const objectsOfClass = Array.from(classObj.objects ?? []);

//   const sync = () => {
//     for (const go of objectsOfClass) {
//       for (const catObj of Array.from(go.categories_of_object)) {
//         const linkedCatId = catObj.category?._id?.toHexString();
//         if (!linkedCatId || !templateCatIdSet.has(linkedCatId)) {
//           for (const sub of Array.from(catObj.subcategories_of_category)) {
//             realm.delete(sub);
//           }
//           realm.delete(catObj);
//         }
//       }

//       for (const templateCat of templateCategories) {
//         let catObj = go.categories_of_object.find(
//           c => c.category?._id?.toHexString() === templateCat._id.toHexString()
//         );
//         if (!catObj) {
//           catObj = realm.create<CategoryOfObject>("CategoryOfObject", {
//             _id: new Realm.BSON.ObjectId(),
//             category: templateCat,
//             object: go,
//             rank: null,
//             subcategories_of_category: [],
//           });
//           go.categories_of_object.push(catObj);
//         }

//         const templateSubs = Array.from(templateCat.subcategories ?? []);
//         const templateSubIdSet = new Set(templateSubs.map(s => s._id.toHexString()));

//         for (const subObj of Array.from(catObj.subcategories_of_category)) {
//           const linkedSubId = subObj.subcategory?._id?.toHexString();
//           if (!linkedSubId || !templateSubIdSet.has(linkedSubId)) {
//             realm.delete(subObj);
//           }
//         }

//         for (const templateSub of templateSubs) {
//           const exists = catObj.subcategories_of_category.some(
//             s => s.subcategory?._id?.toHexString() === templateSub._id.toHexString()
//           );
//           if (!exists) {
//             const newSub = realm.create<SubCategoryOfObject>("SubCategoryOfObject", {
//               _id: new Realm.BSON.ObjectId(),
//               subcategory: templateSub,
//               category_of_object: catObj,
//               rank: null,
//             });
//             catObj.subcategories_of_category.push(newSub);
//           }
//         }
//       }
//     }
//   };

//   if (realm.isInTransaction) {
//     sync();
//   } else {
//     realm.write(sync);
//   }
// }


export function onChangeClass(realm: Realm, classId?: Realm.BSON.ObjectId | null) {
  if (!classId) return;

  const classObj = realm.objectForPrimaryKey<ClassOfGrading>("ClassOfGrading", classId);
  if (!classObj) return;

  const templateCategories = Array.from(classObj.categories ?? []);
  const objectsOfClass = Array.from(classObj.objects ?? []);

  if (objectsOfClass.length === 0) return;

  // Предвычисляем один раз: Map шаблонов категорий и их подкатегорий
  // Это избегает повторного поиска внутри O(N*M) цикла
  const templateCatMap = new Map(
    templateCategories.map(c => [c._id.toHexString(), c])
  );
  const templateSubMap = new Map(
    templateCategories.map(c => [
      c._id.toHexString(),
      new Map(Array.from(c.subcategories ?? []).map(s => [s._id.toHexString(), s]))
    ])
  );

  const sync = () => {
    for (const go of objectsOfClass) {
      // --- Удаляем CategoryOfObject, чья категория удалена из шаблона ---
      const existingCatIds = new Set<string>();
      for (const catObj of Array.from(go.categories_of_object)) {
        const linkedCatId = catObj.category?._id?.toHexString();
        if (!linkedCatId || !templateCatMap.has(linkedCatId)) {
          for (const sub of Array.from(catObj.subcategories_of_category)) {
            realm.delete(sub);
          }
          realm.delete(catObj);
        } else {
          existingCatIds.add(linkedCatId);
        }
      }

      // --- Добавляем недостающие CategoryOfObject ---
      for (const [catIdHex, templateCat] of templateCatMap) {
        let catObj = existingCatIds.has(catIdHex)
          ? go.categories_of_object.find(
              c => c.category?._id?.toHexString() === catIdHex
            )
          : undefined;

        if (!catObj) {
          catObj = realm.create<CategoryOfObject>("CategoryOfObject", {
            _id: new Realm.BSON.ObjectId(),
            category: templateCat,
            object: go,
            rank: null,
            subcategories_of_category: [],
          });
          go.categories_of_object.push(catObj);
        }

        // --- Подкатегории: удаляем устаревшие ---
        const templateSubsForCat = templateSubMap.get(catIdHex)!;
        for (const subObj of Array.from(catObj.subcategories_of_category)) {
          const linkedSubId = subObj.subcategory?._id?.toHexString();
          if (!linkedSubId || !templateSubsForCat.has(linkedSubId)) {
            realm.delete(subObj);
          }
        }

        // --- Подкатегории: добавляем недостающие ---
        const existingSubIds = new Set(
          Array.from(catObj.subcategories_of_category)
            .map(s => s.subcategory?._id?.toHexString())
            .filter(Boolean)
        );
        for (const [subIdHex, templateSub] of templateSubsForCat) {
          if (!existingSubIds.has(subIdHex)) {
            const newSub = realm.create<SubCategoryOfObject>("SubCategoryOfObject", {
              _id: new Realm.BSON.ObjectId(),
              subcategory: templateSub,
              category_of_object: catObj,
              rank: null,
            });
            catObj.subcategories_of_category.push(newSub);
          }
        }
      }
    }
  };

  if (realm.isInTransaction) {
    sync();
  } else {
    realm.write(sync);
  }
}
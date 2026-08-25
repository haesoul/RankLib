import Realm from "realm";
import { CategoryOfObject, ClassOfGrading, SubCategoryOfObject } from "./models";

export function onChangeClass(realm: Realm, classId?: Realm.BSON.ObjectId | null) {
  if (!classId) return;

  const classObj = realm.objectForPrimaryKey<ClassOfGrading>("ClassOfGrading", classId);
  if (!classObj) return;

  const templateCategories = Array.from(classObj.categories ?? []);
  const objectsOfClass = Array.from(classObj.objects ?? []);

  if (objectsOfClass.length === 0) return;


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

        const templateSubsForCat = templateSubMap.get(catIdHex)!;
        for (const subObj of Array.from(catObj.subcategories_of_category)) {
          const linkedSubId = subObj.subcategory?._id?.toHexString();
          if (!linkedSubId || !templateSubsForCat.has(linkedSubId)) {
            realm.delete(subObj);
          }
        }

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
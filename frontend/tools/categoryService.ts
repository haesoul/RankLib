import { Category, CategoryOfObject, ClassOfGrading, GradeObject, LeaderboardEntry, SubCategory, SubCategoryOfObject } from "@/realm/models";
import Realm from "realm";


import { Callbacks } from ".";



export function deleteAllCategories(
  classObj: ClassOfGrading, 
  realm: Realm, 
  callbacks: Callbacks = {}
) {
  if (!classObj || !realm) return;
  const { setReloadFlag, setTargetCategoryId, onChangeClass, setOpenDeleteModal, onSuccess } = callbacks;

  try {
    const categoriesToDelete = [...(classObj.categories || [])];

    const catIds = categoriesToDelete
      .filter(c => c.isValid())
      .map(c => c._id);

    realm.write(() => {
      if (catIds.length > 0) {
        const entries = realm.objects("LeaderboardEntry").filtered(
          "category._id IN $0",
          catIds
        );
        realm.delete(entries);
      }

      for (const cat of categoriesToDelete) {
        if (!cat.isValid()) continue;

        const subsToDelete = [...(cat.subcategories || [])];
        for (const sub of subsToDelete) {
          if (sub.isValid()) realm.delete(sub);
        }

        realm.delete(cat);
      }
    });

    onSuccess?.(); 
    setReloadFlag?.();
    setTargetCategoryId?.(null);
    setOpenDeleteModal?.(false);
    onChangeClass?.(realm, classObj._id ?? null);

  } catch (err) {
    console.error("Failed to delete all categories:", err);
  }
}

type HasPriority = {
  priority?: number | null;
};

export function getNextPriority<T extends HasPriority>(
  items: readonly T[] | Realm.List<T>
): number {
  let max = 0;

  for (const item of items) {
    const p = item?.priority;
    if (typeof p === "number" && p >= 0 && p > max) {
      max = p;
    }
  }

  return max + 1;
}





export function deleteSelectedCategories(
  classObj: ClassOfGrading,
  realm: Realm,
  catIds: Realm.BSON.ObjectId[],
  callbacks: any = {}
) {
  const { setReloadFlag, onChangeClass, setTargetCategoryId, onSuccess } = callbacks;

  if (!classObj || !realm || catIds.length === 0) return;

  try {
    const catsToDelete = catIds
      .map(id => (classObj.categories || []).find((c: any) => c._id.equals(id)))
      .filter((c): c is Category => !!c && c.isValid());
    realm.write(() => {
      const entries = realm.objects("LeaderboardEntry").filtered(
        "category._id IN $0",
        catsToDelete.map(c => c._id)
      );
      realm.delete(entries);

      for (const cat of catsToDelete) {
        if (cat.subcategories) {
          for (const s of Array.from(cat.subcategories) as any[]) {
            if (s.isValid()) realm.delete(s);
          }
        }
        realm.delete(cat);
      }
    });

    setReloadFlag?.();
    onChangeClass?.(realm, classObj._id);
    onSuccess?.();
    setTargetCategoryId?.(null);

  } catch (err) {
    console.error("bulkDeleteCategories error:", err);
  }
}


export const getPriority = (item: any): number | null => {
  if (!item) return null;
  const catPri = item?.category && Number.isFinite(item.category.priority) ? item.category.priority : null;
  if (catPri !== null) return catPri;

  const subPri = item?.subcategory && Number.isFinite(item.subcategory.priority) ? item.subcategory.priority : null;
  if (subPri !== null) return subPri;

  if (Number.isFinite(item.priority)) return item.priority;

  if (Number.isFinite(item.rank)) return item.rank;

  return null;
};

export const getDate = (item: any): Date => {
  if (!item) return new Date(0);

  if (item.date) return new Date(item.date);
  if (item.createdAt) return new Date(item.createdAt);
  if (item.created_at) return new Date(item.created_at);

  if (item.category) {
    const d = getDate(item.category);
    if (+d !== 0) return d;
  }
  if (item.subcategory) {
    const d = getDate(item.subcategory);
    if (+d !== 0) return d;
  }

  if (item._id && typeof item._id.getTimestamp === "function") {
    try {
      const ts = item._id.getTimestamp();
      if (ts instanceof Date) return ts;
    } catch (e) {
    }
  }

  return new Date(0);
};

const extractName = (item: any): string => {
  return (
    (item?.category?.name ?? item?.subcategory?.name ?? item?.name ?? item?.title ?? "")
      .toString()
  );
};

export const compareByPriorityThenDate = (a: any, b: any): number => {
  const pa = getPriority(a);
  const pb = getPriority(b);

  const aPrefersDate = pa === -1 || pa == null;
  const bPrefersDate = pb === -1 || pb == null;

  if (pa != null && pa !== -1 && pb != null && pb !== -1) {
    if (pa !== pb) return pa - pb;
    return +getDate(b) - +getDate(a);
  }

  if (pa != null && pa !== -1 && (pb === -1 || pb == null)) return -1;
  if (pb != null && pb !== -1 && (pa === -1 || pa == null)) return 1;

  const da = getDate(a);
  const db = getDate(b);
  if (+db !== +da) return +db - +da;

  const na = extractName(a);
  const nb = extractName(b);
  return na.localeCompare(nb);
};



export function updateRankService(
  realm: Realm | undefined | null,
  cat: CategoryOfObject,
  value: string,
  sub?: SubCategoryOfObject
): boolean {
  if (!realm) return false;

  const raw = value?.trim() ?? "";

  if (raw === "") {
    realm.write(() => {
      if (sub) sub.rank = null;
      else cat.rank = null;
    });
    return true;
  }

  let parsed = parseFloat(raw.replace(",", "."));

  if (Number.isNaN(parsed)) return false;

  if (parsed > 10) parsed = 10
  if (parsed < 1) parsed = 1
  realm.write(() => {
    const fixed = Number(parsed.toFixed(2));
    if (sub) sub.rank = fixed;
    else cat.rank = fixed;

  });
  recomputeLeaderboard(
    realm,
    cat.object.class_of_object,
    cat.category
  );
  return true;
}

export function updateCatRankBySubs(categoryObject: CategoryOfObject): number | null {
  const subcategories = categoryObject.subcategories_of_category;

  if (!subcategories || subcategories.length === 0) {
    categoryObject.rank = null;
    return null;
  }

  const valid = subcategories.filter(s => typeof s.rank === 'number' && Number.isFinite(s.rank));

  if (valid.length === 0) {
    categoryObject.rank = null;
    return null;
  }

  const total = valid.reduce((acc, s) => acc + s.rank!, 0);
  const result = Number((total / valid.length).toFixed(2));

  categoryObject.rank = result;

  return result;
}

export function updateCatsRankBySubs(categories: CategoryOfObject[]) {
  categories.map(cat => updateCatRankBySubs(cat));
}


export function recomputeLeaderboard(
  realm: Realm,
  classObj: ClassOfGrading,
  category: Category
) {
  const objects = realm.objects(GradeObject)
    .filtered("class_of_object == $0", classObj);
  const scored: { obj: GradeObject; score: number }[] = [];

  for (const obj of objects) {
    const cat = obj.categories_of_object.find(c => c.category._id.equals(category._id));
    if (cat?.rank != null) {
      scored.push({ obj, score: cat.rank });
    }
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    a.obj._id.toHexString().localeCompare(b.obj._id.toHexString())
  );

  const top = scored.slice(0, 10);

  realm.write(() => {
    const toDelete = realm.objects(LeaderboardEntry)
      .filtered("classOfGrading == $0 AND category == $1", classObj, category);
    realm.delete(toDelete);

    for (const item of top) {
      realm.create(LeaderboardEntry, {
        _id: new Realm.BSON.ObjectId(),
        classOfGrading: classObj,
        category,
        object: item.obj,
        rankValue: item.score,
        period: "all_time",
        updatedAt: new Date(),
      });
    }
  });
}


function getOrCreateCOR(
  realm: Realm,
  obj: GradeObject,
  category: Category,
  categoryId: string
): CategoryOfObject {
  const existing = Array.from(obj.categories_of_object).find(
    (r) => r.category._id.toHexString() === categoryId
  );
  if (existing) return existing;

  const cor = realm.create<CategoryOfObject>("CategoryOfObject", {
    _id: new Realm.BSON.ObjectId(),
    category,
    object: obj,
    rank: undefined,
    subcategories_of_category: [],
    proof: undefined,
  });
  obj.categories_of_object.push(cor);
  return cor;
}

export function writeCategoryRank(
  realm: Realm,
  obj: GradeObject,
  category: Category,
  categoryId: string,
  newRank: number | null
): void {
  realm.write(() => {
    const cor = getOrCreateCOR(realm, obj, category, categoryId);
    cor.rank = newRank ?? undefined;
  });
}

export function writeSubcategoryRank(
  realm: Realm,
  obj: GradeObject,
  category: Category,
  categoryId: string,
  subcategory: SubCategory,
  subcategoryId: string,
  newRank: number | null
): void {
  realm.write(() => {
    const cor = getOrCreateCOR(realm, obj, category, categoryId);

    const existing = Array.from(cor.subcategories_of_category).find(
      (s) => s.subcategory._id.toHexString() === subcategoryId
    );

    if (existing) {
      existing.rank = newRank ?? undefined;
    } else {
      const sub = realm.create<SubCategoryOfObject>("SubCategoryOfObject", {
        _id: new Realm.BSON.ObjectId(),
        subcategory,
        category_of_object: cor,
        rank: newRank ?? undefined,
        color: undefined,
        proof: undefined,
      });
      cor.subcategories_of_category.push(sub);
    }
  });
}

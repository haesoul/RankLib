import { Category, ClassOfGrading, GradeObject, Tag } from "@/realm/models";
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


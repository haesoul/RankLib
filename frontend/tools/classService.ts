import { ClassOfGrading, RankType, Tag } from "@/realm/models";

import Realm from "realm";




export function createClassTagService(
  realm: Realm | null | undefined,
  classObj: ClassOfGrading | null | undefined,
  tagName: string
): boolean {
  if (!realm || !classObj) return false;

  const name = tagName.trim();
  if (!name) return false;

  try {
    realm.write(() => {
      if (classObj.tags === undefined) return;
      const existsInClass = classObj.tags.some(
        (t) => t.name.toLowerCase() === name.toLowerCase()
      );
      if (existsInClass) return; 

      const newTag = realm.create<Tag>("Tag", {
        _id: new Realm.BSON.ObjectId(),
        name: name,
        createdAt: new Date(),
      });

      classObj.tags.push(newTag);
    });

    return true;
  } catch (error) {
    console.error("Error creating tag:", error);
    return false;
  }
}



export const createRankType = (
  realm: Realm,
  classId: Realm.BSON.ObjectId,
  data: {
    name: string;
    fromRank: number;
    color: string;
  }
): void => {
  const parentClass = realm.objectForPrimaryKey(ClassOfGrading, classId);

  if (!parentClass) {
    throw new Error("ClassOfGrading not found");
  }

  realm.write(() => {
    const newRankType = realm.create(RankType, {
      _id: new Realm.BSON.ObjectId(),
      name: data.name,
      fromRank: data.fromRank,
      color: data.color,
      createdAt: new Date(),
    });

    parentClass.rankTypes?.push(newRankType);
  });
};


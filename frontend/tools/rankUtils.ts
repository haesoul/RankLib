import { Colors } from "@/CONSTANTS";
import { GradeObject } from "@/realm/models";

export type GradeMode = "category" | "subcategory";

export function getRankColor(rank: number | null | undefined): string {
  if (rank == null) return Colors.textSecondary;
  if (rank >= 9) return "#FFD700";
  if (rank >= 7) return "#2ECC71";
  if (rank >= 5) return Colors.primary;
  if (rank >= 3) return "#F39C12";
  return Colors.error;
}

export function getRankLabel(rank: number | null | undefined): string {
  if (rank == null) return "—";
  return rank.toFixed(1);
}

export function getObjectRank(
  obj: GradeObject,
  mode: GradeMode,
  categoryId: string,
  subcategoryId: string
): number | null {
  if (mode === "category") {
    const cor = Array.from(obj.categories_of_object).find(
      (r) => r.category._id.toHexString() === categoryId
    );
    return cor?.rank ?? null;
  }
  for (const cor of Array.from(obj.categories_of_object)) {
    if (cor.category._id.toHexString() === categoryId) {
      const sub = Array.from(cor.subcategories_of_category).find(
        (s) => s.subcategory._id.toHexString() === subcategoryId
      );
      return sub?.rank ?? null;
    }
  }
  return null;
}

export function sortObjectsByRank(
  objects: GradeObject[],
  mode: GradeMode,
  categoryId: string,
  subcategoryId: string
): GradeObject[] {
  return objects
    .map(obj => ({
      obj,
      rank: getObjectRank(obj, mode, categoryId, subcategoryId),
    }))
    .sort((a, b) => {
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return b.rank - a.rank;
    })
    .map(({ obj }) => obj);
}

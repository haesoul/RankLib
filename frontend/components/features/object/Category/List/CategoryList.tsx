import styles from "@/app/object/STYLES";
import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import { CategoryOfObject, SubCategoryOfObject } from "@/realm/models";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const to2 = (v: any) =>
  Number.isFinite(v) ? Number(v.toFixed(2)) : null;

interface Props {
  sortedCategories: CategoryOfObject[];
  expandedCategories: Record<string, boolean>;
  categoryInputs: Record<string, string>;
  subcategoryInputs: Record<string, string>;
  onToggleCategory: (catId: string) => void;
  onUpdateRank: (cat: CategoryOfObject, value: string, sub?: SubCategoryOfObject) => void;
}

export default function ShowCategoriesOfObject({
  sortedCategories,
  expandedCategories,
  categoryInputs,
  subcategoryInputs,
  onToggleCategory,
  onUpdateRank,
}: Props) {
  const { t } = useTranslation();

  if (!sortedCategories || sortedCategories.length === 0) {
    return (
      <Text style={styles.emptyText}>{t('categories.no_categories')}</Text>
    );
  }

  return (
    <>
      {sortedCategories.map(cat => {
        // Read name directly from the live Realm object, not a snapshot
        const catId = cat._id.toHexString();
        const catName = cat.category?.name ?? t('common.without_name');
        const catRank = to2(cat.rank);

        return (
          <View key={catId} style={styles.card}>
            <Button
              title={
                <Text style={styles.categoryTitle}>
                  {catName} — {catRank ?? "—"}
                </Text>
              }
              onPress={() => onToggleCategory(catId)}
              style={styles.categoies}
            />
            <Input
              placeholder={t('grading.grade')}
              value={categoryInputs[catId] ?? (cat.rank != null ? String(to2(cat.rank)) : "")}
              onChangeText={val => onUpdateRank(cat, val)}
              keyboardType="decimal-pad"
            />

            {expandedCategories[catId] && (
              cat.subcategories_of_category.length > 0 ? (
                cat.subcategories_of_category.map((sub: SubCategoryOfObject) => {
                  const subId = sub._id.toHexString();
                  const subName = sub.subcategory?.name ?? t('common.without_name');
                  const subRank = to2(sub.rank);

                  return (
                    <View key={subId} style={styles.subBox}>
                      <Text style={styles.subcategoies}>
                        {subName} — {subRank ?? "—"}
                      </Text>
                      <Input
                        placeholder={t('grading.grade')}
                        value={
                          subcategoryInputs[subId] ??
                          (sub.rank != null ? String(to2(sub.rank)) : "")
                        }
                        onChangeText={val => onUpdateRank(cat, val, sub)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  );
                })
              ) : (
                <Text style={styles.subcategory}>
                  {t('categories.no_subcategories')}
                </Text>
              )
            )}
          </View>
        );
      })}
    </>
  );
}

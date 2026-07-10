import styles from "@/app/object/STYLES";
import Button from "@/components/UI/Buttons/Button";
import { GradeObject } from "@/realm/models";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";


interface Props {
  object: GradeObject;
  newPhotoUri: string | null;
  objectMenuOpen: boolean;
  setObjectMenuOpen: (v: boolean) => void;
  setEditing: (v: boolean) => void
}

export default function ObjectHeader({ object, newPhotoUri, objectMenuOpen,  setObjectMenuOpen, setEditing}: Props) {
  const { t } = useTranslation();

  const router = useRouter()


  return (
    <>
      <View style={styles.header}>
        {object.photo ? (
          <Image source={{ uri: newPhotoUri || object.photo }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.iconMenu}>
          <Button style={{width: 50, paddingHorizontal: 0 }} onPress={() => setObjectMenuOpen(!objectMenuOpen)}>
            <MaterialIcons name="menu" size={28} color="#fff" />

          </Button>
          <Button style={{width: 50, paddingHorizontal: 0 }} onPress={() => router.push(`/object/Galery/${object._id}`)}>
            <MaterialIcons name="photo" size={28} color="#fff" />
          </Button>
          <Button style={{width: 50, paddingHorizontal: 0 }} onPress={() => router.push(`/object/Notes/${object._id}`)}>
            <MaterialIcons name="sticky-note-2" size={28} color="#fff" />
          </Button>
        </View>
      </View>


      <View style={styles.objectCard}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.label}>{t('object.object')}</Text>
            <Text
              style={styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {object.name || t('common.without_name')}
            </Text>
          </View>

          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>
              ⭐ {object.overall_rank?.toFixed(2) ?? "—"}
            </Text>
          </View>
        </View>

        {object?.description && 
          <View style={styles.descriptionWrapper}>
            <Text style={styles.descriptionText}>{object?.description}</Text>
          </View>
        }
        {!object?.description &&
          <View style={{marginBottom: 25}}/>
        }
        <View style={styles.divider} />

          <Button
            title={t('common.edit')}
            textStyle={styles.buttonText}
            onPress={() => setObjectMenuOpen(true)}
          />
      </View>
    </>
  );
}

import Button from "@/components/UI/Buttons/Button";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from "react-native";
interface PickImageProps {
  photo?: string | null;
  onChange?: (uri: string) => void;
  isFullScreen?: boolean;
  sizeOption?: '1' | '3:4'; 
}

export default function PickImage ({photo, onChange, isFullScreen, sizeOption}: PickImageProps) {
  if (!onChange) return;
  const { t, i18n } = useTranslation()

  const aspectRatio = sizeOption === '3:4' ? 3 / 4 : 1;
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      console.log("Нет доступа к галерее");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      onChange(result.assets[0].uri)
    }
  };

  const containerStyle = [
    styles.baseContainer,
    { aspectRatio: aspectRatio },
    isFullScreen && styles.fullScreen
  ];
  return (
      <>
        {photo && !isFullScreen && (
          <Button 
            onPress={pickImage} 
            pickingImage={true}
            style={[styles.btn, { paddingVertical: 0, paddingHorizontal: 0,}]} 
            title={
              <Image 
                source={{ uri: photo }} 
                style={[ {width: '100%', height: '100%', borderRadius: 12}]} 
                resizeMode="cover"
              />
            } 
          />
        )}

        {photo && isFullScreen && (
          <View style={containerStyle}>
            <Button
              onPress={pickImage}
              pickingImage={true}
              style={[styles.btn, isFullScreen && styles.fullScreen, { padding: 0, overflow: 'hidden' }]}
              title={
                <Image 
                  source={{ uri: photo }} 
                  style={StyleSheet.absoluteFill} 
                  resizeMode="cover"
                />
              }
            />
          </View>            
        )}
          {!photo && <Button onPress={pickImage} title={t('pickImage.pick')}/>}
      </>
  )
}



const styles = StyleSheet.create({
  baseContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  fullScreen: {
    width: '100%',
    height: '100%'
  },
  btn: {
    width: '50%',
    aspectRatio: 1,
    borderRadius: 12,
    paddingHorizontal: 0,
    // marginBottom: 12,
    alignSelf: "center",
    margin: 7
  },
  uploadBtn: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  uploadText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "600",
  },


})

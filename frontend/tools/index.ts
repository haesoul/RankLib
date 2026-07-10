import { PRO_MODE } from "@/CONSTANTS";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Realm from "realm";


export type Callbacks = {
    setReloadFlag?: () => void;
    setTargetCategoryId?: (id: Realm.BSON.ObjectId | null) => void;
    onChangeClass?: (realm: Realm, id: Realm.BSON.ObjectId | null) => void;
    setOpenDeleteModal?: (value: boolean) => void;
    setNewCategoryName?: (v: string) => void;
    setNewSubName?: (v: string) => void;
    setOpenRenameModal?: (v: boolean) => void;

    setNewCatName?: (v: string) => void;

    setRenameValue?: (v: string) => void;
    showAlert?: (title: string, message?: string) => void;

    onSuccess?: () => void;
};




export const formatPrice = (price: string | number) => {
    return Number(price).toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
    });
};

export async function toggleProMode() {
  try {
    const currentMode = await AsyncStorage.getItem(PRO_MODE);
    const nextMode = currentMode === 'true' ? 'false' : 'true';
    
    await AsyncStorage.setItem(PRO_MODE, nextMode);
    return nextMode === 'true';
  } catch (e) {
    console.error("Ошибка при переключении Pro Mode:", e);
  }
}

export async function getProModeStatus() {
  try {
    const mode = await AsyncStorage.getItem(PRO_MODE)

    return mode
  } catch (err) {
    console.error(err)
  }
}
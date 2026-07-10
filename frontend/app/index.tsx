import 'react-native-get-random-values';


import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";


import { Colors } from '@/CONSTANTS';
import '@/i18n/index';
import { useRealm } from "@realm/react";
import { useTranslation } from 'react-i18next';




export default function Home() {
  const router = useRouter();
  const realm = useRealm()
  const [openCreateClass, setOpenCreateClass] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false)

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const {t, i18n} = useTranslation();
  const [show, setShow] = useState(false)
  const [langModal, setLangModal] = useState(false);
  function DeleteAll() {
    realm.write(() => {
      realm.deleteAll()
    })
    setOpenDeleteModal(false)
  }


  return <Redirect href={"/(tabs)/" as any} />;
  
}



const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.surfaceDarker,
  },

  buttonPrimary: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    backgroundColor: "#1A1A1A",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F5F5F5",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#B5B5B5",
    textAlign: "center",
  },

  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    
  },

  RNModalContainer: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    padding: 20,
  },
});
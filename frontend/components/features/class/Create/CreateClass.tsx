import Button from "@/components/UI/Buttons/Button";
import Input from "@/components/UI/Input/Input";
import Modal from "@/components/UI/Modal/Modal";
import PickImage from "@/components/UI/PickImage/PickImage";
import { ClassOfGrading } from "@/realm/models";
import { createClass } from "@/services/CRUD/class/class.client";
import { useRealm } from "@realm/react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from "react-native";

interface CreateClassProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (newClass: ClassOfGrading) => void;
}

const CreateClass: React.FC<CreateClassProps> = ({ visible, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState("1");
  const realm = useRealm();
  const [ready, setReady] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setReady(true), 100); 
      return () => clearTimeout(timer);
    } else {
      setReady(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} onClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
            <Text style={styles.title}>{t('class.create_new')}</Text>

            <Input
              placeholder={t('class.name_placeholder')}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />

            <Input
              placeholder={t('class.priority_placeholder')}
              value={priority}
              onChangeText={setPriority}
              keyboardType="numeric"
              placeholderTextColor="#aaa"
            />
            
            <PickImage photo={photo} onChange={setPhoto} />

            <View style={styles.buttons}>
              <Button onPress={onClose} title={t('common.cancel')} disabled={!ready}/>
              <Button 
                title={t('common.create')} 
                disabled={!ready} 
                onPress={async () => {
                  await createClass({ realm, name, photo, priority });
                  setName("");
                  setPriority("1");
                  setPhoto(undefined);
                  onClose();
                }}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CreateClass;



const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F5F5F5",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#2E2E2E",
    color: "#F5F5F5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  label: {
    color: "#F5F5F5",
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 14,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  buttonText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "600",
  },
  innerContainer: {
    width: "100%", 
  },

  
});
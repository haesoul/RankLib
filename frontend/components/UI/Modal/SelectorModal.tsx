import React from "react";
import { Modal, Pressable, View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Colors } from "@/CONSTANTS";

export interface SelectorItem { id: string; label: string; sub?: string; }

interface Props {
  visible: boolean;
  title: string;
  items: SelectorItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const SelectorModal: React.FC<Props> = ({ visible, title, items, selectedId, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.overlay} onPress={onClose}>
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.title}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.item}
              onPress={() => { onSelect(item.id); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[s.itemText, item.id === selectedId && { color: Colors.primary }]}>
                {item.label}
              </Text>
              {item.sub && <Text style={s.itemSub}>{item.sub}</Text>}
              {item.id === selectedId && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Pressable>
  </Modal>
);

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%", paddingHorizontal: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.inputBackground, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textOffWhite, marginBottom: 12 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 8 },
  itemText: { flex: 1, fontSize: 15, fontWeight: "500", color: Colors.text },
  itemSub: { fontSize: 12, color: Colors.textSecondary },
  check: { fontSize: 16, color: Colors.primary, fontWeight: "700" },
  sep: { height: 1, backgroundColor: Colors.backgroundSecondary },
});

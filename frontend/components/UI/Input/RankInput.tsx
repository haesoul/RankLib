import { Colors } from "@/CONSTANTS";
import { getRankColor, getRankLabel } from "@/tools/rankUtils";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

interface Props {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}

export const RankInput: React.FC<Props> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value != null ? String(value) : "");
  const color = getRankColor(value);

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(text);
    onChange(text.trim() === "" || isNaN(parsed) ? null : Math.min(10, Math.max(0, parsed)));
  };

  if (editing) {
    return (
      <TextInput
        style={[s.input, { borderColor: color, color }]}
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        autoFocus
        maxLength={5}
        selectTextOnFocus
        placeholderTextColor={Colors.textSecondary}
        placeholder="0–10"
      />
    );
  }

  return (
    <TouchableOpacity
      style={[s.badge, { borderColor: color + "60" }]}
      onPress={() => { setText(value != null ? String(value) : ""); setEditing(true); }}
      activeOpacity={0.7}
    >
      <Text style={[s.badgeText, { color }]}>{getRankLabel(value)}</Text>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  badge: {
    width: 64, height: 36, borderRadius: 8, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  badgeText: { fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  input: {
    width: 64, height: 36, borderRadius: 8, borderWidth: 1.5,
    backgroundColor: Colors.inputBackground,
    textAlign: "center", fontSize: 15, fontWeight: "700",
  },
});

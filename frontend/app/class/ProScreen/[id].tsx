import { ClassOfGrading, GradeObject } from "@/realm/models";
import { useRealm } from "@realm/react";
import { useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Realm from "realm";

// --- Colors ---
const Colors = {
  background: "#000000",
  backgroundSecondary: "#18181a",
  surface: "#121212",
  inputBackground: "#262626",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  primary: "#8B5CF6",
  accent: "#EC4899",
  error: "#FF4757",
  success: "#2ECC71",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.08)",
  primaryTransparent: "rgba(139, 92, 246, 0.15)",
};

// --- Types ---
interface ProObjectPayload {
  name: string;
  overall_rank?: number | null;
  description?: string;
  object_name?: string;
}

// --- Schema Docs ---
const SCHEMA_DOCS = [
  { field: "name", type: "string", required: true, desc: "Название объекта" },
  { field: "overall_rank", type: "number | null", required: false, desc: "Общий ранг (1–10, float)" },
  { field: "description", type: "string", required: false, desc: "Описание объекта" },
  { field: "object_name", type: "string", required: false, desc: "Кастомное имя объекта" },
];

const EXAMPLE_JSON = `{
  "name": "Fullmetal Alchemist",
  "overall_rank": 9.5,
  "description": "Культовое аниме про алхимиков",
  "object_name": "FMA"
}`;

const EXAMPLE_BATCH_JSON = `[
  { "name": "Naruto", "overall_rank": 7.8 },
  { "name": "Bleach", "overall_rank": 7.2 },
  { "name": "One Piece", "overall_rank": 9.1 }
]`;

// --- Validation for single object ---
function validateSingle(payload: any): { valid: boolean; error?: string } {
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "Ожидался объект {}" };
  }
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    return { valid: false, error: '"name" обязателен и должен быть строкой' };
  }
  if (payload.overall_rank !== undefined && payload.overall_rank !== null) {
    const r = Number(payload.overall_rank);
    if (isNaN(r) || r < 1 || r > 10) {
      return { valid: false, error: '"overall_rank" должен быть числом от 1 до 10' };
    }
  }
  return { valid: true };
}

// --- Component ---
export default function ProObjectScreen() {
  const realm = useRealm();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [jsonText, setJsonText] = useState(EXAMPLE_JSON);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Resolve class
  const classObj = id
    ? realm.objectForPrimaryKey<ClassOfGrading>(
        "ClassOfGrading",
        new Realm.BSON.ObjectId(id)
      )
    : null;

  const handleExecute = () => {
    setStatus("loading");
    setMessage(null);
    pulse();

    if (!classObj) {
      setStatus("error");
      setMessage("Класс не найден по id: " + id);
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setStatus("error");
      setMessage("Невалидный JSON: " + (e as Error).message);
      return;
    }

    // Normalize: single → array
    const items: any[] = Array.isArray(parsed) ? parsed : [parsed];

    if (items.length === 0) {
      setStatus("error");
      setMessage("Массив пуст");
      return;
    }

    // Validate all
    for (let i = 0; i < items.length; i++) {
      const v = validateSingle(items[i]);
      if (!v.valid) {
        setStatus("error");
        setMessage(`Объект [${i}]: ${v.error}`);
        return;
      }
    }

    try {
      realm.write(() => {
        for (const item of items) {
          const payload = item as ProObjectPayload;
          const rank =
            payload.overall_rank != null
              ? Number(Number(payload.overall_rank).toFixed(2))
              : null;

          const newObj = realm.create<GradeObject>("GradeObject", {
            _id: new Realm.BSON.ObjectId(),
            name: payload.name.trim(),
            class_of_object: classObj,
            categories_of_object: [],
            overall_rank: rank,
            media: [],
            notes: [],
            tags: [],
            description: payload.description?.trim() || undefined,
            object_name: payload.object_name?.trim() || undefined,
          });

          classObj.objects.push(newObj);
        }
      });

      const count = items.length;
      setStatus("success");
      setMessage(
        count === 1
          ? `Объект "${items[0].name.trim()}" успешно создан`
          : `${count} объектов успешно создано`
      );
    } catch (err) {
      setStatus("error");
      setMessage("Ошибка Realm: " + (err as Error).message);
    }
  };

  const statusColor =
    status === "success"
      ? Colors.success
      : status === "error"
      ? Colors.error
      : Colors.primary;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.title}>Создание объектов</Text>
          <Text style={styles.subtitle}>JSON Script Executor</Text>
          {classObj && (
            <View style={styles.classPill}>
              <Text style={styles.classPillLabel}>Класс: </Text>
              <Text style={styles.classPillName}>{classObj.name}</Text>
            </View>
          )}
          {!classObj && (
            <Text style={styles.errorInline}>⚠ Класс не найден</Text>
          )}
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "single" && styles.modeBtnActive]}
            onPress={() => {
              setMode("single");
              setJsonText(EXAMPLE_JSON);
              setStatus("idle");
              setMessage(null);
            }}
          >
            <Text style={[styles.modeBtnText, mode === "single" && styles.modeBtnTextActive]}>
              Один объект
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "batch" && styles.modeBtnActive]}
            onPress={() => {
              setMode("batch");
              setJsonText(EXAMPLE_BATCH_JSON);
              setStatus("idle");
              setMessage(null);
            }}
          >
            <Text style={[styles.modeBtnText, mode === "batch" && styles.modeBtnTextActive]}>
              Массово (массив)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Docs toggle */}
        <TouchableOpacity
          style={styles.docsToggle}
          onPress={() => setDocsExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.docsToggleIcon}>{docsExpanded ? "▼" : "▶"}</Text>
          <Text style={styles.docsToggleText}>Документация по полям</Text>
        </TouchableOpacity>

        {docsExpanded && (
          <View style={styles.docsBlock}>
            <Text style={styles.docsNote}>
              Принимает объект {} или массив [{}]. Поле{" "}
              <Text style={{ color: Colors.primary }}>class_of_object</Text> подставляется
              автоматически из параметра маршрута{" "}
              <Text style={{ color: Colors.accent, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" }}>id</Text>.
            </Text>
            {SCHEMA_DOCS.map((doc) => (
              <View key={doc.field} style={styles.docRow}>
                <View style={styles.docLeft}>
                  <Text style={styles.docField}>{doc.field}</Text>
                  <Text style={styles.docType}>{doc.type}</Text>
                  {doc.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>req</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.docDesc}>{doc.desc}</Text>
              </View>
            ))}
            <View style={styles.docsDivider} />
            <Text style={styles.docsNote}>
              ⚠ Категории и теги — через отдельные Pro-экраны.
            </Text>
          </View>
        )}

        {/* JSON Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Script</Text>
            <TouchableOpacity
              onPress={() => {
                setJsonText(mode === "single" ? EXAMPLE_JSON : EXAMPLE_BATCH_JSON);
                setStatus("idle");
                setMessage(null);
              }}
              style={styles.resetBtn}
            >
              <Text style={styles.resetBtnText}>Вставить пример</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.jsonInput}
            value={jsonText}
            onChangeText={(t) => {
              setJsonText(t);
              if (status !== "idle") setStatus("idle");
              setMessage(null);
            }}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={mode === "single" ? '{\n  "name": "..."\n}' : '[\n  { "name": "..." }\n]'}
            placeholderTextColor={Colors.textSecondary}
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>

        {/* Status */}
        {message && (
          <Animated.View
            style={[
              styles.statusMsg,
              { borderColor: statusColor, backgroundColor: statusColor + "15" },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.statusMsgText, { color: statusColor }]}>
              {status === "success" ? "✓ " : "✕ "}
              {message}
            </Text>
          </Animated.View>
        )}

        {/* Execute button */}
        <TouchableOpacity
          style={[
            styles.execBtn,
            !classObj && styles.execBtnDisabled,
            status === "loading" && styles.execBtnDisabled,
          ]}
          onPress={handleExecute}
          activeOpacity={0.8}
          disabled={!classObj || status === "loading"}
        >
          {status === "loading" ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <>
              <Text style={styles.execBtnIcon}>▶</Text>
              <Text style={styles.execBtnText}>Выполнить скрипт</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Только операция CREATE. Изменения необратимы.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },

  header: { marginBottom: 20, alignItems: "flex-start" },
  proBadge: {
    backgroundColor: Colors.primaryTransparent,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 10,
  },
  proBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: { color: Colors.text, fontSize: 26, fontWeight: "700", marginBottom: 2 },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginBottom: 10,
  },
  classPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  classPillLabel: { color: Colors.textSecondary, fontSize: 12 },
  classPillName: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  errorInline: { color: Colors.error, fontSize: 12, marginTop: 4 },

  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  modeBtnTextActive: { color: Colors.text },

  docsToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    marginBottom: 8,
  },
  docsToggleIcon: { color: Colors.primary, marginRight: 8, fontSize: 12 },
  docsToggleText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },

  docsBlock: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  docsNote: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  docRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  docLeft: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 120 },
  docField: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontWeight: "600",
  },
  docType: {
    color: Colors.accent,
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  requiredBadge: {
    backgroundColor: Colors.error + "25",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  requiredText: { color: Colors.error, fontSize: 9, fontWeight: "700" },
  docDesc: { color: Colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },
  docsDivider: { height: 1, backgroundColor: Colors.glassBorder, marginVertical: 6 },

  inputWrapper: { marginBottom: 16 },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 6,
  },
  resetBtnText: { color: Colors.textSecondary, fontSize: 11 },

  jsonInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    lineHeight: 20,
    minHeight: 220,
  },

  statusMsg: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  statusMsgText: { fontSize: 13, fontWeight: "600" },

  execBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  execBtnDisabled: { opacity: 0.5 },
  execBtnIcon: { color: Colors.text, fontSize: 14 },
  execBtnText: { color: Colors.text, fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },

  footer: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    opacity: 0.6,
  },
});

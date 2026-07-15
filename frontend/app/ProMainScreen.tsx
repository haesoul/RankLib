import { ClassOfGrading } from "@/realm/models";
import { createClassesBulk } from "@/services/CRUD/class/class.client";
import { downloadImageToLocalStorage } from "@/utils/downloadImage";
import { useRealm } from "@realm/react";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
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
interface ProClassPayload {
  name: string;
  priority?: number;
  noteName?: string;
  notesName?: string;
  objectName?: string;
  objectsName?: string;
  photo?: string;
}

// --- Schema Docs ---
const SCHEMA_DOCS = [
  { field: "name", type: "string", required: true, descKey: "schema_name" },
  { field: "priority", type: "number", required: false, descKey: "schema_priority" },
  { field: "objectName", type: "string", required: false, descKey: "schema_object_name" },
  { field: "objectsName", type: "string", required: false, descKey: "schema_objects_name" },
  { field: "noteName", type: "string", required: false, descKey: "schema_note_name" },
  { field: "notesName", type: "string", required: false, descKey: "schema_notes_name" },
  { field: "photo", type: "string", required: false, descKey: "schema_photo" },
];

const EXAMPLE_JSON_SINGLE = `{
  "name": "Аниме",
  "priority": 5,
  "objectName": "Тайтл",
  "objectsName": "Тайтлы",
  "noteName": "Заметка",
  "notesName": "Заметки",
  "photo": "url"
}`;

const EXAMPLE_JSON_BATCH = `[
  {
    "name": "Аниме",
    "priority": 5,
    "objectName": "Тайтл",
    "objectsName": "Тайтлы",
    "photo": "url"
  },
  {
    "name": "Игры",
    "priority": 3,
    "objectName": "Игра",
    "objectsName": "Игры",
    "photo": "url"
  },
  {
    "name": "Фильмы",
    "priority": 4,
    "photo": "url"
  }
]`;

// --- Validation ---
function validateSingle(payload: any): { valid: boolean; error?: string } {
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: 'JSON должен быть объектом {}' };
  }
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    return { valid: false, error: 'Поле "name" обязательно и должно быть строкой' };
  }
  if (payload.priority !== undefined) {
    const p = Number(payload.priority);
    if (isNaN(p) || p < 1) {
      return { valid: false, error: '"priority" должен быть числом >= 1' };
    }
  }
  const strFields = ["noteName", "notesName", "objectName", "objectsName"];
  for (const f of strFields) {
    if (payload[f] !== undefined && typeof payload[f] !== "string") {
      return { valid: false, error: `"${f}" должен быть строкой` };
    }
  }
  return { valid: true };
}

function validateBatch(payload: any): { valid: boolean; error?: string } {
  if (!Array.isArray(payload)) {
    return { valid: false, error: "Для массового режима JSON должен быть массивом []" };
  }
  if (payload.length === 0) {
    return { valid: false, error: "Массив не должен быть пустым" };
  }
  for (let i = 0; i < payload.length; i++) {
    const result = validateSingle(payload[i]);
    if (!result.valid) {
      return { valid: false, error: `Элемент [${i}]: ${result.error}` };
    }
  }
  return { valid: true };
}

// --- Component ---
export default function ProMainScreen() {
  const { t } = useTranslation();
  const realm = useRealm();

  type Mode = "single" | "batch";
  const [mode, setMode] = useState<Mode>("single");
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON_SINGLE);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setStatus("idle");
    setMessage(null);
    setJsonText(newMode === "single" ? EXAMPLE_JSON_SINGLE : EXAMPLE_JSON_BATCH);
  };

  const handleExecute = async () => {
    setStatus("loading");
    setMessage(null);
    pulse();

    let parsed: any;
    try {
      const sanitized = jsonText.replace(/,(\s*[}\]])/g, "$1");
      parsed = JSON.parse(sanitized);
      // parsed = JSON.parse(jsonText);
    } catch (e) {
      setStatus("error");
      setMessage("Невалидный JSON: " + (e as Error).message);
      return;
    }

    if (mode === "single") {
      const validation = validateSingle(parsed);
      if (!validation.valid) {
        setStatus("error");
        setMessage(validation.error ?? "Ошибка валидации");
        return;
      }

      const payload = parsed as ProClassPayload;

      let localPhoto: string | undefined;
      try {
        localPhoto = await downloadImageToLocalStorage(payload.photo);
      } catch (err) {
        setStatus("error");
        setMessage("Не удалось скачать фото: " + (err as Error).message);
        return;
      }

      try {
        realm.write(() => {
          realm.create<ClassOfGrading>("ClassOfGrading", {
            _id: new Realm.BSON.ObjectId(),
            name: payload.name.trim(),
            priority: payload.priority ? Math.round(Number(payload.priority)) : 1,
            categories: [],
            objects: [],
            tags: [],
            noteName: payload.noteName?.trim() || undefined,
            notesName: payload.notesName?.trim() || undefined,
            objectName: payload.objectName?.trim() || undefined,
            objectsName: payload.objectsName?.trim() || undefined,
            photo: localPhoto,
          });
        });
        setStatus("success");
        setMessage(t("pro_mode.success_single", { name: payload.name.trim() }));
      } catch (err) {
        setStatus("error");
        setMessage("Ошибка Realm: " + (err as Error).message);
      }
    } else {
      // Batch mode
      const validation = validateBatch(parsed);
      if (!validation.valid) {
        setStatus("error");
        setMessage(validation.error ?? "Ошибка валидации");
        return;
      }

const rawItems = parsed as ProClassPayload[];
      const failedPhotos: string[] = [];
      const downloadedPhotos = await Promise.all(
        rawItems.map(async (item) => {
          try {
            return await downloadImageToLocalStorage(item.photo);
          } catch (err) {
            failedPhotos.push(item.name);
            console.warn(`Фото для "${item.name}" не скачалось:`, err);
            return undefined;
          }
        })
      );

      const classesData = rawItems.map((item, i) => ({
        name: item.name,
        priority: item.priority?.toString(),
        noteName: item.noteName,
        notesName: item.notesName,
        objectName: item.objectName,
        objectsName: item.objectsName,
        photo: downloadedPhotos[i],
      }));

      try {
        const ids = await createClassesBulk(realm, classesData);
        setStatus("success");
        setMessage(
          failedPhotos.length
            ? t("pro_mode.success_batch", { count: ids?.length ?? 0 }) +
                ` (без фото: ${failedPhotos.join(", ")})`
            : t("pro_mode.success_batch", { count: ids?.length ?? 0 })
        );
      } catch (err) {
        setStatus("error");
        setMessage("Ошибка Realm: " + (err as Error).message);
      }
    }
  };

  const statusColor =
    status === "success"
      ? Colors.success
      : status === "error"
      ? Colors.error
      : Colors.primary;

  const exampleJson = mode === "single" ? EXAMPLE_JSON_SINGLE : EXAMPLE_JSON_BATCH;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
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
            <Text style={styles.title}>{t("class.create")}</Text>
            <Text style={styles.subtitle}>{t("pro_mode.json_executor")}</Text>
          </View>

          {/* Mode switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "single" && styles.modeBtnActive]}
              onPress={() => handleModeChange("single")}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === "single" && styles.modeBtnTextActive]}>
                {t("pro_mode.single_object")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "batch" && styles.modeBtnActive]}
              onPress={() => handleModeChange("batch")}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === "batch" && styles.modeBtnTextActive]}>
                {t("pro_mode.batch_objects")}
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
            <Text style={styles.docsToggleText}>{t("pro_mode.field_docs")}</Text>
          </TouchableOpacity>

          {docsExpanded && (
            <View style={styles.docsBlock}>
              <Text style={styles.docsNote}>
                {mode === "single"
                  ? t("pro_mode.docs_note_single")
                  : t("pro_mode.docs_note_batch")}
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
                  <Text style={styles.docDesc}>{t(`pro_mode.${doc.descKey}`)}</Text>
                </View>
              ))}
              <View style={styles.docsDivider} />
              <Text style={styles.docsNote}>{t("pro_mode.categories_warning")}</Text>
            </View>
          )}

          {/* JSON Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Script</Text>
              <TouchableOpacity
                onPress={() => setJsonText(exampleJson)}
                style={styles.resetBtn}
              >
                <Text style={styles.resetBtnText}>{t("pro_mode.insert_example")}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.jsonInput}
              value={jsonText}
              onChangeText={(text) => {
                setJsonText(text);
                if (status !== "idle") setStatus("idle");
                setMessage(null);
              }}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              placeholder={mode === "single" ? '{\n  "name": "...",\n  "priority": 1\n}' : '[{\n  "name": "..."\n}]'}
              placeholderTextColor={Colors.textSecondary}
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>

          {/* Status message */}
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
            style={[styles.execBtn, status === "loading" && styles.execBtnDisabled]}
            onPress={handleExecute}
            activeOpacity={0.8}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <>
                <Text style={styles.execBtnIcon}>▶</Text>
                <Text style={styles.execBtnText}>{t("pro_mode.execute_script")}</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>{t("pro_mode.create_only_warning")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },

  header: { marginBottom: 24, alignItems: "flex-start" },
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
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },

  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 7,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  modeBtnTextActive: {
    color: Colors.text,
  },

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
  docsDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: 6,
  },

  inputWrapper: {
    marginBottom: 16,
  },
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
    minHeight: 200,
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
  execBtnDisabled: { opacity: 0.6 },
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

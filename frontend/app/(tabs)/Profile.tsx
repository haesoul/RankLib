import Button from "@/components/UI/Buttons/Button";
import { performFullSyncWithProgress } from "@/tools/exportFromRealm";
import { performFullImportWithProgress } from "@/tools/importFromDjango";
import { useRealm } from "@realm/react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LoginScreen from "@/app/auth/Login";
import { ACCESS_TOKEN } from "@/CONSTANTS";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Profile() {
    const realm = useRealm();
    const router = useRouter();
    const [token, setToken] = useState("");
    const [syncStatus, setSyncStatus] = useState({ 
        loading: false, 
        phase: "", 
        percentage: 0,
        operation: "" // "export" или "import"
    });
    const { isAuth } = useAuth();
    
    useEffect(() => {
        async function getToken() {
            const access = await SecureStore.getItemAsync(ACCESS_TOKEN);
            if (access) setToken(access);
        }
        getToken();
    }, []);

    /**
     * ЭКСПОРТ: Realm → Django
     * Отправляет данные из локальной базы на сервер
     */
    const handleExport = async () => {
        setSyncStatus({ loading: true, phase: "", percentage: 0, operation: "export" });
        
        try {
            const result = await performFullSyncWithProgress(
                realm, 
                token, 
                (phase, current, total, percentage) => {
                    setSyncStatus({ 
                        loading: true, 
                        phase: getPhaseLabel(phase, "export"), 
                        percentage,
                        operation: "export"
                    });
                }
            );

            if (result.success) {
                Alert.alert(
                    "✅ Экспорт успешен",
                    `Данные отправлены на сервер\n\n` +
                    `Всего объектов: ${result.stats?.total_items || 0}\n` +
                    `Создано: ${result.stats?.created_items || 0}\n` +
                    `Обновлено: ${result.stats?.updated_items || 0}\n` +
                    `Файлов загружено: ${result.stats?.files_uploaded || 0}\n` +
                    `Размер: ${result.stats?.total_size_mb || 0} MB`
                );
            } else {
                Alert.alert("❌ Ошибка экспорта", result.error || "Неизвестная ошибка");
            }
        } catch (e: any) {
            Alert.alert("❌ Критическая ошибка", e.message || "Ошибка синхронизации");
        } finally {
            setSyncStatus({ loading: false, phase: "", percentage: 0, operation: "" });
        }
    };

    /**
     * ИМПОРТ: Django → Realm
     * Загружает данные с сервера в локальную базу
     */
    const handleImport = async (clearExisting: boolean = false, downloadFiles: boolean = false) => {
        // Подтверждение при очистке существующих данных
        if (clearExisting) {
            Alert.alert(
                "⚠️ Внимание",
                "Все существующие данные будут удалены! Продолжить?",
                [
                    { text: "Отмена", style: "cancel" },
                    { 
                        text: "Удалить и импортировать", 
                        style: "destructive",
                        onPress: () => performImport(clearExisting, downloadFiles)
                    }
                ]
            );
        } else {
            performImport(clearExisting, downloadFiles);
        }
    };

    const performImport = async (clearExisting: boolean, downloadFiles: boolean) => {
        setSyncStatus({ loading: true, phase: "", percentage: 0, operation: "import" });
        
        try {
            const result = await performFullImportWithProgress(
                realm,
                clearExisting,
                downloadFiles,
                (phase, current, total, percentage) => {
                    setSyncStatus({ 
                        loading: true, 
                        phase: getPhaseLabel(phase, "import"), 
                        percentage,
                        operation: "import"
                    });
                }
            );

            if (result.success) {
                Alert.alert(
                    "✅ Импорт успешен",
                    `Данные загружены с сервера\n\n` +
                    `Классов: ${result.stats?.total_classes || 0}\n` +
                    `Объектов: ${result.stats?.total_objects || 0}\n` +
                    `Категорий: ${result.stats?.total_categories || 0}\n` +
                    `Тегов: ${result.stats?.total_tags || 0}\n` +
                    `Типов рангов: ${result.stats?.total_rank_types || 0}` +
                    (downloadFiles ? `\n\nФайлов загружено: ${result.stats?.files_downloaded || 0}` : "")
                );
            } else {
                Alert.alert("❌ Ошибка импорта", result.error || "Неизвестная ошибка");
            }
        } catch (e: any) {
            Alert.alert("❌ Критическая ошибка", e.message || "Ошибка импорта");
        } finally {
            setSyncStatus({ loading: false, phase: "", percentage: 0, operation: "" });
        }
    };

    /**
     * Получить читаемое название фазы
     */
    const getPhaseLabel = (phase: string, operation: string): string => {
        const labels: Record<string, string> = {
            // Экспорт
            "metadata": "Сбор метаданных",
            "scan_files": "Сканирование файлов",
            "upload_metadata": "Отправка данных",
            "upload_files": "Загрузка файлов",
            
            // Импорт
            "fetch_data": "Загрузка с сервера",
            "import_rank_types": "Импорт типов рангов",
            "import_tags": "Импорт тегов",
            "import_classes": "Импорт классов",
            "download_files": "Загрузка файлов",
        };
        
        return labels[phase] || phase;
    };

    if (!isAuth) return <LoginScreen/>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Личный кабинет</Text>
                
                {/* Индикатор прогресса */}
                {syncStatus.loading && (
                    <View style={styles.progressContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.operationText}>
                            {syncStatus.operation === "export" ? "📤 Экспорт данных" : "📥 Импорт данных"}
                        </Text>
                        <Text style={styles.phaseText}>Фаза: {syncStatus.phase}</Text>
                        <Text style={styles.percentageText}>Прогресс: {syncStatus.percentage}%</Text>
                        <View style={styles.progressBar}>
                            <View 
                                style={[
                                    styles.progressBarFill, 
                                    { width: `${syncStatus.percentage}%` }
                                ]} 
                            />
                        </View>
                    </View>
                )}
                
                {/* Кнопки синхронизации */}
                {!syncStatus.loading && (
                    <View style={styles.buttonsContainer}>
                        {/* ЭКСПОРТ */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📤 Экспорт данных (Realm → Django)</Text>
                            <Text style={styles.sectionDescription}>
                                Отправить все данные из локальной базы на сервер. Существующие данные на сервере будут обновлены.
                            </Text>
                            <Button onPress={handleExport} style={styles.button}>
                                <Text style={styles.buttonText}>Экспортировать на сервер</Text>
                            </Button>
                        </View>
                        
                        {/* ИМПОРТ */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📥 Импорт данных (Django → Realm)</Text>
                            <Text style={styles.sectionDescription}>
                                Загрузить данные с сервера в локальную базу.
                            </Text>
                            
                            {/* Импорт с объединением */}
                            <Button 
                                onPress={() => handleImport(false, false)} 
                                style={[styles.button, styles.buttonSecondary]}
                            >
                                <Text style={styles.buttonText}>Импортировать (объединить)</Text>
                            </Button>
                            
                            {/* Импорт с очисткой */}
                            <Button 
                                onPress={() => handleImport(true, false)} 
                                style={[styles.button, styles.buttonDanger]}
                            >
                                <Text style={styles.buttonText}>Импортировать (очистить локальную БД)</Text>
                            </Button>
                            
                            {/* Импорт с файлами */}
                            <Button 
                                onPress={() => handleImport(false, true)} 
                                style={[styles.button, styles.buttonSecondary]}
                            >
                                <Text style={styles.buttonText}>Импортировать с файлами</Text>
                            </Button>
                        </View>
                        
                        {/* Информация */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoTitle}>ℹ️ Информация</Text>
                            <Text style={styles.infoText}>
                                • <Text style={styles.bold}>Экспорт:</Text> отправляет данные из приложения на сервер{'\n'}
                                • <Text style={styles.bold}>Импорт (объединить):</Text> добавляет данные с сервера, сохраняя локальные{'\n'}
                                • <Text style={styles.bold}>Импорт (очистить):</Text> удаляет локальные данные и загружает с сервера{'\n'}
                                • <Text style={styles.bold}>С файлами:</Text> также загружает все изображения и видео (может занять время){'\n'}
                                • Максимальный размер файлов: 20 ГБ
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    
    // Progress
    progressContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    operationText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 15,
        color: '#333',
    },
    phaseText: {
        fontSize: 14,
        marginTop: 10,
        color: '#666',
    },
    percentageText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 5,
        color: '#007AFF',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginTop: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    
    // Buttons
    buttonsContainer: {
        gap: 20,
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        lineHeight: 20,
    },
    button: {
        marginBottom: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    buttonSecondary: {
        backgroundColor: '#34C759',
    },
    buttonDanger: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Info
    infoContainer: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        lineHeight: 22,
    },
    bold: {
        fontWeight: 'bold',
        color: '#333',
    },
});

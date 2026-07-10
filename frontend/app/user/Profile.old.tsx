import Button from "@/components/UI/Buttons/Button";
// Импортируем новую функцию с прогрессом
import { performFullSyncWithProgress } from "@/tools/exportFromRealm";
import { useRealm } from "@realm/react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
        percentage: 0 
    });
    const { isAuth } = useAuth();
    
    useEffect(() => {
        async function getToken() {
            const access = await SecureStore.getItemAsync(ACCESS_TOKEN);
            if (access) setToken(access);
        }
        getToken();
    }, []);

    const handleSync = async () => {
        setSyncStatus(prev => ({ ...prev, loading: true }));
        
        try {
            const result = await performFullSyncWithProgress(
                realm, 
                token, 
                (phase, current, total, percentage) => {
                    // Обновляем состояние прогресса
                    setSyncStatus({ loading: true, phase, percentage });
                }
            );

            if (result.success) {
                alert("Успешно синхронизировано!");
            } else {
                alert("Ошибка: " + result.error);
            }
        } catch (e) {
            alert("Критическая ошибка синхронизации");
        } finally {
            setSyncStatus({ loading: false, phase: "", percentage: 0 });
        }
    };

    if (!isAuth) return <LoginScreen/>;

    return (
        <SafeAreaView style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>Личный кабинет</Text>
            
            {syncStatus.loading ? (
                <View style={{ marginBottom: 20 }}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text>Фаза: {syncStatus.phase}</Text>
                    <Text>Прогресс: {syncStatus.percentage}%</Text>
                </View>
            ) : (
                <Button onPress={handleSync}>
                    <Text>Экспорт на сервер (20 ГБ лимит)</Text>
                </Button>
            )}
        </SafeAreaView>
    );
}
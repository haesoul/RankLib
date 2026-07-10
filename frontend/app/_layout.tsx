import { Colors } from "@/CONSTANTS";
import { AuthProvider } from "@/context/AuthContext";
import { SCHEMAS } from "@/realm/models";
import { RealmProvider } from "@realm/react";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function Layout() {
  return (
    <RealmProvider schema={SCHEMAS} schemaVersion={21}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <Stack 
              screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'fade',
            }}
          />
        </AuthProvider>
      </GestureHandlerRootView>
    </RealmProvider>

  )
}

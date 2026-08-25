import { Colors } from "@/CONSTANTS";
import { AuthProvider } from "@/context/AuthContext";
import { SCHEMAS } from "@/realm/models";
import { Feather } from "@expo/vector-icons";
import { RealmProvider } from "@realm/react";
import * as Font from 'expo-font';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync(Feather.font).then(() => setFontLoaded(true));
  }, []);

  if (!fontLoaded) return null;
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

import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      // tabBar={(props) => <BottomAppBar {...props} />}
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Main', href: null, }} />
      <Tabs.Screen name="Profile" options={{ title: 'Profile', href: null, }} />
    </Tabs>
  );
}
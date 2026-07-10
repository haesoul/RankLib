import { Colors } from '@/CONSTANTS';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';


interface TabItem {
  id: string;       
  routeName: string;   
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}

const AppTabs: TabItem[] = [
  { id: 'Home', routeName: 'index', icon: 'home-outline', activeIcon: 'home' },
  { id: 'Profile', routeName: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

const BottomAppBar: React.FC<any> = ({ state, navigation }) => {

  const animatedValues = useRef(
    AppTabs.reduce((acc, tab) => {
      acc[tab.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  const activeTabId = useMemo(() => {
    if (!state || !state.routes) return AppTabs[0].id;
    const activeRouteName = state.routes[state.index]?.name;
    const found = AppTabs.find((t) => t.routeName === activeRouteName);
    return found ? found.id : AppTabs[0].id;
  }, [state?.index, state?.routes]);

  useEffect(() => {
    AppTabs.forEach((tab) => {
      Animated.spring(animatedValues[tab.id], {
        toValue: activeTabId === tab.id ? 1 : 0,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    });
  }, [activeTabId]);

  function changeTab(tab: TabItem) {
    const currentRouteName = state.routes[state.index]?.name;
    if (currentRouteName === tab.routeName) return;

    if (typeof navigation.jumpTo === 'function') {
      navigation.jumpTo(tab.routeName);
      return;
    }
    navigation.navigate(tab.routeName);
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: Colors.surfaceMuted,
            borderColor: Colors.background,
          },
        ]}
      >
        {AppTabs.map((tab) => {
          const anim = animatedValues[tab.id];
          const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
          const bgOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
          const isActive = activeTabId === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => changeTab(tab)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.activeBackground, { opacity: bgOpacity }]}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientFill}
                  />
                </Animated.View>

                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? Colors.text : Colors.textSecondary}
                  style={styles.iconElement}
                />
              </Animated.View>

              {/* <Text style={[styles.tabLabel, { color: isActive ? Colors.primary : Colors.textSecondary }]}>
                {tab.id}
              </Text> */}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 26 : 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 460,
    height: 68,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  iconWrapper: {
    width: 56,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginBottom: 6,
    overflow: 'hidden',
  },
  activeBackground: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
  },
  iconElement: {
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    minWidth: 58,
    letterSpacing: 0.1,
  },
});

export default BottomAppBar;
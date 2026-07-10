import { Colors, Radius } from '@/CONSTANTS';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SettingsList, { SettingsItem } from './SettingsList';
import SettingsSection from './SettingsSection';

interface SettingsPanelProps {
  title?: string;
  sections: Array<{
    title?: string;
    items: SettingsItem[];
  }>;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export default function SettingsPanel({
  title,
  sections,
  headerContent,
  footerContent,
}: SettingsPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <MaterialIcons name="settings" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>{title ?? 'Settings'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {headerContent && <View style={styles.headerSlot}>{headerContent}</View>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sections.map((section, i) => (
          <SettingsSection key={i} title={section.title}>
            <SettingsList items={section.items} />
          </SettingsSection>
        ))}

        {footerContent && <View style={styles.footer}>{footerContent}</View>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textOffWhite,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  headerSlot: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footer: {
    marginTop: 8,
  },
});

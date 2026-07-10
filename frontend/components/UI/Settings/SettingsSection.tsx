import { Colors } from '@/CONSTANTS';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      {title && (
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      )}
      <View style={styles.itemsContainer}>
        {React.Children.map(children, (child, i) => (
          <View key={i} style={styles.itemWrapper}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  itemsContainer: {
    gap: 6,
  },
  itemWrapper: {},
});

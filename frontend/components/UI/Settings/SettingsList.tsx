import SettingsButton, { SettingsButtonVariant } from '@/components/UI/Buttons/SettingsButton';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress: () => void;
  variant?: SettingsButtonVariant;
  disabled?: boolean;
  rightElement?: React.ReactNode;
}

interface SettingsListProps {
  items: SettingsItem[];
}

export default function SettingsList({ items }: SettingsListProps) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item) => (
        <SettingsButton
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          onPress={item.onPress}
          variant={item.variant}
          disabled={item.disabled}
          rightElement={item?.rightElement}
        />
      ))}
    </View>
  );
}

import { Colors } from '@/CONSTANTS';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withScrollView?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  style, 
  withScrollView = true 
}) => {

  const content = withScrollView ? (
    <ScrollView 
      contentContainerStyle={[styles.scrollContent, style]} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }, style]}>
      <StatusBar style={'dark'} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
});
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AuthButton } from '@/components/UI/Buttons/AuthButton';
import { AuthInput } from '@/components/UI/Input/AuthInput';
import { Colors } from '@/CONSTANTS';
import { registerUser } from '@/services/API/auth';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInLeft,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: ''
  });

  const scale = useSharedValue(1);

  const animatedBackButton = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleBackPress = () => {
    scale.value = withSpring(0.85, {
      damping: 15,
      stiffness: 400,
    });
    setTimeout(() => {
      scale.value = withSpring(1);
      router.back();
    }, 100);
  };

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleRegister = () => {
    registerUser({
      form,
      setLoading,
      onSuccess: (email) => {
        router.push({ pathname: '/auth/Verify', params: { email } });
      },
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeInLeft.duration(600).springify().damping(20)}
        style={styles.header}
      >
        <AnimatedTouchable 
          onPress={handleBackPress}
          style={[styles.backButton, animatedBackButton]}
          activeOpacity={1}
        >
          <Ionicons name="arrow-back" size={28} color="white" />
        </AnimatedTouchable>
        <Text style={styles.headerTitle}>Регистрация</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(700).springify().damping(18)}
        style={styles.form}
      >
        <AuthInput
          iconName="mail"
          placeholder="Email"
          value={form.email}
          onChangeText={(t) => handleChange('email', t)}
          delay={200}
        />
        
        <AuthInput
          iconName="person"
          placeholder="Username (без @)"
          value={form.username}
          onChangeText={(t) => handleChange('username', t)}
          delay={300}
        />

        <AuthInput
          iconName="lock-closed"
          placeholder="Пароль"
          value={form.password}
          onChangeText={(t) => handleChange('password', t)}
          isPassword
          delay={400}
        />

        <AuthInput
          iconName="lock-closed"
          placeholder="Подтвердите пароль"
          value={form.password_confirm}
          onChangeText={(t) => handleChange('password_confirm', t)}
          isPassword
          delay={500}
        />

        <AuthButton
          title="Создать аккаунт"
          onPress={handleRegister}
          disabled={loading}
          loading={loading}
          delay={600}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  form: {
    width: '100%',
  },
});

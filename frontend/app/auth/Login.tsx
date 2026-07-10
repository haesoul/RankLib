import { AuthButton } from '@/components/UI/Buttons/AuthButton';
import { AuthInput } from '@/components/UI/Input/AuthInput';
import { Colors } from '@/CONSTANTS';
import { loginUser } from '@/services/API/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp
} from 'react-native-reanimated';

export default function LoginScreen() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    loginUser({
      login,
      password,
      setLoading,
      onSuccess: () => {
        router.replace('/'); 
        alert('Переход на главную');
      },
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInUp.duration(800).springify().damping(20).stiffness(80)}
        style={styles.logoContainer}
      >
        <Text style={styles.title}>RankLib</Text>
        <Animated.View 
          entering={FadeInDown.delay(400).duration(600).springify()}
          style={styles.tagline}
        >
          <Text style={styles.taglineText}>Ваша библиотека рейтингов</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View 
        entering={FadeInDown.delay(200).duration(700).springify().damping(18)}
        style={styles.form}
      >
        <AuthInput
          iconName="person"
          placeholder="Email или Username"
          value={login}
          onChangeText={setLogin}
          delay={400}
        />
        
        <AuthInput
          iconName="lock-closed"
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          isPassword
          delay={500}
        />

        <AuthButton
          title="Войти"
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          delay={600}
        />

        <Animated.View 
          entering={FadeInDown.delay(700).duration(600).springify()}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Впервые у нас? </Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.link}>Регистрация</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: -1,
    fontFamily: 'System',
  },
  tagline: {
    marginTop: 8,
    opacity: 0.8,
  },
  taglineText: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  link: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

import { AuthButton } from '@/components/UI/Buttons/AuthButton';
import { AuthInput } from '@/components/UI/Input/AuthInput';
import { Colors } from '@/CONSTANTS';
import { verifyCode } from '@/services/API/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    BounceIn,
    FadeInDown,
    FadeInUp
} from 'react-native-reanimated';

export default function VerifyScreen() {
  const router = useRouter();
  const { login } = useLocalSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const [code, setCode] = useState('');

  const handleVerify = () => {
    if (code.length !== 6) {
      alert("Введите 6-значный код");
      return;
    }
    verifyCode({
      login, // Передаем email из параметров
      token: code,
      setLoading,
      onSuccess: () => {
        router.dismissAll();
        router.replace('/');
      },
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={BounceIn.duration(800).delay(100)}
        style={styles.iconContainer}
      >
        <Text style={styles.icon}>📧</Text>
      </Animated.View>

      <Animated.View 
        entering={FadeInUp.duration(700).delay(300).springify().damping(20)}
        style={styles.content}
      >
        <Text style={styles.title}>Проверьте почту</Text>
        <Text style={styles.subtitle}>
          Мы отправили ссылку на {login}. Скопируйте токен из ссылки и вставьте сюда.
        </Text>
      </Animated.View>

     <Animated.View entering={FadeInUp.duration(700)}>
        <Text style={styles.title}>Введите код</Text>
        <Text style={styles.subtitle}>
          Мы отправили 6-значный код на {login}.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)}>
        <AuthInput
          iconName="key"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          maxLength={6}
          keyboardType="number-pad" // Только цифры
          delay={500}
        />

        <AuthButton
          title="Подтвердить"
          onPress={handleVerify}
          disabled={loading || code.length < 6}
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
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  form: {
    width: '100%',
  },
});

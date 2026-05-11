// KYC Screen - SkillPlay v1.0
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

type KycPhase = 'intro' | 'loading' | 'pending' | 'done';

export default function KycScreen() {
  const [phase, setPhase] = useState<KycPhase>('intro');
  const [isLoading, setIsLoading] = useState(false);

  const startKyc = async () => {
    setIsLoading(true);
    try {
      setTimeout(() => {
        setIsLoading(false);
        setPhase('pending');
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      Alert.alert('Error', 'No se pudo iniciar la verificación.');
    }
  };

  if (phase === 'intro') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>??</Text>
        <Text style={styles.title}>Verificación de identidad</Text>
        <Text style={styles.body}>
          Para poder transferir tus recompensas, la normativa europea (AMLD5)
          requiere que verifiquemos tu identidad una sola vez.
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, isLoading && styles.startBtnDisabled]}
          onPress={startKyc}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color='#fff' />
            : <Text style={styles.startBtnText}>Verificar mi identidad</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.emoji}>?</Text>
      <Text style={styles.title}>Verificando tu identidad...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight, padding: 24, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  startBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

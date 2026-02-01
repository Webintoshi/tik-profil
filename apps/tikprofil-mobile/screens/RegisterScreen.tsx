import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '@/services/auth';

const BRAND_BLUE = '#3B82F6';

export function RegisterScreen() {
    const navigation = useNavigation<any>();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !email || !password) {
            Alert.alert('Hata', 'Tüm alanları doldurun');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Hata', 'Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
            return;
        }

        setLoading(true);
        try {
            await authService.signUp(email, password, fullName);
            Alert.alert('Başarılı', 'Hesabınız oluşturuldu!');
        } catch (error: any) {
            Alert.alert('Kayıt Hatası', error.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Hesap Oluştur</Text>
                        <Text style={styles.subtitle}>TikProfil'e hoş geldiniz</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Ad Soyad"
                                placeholderTextColor="#6B7280"
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#6B7280"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifre"
                                placeholderTextColor="#6B7280"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={20}
                                    color="#9CA3AF"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifre Tekrar"
                                placeholderTextColor="#6B7280"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                            )}
                        </TouchableOpacity>

                        {/* Terms */}
                        <Text style={styles.termsText}>
                            Kayıt olarak{' '}
                            <Text style={styles.termsLink}>Kullanım Koşulları</Text>
                            {' '}ve{' '}
                            <Text style={styles.termsLink}>Gizlilik Politikası</Text>
                            'nı kabul etmiş olursunuz.
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.loginLink}>Giriş Yap</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    form: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#FFFFFF',
    },
    eyeIcon: {
        padding: 8,
    },
    registerButton: {
        backgroundColor: BRAND_BLUE,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    termsText: {
        color: '#6B7280',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: BRAND_BLUE,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingTop: 32,
    },
    footerText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    loginLink: {
        color: BRAND_BLUE,
        fontSize: 14,
        fontWeight: '600',
    },
});

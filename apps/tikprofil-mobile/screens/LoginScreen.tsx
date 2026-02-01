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
const BRAND_BLUE_DARK = '#2563EB';

export function LoginScreen() {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Hata', 'Email ve şifre gerekli');
            return;
        }

        setLoading(true);
        try {
            await authService.signIn(email, password);
        } catch (error: any) {
            Alert.alert('Giriş Hatası', error.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        Alert.alert('Google ile Giriş', 'Yakında aktif olacak');
    };

    const handleAppleLogin = () => {
        Alert.alert('Apple ile Giriş', 'Yakında aktif olacak');
    };

    const handleSkipLogin = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
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
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>TikProfil</Text>
                        <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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

                        {/* Forgot Password */}
                        <TouchableOpacity style={styles.forgotButton}>
                            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Giriş Yap</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>veya</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                            <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                            <Text style={styles.socialButtonText}>Google ile Devam Et</Text>
                        </TouchableOpacity>

                        {Platform.OS === 'ios' && (
                            <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleLogin}>
                                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                                <Text style={styles.socialButtonText}>Apple ile Devam Et</Text>
                            </TouchableOpacity>
                        )}

                        {/* Skip Login */}
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkipLogin}>
                            <Text style={styles.skipText}>Misafir olarak devam et</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Hesabınız yok mu? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerLink}>Kayıt Ol</Text>
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
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        fontSize: 36,
        fontWeight: '800',
        color: BRAND_BLUE,
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
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: BRAND_BLUE,
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: BRAND_BLUE,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
        color: '#6B7280',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        height: 52,
        marginBottom: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    appleButton: {
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    socialButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    skipText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
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
    registerLink: {
        color: BRAND_BLUE,
        fontSize: 14,
        fontWeight: '600',
    },
});

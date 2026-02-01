import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface LocationState {
    coords: {
        latitude: number;
        longitude: number;
    } | null;
    city: string | null;
    loading: boolean;
    error: string | null;
    permissionStatus: Location.PermissionStatus | null;
}

export function useLocation() {
    const [state, setState] = useState<LocationState>({
        coords: null,
        city: null,
        loading: true,
        error: null,
        permissionStatus: null,
    });

    const requestPermission = async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setState((prev) => ({ ...prev, permissionStatus: status }));

            if (status !== 'granted') {
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: 'Konum izni verilmedi',
                }));
                return false;
            }
            return true;
        } catch (error) {
            console.error('[useLocation] Permission error:', error);
            setState((prev) => ({
                ...prev,
                loading: false,
                error: 'Konum izni alınırken hata oluştu',
            }));
            return false;
        }
    };

    const getCurrentLocation = async () => {
        try {
            setState((prev) => ({ ...prev, loading: true, error: null }));

            const hasPermission = await requestPermission();
            if (!hasPermission) return;

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;

            // Reverse geocode to get city
            let cityName: string | null = null;
            try {
                const [address] = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });
                if (address) {
                    cityName = address.city || address.subregion || address.region || null;
                }
            } catch (geoError) {
                console.warn('[useLocation] Reverse geocode failed:', geoError);
            }

            setState({
                coords: { latitude, longitude },
                city: cityName,
                loading: false,
                error: null,
                permissionStatus: Location.PermissionStatus.GRANTED,
            });

            console.log('[useLocation] Location obtained:', { latitude, longitude, cityName });
        } catch (error: any) {
            console.error('[useLocation] Error getting location:', error);
            setState((prev) => ({
                ...prev,
                loading: false,
                error: error.message || 'Konum alınamadı',
            }));
        }
    };

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    const showPermissionAlert = () => {
        Alert.alert(
            'Konum İzni Gerekli',
            'Yakınındaki işletmeleri görebilmek için konum iznine ihtiyacımız var.',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Ayarlara Git', onPress: openSettings },
            ]
        );
    };

    useEffect(() => {
        getCurrentLocation();
    }, []);

    return {
        ...state,
        refresh: getCurrentLocation,
        openSettings,
        showPermissionAlert,
    };
}

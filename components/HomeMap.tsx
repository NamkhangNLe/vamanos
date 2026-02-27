import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '../constants/theme';

interface HomeMapProps {
    activities: any[];
    userLocation?: { latitude: number, longitude: number } | null;
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
}

// Native iOS/Android version — react-native-maps is lazy-required so Metro
// doesn't statically analyze it. The .web.tsx platform extension ensures
// this file is never loaded on web builds anyway.
export default function HomeMap({ activities, userLocation, onPinPress, onMapPress }: HomeMapProps) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNMaps = require('react-native-maps');
    const MapView = RNMaps.default;
    const Marker = RNMaps.Marker;
    const PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;

    const initialLat = userLocation?.latitude || 34.02;
    const initialLng = userLocation?.longitude || -118.495;

    return (
        <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            region={{
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: 0.07,
                longitudeDelta: 0.07,
            }}
            userInterfaceStyle="light"
            showsUserLocation={true}
            showsCompass={false}
            showsMyLocationButton={false}
            onPress={onMapPress}
        >
            {activities.map((activity: any, idx: number) => (
                <Marker
                    key={activity.id || idx}
                    coordinate={{
                        latitude: activity.latitude || 34.02 + (idx - 2) * 0.008,
                        longitude: activity.longitude || -118.495 + (idx - 2) * 0.005,
                    }}
                    onPress={() => onPinPress(activity.id)}
                >
                    <View style={styles.mapPin}>
                        <Text style={styles.mapPinEmoji}>{activity.emoji || '📍'}</Text>
                    </View>
                </Marker>
            ))}
        </MapView>
    );
}

const styles = StyleSheet.create({
    mapPin: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 8,
        ...Shadows.medium,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    mapPinEmoji: {
        fontSize: 18,
    },
});

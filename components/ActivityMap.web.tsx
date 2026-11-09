import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';
import { offsetFor } from '../lib/geo';

export interface ActivityMapProps {
    activity: any;
    participants: any[];
    userLocation?: { latitude: number, longitude: number } | null;
}

// Leaflet sizes itself once at mount. If the container is still settling
// (fonts loading, layout shifts), the map can end up grey or with
// tiles/markers placed for the wrong viewport — the classic
// blank-Leaflet-map failure. Re-measure shortly after mount and on
// every window resize so the tiles always land where they belong.
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 100);
        const t2 = setTimeout(() => map.invalidateSize(), 600);
        const onResize = () => map.invalidateSize();
        window.addEventListener('resize', onResize);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            window.removeEventListener('resize', onResize);
        };
    }, [map]);
    return null;
}

const FRIEND_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];
function getFriendColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return FRIEND_COLORS[Math.abs(hash) % FRIEND_COLORS.length];
}

const createEmojiIcon = (emoji: string) => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `
        <div style="
            background: white;
            border-radius: 26px;
            padding: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            border: 3px solid #1c1c1e;
            text-align: center;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        ">
            ${emoji || '📍'}
        </div>
        `,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
    });
};

const createFriendIcon = (name: string, color: string) => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `
        <div style="
            background: ${color};
            border-radius: 18px;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            text-align: center;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            font-family: -apple-system, system-ui, sans-serif;
        ">
            ${name[0].toUpperCase()}
        </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
};

const createUserDotIcon = () => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon user-dot-icon',
        html: `
      <div style="
        background: #007AFF;
        border-radius: 12px;
        border: 3px solid white;
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
        width: 18px;
        height: 18px;
        margin-left: -9px;
        margin-top: -9px;
      ">
      </div>
    `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
};

export default function ActivityMap({ activity, participants, userLocation }: ActivityMapProps) {
    if (!activity) return null;

    const centerLat = activity.latitude || userLocation?.latitude || 34.0522;
    const centerLng = activity.longitude || userLocation?.longitude || -118.2437;

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* Scoped to this map: 100% of the parent, never 100vh (the detail
                hero is only 320px tall and 100vh would overflow it). */}
            <style>{`
                .leaflet-container { height: 100%; width: 100%; z-index: 1; }
                .custom-leaflet-icon { background: none; border: none; }
            `}</style>
            <MapContainer
                key={`${centerLat}-${centerLng}`}
                center={[centerLat, centerLng]}
                zoom={14}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <MapResizer />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Destination pin */}
                <Marker position={[centerLat, centerLng]} icon={createEmojiIcon(activity.emoji)} />

                {/* User point marker */}
                {userLocation && (
                    <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={createUserDotIcon()}
                    />
                )}

                {/* Participant pins — deterministic offsets per participant id,
                    so pins stay put instead of jumping on every render. */}
                {participants
                    .filter(p => p.status === 'committed')
                    .slice(0, 8)
                    .map((p, idx) => {
                        const name = p.profiles?.username || p.username || '?';
                        const { dLat, dLng } = offsetFor(p.id || `${name}-${idx}`, 0.01);
                        return (
                            <Marker
                                key={p.id || idx}
                                position={[
                                    centerLat + dLat,
                                    centerLng + dLng,
                                ]}
                                icon={createFriendIcon(name, getFriendColor(name))}
                            >
                                <Popup>{name}</Popup>
                            </Marker>
                        );
                    })}
            </MapContainer>
        </View>
    );
}

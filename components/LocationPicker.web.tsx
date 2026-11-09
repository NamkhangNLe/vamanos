import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, View } from 'react-native';

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  initial?: { latitude: number; longitude: number } | null;
  value: PickedLocation | null;
  onPick: (loc: PickedLocation) => void;
}

const pinIcon = new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background:#0D7A5F;border-radius:20px;padding:6px;box-shadow:0 4px 12px rgba(0,0,0,0.25);border:3px solid white;text-align:center;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px">📍</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

function ClickToPlace({ onPick }: { onPick: (loc: PickedLocation) => void }) {
  useMapEvents({
    click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

/** Web location picker: tap the map to drop the pin exactly where the plan is. */
export default function LocationPicker({ initial, value, onPick }: LocationPickerProps) {
  const centerLat = value?.latitude ?? initial?.latitude ?? 37.7749;
  const centerLng = value?.longitude ?? initial?.longitude ?? -122.4194;
  return (
    <View style={styles.wrap}>
      <style>{`.leaflet-container { height: 100%; width: 100%; z-index: 1; border-radius: 16px; } .custom-leaflet-icon { background: none; border: none; }`}</style>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: 220, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPick={onPick} />
        {value && <Marker position={[value.latitude, value.longitude]} icon={pinIcon} />}
      </MapContainer>
      <Text style={styles.hint}>
        {value
          ? `Pinned at ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)} — tap elsewhere to move it.`
          : 'Tap the map to drop the pin where the plan actually is.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { fontSize: 13, color: '#5C6E66', fontWeight: '500' },
});

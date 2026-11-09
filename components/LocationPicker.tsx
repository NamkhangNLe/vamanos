import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '../constants/theme';

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  initial?: { latitude: number; longitude: number } | null;
  value: PickedLocation | null;
  onPick: (loc: PickedLocation) => void;
}

/**
 * Native fallback: tap-to-place lives on the web map. On native, pin the
 * plan at your current location (or leave it unset and pick on web).
 */
export default function LocationPicker({ initial, value, onPick }: LocationPickerProps) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          if (initial) onPick({ latitude: initial.latitude, longitude: initial.longitude });
        }}
        disabled={!initial}
      >
        <Text style={styles.btnText}>
          {value
            ? `Pinned at ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`
            : initial
              ? '📍 Use my current location as the pin'
              : 'Waiting for your location…'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap-to-place on the map is available on web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  btn: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  btnText: { ...Typography.callout, color: Colors.text, fontWeight: '600' },
  hint: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});

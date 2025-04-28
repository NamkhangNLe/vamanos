import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AmigosScreen() {
  const { activity } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Amigos Page</Text>
      {activity && <Text style={styles.text}>Activity: {activity}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
});

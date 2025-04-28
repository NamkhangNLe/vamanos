import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

const PlaceholderImage = require('@/assets/images/buzz.png');

export default function Index() {
  return (
    <View style={styles.container}>
       <View style={styles.imageContainer}>
        <Image source={PlaceholderImage} style={styles.image} />
      </View>
      <View style={styles.footerContainer}>
        <Button label="Choose a photo" />
        <Pressable style={styles.buttonContainer}>
          <Link href="/amigos" style={styles.buttonLabel}>
            Vamanos!
          </Link>
        </Pressable>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: 320,
    height: 440,
    borderRadius: 18,
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: 'center',
  },
  buttonContainer: {
    width: 200,
    height: 68,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  buttonLabel: {
    color: '#25292e',
    fontSize: 16,
    textAlign: 'center',
  },
});
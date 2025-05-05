import { Session } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const PlaceholderImage = require('@/assets/images/buzz.png');

export default function Index() {
  const [activity, setActivity] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push('/auth'); // Redirect to auth screen if not logged in
      }
    });
  }, []);

  if (!session) {
    return null; // Optionally render a loading state
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={PlaceholderImage} style={styles.image} />
      </View>
      <View style={styles.footerContainer}>
        <TextInput
          style={styles.textbox}
          placeholder="Enter text here"
          placeholderTextColor="#aaa"
          value={activity}
          onChangeText={setActivity}
        />
      </View>
      <View style={styles.footerContainer}>
        <Pressable
          style={styles.buttonContainer}
          onPress={() => router.push({ pathname: '/amigos', params: { activity } })}
        >
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
  textbox: {
    width: 200,
    height: 40,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    color: '#25292e',
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
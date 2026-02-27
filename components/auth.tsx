import { Button, Input } from '@rneui/themed';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Dimensions, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../constants/theme';
import { supabase } from '../lib/supabase';
import HomeMap from './HomeMap';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AuthProps {
  onSuccess?: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  // Start with a high realistic number for social proof
  const [waitlistCount, setWaitlistCount] = useState(1248);

  const handleJoinWaitlist = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Store in Supabase 'waitlist' table
      const { error: dbError } = await supabase
        .from('waitlist')
        .insert([{ email }]);

      if (dbError && dbError.code !== '23505') { // Ignore unique constraint (already joined)
        console.warn('DB storage error:', dbError);
      }

      /**
       * "Anonymous" Email Integration via FormSubmit
       * This sends a POST request that triggers an email notification to the user's HOTMAIL.
       */
      const response = await fetch('https://formsubmit.co/ajax/Namkhangnle@hotmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          message: `New signup for Vámonos Waitlist!`,
          _subject: '🔥 New Vámonos Signup'
        })
      });

      if (response.ok || (dbError && dbError.code === '23505')) {
        setJoined(true);
        setWaitlistCount(prev => prev + 1);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Short delay for the "Success" animation before entering the app
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error('Failed to join');
      }
    } catch (error: any) {
      console.warn('Waitlist notification error:', error);
      // Graceful fallback: let them in anyway so we don't block conversion
      setJoined(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background: The Live Map blurred - giving a tease of the product */}
      <View style={styles.mapBackground}>
        <HomeMap
          activities={[]}
          userLocation={{ latitude: 34.020, longitude: -118.495 }}
          onPinPress={() => { }}
          onMapPress={() => { }}
        />
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 95}
          style={StyleSheet.absoluteFill}
          tint="light"
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.emoji}>🚀</Text>
              <Text style={styles.title}>Vámonos</Text>
              <Text style={styles.tagline}>Spontaneous activities with friends.</Text>
            </View>

            {joined ? (
              <View style={styles.successState}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>You're on the list!</Text>
                <Text style={styles.successSubtitle}>
                  Redirecting you to the map...
                </Text>
                <View style={styles.statsContainer}>
                  <Text style={styles.statsCount}>{waitlistCount.toLocaleString()}</Text>
                  <Text style={styles.statsLabel}>Friends currently in line</Text>
                </View>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.pitch}>
                  The map-first social app for real-life plans. Join the waitlist for early access.
                </Text>

                <View style={styles.inputWrapper}>
                  <Input
                    placeholder="Enter your email"
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    autoCapitalize={'none'}
                    autoComplete="email"
                    keyboardType="email-address"
                    containerStyle={styles.inputContainerStyle}
                    inputContainerStyle={styles.inputFieldContainer}
                    inputStyle={styles.inputText}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <Button
                  title="Join the Waitlist"
                  loading={loading}
                  disabled={loading || !email}
                  onPress={handleJoinWaitlist}
                  buttonStyle={styles.primaryButton}
                  titleStyle={styles.buttonTitle}
                  containerStyle={styles.buttonContainer}
                />

                <View style={styles.footer}>
                  <Text style={styles.footerDisclaimer}>
                    We value your privacy. No spam, ever.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    ...Platform.select({
      ios: Shadows.large,
      android: Shadows.medium,
      web: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 40 }
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 54,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
    fontSize: 42,
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  tagline: {
    ...Typography.headline,
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    gap: Spacing.sm,
  },
  pitch: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  inputWrapper: {
    marginBottom: -Spacing.sm,
  },
  inputContainerStyle: {
    paddingHorizontal: 0,
  },
  inputFieldContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    borderBottomWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  inputText: {
    fontSize: 16,
    color: Colors.text,
  },
  buttonContainer: {
    marginTop: Spacing.sm,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: Colors.black,
    height: 62,
    borderRadius: Radius.full,
  },
  buttonTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: Colors.white,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  footerDisclaimer: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    fontSize: 13,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.title1,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  statsContainer: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    width: '100%',
  },
  statsCount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  statsLabel: {
    ...Typography.caption1,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
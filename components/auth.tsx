import { Button, Input } from '@rneui/themed'
import React, { useState } from 'react'
import { Alert, AppState, StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope', color: '#8E8E93' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          inputContainerStyle={styles.inputContainer}
          labelStyle={styles.label}
          inputStyle={styles.inputText}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock', color: '#8E8E93' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
          inputContainerStyle={styles.inputContainer}
          labelStyle={styles.label}
          inputStyle={styles.inputText}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Sign in"
          disabled={loading}
          onPress={() => signInWithEmail()}
          buttonStyle={styles.primaryButton}
          titleStyle={styles.buttonTitle}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Button
          title="Sign up"
          disabled={loading}
          onPress={() => signUpWithEmail()}
          buttonStyle={styles.secondaryButton}
          titleStyle={styles.secondaryButtonTitle}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 24,
    backgroundColor: '#F9F9F9',
    flex: 1,
  },
  verticallySpaced: {
    paddingTop: 8,
    paddingBottom: 8,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  label: {
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 14,
  },
  inputText: {
    color: '#1C1C1E',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    height: 56,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  buttonTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButtonTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#1C1C1E',
  },
})
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          value={session?.user?.email}
          disabled
          inputContainerStyle={styles.inputContainer}
          labelStyle={styles.label}
          inputStyle={styles.inputText}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Username"
          value={username || ''}
          onChangeText={(text) => setUsername(text)}
          inputContainerStyle={styles.inputContainer}
          labelStyle={styles.label}
          inputStyle={styles.inputText}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Website"
          value={website || ''}
          onChangeText={(text) => setWebsite(text)}
          inputContainerStyle={styles.inputContainer}
          labelStyle={styles.label}
          inputStyle={styles.inputText}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() => updateProfile({ username, website, avatar_url: avatarUrl })}
          disabled={loading}
          buttonStyle={styles.primaryButton}
          titleStyle={styles.buttonTitle}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Button
          title="Sign Out"
          onPress={() => supabase.auth.signOut()}
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
    color: '#FF3B30', // Red for sign out
  },
})
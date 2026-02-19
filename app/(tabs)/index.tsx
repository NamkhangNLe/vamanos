import Ionicons from '@expo/vector-icons/Ionicons';
import { Session } from '@supabase/supabase-js';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.replace('/auth');
      } else {
        fetchActivities();
      }
    });
  }, []);

  async function fetchActivities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          creator:profiles!creator_id(username, avatar_url),
          crew:crews(name)
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateActivity() {
    if (!newActivityTitle.trim() || !session?.user) return;

    try {
      setIsCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Simple logic for MVP: Assign to first crew user belongs to
      const { data: crewData } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      if (!crewData) {
        Alert.alert('No Crew found', 'You need to be in a crew to post activities.');
        return;
      }

      const { error } = await supabase.from('activities').insert({
        title: newActivityTitle,
        creator_id: session.user.id,
        crew_id: crewData.crew_id,
        scheduled_at: new Date(Date.now() + 3600000).toISOString(), // Sample: In 1 hour
      });

      if (error) throw error;

      setNewActivityTitle('');
      fetchActivities();
    } catch (error) {
      Alert.alert('Error', 'Failed to create activity');
    } finally {
      setIsCreating(false);
    }
  }

  const renderActivity = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => router.push({ pathname: '/amigos', params: { activityId: item.id } })}
    >
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityTag}>{item.crew?.name || 'Local'}</Text>
      </View>
      <View style={styles.activityFooter}>
        <Text style={styles.activityInfo}>
          By {item.creator?.username || 'Someone'} • {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#aaa" />
      </View>
    </TouchableOpacity>
  );

  if (loading && activities.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ffd33d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="🏐 What's the plan?"
          placeholderTextColor="#666"
          value={newActivityTitle}
          onChangeText={setNewActivityTitle}
        />
        <TouchableOpacity
          style={[styles.vamanosButton, !newActivityTitle.trim() && styles.disabledButton]}
          onPress={handleCreateActivity}
          disabled={!newActivityTitle.trim() || isCreating}
        >
          <Text style={styles.buttonText}>{isCreating ? '...' : 'Vámonos!'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No activities yet. Be the spark! 🔥</Text>
          </View>
        }
        onRefresh={fetchActivities}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
  },
  vamanosButton: {
    backgroundColor: '#ffd33d',
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    padding: 20,
  },
  activityCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  activityTag: {
    backgroundColor: '#2a2a2a',
    color: '#ffd33d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    overflow: 'hidden',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    color: '#aaa',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
});
import Ionicons from '@expo/vector-icons/Ionicons';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AmigosScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [crews, setCrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCrewName, setNewCrewName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchCrews(session.user.id);
    });
  }, []);

  async function fetchCrews(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crews')
        .select(`
          *,
          members:crew_members(user_id, profiles(username, avatar_url))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCrews(data || []);
    } catch (error) {
      console.error('Error fetching crews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCrew() {
    if (!newCrewName.trim() || !session?.user) return;

    try {
      setLoading(true);
      const { data: crew, error: crewError } = await supabase
        .from('crews')
        .insert({ name: newCrewName, created_by: session.user.id })
        .select()
        .single();

      if (crewError) throw crewError;

      const { error: memberError } = await supabase
        .from('crew_members')
        .insert({ crew_id: crew.id, user_id: session.user.id });

      if (memberError) throw memberError;

      setNewCrewName('');
      fetchCrews(session.user.id);
      Alert.alert('Success', `Crew "${newCrewName}" created!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create crew');
    } finally {
      setLoading(false);
    }
  }

  const renderCrew = ({ item }: { item: any }) => (
    <View style={styles.crewCard}>
      <View style={styles.crewHeader}>
        <Text style={styles.crewName}>{item.name}</Text>
        <Text style={styles.memberCount}>{item.members?.length || 0} members</Text>
      </View>
      <View style={styles.memberList}>
        {item.members?.slice(0, 5).map((m: any, idx: number) => (
          <View key={idx} style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{m.profiles?.username?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.createSection}>
        <TextInput
          style={styles.input}
          placeholder="New Crew Name (e.g. Volleyball Crew)"
          placeholderTextColor="#666"
          value={newCrewName}
          onChangeText={setNewCrewName}
        />
        <TouchableOpacity
          style={[styles.addButton, !newCrewName.trim() && styles.disabledButton]}
          onPress={handleCreateCrew}
          disabled={!newCrewName.trim() || loading}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={crews}
        keyExtractor={(item) => item.id}
        renderItem={renderCrew}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your Crews</Text>}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You're not in any crews yet.</Text>
          </View>
        }
        onRefresh={() => session && fetchCrews(session.user.id)}
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
  createSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#ffd33d',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  listContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  crewCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  crewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  crewName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  memberCount: {
    color: '#ffd33d',
    fontSize: 14,
  },
  memberList: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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


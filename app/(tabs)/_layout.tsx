import { Tabs } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';


export default function TabLayout() {
  return (
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#ffd33d',
            headerStyle: {
            backgroundColor: '#25292e',
          },
            headerShadowVisible: false,
            headerTintColor: '#fff',
            tabBarStyle: {
            backgroundColor: '#25292e',
          },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people-circle' : 'people-circle-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="amigos"
        options={{
          title: 'Amigos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'footsteps' : 'footsteps-outline'} color={color} size={24}/>
          ),
        }}
      />
    </Tabs>
  );
}

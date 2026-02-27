# Vámonos 🚀

Vámonos is a social coordination app designed for spontaneous activities with friend groups. See who's down, set squad thresholds, and track real-time progress toward the event.

## 📍 Real-time Location Features

The app now features robust real-time location integration across all platforms (iOS, Android, and Web):

- **Automatic Location Tagging**: New activities are automatically tagged with your current coordinates using `expo-location`.
- **Dynamic Maps**: Maps center on your actual location and show your progress toward activity destinations.
- **Live Participation Pins**: See where your squad is relative to the activity in real-time.
- **Web Support**: Full Leaflet-based map integration for web browsers with IP/Browser-based location estimation.
- **Smart Fallbacks**: Graceful fallback to city-level centering if location permissions are denied.

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup Supabase**
   - Configure your environment variables in `.env` with your Supabase URL and Anon Key.

3. **Start the app**
   ```bash
   npm run ios     # Run on iOS
   npm run android # Run on Android
   npm run web     # Run on Web
   ```

## 🛠 Features

- **Activity Creation**: Set emojis, titles, and squad thresholds.
- **RSVP System**: "I'm Down" vs "Maybe", with progress bars tracking toward the minimum squad size.
- **Crew Management**: Coordinate within specific friend groups.
- **Native Experience**: Haptics, blurs, and smooth bottom-sheet interactions.
- **Full-Screen Map**: Uber-style home screen with activity discovery pins.

## 📚 Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Supabase documentation](https://supabase.com/docs)

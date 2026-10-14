// AppHeader.js
// Install once:
//   npm i react-native-linear-gradient react-native-safe-area-context
//   (Expo: npx expo install expo-linear-gradient react-native-safe-area-context)
//
// Usage:
//   <AppHeader
//     greeting="Good Afternoon,"
//     userName="Domestic CRM 3"
//     status="Online"
//     initials="DC"
//     logo={require('./assets/stunning-logo.png')}
//     onLogoPress={() => {}}
//     onAvatarPress={() => {}}
//   />

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bare React Native:
import LinearGradient from 'react-native-linear-gradient';
// Expo instead (swap the line above):
// import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  gradientStart: '#E9B84A', // light gold (left)
  gradientMid: '#D9A233', // amber
  gradientEnd: '#C98F22', // deeper amber (right)
  textDark: '#3A2A08', // dark brown text
  onlineDot: '#2ECC71',
  avatarBg: '#E26A4B', // coral avatar circle
  avatarBorder: '#FFFFFF',
  avatarText: '#FFFFFF',
  chevron: '#3A2A08',
};

const AppHeader = ({
  greeting = 'Good Afternoon,',
  userName = 'Domestic CRM 3',
  status = 'Online',
  initials = 'DC',
  logo,
  onLogoPress,
  onAvatarPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.container,
          { paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top) + 6 },
        ]}
      >
        <View style={styles.row}>
          {/* Logo + chevron */}
          <TouchableOpacity
            style={styles.left}
            activeOpacity={0.7}
            onPress={onLogoPress}
          >
            {logo ? (
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.logoFallback}>STUNNING</Text>
            )}
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>

          {/* Greeting + user + status */}
          <View style={styles.center}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}
            </Text>
            <View style={styles.userRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.userName}> [</Text>
              <View style={styles.dot} />
              <Text style={styles.userName}>{status}]</Text>
            </View>
          </View>

          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAvatarPress}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 14,
    // subtle shadow under header
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 96,
  },
  logo: {
    width: 72,
    height: 28,
  },
  logoFallback: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textDark,
  },
  chevron: {
    fontSize: 14,
    color: COLORS.chevron,
    marginLeft: 2,
    marginTop: -4,
  },
  center: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.onlineDot,
    marginRight: 3,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.avatarBg,
    borderWidth: 2,
    borderColor: COLORS.avatarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.avatarText,
  },
});

export default AppHeader;

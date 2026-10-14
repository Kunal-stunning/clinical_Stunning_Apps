// SideDrawer.js
// Right-side sliding panel. Shows only: profile info, "Personal Dashboard", and "Logout".
// (The "Checked In" card has been removed.)
//
// Install once (icons only):
//   npm i react-native-vector-icons react-native-safe-area-context
//   (Expo: npx expo install @expo/vector-icons react-native-safe-area-context)
//
// Usage:
//   const [open, setOpen] = useState(false);
//
//   <AppHeader onAvatarPress={() => setOpen(true)} />
//   <SideDrawer
//     visible={open}
//     onClose={() => setOpen(false)}
//     initials="DC"
//     name="Domestic CRM 3"
//     status="Online"
//     email="crm.domestic3@stunningdentistry.in"
//     onPersonalDashboard={() => { setOpen(false); navigation.navigate('Dashboard'); }}
//     onLogout={() => { setOpen(false); handleLogout(); }}
//   />

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bare React Native:
import Icon from 'react-native-vector-icons/Ionicons';
// Expo instead (swap the line above):
// import { Ionicons as Icon } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 340);

const COLORS = {
  overlay: 'rgba(0,0,0,0.35)',
  panel: '#FFFFFF',
  avatarBg: '#FBF1D8',
  avatarBorder: '#D9A233',
  avatarText: '#B8841C',
  title: '#111827',
  subtitle: '#6B7280',
  itemText: '#111827',
  itemIcon: '#374151',
  closeBg: '#F3F4F6',
  closeIcon: '#374151',
  logoutBg: '#FFF1F1',
  logoutBorder: '#F7CACA',
  logoutText: '#D92D20',
};

const SideDrawer = ({
  visible,
  onClose,
  initials = 'DC',
  name = 'Domestic CRM 3',
  status = 'Online',
  email = '',
  onPersonalDashboard,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Dimmed backdrop (tap to close) */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: fade }]} />
        </TouchableWithoutFeedback>

        {/* Panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top + 12,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Close button */}
          <View style={styles.closeRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close menu"
            >
              <Icon name="close" size={16} color={COLORS.closeIcon} />
            </TouchableOpacity>
          </View>

          {/* Profile */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {name} ({status})
          </Text>
          {!!email && (
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          )}

          <View style={styles.divider} />

          {/* Personal Dashboard */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onPersonalDashboard}
          >
            <Icon name="grid-outline" size={18} color={COLORS.itemIcon} />
            <Text style={styles.menuText}>Personal Dashboard</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.8}
            onPress={onLogout}
          >
            <Icon name="log-out-outline" size={16} color={COLORS.logoutText} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  panel: {
    height: '100%',
    backgroundColor: COLORS.panel,
    paddingHorizontal: 16,
    borderTopLeftRadius: 0,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: -3, height: 0 },
  },
  closeRow: {
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.avatarBg,
    borderWidth: 2,
    borderColor: COLORS.avatarBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.avatarText,
  },
  name: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.title,
  },
  email: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.subtitle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.itemText,
  },
  logoutBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.logoutBg,
    borderWidth: 1,
    borderColor: COLORS.logoutBorder,
  },
  logoutText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.logoutText,
  },
});

export default SideDrawer;

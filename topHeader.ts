import type { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { useNotifications, formatTimeAgo } from "@/hooks/useNotifications";
import { ApiNotification } from "@/services/notification";
import {
  isHodUser,
  getActiveWorkspace,
  setActiveWorkspace,
  subscribeCrmStore,
} from "@/services/crmStore";
import { useUserProfile } from "@/services/employeeOnboardingService";

type Props = {
  onProfilePress?: () => void;
};

// Web fallback chime — used only when Platform.OS === "web", since expo-audio's
// player is aimed at native and web audio autoplay/decoding is unreliable there.
const playWebChime = () => {
  try {
    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    }
  } catch (e) {
    console.log("Web notification chime failed", e);
  }
};

export function EnquiryHeader({ onProfilePress }: Props) {
  // --- Same username-resolution logic used in GreetingSection ---
  const user = useSelector((state: RootState) => state.auth.user);
  const presenceStatus = useSelector((state: RootState) => state.presence?.status);
  const isOnline = presenceStatus === "online" || Boolean(user?.isCheckedIn);
  const rawName = user?.name ?? user?.fullName ?? user?.firstName ?? "User";
  const cleanName = rawName.replace(/\s*\((Offline|Online)\)\s*/gi, "").trim();
  const userName = isOnline ? `${cleanName} (Online)` : `${cleanName} (Offline)`;
  const userProfile = useUserProfile();
  const resolvedAvatarUri = userProfile.avatarUri;
  const initials = userProfile.initials;

  // --- Live clock so the greeting word (Morning/Afternoon/Evening) stays correct ---
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  let greetingWord = "Good Evening";
  if (hour < 12) greetingWord = "Good Morning";
  else if (hour < 17) greetingWord = "Good Afternoon";

  const notificationPlayer = useAudioPlayer(
    require("../../../assets/sounds/notification.mp3"),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentWs, setCurrentWs] = useState(getActiveWorkspace());

  useEffect(() => {
    const unsub = subscribeCrmStore(() => {
      setCurrentWs(getActiveWorkspace());
    });
    return unsub;
  }, []);

  const isHod = isHodUser(user) || isHodUser(userProfile) || isHodUser(userProfile?.profileData);

  // Floating Bubble Notification Toast State
  const [toastNotif, setToastNotif] = useState<ApiNotification | null>(null);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const notifAnim = useRef(new Animated.Value(0)).current;

  // Toast animation (Slide Down & Fade)
  const toastY = useRef(new Animated.Value(-60)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Make sure the notification sound is actually audible on native devices,
  // even when the iOS silent switch is on.
  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
      }).catch((e) => console.log("Failed to configure audio mode", e));
    }
  }, []);

  // Plays the notification chime on whichever platform we're running on.
  const playChime = async () => {
    try {
      if (Platform.OS === "web") {
        playWebChime();
        return;
      }
      await notificationPlayer.seekTo(0);
      notificationPlayer.play();
    } catch (e) {
      console.log("Notification sound playback failed", e);
    }
  };

  // Trigger floating bubble toast notification for 5 seconds
  const showBubbleToast = (notif: ApiNotification) => {
    setToastNotif(notif);
    playChime();

    // Slide down animation
    Animated.parallel([
      Animated.spring(toastY, {
        toValue: 10,
        bounciness: 8,
        speed: 16,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide bubble notification toast after 5 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastY, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setToastNotif(null));
    }, 5000);
  };

  // Real backend-backed notifications — a toast/chime fires only for
  // notifications that are genuinely new since the last poll (never for the
  // initial load, so opening the app doesn't toast the whole history).
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({
    onNewNotifications: (fresh) => {
      fresh.forEach(showBubbleToast);
    },
  });

  const handleNotificationPress = (notif: ApiNotification) => {
    if (!notif.isRead) markRead(notif.id);
    if (notif.linkedLeadId) {
      closeNotif();
      router.push({
        pathname: "/leadTimeline/[leadId]",
        params: { leadId: String(notif.linkedLeadId) },
      } as any);
    }
  };

  const animateOpen = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  };

  const animateClose = (anim: Animated.Value, onDone: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => finished && onDone());
  };

  const closeMenu = () => animateClose(menuAnim, () => setMenuOpen(false));
  const closeNotif = () => animateClose(notifAnim, () => setNotifOpen(false));

  const toggleMenu = () => {
    if (notifOpen) closeNotif();
    if (menuOpen) {
      closeMenu();
    } else {
      setMenuOpen(true);
      animateOpen(menuAnim);
    }
  };

  const openNotif = () => {
    if (menuOpen) closeMenu();
    setNotifOpen(true);
    animateOpen(notifAnim);
  };

  const dropdownStyle = {
    opacity: menuAnim,
    transform: [
      {
        scale: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
      {
        translateY: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
    ],
  };

  const notifStyle = {
    opacity: notifAnim,
    transform: [
      {
        scale: notifAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
      {
        translateY: notifAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
    ],
  };

  return (
    <>
      {/* Gold Gradient Header (replaces white background) */}
      <LinearGradient
        colors={[
          "rgb(201, 146, 46)",
          "rgb(217, 164, 65)",
          "rgb(232, 196, 106)",
        ]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradientWrap}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.container}>
            {/* Left: Stunning Dentistry Logo */}
            <TouchableOpacity
              style={styles.titleRow}
              activeOpacity={0.75}
              onPress={toggleMenu}
            >
              <Image
                source={require("../../../assets/images/Whites.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />

              <View style={styles.titleTextWrap}>
                <View style={styles.subTitleRow}>
                  <Ionicons
                    name={menuOpen ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Center: Live greeting pulled from Redux user state */}
            <View style={styles.greetingWrap}>
              <Text style={styles.greetingText} numberOfLines={1}>
                {greetingWord},
              </Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {userName} 👋
              </Text>
            </View>

            {/* Right: Notifications & Profile */}
            <View style={styles.right}>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={openNotif}
              >
                <View>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  {unreadCount > 0 && <View style={styles.badgeDot} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onProfilePress || (() => router.push("/more" as any))}
                activeOpacity={0.85}
              >
                {resolvedAvatarUri ? (
                  <Image
                    source={{ uri: resolvedAvatarUri }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.initialsAvatar]}>
                    <Text style={styles.initialsText}>{initials}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Floating 5-Second Bubble Notification Toast */}
      {toastNotif && (
        <Animated.View
          style={[
            styles.bubbleToast,
            {
              transform: [{ translateY: toastY }],
              opacity: toastOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={["#F9E3A3", "#E2B35A", "#B8832F"]}
            style={styles.toastIconBox}
          >
            <Ionicons name="notifications" size={14} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle} numberOfLines={1}>
              {toastNotif.title}
            </Text>
            <Text style={styles.toastMessage} numberOfLines={1}>
              {toastNotif.message}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setToastNotif(null)} hitSlop={10}>
            <Ionicons name="close" size={14} color="#6E6E73" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Workspace Switcher */}
      {menuOpen && (
        <>
          <Pressable style={styles.overlay} onPress={closeMenu} />
          <Animated.View style={[styles.dropdown, dropdownStyle]}>
            <Text style={styles.dropdownLabel}>SWITCH WORKSPACE</Text>

            {/* Patient Management */}
            {currentWs !== "patient" && (
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => {
                  closeMenu();
                  setActiveWorkspace("patient");
                  router.replace("/patient-dashboard" as any);
                }}
              >
                <View style={styles.itemIconWrap}>
                  <Ionicons name="people-outline" size={18} color="#0D395E" />
                </View>

                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemText}>Patient Management</Text>
                  <Text style={styles.itemSubText}>
                    Files, appointments & clinical history
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#C9C9C9" />
              </TouchableOpacity>
            )}

            {/* Head Department Relation (HOD Only) */}
            {isHod && currentWs !== "head_department_relation" && (
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => {
                  closeMenu();
                  setActiveWorkspace("head_department_relation");
                  router.replace("/enquiry-dashboard" as any);
                }}
              >
                <View
                  style={[
                    styles.itemIconWrap,
                    { backgroundColor: "#FFF8EE" },
                  ]}
                >
                  <Ionicons name="git-network-outline" size={18} color="#C4922A" />
                </View>

                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemText}>Head Department Relation</Text>
                  <Text style={styles.itemSubText}>
                    Full CRM network report, team leads & performance
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#C9C9C9" />
              </TouchableOpacity>
            )}

            {/* Enquiry Management */}
            {(currentWs === "patient" || currentWs === "head_department_relation") && (
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => {
                  closeMenu();
                  setActiveWorkspace("enquiry");
                  router.replace("/enquiry-dashboard" as any);
                }}
              >
                <View style={styles.itemIconWrap}>
                  <Ionicons name="call-outline" size={18} color="#0D395E" />
                </View>

                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemText}>Enquiry Management</Text>
                  <Text style={styles.itemSubText}>
                    Inbound leads, follow-ups & tasks
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#C9C9C9" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </>
      )}

      {/* Notification Panel */}
      {notifOpen && (
        <>
          <Pressable style={styles.overlay} onPress={closeNotif} />
          <Animated.View style={[styles.notifPanel, notifStyle]}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderText}>
                Live Notifications ({notifications.length})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.readAllBtn}
                    activeOpacity={0.75}
                    onPress={() => markAllRead()}
                  >
                    <Text style={styles.readAllText}>Read All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  onPress={closeNotif}
                >
                  <Ionicons name="close" size={18} color="#1D1D1F" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.notifList}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length === 0 ? (
                <Text style={styles.notifEmptyText}>
                  No notifications yet — you'll see new email leads and re-enquiries here.
                </Text>
              ) : (
                notifications.map((n, idx) => (
                  <View key={n.id}>
                    <TouchableOpacity
                      style={styles.notifItem}
                      activeOpacity={0.7}
                      onPress={() => handleNotificationPress(n)}
                    >
                      <View
                        style={[styles.notifDot, !n.isRead && styles.notifDotUnread]}
                      />
                      <View style={styles.notifTextWrap}>
                        <Text
                          style={[styles.notifTitle, !n.isRead && styles.notifTitleUnread]}
                        >
                          {n.title}
                        </Text>
                        {n.message && (
                          <Text style={styles.notifMessage}>{n.message}</Text>
                        )}
                        <Text style={styles.notifTime}>{formatTimeAgo(n.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                    {idx < notifications.length - 1 && (
                      <View style={styles.line} />
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewAllBtn}
              activeOpacity={0.75}
              onPress={() => {
                closeNotif();
                router.push("/notifications" as any);
              }}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerGradientWrap: {
    width: "100%",
  },

  safeArea: {
    backgroundColor: "transparent",
  },

  container: {
    height: 56,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoImage: {
    width: 120,
    height: 96,
  },

  titleTextWrap: {
    justifyContent: "center",
  },

  subTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* Live greeting, stacked two-line block between logo and icons */
  greetingWrap: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  greetingText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 16,
  },

  greetingName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 19,
    marginTop: 1,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBtn: {
    marginRight: 12,
  },

  badgeDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E11D48",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  initialsAvatar: {
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#B45309",
  },
  initialsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },

  /* Bubble Toast Notification */
  bubbleToast: {
    position: "absolute",
    top: 64,
    left: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2B35A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },

  toastIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  toastTextWrap: {
    flex: 1,
    marginRight: 6,
  },

  toastTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D1D1F",
  },

  toastMessage: {
    fontSize: 11,
    color: "#6E6E73",
    marginTop: 1,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },

  /* Workspace dropdown */
  dropdown: {
    position: "absolute",
    top: 64,
    left: 14,
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },

  dropdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6E6E73",
    letterSpacing: 1,
    paddingHorizontal: 10,
    marginBottom: 4,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  activeWorkspaceItem: {
    backgroundColor: "#FDF5E6",
  },

  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  itemTextWrap: {
    flex: 1,
  },

  itemText: {
    fontSize: 13,
    color: "#1D1D1F",
    fontWeight: "700",
  },

  itemSubText: {
    fontSize: 11,
    color: "#6E6E73",
    marginTop: 1,
  },

  /* Notification panel */
  notifPanel: {
    position: "absolute",
    top: 64,
    right: 14,
    width: 300,
    maxHeight: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingTop: 4,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },

  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
  },

  notifHeaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D1D1F",
  },

  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },

  readAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FFF9F2",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8D6B7",
  },

  readAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B9822A",
  },

  notifList: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E5EA",
    marginTop: 5,
    marginRight: 8,
  },

  notifDotUnread: {
    backgroundColor: "#E2B35A",
  },

  notifTextWrap: {
    flex: 1,
  },

  notifTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    marginBottom: 2,
  },

  notifTitleUnread: {
    fontWeight: "700",
    color: "#1D1D1F",
  },

  notifMessage: {
    fontSize: 11.5,
    color: "#6E6E73",
    lineHeight: 16,
    marginBottom: 3,
  },

  notifTime: {
    fontSize: 10,
    color: "#6E6E73",
    fontWeight: "500",
  },

  notifEmptyText: {
    fontSize: 12,
    color: "#6E6E73",
    textAlign: "center",
    paddingVertical: 24,
    paddingHorizontal: 10,
  },

  viewAllBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F7",
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B9822A",
  },

  line: {
    height: 1,
    backgroundColor: "#F5F5F7",
  },
});

export default EnquiryHeader;

import { logoutSuccess } from "@/features/auth/authSlice";
import { logout as logoutApi } from "@/services/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useUserProfile, getEmployeeProfile } from "@/services/employeeOnboardingService";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  presenceRequestFailed,
  presenceRequestStart,
  setPresence,
} from "../features/presence/presenceSlice";
import { checkIn, checkOut, getMyPresence } from "../services/presence";
import { getCheckInLocationData } from "../services/locationService";
import {
  isHodUser,
  isCrmOrCrmHead,
  getActiveWorkspace,
  setActiveWorkspace,
  subscribeCrmStore,
  WorkspaceType,
} from "../services/crmStore";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const DRAWER_WIDTH = Math.min(310, Dimensions.get("window").width * 0.84);

const GOLD = "#C9971F";
const GOLD_BG = "#FBF0D9";
const DARK_TEXT = "#1C1C1E";
const MUTED_TEXT = "#7A7A7A";
const RED = "#E5484D";
const RED_BG = "#FCEAE9";
const GREEN = "#1AAE6F";
const GREEN_BG = "#E6F7EF";

function formatTime(iso: string) {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  return `${hours}:${minutes} ${ampm}`;
}

// Formats elapsed seconds as HH:MM:SS (or MM:SS if under an hour)
function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function ProfileDrawer({ visible, onClose }: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const presenceStatus = useAppSelector(
    (state) => state.presence?.status ?? "offline",
  );

  // activeSessionStart: ISO start of the CURRENT session, null while offline.
  // Used to drive the live ticking timer.
  const activeSessionStart = useAppSelector(
    (state) => state.presence?.activeSessionStart ?? null,
  );

  // lastCheckInTime: ISO of the most recent check-in, kept around even after
  // checkout, so the drawer can always show "Last Check-in" regardless of
  // current online/offline status.
  const lastCheckInTime = useAppSelector(
    (state) => state.presence?.lastCheckInTime ?? null,
  );

  const todayTotalDurationSeconds = useAppSelector(
    (state) => state.presence?.todayTotalDurationSeconds ?? 0,
  );
  const ipAddress = useAppSelector(
    (state) => state.presence?.ipAddress ?? null,
  );
  const geoLocation = useAppSelector(
    (state) => state.presence?.geoLocation ?? null,
  );
  const latitude = useAppSelector(
    (state) => state.presence?.latitude ?? null,
  );
  const longitude = useAppSelector(
    (state) => state.presence?.longitude ?? null,
  );

  const rawName = user?.name ?? user?.fullName ?? user?.firstName ?? "User";
  const cleanName = rawName.replace(/\s*\((Offline|Online)\)\s*/gi, "").trim();
  const isOnline = presenceStatus === "online" || Boolean(user?.isCheckedIn);
  const userName = isOnline ? `${cleanName} (Online)` : `${cleanName} (Offline)`;
  const userProfile = useUserProfile();
  const isHod = isHodUser(user) || isHodUser(userProfile) || isHodUser(userProfile?.profileData);
  const userEmail = user?.email ?? "No Email";
  const resolvedAvatarUri = userProfile.avatarUri;
  const initials = userProfile.initials;
  const [updatingPresence, setUpdatingPresence] = useState(false);
  const [currentSessionElapsed, setCurrentSessionElapsed] = useState(0);
  const [currentWs, setCurrentWs] = useState<WorkspaceType>(getActiveWorkspace());

  useEffect(() => {
    setCurrentWs(getActiveWorkspace());
    const unsub = subscribeCrmStore(() => {
      setCurrentWs(getActiveWorkspace());
    });
    return unsub;
  }, []);

  const pathname = usePathname();
  const isInsidePortal = Boolean(
    pathname && (pathname.includes("(portal)") || pathname.startsWith("/dashboard") || pathname.includes("/leave") || pathname.includes("/attendance"))
  );

  const isCrm =
    isCrmOrCrmHead(user, userProfile) ||
    isCrmOrCrmHead(userProfile?.profileData) ||
    Boolean(user?.isCrm || user?.isCrmUser || userProfile?.isCrm || userProfile?.isCrmUser) ||
    ((user?.role || "").toLowerCase().includes("crm")) ||
    ((user?.email || "").toLowerCase().includes("crm")) ||
    ((userProfile?.role || "").toLowerCase().includes("crm")) ||
    ((userProfile?.email || "").toLowerCase().includes("crm")) ||
    ((userProfile?.profileData?.role || "").toLowerCase().includes("crm")) ||
    ((userProfile?.profileData?.email || "").toLowerCase().includes("crm")) ||
    ((userProfile?.profileData?.designation || "").toLowerCase().includes("crm"));

  const handleProfessionalPortalPress = async () => {
    onClose();
    let pData = userProfile?.profileData;
    if (!pData || !pData.designation) {
      try {
        pData = await getEmployeeProfile();
      } catch {}
    }

    const email = (pData?.email || userProfile.email || user?.email || "").toLowerCase().trim();
    const role = (pData?.role || userProfile.role || user?.role || "").toLowerCase().trim();
    const desig = (pData?.designation || userProfile.designation || (user as any)?.designation || "").toLowerCase().trim();

    const isSuperAdmin =
      email === "ritiksharma10508@gmail.com" ||
      email === "kunalsharma020401@gmail.com" ||
      role === "admin" ||
      user?.role === "admin" ||
      desig.includes("super_admin") ||
      desig.includes("admin,");

    if (isSuperAdmin) {
      router.replace("/(admin)/dashboard" as any);
      return;
    }

    if (isHod) {
      setActiveWorkspace("head_department_relation");
      router.replace("/(enquiry)/enquiry-dashboard" as any);
      return;
    }

    if (isCrm) {
      setActiveWorkspace("enquiry");
      router.replace("/(enquiry)/enquiry-dashboard" as any);
      return;
    }

    router.push("/tickets" as any);
  };

  const dispatch = useAppDispatch();

  // Sync the real presence state from the backend whenever the drawer opens.
  useEffect(() => {
    if (!visible) return;

    (async () => {
      try {
        const result = await getMyPresence();
        dispatch(setPresence(result));
      } catch (error) {
        console.log("[getMyPresence failed]", error);
      }
    })();
  }, [visible, dispatch]);

  // Live ticking timer for the CURRENT session only.
  // Today's grand total shown in UI = todayTotalDurationSeconds (past sessions, from backend)
  // + currentSessionElapsed (this session, ticking live). Never invented client-side outside this tick.
  useEffect(() => {
    if (!isOnline || !activeSessionStart) {
      setCurrentSessionElapsed(0);
      return;
    }

    const startedAt = new Date(activeSessionStart).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setCurrentSessionElapsed(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [isOnline, activeSessionStart]);

  // Today's running total = past completed sessions (from backend) + live current session
  const todayTotalDisplaySeconds =
    todayTotalDurationSeconds + (isOnline ? currentSessionElapsed : 0);

  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(DRAWER_WIDTH);
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 4,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => finished && setModalVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleCheckIn = async () => {
    if (updatingPresence) return;
    setUpdatingPresence(true);
    dispatch(presenceRequestStart());
    try {
      const locationData = await getCheckInLocationData();
      const result = await checkIn(locationData);
      dispatch(setPresence(result));
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Check-in failed. Please try again.";
      console.log("[Check In Error]", message);
      dispatch(presenceRequestFailed(message));
      Alert.alert("Check In", message);
    } finally {
      setUpdatingPresence(false);
    }
  };

  const handleCheckOut = async () => {
    if (updatingPresence) return;
    setUpdatingPresence(true);
    dispatch(presenceRequestStart());
    try {
      let locationData;
      try {
        locationData = await getCheckInLocationData();
      } catch (locErr) {
        console.warn("[ProfileDrawer] location on checkout error:", locErr);
      }
      const result = await checkOut(locationData);
      dispatch(setPresence(result));
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to check out.";
      console.log("[Check Out Error]", error?.response?.data);
      dispatch(presenceRequestFailed(message));
      Alert.alert("Check Out Failed", message);
    } finally {
      setUpdatingPresence(false);
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const performActualLogout = async () => {
    setLoggingOut(true);
    try {
      onClose();
      await logoutApi();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      dispatch(logoutSuccess());
      setLoggingOut(false);
      router.replace("/login");
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;

    if (isCrm && presenceStatus === "online") {
      Alert.alert(
        "Check Out & Logout",
        "You are currently checked in. Would you like to check out before logging out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Check Out & Logout",
            style: "destructive",
            onPress: async () => {
              try {
                const result = await checkOut();
                dispatch(setPresence(result));
              } catch (e) {
                console.warn("Checkout before logout failed:", e);
              } finally {
                await performActualLogout();
              }
            },
          },
        ],
      );
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: performActualLogout,
        },
      ]);
    }
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={modalVisible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
              colors={["#FBEEDC", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.header}
            >
              <TouchableOpacity
                style={styles.closeBtn}
                activeOpacity={0.7}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={DARK_TEXT} />
              </TouchableOpacity>

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

              <Text style={styles.name}>{userName}</Text>

              <Text style={styles.email}>{userEmail}</Text>
            </LinearGradient>

            <ScrollView
              style={styles.scrollMenu}
              contentContainerStyle={styles.menu}
              showsVerticalScrollIndicator={false}
            >
              {/* Personal Dashboard button */}
              <TouchableOpacity
                style={[
                  styles.item,
                  isInsidePortal && styles.activeItem,
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  onClose();
                  router.push("/(portal)/dashboard" as any);
                }}
              >
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={20}
                  color={isInsidePortal ? GOLD : DARK_TEXT}
                />
                <Text
                  style={
                    isInsidePortal ? styles.activeItemText : styles.itemText
                  }
                >
                  Personal Dashboard
                </Text>
              </TouchableOpacity>

              {/* Professional Dashboard / CRM Portal button (visible when inside Staff Portal) */}
              {isInsidePortal && (
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.75}
                  onPress={handleProfessionalPortalPress}
                >
                  <MaterialCommunityIcons
                    name="briefcase-outline"
                    size={20}
                    color={DARK_TEXT}
                  />
                  <Text style={styles.itemText}>
                    {isHod ? "HOD Desk / CRM" : isCrm ? "CRM Dashboard" : "Professional Dashboard"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Head Department Relation (HOD Executive Oversight Desk) */}
              {isHod && (
                <TouchableOpacity
                  style={[
                    styles.item,
                    currentWs === "head_department_relation" && styles.activeItem,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    setActiveWorkspace("head_department_relation");
                    onClose();
                    router.replace("/(enquiry)/enquiry-dashboard" as any);
                  }}
                >
                  <MaterialCommunityIcons
                    name="chart-timeline-variant-shimmer"
                    size={20}
                    color={currentWs === "head_department_relation" ? GOLD : DARK_TEXT}
                  />
                  <Text
                    style={
                      currentWs === "head_department_relation"
                        ? styles.activeItemText
                        : styles.itemText
                    }
                  >
                    Head Department Relation
                  </Text>
                </TouchableOpacity>
              )}

                            {/* Attendance Status Card with aligned text: ONLY SHOWN FOR CRM PROFILES */}
              {isCrm && (
                <View style={styles.attendanceCard}>
                  {/* Header: Title + Status Badge */}
                  <View style={styles.attendanceCardHeader}>
                    <View style={styles.attendanceTitleWrap}>
                      <MaterialCommunityIcons
                        name="account-clock-outline"
                        size={18}
                        color={isOnline ? GREEN : DARK_TEXT}
                      />
                      <Text style={styles.attendanceTitle}>
                        {isOnline ? "Checked In" : "Checked Out"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isOnline ? GREEN_BG : RED_BG },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isOnline ? GREEN : RED },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isOnline ? GREEN : RED },
                        ]}
                      >
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </Text>
                    </View>
                  </View>

                  {/* Details List */}
                  <View style={styles.attendanceDetailsList}>
                    {lastCheckInTime ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Check-in:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(lastCheckInTime)}
                        </Text>
                      </View>
                    ) : null}

                    {isOnline && ipAddress ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>IP:</Text>
                        <Text
                          style={styles.detailValue}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {ipAddress}
                        </Text>
                      </View>
                    ) : null}

                    {isOnline && (geoLocation || latitude) ? (
                      <View style={[styles.detailRow, { alignItems: "flex-start" }]}>
                        <Text style={[styles.detailLabel, { paddingTop: 2 }]}>Geo:</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              flex: 1,
                              maxWidth: "75%",
                              lineHeight: 16,
                              textAlign: "right",
                            },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {geoLocation ||
                            (latitude && longitude
                              ? `New Delhi, India (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                              : "New Delhi, India")}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Duration:</Text>
                      <Text style={styles.detailValue}>
                        {formatElapsed(todayTotalDisplaySeconds)}
                      </Text>
                    </View>
                  </View>

                  {/* Action button: Check Out / Check In */}
                  <TouchableOpacity
                    style={[
                      styles.actionRow,
                      { backgroundColor: isOnline ? RED_BG : GREEN_BG },
                    ]}
                    activeOpacity={0.8}
                    onPress={isOnline ? handleCheckOut : handleCheckIn}
                    disabled={updatingPresence}
                  >
                    {updatingPresence ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={isOnline ? RED : GREEN}
                        />
                        <Text
                          style={[
                            styles.actionRowText,
                            { color: isOnline ? RED : GREEN },
                          ]}
                        >
                          {isOnline ? "Checking Out..." : "Checking In..."}
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={isOnline ? "logout" : "login"}
                          size={17}
                          color={isOnline ? RED : GREEN}
                        />
                        <Text
                          style={[
                            styles.actionRowText,
                            { color: isOnline ? RED : GREEN },
                          ]}
                        >
                          {isOnline ? "Check Out" : "Check In"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.8}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  overlay: { flex: 1, backgroundColor: "#00000055" },
  drawer: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
  },
  header: { paddingTop: 14, paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: {
    alignSelf: "flex-end",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: GOLD,
    marginTop: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  initialsAvatar: {
    backgroundColor: GOLD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 20,
    fontWeight: "800",
    color: GOLD,
  },
  name: { fontSize: 16.5, fontWeight: "700", color: DARK_TEXT, marginBottom: 3 },
  email: { fontSize: 12, color: MUTED_TEXT },
  scrollMenu: { flex: 1 },
  menu: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24 },
  activeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: GOLD_BG,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  activeItemText: { fontSize: 14, fontWeight: "700", color: GOLD },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  itemText: { fontSize: 14, fontWeight: "600", color: DARK_TEXT },

  /* Aligned Attendance Card */
  attendanceCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  attendanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  attendanceTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attendanceTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: DARK_TEXT,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5 },

  attendanceDetailsList: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: MUTED_TEXT,
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: DARK_TEXT,
    maxWidth: "60%",
    textAlign: "right",
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* Logout Button */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#DC2626",
  },
});

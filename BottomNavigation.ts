
import { useEffect, useRef, useState } from "react";
import QuickActions from "@/quick-actions/QuickActions";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOLD_DARK = "#8A6116";
const INACTIVE = "rgba(255, 255, 255, 0.78)";
const CARD_BG = "#FFFFFF";
const LABEL_DARK = "#2A2210";
const DIM_BACKDROP = "rgba(20, 16, 8, 0.35)";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = 12;
const CARD_GUTTER = 8;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 24, 336);

type Tab = {
  key: string;
  label: string;
  route?: string;
  matchRoutes?: string[];
  icon: (color: string) => React.ReactNode;
};

const TABS: Tab[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    route: "/enquiry-dashboard",
    matchRoutes: ["/enquiry-dashboard"],
    icon: (color) => <Ionicons name="home-outline" size={20} color={color} />,
  },
  {
    key: "leads",
    label: "All Leads",
    route: "/leads",
    matchRoutes: ["/leads"],
    icon: (color) => <Ionicons name="people-outline" size={20} color={color} />,
  },
  {
    key: "calendar",
    label: "Calendar",
    route: "/calendar",
    matchRoutes: ["/calendar"],
    icon: (color) => <Ionicons name="calendar-outline" size={20} color={color} />,
  },
  {
    key: "quick-actions",
    label: "Quick Actions",
    icon: (color) => <Ionicons name="add-circle-outline" size={21} color={color} />,
  },
  {
    key: "more",
    label: "More",
    icon: (color) => (
      <MaterialCommunityIcons
        name="dots-horizontal-circle-outline"
        size={21}
        color={color}
      />
    ),
  },
];

type MoreItem = {
  key: string;
  label: string;
  route: string;
  icon: (color: string) => React.ReactNode;
};

const MORE_ITEMS: MoreItem[] = [
  {
    key: "Stunner",
    label: "Stunner",
    route: "/(enquiry)/(Stunner-chat)",
    icon: (color) => (
      <MaterialCommunityIcons name="robot-outline" size={24} color={color} />
    ),
  },
  {
    key: "Intera-chat",
    label: "Intra-chat",
    route: "/(enquiry)/intra-chat",
    icon: (color) => (
      <Ionicons name="chatbubble-ellipses-outline" size={22} color={color} />
    ),
  },
  {
    key: "Raise-ticket",
    label: "Raise Ticket",
    route: "/(enquiry)/raise-ticket",
    icon: (color) => <Ionicons name="ticket-outline" size={22} color={color} />,
  },
  {
    key: "Intra-mail",
    label: "Intra-mail",
    route: "/(enquiry)/Inbox",
    icon: (color) => <Ionicons name="mail-outline" size={22} color={color} />,
  },
];

const ITEM_COL_WIDTH =
  (CARD_WIDTH -
    CARD_HORIZONTAL_PADDING * 2 -
    CARD_GUTTER * (MORE_ITEMS.length - 1)) /
  MORE_ITEMS.length;

type Layout = { x: number; y: number; width: number; height: number };

type TabItemProps = {
  tab: Tab;
  active: boolean;
  onPress: () => void;
  onLayoutRef?: (ref: View | null) => void;
};

function TabItem({ tab, active, onPress, onLayoutRef }: TabItemProps) {
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(activeAnim, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 130,
      useNativeDriver: true,
    }).start();
  }, [active]);

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.92,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  const pillScale = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  const pillOpacity = activeAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.4, 1],
  });

  const iconScale = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const labelTranslateY = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  const iconColor = active ? GOLD_DARK : INACTIVE;

  return (
    <Pressable
      ref={onLayoutRef as any}
      style={styles.tab}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.tabInner,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <View style={styles.iconContainer}>
          {/* Animated active white pill */}
          <Animated.View
            style={[
              styles.activePill,
              {
                opacity: pillOpacity,
                transform: [{ scale: pillScale }],
              },
            ]}
          />

          {/* Icon with subtle scale */}
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            {tab.icon(iconColor)}
          </Animated.View>
        </View>

        {/* Animated label */}
        <Animated.Text
          style={[
            styles.label,
            active && styles.activeLabel,
            { transform: [{ translateY: labelTranslateY }] },
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function EnquiryBottomBar() {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [moreTabLayout, setMoreTabLayout] = useState<Layout | null>(null);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 0;

  const moreTabRef = useRef<View | null>(null);

  const moreAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(MORE_ITEMS.map(() => new Animated.Value(0))).current;

  const openMoreMenu = () => {
    moreTabRef.current?.measureInWindow((x, y, width, height) => {
      setMoreTabLayout({ x, y, width, height });
    });

    setShowMoreMenu(true);

    Animated.spring(moreAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();

    Animated.stagger(
      60,
      itemAnims.map((val) =>
        Animated.spring(val, {
          toValue: 1,
          useNativeDriver: true,
          speed: 16,
          bounciness: 9,
        }),
      ),
    ).start();
  };

  const closeMoreMenu = () => {
    Animated.stagger(
      30,
      itemAnims
        .slice()
        .reverse()
        .map((val) =>
          Animated.timing(val, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ),
    ).start();

    Animated.timing(moreAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowMoreMenu(false));
  };

  const isActive = (matchRoutes?: string[]) =>
    !!matchRoutes &&
    matchRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const handlePress = (tab: Tab) => {
    if (tab.key === "quick-actions") {
      setQuickActionsOpen(true);
      return;
    }
    if (tab.key === "more") {
      showMoreMenu ? closeMoreMenu() : openMoreMenu();
      return;
    }
    if (tab.route) {
      router.replace(tab.route as any);
    }
  };

  const cardBottom =
    (moreTabLayout ? Dimensions.get("window").height - moreTabLayout.y : 80) + 12;

  const cardLeft = moreTabLayout
    ? Math.max(
        12,
        Math.min(
          moreTabLayout.x + moreTabLayout.width - CARD_WIDTH,
          SCREEN_WIDTH - CARD_WIDTH - 12,
        ),
      )
    : SCREEN_WIDTH - CARD_WIDTH - 12;

  const cardAnimatedStyle = {
    opacity: moreAnim,
    transform: [
      {
        translateY: moreAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: moreAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
    ],
  };

  return (
    <LinearGradient
      colors={[
        "rgb(201, 146, 46)",
        "rgb(217, 164, 65)",
        "rgb(232, 196, 106)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrapper,
        {
          paddingTop: 8,
          paddingBottom: 8 + bottomInset,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const active =
            isActive(tab.matchRoutes) || (tab.key === "more" && showMoreMenu);

          return (
            <TabItem
              key={tab.key}
              tab={tab}
              active={active}
              onPress={() => handlePress(tab)}
              onLayoutRef={tab.key === "more" ? (ref) => (moreTabRef.current = ref) : undefined}
            />
          );
        })}
      </View>

      <QuickActions
        visible={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
      />

      {/* Popover More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMoreMenu}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: DIM_BACKDROP, opacity: moreAnim },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeMoreMenu}
            />
          </Animated.View>

          {/* The popover card */}
          <Animated.View
            style={[
              styles.card,
              { width: CARD_WIDTH, left: cardLeft, bottom: cardBottom },
              cardAnimatedStyle,
            ]}
            pointerEvents={showMoreMenu ? "auto" : "none"}
          >
            <View style={styles.cardRow}>
              {MORE_ITEMS.map((item, index) => {
                const anim = itemAnims[index];
                return (
                  <Animated.View
                    key={item.key}
                    style={[
                      styles.itemCol,
                      {
                        opacity: anim,
                        transform: [
                          {
                            translateY: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [16, 0],
                            }),
                          },
                          {
                            scale: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.6, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.itemButton}
                      onPress={() => {
                        closeMoreMenu();
                        router.push(item.route as any);
                      }}
                    >
                      {item.icon(GOLD_DARK)}
                    </TouchableOpacity>
                    <Text style={styles.itemLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {/* Gold Bar Clone inside Modal for tapping Cancel */}
          <LinearGradient
            colors={[
              "rgb(201, 146, 46)",
              "rgb(217, 164, 65)",
              "rgb(232, 196, 106)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.wrapper,
              styles.barCloneOverlay,
              {
                paddingTop: 8,
                paddingBottom: 8 + bottomInset,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.tabsRow}>
              {TABS.map((tab) => {
                if (tab.key !== "more") {
                  return (
                    <View key={tab.key} style={styles.tab} pointerEvents="none" />
                  );
                }
                return (
                  <Animated.View
                    key={tab.key}
                    style={[styles.tab, { opacity: moreAnim }]}
                    pointerEvents={showMoreMenu ? "auto" : "none"}
                  >
                    <TouchableOpacity
                      style={styles.tabInner}
                      activeOpacity={0.7}
                      onPress={closeMoreMenu}
                    >
                      <View style={[styles.iconContainer, styles.activePill]}>
                        <Ionicons name="close" size={20} color={GOLD_DARK} />
                      </View>
                      <Text
                        style={[styles.label, styles.activeLabel]}
                        numberOfLines={1}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },

  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tabInner: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  activePill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  label: {
    marginTop: 3,
    fontSize: 10.5,
    color: INACTIVE,
    fontWeight: "600",
    textAlign: "center",
  },

  activeLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  modalRoot: {
    flex: 1,
  },

  card: {
    position: "absolute",
    backgroundColor: CARD_BG,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  itemCol: {
    alignItems: "center",
    width: ITEM_COL_WIDTH,
  },

  itemButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(217, 164, 65, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  itemLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: LABEL_DARK,
    textAlign: "center",
    lineHeight: 14,
  },

  barCloneOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
});

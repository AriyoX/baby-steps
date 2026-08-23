import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ShanaPortrait } from "@/components/brand/ShanaPortrait";
import { MarqueeText } from "@/components/common/MarqueeText";
import { Text } from "@/components/StyledText";
import { brandColors, brandShadows } from "@/constants/Brand";

type ColoringBadge = {
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  label: string;
  unlocked: boolean;
};

type JourneyLeadCardProps = {
  cardHeight: number;
  mode: "journey";
  title: string;
};

type ColoringLeadCardProps = {
  accessibilityLabel: string;
  badgeSummary: string;
  badges: ColoringBadge[];
  cardHeight: number;
  mode: "coloring";
  savedSummary: string;
  title: string;
};

type ChildLeadCardProps = JourneyLeadCardProps | ColoringLeadCardProps;

export const CHILD_LEAD_CARD_WIDTH = 204;
export const CHILD_LEAD_CARD_GAP = 14;

export function ChildLeadCard(props: ChildLeadCardProps) {
  if (props.mode === "coloring") {
    return (
      <LinearGradient
        accessibilityLabel={props.accessibilityLabel}
        accessible
        colors={[brandColors.blue[800], brandColors.blue[600]]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.card, styles.coloringCard, { height: props.cardHeight }]}
      >
        <View style={styles.decorativeOrb} />
        <View style={styles.titleRow}>
          <View style={styles.paletteIcon}>
            <Ionicons
              color={brandColors.gold[800]}
              name="color-palette"
              size={19}
            />
          </View>
          <Text
            className="ml-2 flex-1 text-lg text-white"
            numberOfLines={1}
            variant="bold"
          >
            {props.title}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text
              className="text-xs text-white"
              numberOfLines={1}
              variant="bold"
            >
              {props.savedSummary}
            </Text>
          </View>
          <View style={styles.summaryPill}>
            <Text
              className="text-xs text-white"
              numberOfLines={1}
              variant="bold"
            >
              {props.badgeSummary}
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          {props.badges.map((badge) => (
            <View
              accessibilityLabel={badge.label}
              accessible
              key={badge.id}
              style={[
                styles.badge,
                badge.unlocked && styles.badgeUnlocked,
              ]}
            >
              <Ionicons
                color={
                  badge.unlocked
                    ? brandColors.gold[700]
                    : "rgba(255,255,255,0.82)"
                }
                name={badge.unlocked ? badge.icon : "lock-closed"}
                size={14}
              />
            </View>
          ))}
        </View>

      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[brandColors.gold[100], brandColors.orange[100]]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.card, styles.journeyCard, { height: props.cardHeight }]}
    >
      <View style={styles.journeyCopy}>
        <MarqueeText
          adjustsFontSizeToFit
          className="text-[21px] leading-6"
          containerStyle={{ maxWidth: 116 }}
          minimumFontScale={0.68}
          style={{ color: brandColors.blue[800] }}
          variant="display"
        >
          {props.title}
        </MarqueeText>
        <View style={styles.journeyMotif}>
          <View style={styles.journeyMotifDot} />
          <View style={[styles.journeyMotifDot, styles.journeyMotifDotSmall]} />
          <View style={styles.journeyMotifLine} />
        </View>
      </View>
      <ShanaPortrait
        accessible={false}
        importantForAccessibility="no"
        style={styles.journeyMascot}
        variant="welcome"
        width={92}
        height={122}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    marginRight: 5,
    width: 28,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 9,
  },
  badgeUnlocked: {
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
  },
  card: {
    ...brandShadows.soft,
    borderRadius: 22,
    borderWidth: 1.5,
    marginRight: CHILD_LEAD_CARD_GAP,
    overflow: "hidden",
    padding: 14,
    width: CHILD_LEAD_CARD_WIDTH,
  },
  coloringCard: {
    borderColor: "rgba(255,255,255,0.26)",
  },
  decorativeOrb: {
    backgroundColor: "rgba(248,194,62,0.15)",
    borderRadius: 60,
    height: 94,
    position: "absolute",
    right: -28,
    top: -32,
    width: 94,
  },
  journeyCard: {
    borderColor: "rgba(255,255,255,0.72)",
  },
  journeyCopy: {
    zIndex: 2,
  },
  journeyMascot: {
    bottom: -7,
    position: "absolute",
    right: -3,
  },
  journeyMotif: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  journeyMotifDot: {
    backgroundColor: brandColors.shanaOrange,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  journeyMotifDotSmall: {
    height: 5,
    marginLeft: 4,
    width: 5,
  },
  journeyMotifLine: {
    backgroundColor: "rgba(7, 86, 133, 0.3)",
    borderRadius: 2,
    height: 3,
    marginLeft: 5,
    width: 22,
  },
  paletteIcon: {
    alignItems: "center",
    backgroundColor: brandColors.gold[100],
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  summaryPill: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  summaryRow: {
    flexDirection: "row",
    marginRight: -5,
    marginTop: 8,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
  },
});

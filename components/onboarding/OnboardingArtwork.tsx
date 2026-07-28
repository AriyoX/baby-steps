import type { ComponentProps } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShanaPortrait } from "@/components/brand/ShanaPortrait";
import { Text } from "@/components/StyledText";
import { brandColors, brandShadows } from "@/constants/Brand";

export type OnboardingArtworkVariant = "play" | "discover" | "family";

type OnboardingArtworkProps = {
  variant: OnboardingArtworkVariant;
};

type IconBubbleProps = {
  color: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  style?: ViewStyle;
};

function IconBubble({ color, icon, style }: IconBubbleProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[styles.iconBubble, style]}
    >
      <Ionicons name={icon} color={color} size={24} />
    </View>
  );
}

function PlayArtwork() {
  return (
    <View style={styles.stage}>
      <View style={[styles.largeHalo, { backgroundColor: brandColors.gold[100] }]} />
      <View style={[styles.smallOrb, styles.playOrb, { backgroundColor: brandColors.orange[300] }]} />
      <IconBubble
        color={brandColors.victoriaBlue}
        icon="book-outline"
        style={styles.playBookBubble}
      />
      <IconBubble
        color={brandColors.orange[600]}
        icon="game-controller-outline"
        style={styles.playGameBubble}
      />
      <IconBubble
        color={brandColors.gold[700]}
        icon="musical-notes-outline"
        style={styles.playMusicBubble}
      />
      <View style={styles.playMascot}>
        <ShanaPortrait variant="welcome" width={162} height={210} />
      </View>
    </View>
  );
}

function FamilyArtwork() {
  return (
    <View style={styles.stage}>
      <View style={[styles.largeHalo, { backgroundColor: brandColors.orange[100] }]} />
      <View style={styles.familyMascot}>
        <ShanaPortrait variant="family" width={104} height={170} />
      </View>

      <View style={styles.familyCard}>
        <View style={styles.profileRow}>
          <View style={[styles.profileBubble, { backgroundColor: brandColors.blue[100] }]}>
            <Ionicons name="happy-outline" color={brandColors.blue[700]} size={28} />
          </View>
          <View style={[styles.profileBubble, { backgroundColor: brandColors.orange[100] }]}>
            <Ionicons name="happy" color={brandColors.orange[600]} size={28} />
          </View>
          <View style={[styles.profileBubble, { backgroundColor: brandColors.gold[100] }]}>
            <Ionicons name="add" color={brandColors.gold[800]} size={28} />
          </View>
        </View>

        <View style={styles.progressLabelRow}>
          <Text variant="bold" style={styles.familyCardLabel}>
            Family learning
          </Text>
          <Ionicons name="sparkles" color={brandColors.equatorialGold} size={17} />
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <View style={[styles.progressTrack, styles.shortProgressTrack]}>
          <View style={[styles.progressFill, styles.shortProgressFill]} />
        </View>
      </View>

      <IconBubble
        color={brandColors.blue[700]}
        icon="shield-checkmark-outline"
        style={styles.familyShieldBubble}
      />
    </View>
  );
}

function DiscoverArtwork() {
  return (
    <View style={styles.stage}>
      <View style={[styles.largeHalo, { backgroundColor: brandColors.blue[100] }]} />
      <View style={styles.speechBubble}>
        <Text variant="bold" style={styles.speechBubbleText}>
          Stories, words and play — all together!
        </Text>
        <View style={styles.speechBubbleTail} />
      </View>
      <IconBubble
        color={brandColors.victoriaBlue}
        icon="language-outline"
        style={styles.discoverLanguageBubble}
      />
      <IconBubble
        color={brandColors.orange[600]}
        icon="star-outline"
        style={styles.discoverStarBubble}
      />
      <View style={styles.discoverMascot}>
        <ShanaPortrait variant="reading" width={148} height={222} />
      </View>
    </View>
  );
}

export function OnboardingArtwork({ variant }: OnboardingArtworkProps) {
  if (variant === "family") return <FamilyArtwork />;
  if (variant === "discover") return <DiscoverArtwork />;
  return <PlayArtwork />;
}

const styles = StyleSheet.create({
  familyCard: {
    ...brandShadows.soft,
    backgroundColor: brandColors.white,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 28,
    borderWidth: 1,
    height: 164,
    left: 98,
    paddingHorizontal: 18,
    paddingVertical: 17,
    position: "absolute",
    top: 40,
    width: 214,
  },
  familyCardLabel: {
    color: brandColors.neutral[700],
    fontSize: 13,
    lineHeight: 19,
    paddingRight: 3,
  },
  familyMascot: {
    bottom: 3,
    left: 7,
    position: "absolute",
    zIndex: 2,
  },
  familyShieldBubble: {
    right: 2,
    top: 24,
  },
  iconBubble: {
    ...brandShadows.soft,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    width: 48,
    zIndex: 3,
  },
  largeHalo: {
    borderRadius: 120,
    height: 224,
    left: 56,
    opacity: 0.9,
    position: "absolute",
    top: 20,
    width: 224,
  },
  playBookBubble: {
    left: 20,
    top: 48,
  },
  playGameBubble: {
    right: 13,
    top: 77,
  },
  playMascot: {
    bottom: -4,
    left: 89,
    position: "absolute",
  },
  playMusicBubble: {
    bottom: 20,
    left: 46,
  },
  playOrb: {
    right: 34,
    top: 21,
  },
  profileBubble: {
    alignItems: "center",
    borderColor: brandColors.white,
    borderRadius: 25,
    borderWidth: 3,
    height: 50,
    justifyContent: "center",
    marginRight: -7,
    width: 50,
  },
  profileRow: {
    flexDirection: "row",
  },
  progressFill: {
    backgroundColor: brandColors.victoriaBlue,
    borderRadius: 4,
    height: "100%",
    width: "72%",
  },
  progressLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
    marginTop: 14,
  },
  progressTrack: {
    backgroundColor: brandColors.blue[50],
    borderRadius: 4,
    height: 7,
    overflow: "hidden",
    width: "100%",
  },
  discoverLanguageBubble: {
    left: 20,
    top: 96,
  },
  discoverMascot: {
    bottom: -7,
    left: 96,
    position: "absolute",
  },
  discoverStarBubble: {
    right: 20,
    top: 109,
  },
  shortProgressFill: {
    backgroundColor: brandColors.shanaOrange,
    width: "54%",
  },
  shortProgressTrack: {
    marginTop: 8,
    width: "76%",
  },
  smallOrb: {
    borderRadius: 10,
    height: 20,
    position: "absolute",
    transform: [{ rotate: "18deg" }],
    width: 20,
  },
  speechBubble: {
    ...brandShadows.soft,
    backgroundColor: brandColors.white,
    borderColor: brandColors.blue[200],
    borderRadius: 20,
    borderWidth: 1,
    left: 56,
    paddingHorizontal: 14,
    paddingVertical: 13,
    position: "absolute",
    top: 16,
    width: 228,
    zIndex: 4,
  },
  speechBubbleTail: {
    backgroundColor: brandColors.white,
    bottom: -7,
    height: 15,
    left: 54,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 15,
  },
  speechBubbleText: {
    color: brandColors.blue[800],
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 1,
    textAlign: "center",
  },
  stage: {
    height: 260,
    position: "relative",
    width: 340,
  },
});

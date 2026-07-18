"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Text } from "@/components/StyledText"
import { BrandMark } from "@/components/brand/BrandMark"
import { ChildLoadingCard } from "@/components/child/ChildLoadingState"
import { CachedImage } from "@/components/common/CachedImage"
import {
  loadContentBundle,
  resolveImageSource,
  type ChildMenuCard,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { brandColors, brandShadows } from "@/constants/Brand"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { audioManager } from "@/lib/audioManager"
import {
  COLORING_ACHIEVEMENTS,
  EMPTY_COLORING_PROGRESS,
  getColoringProgress,
  type ColoringProgress,
} from "@/lib/coloringProgress"

const TAB_BAR_CLEARANCE = 88

export function ColoringGallery() {
  const router = useRouter()
  const { activeChild } = useChild()
  const { t, translateAchievement } = useChildUiLanguage()
  const { width, height } = useWindowDimensions()
  const {
    settings: audioSettings,
    toggleAppSoundsMuted,
    toggleBackgroundMusicMuted,
  } = useAudio()
  useChildLandscapeOrientation("coloring gallery")

  const isCompact = width < 820 || height < 430
  const [cards, setCards] = useState<ChildMenuCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [retrySequence, setRetrySequence] = useState(0)
  const [progress, setProgress] = useState<ColoringProgress>(EMPTY_COLORING_PROGRESS)

  useEffect(() => {
    let isMounted = true
    const loadGallery = async () => {
      setIsLoading(true)
      const result = await loadContentBundle(activeChild?.selected_language_code, {
        forceRefresh: true,
      })
      if (!isMounted) return

      const nextCards = result.bundle?.menuCardsByTab.coloring ?? []
      setCards(nextCards)
      setIsLoading(false)
      if (result.bundle) void preloadContentBundleImages(result.bundle)
    }

    void loadGallery()
    return () => {
      isMounted = false
    }
  }, [activeChild?.selected_language_code, retrySequence])

  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      if (!activeChild?.id) {
        setProgress(EMPTY_COLORING_PROGRESS)
        return () => {
          isMounted = false
        }
      }

      void getColoringProgress(activeChild.id).then((nextProgress) => {
        if (isMounted) setProgress(nextProgress)
      })
      return () => {
        isMounted = false
      }
    }, [activeChild?.id]),
  )

  const openCard = (card: ChildMenuCard) => {
    router.push(`/${card.targetPage}` as never)
  }

  const openParentGate = () => {
    audioManager.speakAppText("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as never)
  }

  return (
    <LinearGradient
      colors={["#E7F7FF", "#FFF9E5", "#FFF0ED"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.goldBubble} />
      <View pointerEvents="none" style={styles.blueBubble} />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={[styles.header, isCompact && styles.compactHeader]}>
          <View style={styles.brandLockup}>
            <View style={[styles.mascotBubble, isCompact && styles.compactMascotBubble]}>
              <BrandMark kind="mascot" width={isCompact ? 31 : 38} height={isCompact ? 43 : 52} />
            </View>
            <View style={styles.headerCopy}>
              <Text variant="display" numberOfLines={1} style={[styles.title, isCompact && styles.compactTitle]}>
                {t("coloring.title")}
              </Text>
              <Text variant="medium" numberOfLines={1} style={styles.subtitle}>
                {t("coloring.subtitle")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={audioSettings.backgroundMusicMuted ? "Turn music on" : "Turn music off"}
              onPress={toggleBackgroundMusicMuted}
              style={styles.headerIconButton}
            >
              <Ionicons
                name={audioSettings.backgroundMusicMuted ? "musical-note-outline" : "musical-notes"}
                size={20}
                color={audioSettings.backgroundMusicMuted ? brandColors.neutral[500] : brandColors.gold[700]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={audioSettings.appSoundsMuted ? "Turn sounds on" : "Turn sounds off"}
              onPress={toggleAppSoundsMuted}
              style={styles.headerIconButton}
            >
              <Ionicons
                name={audioSettings.appSoundsMuted ? "volume-mute" : "volume-high"}
                size={20}
                color={audioSettings.appSoundsMuted ? brandColors.neutral[500] : brandColors.victoriaBlue}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open parent area"
              onPress={openParentGate}
              style={styles.parentButton}
            >
              <Ionicons name="people" size={19} color={brandColors.orange[600]} />
              {!isCompact ? <Text variant="bold" style={styles.parentButtonText}>{t("child.forParents")}</Text> : null}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, isCompact && styles.compactContent]}>
          <View style={[styles.clubPanel, isCompact && styles.compactClubPanel]}>
            <View style={styles.welcomeRow}>
              <View style={styles.starBubble}>
                <Ionicons name="star" size={22} color={brandColors.gold[700]} />
              </View>
              <View style={styles.welcomeCopy}>
                <Text variant="bold" numberOfLines={1} style={styles.welcomeTitle}>
                  {activeChild?.name
                    ? t("coloring.childArtShelf", { name: activeChild.name })
                    : t("coloring.yourArtShelf")}
                </Text>
                <Text variant="medium" style={styles.welcomeSubtitle}>
                  {t("coloring.everyPictureDifferent")}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={[styles.statCard, isCompact && styles.compactStatCard]}>
                <Text variant="display" style={styles.statNumber}>{progress.savedArtworkCount}</Text>
                <Text variant="bold" style={styles.statLabel}>{t("coloring.saved")}</Text>
              </View>
              <View style={[styles.statCard, styles.statCardGold, isCompact && styles.compactStatCard]}>
                <Text variant="display" style={styles.statNumber}>{progress.unlockedAchievementIds.length}</Text>
                <Text variant="bold" style={styles.statLabel}>{t("coloring.badges")}</Text>
              </View>
            </View>

            <Text variant="display" style={[styles.badgeHeading, isCompact && styles.compactBadgeHeading]}>
              {t("coloring.yourBadges")}
            </Text>
            <View style={[styles.badgeList, isCompact && styles.compactBadgeList]}>
              {COLORING_ACHIEVEMENTS.map((achievement) => {
                const unlocked = progress.unlockedAchievementIds.includes(achievement.id)
                const translatedAchievement = translateAchievement({
                  id: achievement.id,
                  name: achievement.title,
                  description: achievement.description,
                  game_key: "coloring",
                })
                return (
                  <View
                    key={achievement.id}
                    accessibilityLabel={`${translatedAchievement.name}. ${
                      unlocked
                        ? t("common.unlocked")
                        : translatedAchievement.description
                    }`}
                    style={[
                      styles.badgeRow,
                      isCompact && styles.compactBadgeRow,
                      unlocked && styles.unlockedBadgeRow,
                    ]}
                  >
                    <View style={[styles.badgeIcon, unlocked && styles.unlockedBadgeIcon]}>
                      <Ionicons
                        name={unlocked ? achievement.icon : "lock-closed"}
                        size={16}
                        color={unlocked ? brandColors.gold[700] : brandColors.neutral[400]}
                      />
                    </View>
                    <View style={[styles.badgeCopy, isCompact && styles.compactBadgeCopy]}>
                      <Text variant="bold" numberOfLines={1} style={styles.badgeTitle}>
                        {translatedAchievement.name}
                      </Text>
                      {!isCompact ? (
                        <Text variant="medium" numberOfLines={1} style={styles.badgeDescription}>
                          {unlocked ? t("coloring.youDidIt") : translatedAchievement.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>

            {!isCompact ? (
              <View style={styles.dailySpark}>
                <Ionicons name="color-wand" size={19} color={brandColors.orange[600]} />
                <View style={styles.dailySparkCopy}>
                  <Text variant="bold" style={styles.dailySparkTitle}>{t("coloring.creativeSpark")}</Text>
                  <Text variant="medium" numberOfLines={2} style={styles.dailySparkText}>
                    {t("coloring.creativeSparkHint")}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.galleryPanel}>
            <View style={styles.galleryHeadingRow}>
              <View>
                <Text variant="display" style={[styles.galleryTitle, isCompact && styles.compactGalleryTitle]}>
                  {t("coloring.choosePicture")}
                </Text>
                <Text variant="medium" style={styles.gallerySubtitle}>
                  {t("coloring.tapToOpen")}
                </Text>
              </View>
              <View style={styles.pictureCountPill}>
                <Ionicons name="images-outline" size={15} color={brandColors.blue[700]} />
                <Text variant="bold" style={styles.pictureCountText}>
                  {t("coloring.picturesCount", { count: cards.length })}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRail}
            >
              {cards.map((card, index) => (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title}. ${card.description}`}
                  onPress={() => openCard(card)}
                  style={({ pressed }) => [
                    styles.pictureCard,
                    isCompact && styles.compactPictureCard,
                    pressed && styles.pressedCard,
                  ]}
                >
                  <View style={styles.pictureFrame}>
                    <CachedImage
                      source={resolveImageSource(card.image, "african-focus.png")}
                      fallbackSource={resolveImageSource("african-focus.png")}
                      accessibilityLabel={card.title}
                      resizeMode="contain"
                      style={styles.pictureImage}
                      indicatorColor={brandColors.victoriaBlue}
                    />
                    <View style={styles.cardNumber}>
                      <Text variant="bold" style={styles.cardNumberText}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.pictureCopy}>
                    <Text variant="display" numberOfLines={1} style={styles.pictureTitle}>
                      {card.title}
                    </Text>
                    <Text variant="medium" numberOfLines={2} style={styles.pictureDescription}>
                      {card.description}
                    </Text>
                    <View style={styles.openStudioPill}>
                      <Ionicons name="color-palette" size={15} color={brandColors.white} />
                      <Text variant="bold" style={styles.openStudioText}>{t("coloring.colorIt")}</Text>
                      <Ionicons name="arrow-forward" size={14} color={brandColors.white} />
                    </View>
                  </View>
                </Pressable>
              ))}

              {isLoading ? (
                <ChildLoadingCard
                  label={t("coloring.openingShelf")}
                  style={[styles.pictureCard, isCompact && styles.compactPictureCard]}
                />
              ) : null}

              {!isLoading && cards.length === 0 ? (
                <View style={[styles.emptyCard, isCompact && styles.compactPictureCard]}>
                  <BrandMark kind="mascot" width={43} height={58} />
                  <Text variant="display" style={styles.emptyTitle}>{t("coloring.picturesComing")}</Text>
                  <Text variant="medium" style={styles.emptyText}>
                    {t("coloring.preparingPages")}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Try loading coloring pages again"
                    onPress={() => setRetrySequence((current) => current + 1)}
                    style={styles.tryAgainButton}
                  >
                    <Ionicons name="refresh" size={16} color={brandColors.white} />
                    <Text variant="bold" style={styles.tryAgainText}>{t("common.retry")}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  goldBubble: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -76,
    top: -98,
    backgroundColor: "rgba(248,194,62,0.2)",
  },
  blueBubble: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    left: -82,
    bottom: 22,
    backgroundColor: "rgba(2,116,187,0.11)",
  },
  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  compactHeader: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  brandLockup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  mascotBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.gold[300],
    ...brandShadows.soft,
  },
  compactMascotBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  title: {
    color: brandColors.blue[700],
    fontSize: 29,
    lineHeight: 31,
  },
  compactTitle: {
    fontSize: 23,
    lineHeight: 25,
  },
  subtitle: {
    color: brandColors.neutral[600],
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 12,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: brandColors.blue[100],
  },
  parentButton: {
    minWidth: 44,
    height: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.orange[200],
    paddingHorizontal: 12,
  },
  parentButtonText: {
    color: brandColors.blue[700],
    fontSize: 11,
    marginLeft: 5,
  },
  content: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 16,
  },
  compactContent: {
    paddingHorizontal: 10,
    paddingBottom: 7,
    gap: 9,
  },
  clubPanel: {
    width: 248,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 2,
    borderColor: brandColors.gold[200],
    padding: 14,
    ...brandShadows.soft,
  },
  compactClubPanel: {
    width: 204,
    borderRadius: 22,
    padding: 9,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.gold[50],
  },
  welcomeCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  welcomeTitle: {
    color: brandColors.blue[700],
    fontSize: 12,
  },
  welcomeSubtitle: {
    color: brandColors.neutral[500],
    fontSize: 9,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.blue[50],
    borderWidth: 1,
    borderColor: brandColors.blue[100],
  },
  statCardGold: {
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
  },
  compactStatCard: {
    minHeight: 48,
  },
  statNumber: {
    color: brandColors.blue[700],
    fontSize: 21,
    lineHeight: 22,
  },
  statLabel: {
    color: brandColors.neutral[500],
    fontSize: 9,
  },
  badgeHeading: {
    color: brandColors.blue[700],
    fontSize: 16,
    marginTop: 11,
    marginBottom: 3,
  },
  compactBadgeHeading: {
    fontSize: 14,
    marginTop: 7,
  },
  badgeList: {
    gap: 4,
  },
  compactBadgeList: {
    flexDirection: "row",
    gap: 3,
  },
  badgeRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: brandColors.neutral[50],
    borderWidth: 1,
    borderColor: brandColors.neutral[100],
    paddingHorizontal: 7,
  },
  unlockedBadgeRow: {
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
  },
  compactBadgeRow: {
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  badgeIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.neutral[100],
  },
  unlockedBadgeIcon: {
    backgroundColor: brandColors.white,
  },
  badgeCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
  },
  compactBadgeCopy: {
    display: "none",
  },
  badgeTitle: {
    color: brandColors.neutral[700],
    fontSize: 9,
  },
  badgeDescription: {
    color: brandColors.neutral[500],
    fontSize: 7,
  },
  dailySpark: {
    flex: 1,
    minHeight: 50,
    maxHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    backgroundColor: brandColors.orange[50],
    borderWidth: 1,
    borderColor: brandColors.orange[200],
    paddingHorizontal: 10,
    marginTop: 8,
  },
  dailySparkCopy: {
    flex: 1,
    marginLeft: 7,
  },
  dailySparkTitle: {
    color: brandColors.orange[700],
    fontSize: 9,
  },
  dailySparkText: {
    color: brandColors.neutral[600],
    fontSize: 8,
    lineHeight: 10,
  },
  galleryPanel: {
    flex: 1,
    minWidth: 0,
  },
  galleryHeadingRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  galleryTitle: {
    color: brandColors.blue[700],
    fontSize: 24,
    lineHeight: 26,
  },
  compactGalleryTitle: {
    fontSize: 20,
    lineHeight: 22,
  },
  gallerySubtitle: {
    color: brandColors.neutral[600],
    fontSize: 10,
    marginTop: 1,
  },
  pictureCountPill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: brandColors.blue[100],
    paddingHorizontal: 10,
  },
  pictureCountText: {
    color: brandColors.blue[700],
    fontSize: 9,
    marginLeft: 5,
  },
  cardRail: {
    alignItems: "stretch",
    paddingVertical: 7,
    paddingRight: 18,
    gap: 12,
  },
  pictureCard: {
    width: 214,
    height: "100%",
    maxHeight: 350,
    overflow: "hidden",
    borderRadius: 25,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.gold[200],
    ...brandShadows.lifted,
  },
  compactPictureCard: {
    width: 178,
    borderRadius: 21,
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  pictureFrame: {
    flex: 1.25,
    minHeight: 0,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.neutral[100],
    padding: 7,
  },
  pictureImage: {
    flex: 1,
    borderRadius: 17,
    backgroundColor: brandColors.white,
  },
  cardNumber: {
    position: "absolute",
    top: 9,
    left: 9,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.equatorialGold,
    borderWidth: 2,
    borderColor: brandColors.white,
  },
  cardNumberText: {
    color: brandColors.gold[900],
    fontSize: 10,
  },
  pictureCopy: {
    flex: 0.9,
    minHeight: 116,
    padding: 11,
  },
  pictureTitle: {
    color: brandColors.blue[700],
    fontSize: 18,
  },
  pictureDescription: {
    flex: 1,
    color: brandColors.neutral[600],
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
  },
  openStudioPill: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: brandColors.victoriaBlue,
    paddingHorizontal: 10,
    marginTop: 7,
  },
  openStudioText: {
    flex: 1,
    color: brandColors.white,
    fontSize: 10,
    marginLeft: 6,
  },
  emptyCard: {
    width: 214,
    height: "100%",
    maxHeight: 350,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.gold[200],
    padding: 18,
  },
  emptyTitle: {
    color: brandColors.blue[700],
    fontSize: 17,
    textAlign: "center",
    marginTop: 7,
  },
  emptyText: {
    color: brandColors.neutral[600],
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    marginTop: 4,
  },
  tryAgainButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: brandColors.victoriaBlue,
    paddingHorizontal: 13,
    marginTop: 11,
  },
  tryAgainText: {
    color: brandColors.white,
    fontSize: 9,
    marginLeft: 5,
  },
})

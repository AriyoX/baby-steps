import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type LayoutChangeEvent,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface CachedImageProps
  extends Omit<ImageProps, "source" | "style" | "onError" | "onLoad" | "onLoadStart" | "onLoadEnd"> {
  source: ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  className?: string;
  imageClassName?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  indicatorColor?: string;
  showRetry?: boolean;
  loadingDelayMs?: number;
  loadTimeoutMs?: number;
  placeholderText?: string;
  onImageError?: ImageProps["onError"];
}

const imageSourceKey = (source: ImageSourcePropType): string => {
  if (typeof source === "number") {
    return `${source}`;
  }

  if (Array.isArray(source)) {
    return source.map((item) => imageSourceKey(item)).join("|");
  }

  if (source && typeof source === "object" && "uri" in source) {
    return source.uri ?? JSON.stringify(source);
  }

  return JSON.stringify(source);
};

const isNetworkImageSource = (source: ImageSourcePropType): boolean => {
  if (Array.isArray(source)) {
    return source.some(isNetworkImageSource);
  }

  return Boolean(
    source &&
      typeof source === "object" &&
      "uri" in source &&
      typeof source.uri === "string" &&
      /^https?:\/\//i.test(source.uri.trim()),
  );
};

export function CachedImage({
  source,
  fallbackSource,
  className,
  imageClassName,
  style,
  imageStyle,
  indicatorColor = "#6366f1",
  showRetry = true,
  loadingDelayMs = 180,
  loadTimeoutMs = 15_000,
  placeholderText = "Picture coming soon",
  onImageError,
  accessibilityLabel,
  resizeMode = "cover",
  ...imageProps
}: CachedImageProps) {
  const sourceKey = useMemo(() => imageSourceKey(source), [source]);
  const fallbackSourceKey = useMemo(
    () => (fallbackSource ? imageSourceKey(fallbackSource) : ""),
    [fallbackSource],
  );
  const [fallbackForSourceKey, setFallbackForSourceKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingUi, setShowLoadingUi] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | undefined>();
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const isUsingFallback = fallbackForSourceKey === sourceKey;
  const activeSource = isUsingFallback && fallbackSource ? fallbackSource : source;
  const activeSourceKey = imageSourceKey(activeSource);
  const canUseFallback = Boolean(
    fallbackSource && fallbackSourceKey !== activeSourceKey,
  );
  const isCompactPlaceholder =
    layout.width === 0 || layout.height === 0 || layout.width < 120 || layout.height < 96;
  const canShowRetry =
    showRetry &&
    isNetworkImageSource(source) &&
    layout.width >= 160 &&
    layout.height >= 128;

  useEffect(() => {
    setFallbackForSourceKey(null);
    setIsLoading(true);
    setShowLoadingUi(false);
    setLoadProgress(undefined);
    setHasError(false);
  }, [fallbackSourceKey, sourceKey]);

  useEffect(() => {
    if (!isLoading || hasError) {
      setShowLoadingUi(false);
      return;
    }

    if (loadingDelayMs <= 0) {
      setShowLoadingUi(true);
      return;
    }

    const timer = setTimeout(() => setShowLoadingUi(true), loadingDelayMs);
    return () => clearTimeout(timer);
  }, [activeSourceKey, hasError, isLoading, loadingDelayMs, retryKey]);

  useEffect(() => {
    if (!isLoading || hasError || loadTimeoutMs <= 0) return;

    const timer = setTimeout(() => {
      if (canUseFallback && !isUsingFallback) {
        setFallbackForSourceKey(sourceKey);
        setLoadProgress(undefined);
        setRetryKey((current) => current + 1);
        return;
      }

      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("Image and fallback timed out while loading.");
      }
      setHasError(true);
      setIsLoading(false);
      setShowLoadingUi(false);
    }, loadTimeoutMs);

    return () => clearTimeout(timer);
  }, [
    activeSourceKey,
    canUseFallback,
    hasError,
    isLoading,
    isUsingFallback,
    loadTimeoutMs,
    retryKey,
    sourceKey,
  ]);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setLoadProgress(undefined);
    setFallbackForSourceKey(null);
    setRetryKey((current) => current + 1);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setLayout((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  };

  return (
    <View className={className} style={[styles.container, style]} onLayout={handleLayout}>
      {!hasError ? (
        <Image
          {...imageProps}
          key={`${activeSourceKey}-${retryKey}`}
          source={activeSource}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{
            ...imageProps.accessibilityState,
            busy: isLoading,
          }}
          resizeMode={resizeMode}
          className={imageClassName}
          style={[styles.image, imageStyle]}
          onLoadStart={() => {
            setIsLoading(true);
            setLoadProgress(undefined);
          }}
          onProgress={(event) => {
            const { loaded, total } = event.nativeEvent;
            if (total > 0 && loaded >= 0) {
              setLoadProgress(Math.min(1, loaded / total));
            }
          }}
          onLoad={() => {
            setIsLoading(false);
            setShowLoadingUi(false);
          }}
          onError={(event) => {
            if (canUseFallback && !isUsingFallback) {
              setFallbackForSourceKey(sourceKey);
              setIsLoading(true);
              setRetryKey((current) => current + 1);
              setLoadProgress(undefined);
              return;
            }

            if (typeof __DEV__ !== "undefined" && __DEV__) {
              console.warn("Image and fallback failed to load.", event.nativeEvent.error);
            }

            setHasError(true);
            setIsLoading(false);
            setShowLoadingUi(false);
            onImageError?.(event);
          }}
        />
      ) : null}

      {showLoadingUi && isLoading && !hasError ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="small" color={indicatorColor} />
          {!isCompactPlaceholder && loadProgress !== undefined ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(loadProgress * 100)}%`, backgroundColor: indicatorColor },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {hasError ? (
        <View
          style={styles.fallback}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            accessibilityLabel
              ? `${accessibilityLabel} is unavailable`
              : "Picture is unavailable"
          }
        >
          <Ionicons
            name="image-outline"
            size={isCompactPlaceholder ? 22 : 30}
            color="#64748b"
          />
          {!isCompactPlaceholder ? (
            <Text style={styles.fallbackText}>{placeholderText}</Text>
          ) : null}
          {canShowRetry ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                accessibilityLabel ? `Try loading ${accessibilityLabel} again` : "Try loading picture again"
              }
              onPress={retry}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 250, 252, 0.82)",
    gap: 8,
  },
  progressTrack: {
    width: "54%",
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: "rgba(100, 116, 139, 0.22)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#eef6fb",
  },
  fallbackText: {
    marginTop: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700",
  },
});

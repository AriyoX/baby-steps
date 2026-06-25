import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  extends Omit<ImageProps, "source" | "style" | "onError" | "onLoadStart" | "onLoadEnd"> {
  source: ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  className?: string;
  imageClassName?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  indicatorColor?: string;
  showRetry?: boolean;
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

export function CachedImage({
  source,
  fallbackSource,
  className,
  imageClassName,
  style,
  imageStyle,
  indicatorColor = "#6366f1",
  showRetry = true,
  accessibilityLabel,
  resizeMode = "cover",
  ...imageProps
}: CachedImageProps) {
  const sourceKey = useMemo(() => imageSourceKey(source), [source]);
  const latestSourceRef = useRef(source);
  const [activeSource, setActiveSource] = useState<ImageSourcePropType>(source);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<number | undefined>();
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  latestSourceRef.current = source;

  useEffect(() => {
    setActiveSource(latestSourceRef.current);
    setIsUsingFallback(false);
    setIsLoading(true);
    setLoadProgress(undefined);
    setHasError(false);
  }, [sourceKey]);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setLoadProgress(undefined);
    setIsUsingFallback(false);
    setActiveSource(source);
    setRetryKey((current) => current + 1);
  };

  return (
    <View className={className} style={[styles.container, style]}>
      {!hasError ? (
        <Image
          {...imageProps}
          key={`${imageSourceKey(activeSource)}-${retryKey}`}
          source={activeSource}
          accessibilityLabel={accessibilityLabel}
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
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={(event) => {
            if (typeof __DEV__ !== "undefined" && __DEV__) {
              console.warn("Image failed to load.", event.nativeEvent.error);
            }

            if (fallbackSource && !isUsingFallback) {
              setIsUsingFallback(true);
              setActiveSource(fallbackSource);
              setRetryKey((current) => current + 1);
              setLoadProgress(undefined);
              return;
            }

            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : null}

      {isLoading && !hasError ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="small" color={indicatorColor} />
          {loadProgress !== undefined ? (
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
        <View style={styles.fallback}>
          <Ionicons name="image-outline" size={28} color="#64748b" />
          <Text style={styles.fallbackText}>Picture coming soon</Text>
          {showRetry ? (
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
    backgroundColor: "rgba(248, 250, 252, 0.72)",
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
    backgroundColor: "#e0f2fe",
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

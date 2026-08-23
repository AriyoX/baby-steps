import React, { useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { Text, type StyledTextProps } from "@/components/StyledText"
import { useReducedMotion } from "@/hooks/useReducedMotion"

type MarqueeTextProps = Omit<StyledTextProps, "numberOfLines"> & {
  align?: "left" | "center" | "right"
  containerStyle?: StyleProp<ViewStyle>
  pauseMs?: number
  speed?: number
}

const getAccessibleText = (children: React.ReactNode): string =>
  React.Children.toArray(children)
    .filter((child): child is string | number =>
      typeof child === "string" || typeof child === "number",
    )
    .join("")

export function MarqueeText({
  accessibilityLabel,
  align = "left",
  children,
  containerStyle,
  onLayout,
  pauseMs = 550,
  speed = 34,
  style,
  ...textProps
}: MarqueeTextProps) {
  const scrollPosition = useRef(new Animated.Value(0)).current
  const scrollView = useRef<ScrollView | null>(null)
  const animation = useRef<Animated.CompositeAnimation | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  const reduceMotion = useReducedMotion()
  const shouldScroll =
    !reduceMotion && containerWidth > 0 && contentWidth > containerWidth + 2
  const restingAlignment =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"

  useEffect(() => {
    const listenerId = scrollPosition.addListener(({ value }) => {
      scrollView.current?.scrollTo({ animated: false, x: value, y: 0 })
    })

    return () => scrollPosition.removeListener(listenerId)
  }, [scrollPosition])

  useEffect(() => {
    animation.current?.stop()
    scrollPosition.stopAnimation()
    scrollPosition.setValue(0)
    scrollView.current?.scrollTo({ animated: false, x: 0, y: 0 })

    if (!shouldScroll) return

    const distance = contentWidth - containerWidth
    const forwardDuration = Math.max(2200, Math.round((distance / speed) * 1000))
    const returnDuration = Math.max(1400, Math.round(forwardDuration * 0.65))
    animation.current = Animated.loop(
      Animated.sequence([
        Animated.delay(pauseMs),
        Animated.timing(scrollPosition, {
          duration: forwardDuration,
          easing: Easing.linear,
          toValue: distance,
          useNativeDriver: false,
        }),
        Animated.delay(pauseMs),
        Animated.timing(scrollPosition, {
          duration: returnDuration,
          easing: Easing.linear,
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    )
    animation.current.start()

    return () => animation.current?.stop()
  }, [containerWidth, contentWidth, pauseMs, scrollPosition, shouldScroll, speed])

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? getAccessibleText(children)}
      onLayout={(event) => setContainerWidth(Math.ceil(event.nativeEvent.layout.width))}
      style={[styles.container, containerStyle]}
    >
      <ScrollView
        ref={scrollView}
        horizontal
        onContentSizeChange={(width) => setContentWidth(Math.ceil(width))}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.viewport}
        contentContainerStyle={[
          styles.viewportContent,
          !shouldScroll && { justifyContent: restingAlignment },
        ]}
      >
        <Text
          {...textProps}
          accessible={false}
          numberOfLines={1}
          onLayout={onLayout}
          style={[style, styles.text]}
        >
          {children}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    overflow: "hidden",
    width: "100%",
  },
  text: {
    flexShrink: 0,
  },
  viewport: {
    flexGrow: 0,
    width: "100%",
  },
  viewportContent: {
    alignItems: "center",
    flexDirection: "row",
    flexGrow: 1,
  },
})

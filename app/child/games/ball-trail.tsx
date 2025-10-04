"use client"

import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  type ViewStyle,
  Easing,
} from "react-native"

interface Ball {
  position: Animated.ValueXY
  scale: Animated.Value
  color: string
  id: number
}

// Array of vibrant colors for the balls
const COLORS = [
  "#FF5252", // Red
  "#FF9800", // Orange
  "#FFEB3B", // Yellow
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#673AB7", // Purple
  "#F06292", // Pink
  "#00BCD4", // Cyan
]

export default function BallTrail() {
  const [balls, setBalls] = useState<Ball[]>([])
  const touchPosition = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const lastTouch = useRef({ x: 0, y: 0, time: 0 })
  const { width, height } = Dimensions.get("window")
  const [ballCount, setBallCount] = useState(40) // Increased ball count
  const [isExploding, setIsExploding] = useState(false)

  // Initialize with touch in the center
  useEffect(() => {
    touchPosition.current = {
      x: width / 2,
      y: height / 2,
    }

    lastTouch.current = {
      x: width / 2,
      y: height / 2,
      time: Date.now(),
    }

    // Create initial balls
    const initialBalls: Ball[] = []
    for (let i = 0; i < ballCount; i++) {
      initialBalls.push({
        position: new Animated.ValueXY({ x: width / 2, y: height / 2 }),
        scale: new Animated.Value(1),
        color: COLORS[i % COLORS.length],
        id: i,
      })
    }
    setBalls(initialBalls)

    // Start animation loop
    const animationLoop = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTouch.current.time

      // Calculate velocity based on touch movement
      if (deltaTime > 0) {
        velocity.current = {
          x: ((touchPosition.current.x - lastTouch.current.x) / deltaTime) * 15, // Amplify velocity
          y: ((touchPosition.current.y - lastTouch.current.y) / deltaTime) * 15,
        }
      }

      // Update last touch
      lastTouch.current = {
        x: touchPosition.current.x,
        y: touchPosition.current.y,
        time: currentTime,
      }

      let prevX = touchPosition.current.x
      let prevY = touchPosition.current.y
      let speedFactor = 1.0

      initialBalls.forEach((ball, index) => {
        // Calculate follow delay based on position in the trail
        const delay = index / initialBalls.length
        const followSpeed = 0.2 + (1 - delay) * 0.6 // Faster for lead balls, slower for tail

        // Use type assertion to access the current value
        const currentX = (ball.position.x as any)._value
        const currentY = (ball.position.y as any)._value

        // Calculate distance and new position with velocity influence
        const dx = prevX - currentX
        const dy = prevY - currentY

        // Add velocity influence for more responsive movement
        const velocityInfluence = 0.3 * (1 - delay) // More influence for lead balls
        const newX = currentX + dx * followSpeed + velocity.current.x * velocityInfluence
        const newY = currentY + dy * followSpeed + velocity.current.y * velocityInfluence

        // Calculate scale based on position in trail and speed
        const speed = Math.sqrt(dx * dx + dy * dy)
        speedFactor = Math.max(speedFactor, speed / 30) // Track max speed for glow effect

        // Scale based on position in trail (larger at front, smaller at back)
        const positionScale = 1 - (index / initialBalls.length) * 0.7

        // Scale also based on speed (faster = larger)
        const speedScale = Math.min(1.5, 1 + speed / 100)

        const newScale = positionScale * speedScale

        // Use Animated.timing for smoother movement
        Animated.timing(ball.position, {
          toValue: { x: newX, y: newY },
          duration: 16, // ~60fps
          useNativeDriver: false, // Required for x/y values
          easing: Easing.linear,
        }).start()

        ball.scale.setValue(newScale)

        // Update previous position for next ball with some spacing
        const spacing = 0.8 // Reduced from 1.0 for tighter trail
        prevX = currentX + (newX - currentX) * spacing
        prevY = currentY + (newY - currentY) * spacing
      })

      requestAnimationFrame(animationLoop)
    }

    const animationId = requestAnimationFrame(animationLoop)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [ballCount])

  // Set up pan responder to track touch with improved responsiveness
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event, gestureState) => {
        // When touch starts, update position immediately
        touchPosition.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        }
        lastTouch.current = {
          x: gestureState.x0,
          y: gestureState.y0,
          time: Date.now(),
        }
      },
      onPanResponderMove: (event, gestureState) => {
        // Update touch position with current move
        touchPosition.current = {
          x: gestureState.moveX,
          y: gestureState.moveY,
        }
      },
      onPanResponderRelease: () => {
        // When touch ends, create an explosion effect
        triggerExplosion()
      },
    }),
  ).current

  // Create explosion effect
  const triggerExplosion = () => {
    setIsExploding(true)

    // Animate balls outward
    balls.forEach((ball, index) => {
      const angle = (index / balls.length) * Math.PI * 2
      const distance = 300 // Explosion radius

      Animated.sequence([
        // First explode outward
        Animated.timing(ball.position, {
          toValue: {
            x: touchPosition.current.x + Math.cos(angle) * distance,
            y: touchPosition.current.y + Math.sin(angle) * distance,
          },
          duration: 500,
          useNativeDriver: false,
          easing: Easing.cubic, // Fixed: using cubic instead of outCubic
        }),
        // Then come back to center
        Animated.timing(ball.position, {
          toValue: { x: width / 2, y: height / 2 },
          duration: 800,
          useNativeDriver: false,
          easing: Easing.elastic(1), // Fixed: using elastic instead of outElastic
        }),
      ]).start()
    })

    // Reset explosion state after animation
    setTimeout(() => {
      setIsExploding(false)
    }, 1300)
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {balls.map((ball, index) => (
        <Animated.View
          key={ball.id}
          style={[
            styles.ball,
            {
              backgroundColor: ball.color,
              transform: [
                { translateX: ball.position.x },
                { translateY: ball.position.y },
                { scale: ball.scale },
                { translateX: -15 }, // Half of ball width to center
                { translateY: -15 }, // Half of ball height to center
              ],
              opacity: 0.8 + (index / balls.length) * 0.2, // Slightly more opaque at the end
              shadowColor: ball.color,
              shadowOpacity: 0.8,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            } as ViewStyle,
          ]}
        />
      ))}

      {/* Exit button */}
      <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
        <Text style={styles.exitButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>Drag your finger to create a trail</Text>
        <Text style={styles.instructionsText}>Release to see an explosion!</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
  },
  ball: {
    position: "absolute",
    width: 30, // Increased size
    height: 30, // Increased size
    borderRadius: 15,
    elevation: 5, // Android shadow
  },
  exitButton: {
    position: "absolute",
    top: 15,
    left: 25,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  exitButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  instructions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    padding: 20,
  },
  instructionsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    marginBottom: 5,
    textAlign: "center",
  },
})


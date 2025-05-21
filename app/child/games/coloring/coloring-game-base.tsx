"use client"

import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
  ImageBackground,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  type GestureResponderEvent,
} from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useColorScheme } from "@/hooks/useColorScheme"
import Svg, { Path, Circle } from "react-native-svg"
import { useRouter } from "expo-router"
import ViewShot from "react-native-view-shot"
import * as MediaLibrary from "expo-media-library"
import * as Sharing from "expo-sharing"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view"

// Define types for our drawing data
interface Point {
  x: number
  y: number
}

interface DrawPath {
  id: string
  path: Point[]
  color: string
  size: number
  type: "brush" | "eraser"
}

interface ColoringGameProps {
  imageSource: any
  pageName: string
  colors?: string[]
}

// Define tool types
type ToolType = "brush" | "eraser" | "fill"

// Bright, baby-friendly colors
const DEFAULT_COLORS = [
  "#FF4081", // Pink
  "#FF9800", // Orange
  "#FFEB3B", // Yellow
  "#8BC34A", // Light Green
  "#03A9F4", // Light Blue
  "#9C27B0", // Purple
  "#000000", // Black
  "#FFFFFF", // White
]

const { width, height } = Dimensions.get("window")

// Helper function to calculate distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

// Helper function to smooth points using Bezier curves
const smoothPath = (points: Point[]): string => {
  if (points.length < 2) return ""

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i < points.length - 2 ? points[i + 2] : p2

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

export default function ColoringGameScreen({ imageSource, pageName, colors = DEFAULT_COLORS }: ColoringGameProps) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const [selectedColor, setSelectedColor] = useState(colors[0])
  const [brushSize, setBrushSize] = useState(15) // Larger default for babies
  const [selectedTool, setSelectedTool] = useState<ToolType>("brush")

  // Properly type the state variables
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [undoStack, setUndoStack] = useState<DrawPath[][]>([])
  const [redoStack, setRedoStack] = useState<DrawPath[][]>([])

  const [isDrawing, setIsDrawing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [showColorPalette, setShowColorPalette] = useState(true)
  const [showToolOptions, setShowToolOptions] = useState(false)

  const router = useRouter()

  // Animation values
  const toolbarAnimation = useRef(new Animated.Value(0)).current
  const paletteAnimation = useRef(new Animated.Value(1)).current
  const successAnimation = useRef(new Animated.Value(0)).current

  // Create a ref for ViewShot
  const viewShotRef = useRef<ViewShot>(null)
  const zoomableViewRef = useRef(null)

  // Check for media library permissions on mount
  useEffect(() => {
    ;(async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      setHasPermission(status === "granted")
      if (status !== "granted") {
        Alert.alert("Permission Required", "This app needs access to your media library to save images.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Settings",
            onPress: () => {
              // This would ideally open settings, but for now just alert
              Alert.alert("Please grant permissions in your device settings")
            },
          },
        ])
      }
    })()
  }, [])

  // Animate toolbar when tool options visibility changes
  useEffect(() => {
    Animated.timing(toolbarAnimation, {
      toValue: showToolOptions ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [showToolOptions])

  // Animate color palette visibility
  useEffect(() => {
    Animated.timing(paletteAnimation, {
      toValue: showColorPalette ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [showColorPalette])

  // Create the pan responder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent
      setIsDrawing(true)
      setCurrentPath([{ x: locationX, y: locationY }])
    },
    onPanResponderMove: (evt) => {
      if (!isDrawing) return
      const { locationX, locationY } = evt.nativeEvent

      // Add point only if it's far enough from the last point (for smoother lines)
      setCurrentPath((prevPath) => {
        const lastPoint = prevPath[prevPath.length - 1]
        const newPoint = { x: locationX, y: locationY }

        // Skip points that are too close to each other
        if (prevPath.length > 0 && distance(lastPoint, newPoint) < 2) {
          return prevPath
        }

        return [...prevPath, newPoint]
      })
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0) {
        // Save current state for undo
        setUndoStack((prev) => [...prev, [...paths]])
        setRedoStack([]) // Clear redo stack on new drawing

        // Important: Use functional update to ensure we're working with the latest state
        setPaths((prevPaths) => [
          ...prevPaths,
          {
            id: Date.now().toString(), // Add unique ID
            path: currentPath,
            color: selectedTool === "eraser" ? "#FFFFFF" : selectedColor,
            size: selectedTool === "eraser" ? brushSize * 1.5 : brushSize,
            type: selectedTool as "brush" | "eraser",
          },
        ])
        setCurrentPath([])
        setIsDrawing(false)

        // Show success animation for babies
        showSuccessAnimation()
      }
    },
  })

  // Show a brief success animation when drawing is completed
  const showSuccessAnimation = () => {
    successAnimation.setValue(0)
    Animated.sequence([
      Animated.timing(successAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(successAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Clear canvas
  const clearCanvas = () => {
    // Save current state for undo
    setUndoStack((prev) => [...prev, [...paths]])
    setRedoStack([])
    setPaths([])
  }

  // Change brush size
  const changeBrushSize = (size: number) => {
    setBrushSize(size)
  }

  // Undo last action
  const handleUndo = () => {
    if (undoStack.length === 0) return

    const previousPaths = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [...prev, [...paths]])
    setPaths(previousPaths)
    setUndoStack((prev) => prev.slice(0, -1))
  }

  // Redo last undone action
  const handleRedo = () => {
    if (redoStack.length === 0) return

    const nextPaths = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, [...paths]])
    setPaths(nextPaths)
    setRedoStack((prev) => prev.slice(0, -1))
  }

  // Toggle tool selection
  const selectTool = (tool: ToolType) => {
    setSelectedTool(tool)
    if (tool === "fill") {
      // Fill tool doesn't need to stay selected
      setTimeout(() => setSelectedTool("brush"), 100)
    }
    setShowToolOptions(false)
  }

  // Toggle color palette visibility
  const toggleColorPalette = () => {
    setShowColorPalette(!showColorPalette)
  }

  // Toggle tool options visibility
  const toggleToolOptions = () => {
    setShowToolOptions(!showToolOptions)
  }

  // Fill tool implementation (simplified for babies)
  const handleFill = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent

    // Save current state for undo
    setUndoStack((prev) => [...prev, [...paths]])
    setRedoStack([])

    // Add a large circle at the tap location
    setPaths((prevPaths) => [
      ...prevPaths,
      {
        id: Date.now().toString(),
        path: [{ x: locationX, y: locationY }],
        color: selectedColor,
        size: 100, // Large fill area
        type: "brush",
      },
    ])

    // Show success animation
    showSuccessAnimation()
  }

  // Save the image to gallery
  const saveToGallery = async () => {
    if (!hasPermission) {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Cannot save without permission to access media library.")
        return
      }
      setHasPermission(true)
    }

    try {
      setIsSaving(true)

      // Wait a moment to ensure UI updates are complete
      setTimeout(async () => {
        try {
          if (!viewShotRef.current) {
            throw new Error("ViewShot reference is not available")
          }

          // Capture the view
          const uri = await (viewShotRef.current as any).capture()
          console.log("Captured URI:", uri)

          // Save to gallery
          const asset = await MediaLibrary.createAssetAsync(uri)
          await MediaLibrary.createAlbumAsync("ColoringBook", asset, false)

          // Show success message with baby-friendly language
          Alert.alert("Yay! 🎉", `Your beautiful ${pageName} picture is saved!`, [
            { text: "Awesome!", style: "default" },
          ])

          // Show success animation
          showSuccessAnimation()
        } catch (error) {
          console.error("Error capturing or saving:", error)
          Alert.alert("Oops!", "We couldn't save your picture. Let's try again!")
        } finally {
          setIsSaving(false)
        }
      }, 300)
    } catch (error) {
      console.error("Error in save process:", error)
      setIsSaving(false)
      Alert.alert("Oops!", "Something went wrong. Let's try again!")
    }
  }

  // Share the image
  const shareImage = async () => {
    if (!viewShotRef.current) {
      Alert.alert("Oops!", "We can't share right now. Let's try again!")
      return
    }

    try {
      setIsSaving(true)

      // Wait a moment to ensure UI updates are complete
      setTimeout(async () => {
        try {
          // Capture the view
          const uri = await (viewShotRef.current as any).capture()

          // Check if sharing is available
          const isAvailable = await Sharing.isAvailableAsync()
          if (!isAvailable) {
            Alert.alert("Sharing is not available on this device")
            return
          }

          // Share the image
          await Sharing.shareAsync(uri)
        } catch (error) {
          console.error("Error sharing:", error)
          Alert.alert("Oops!", "We couldn't share your picture. Let's try again!")
        } finally {
          setIsSaving(false)
        }
      }, 300)
    } catch (error) {
      console.error("Error in share process:", error)
      setIsSaving(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header with exit button and save button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>{pageName}</Text>
        </View>

        <View style={styles.headerActions}>
          {/* Undo button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#9C27B0" }]}
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Ionicons name="arrow-undo" size={24} color={undoStack.length === 0 ? "#CCCCCC" : "white"} />
          </TouchableOpacity>

          {/* Redo button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#9C27B0" }]}
            onPress={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Ionicons name="arrow-redo" size={24} color={redoStack.length === 0 ? "#CCCCCC" : "white"} />
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
            onPress={shareImage}
            disabled={isSaving}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
            onPress={saveToGallery}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="save-outline" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area with drawing canvas and color palette side by side */}
      <View style={styles.mainContent}>
        <View style={styles.canvasContainer}>
          {/* ViewShot wrapper to capture the canvas */}
          <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.viewShot}>
            {/* Zoomable container for the canvas */}
            <ReactNativeZoomableView
              ref={zoomableViewRef}
              maxZoom={3}
              minZoom={0.5}
              zoomStep={0.5}
              initialZoom={1}
              bindToBorders={true}
              style={styles.zoomContainer}
              contentWidth={width}
              contentHeight={height}
            >
              {/* Background Image as a full container */}
              <ImageBackground
                source={imageSource}
                style={styles.backgroundImage}
                resizeMode="contain"
                onLoad={() => setImageLoaded(true)}
              >
                {/* Drawing area with pan responder */}
                <View
                  style={styles.drawingArea}
                  {...(selectedTool === "fill" ? { onTouchEnd: handleFill } : panResponder.panHandlers)}
                >
                  {/* Saved Paths Layer */}
                  <View style={styles.pathsLayer} pointerEvents="none">
                    {paths.map((item) => (
                      <View key={item.id} style={styles.pathContainer}>
                        <Svg height="100%" width="100%">
                          {item.path.length === 1 ? (
                            // For single points (like fill tool), render a circle
                            <Circle cx={item.path[0].x} cy={item.path[0].y} r={item.size} fill={item.color} />
                          ) : (
                            // For paths, render smooth bezier curves
                            <Path
                              d={smoothPath(item.path)}
                              fill="none"
                              stroke={item.color}
                              strokeWidth={item.size}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </Svg>
                      </View>
                    ))}
                  </View>

                  {/* Current Drawing Path Layer */}
                  {currentPath.length > 0 && (
                    <View style={styles.pathContainer} pointerEvents="none">
                      <Svg height="100%" width="100%">
                        <Path
                          d={smoothPath(currentPath)}
                          fill="none"
                          stroke={selectedTool === "eraser" ? "#FFFFFF" : selectedColor}
                          strokeWidth={selectedTool === "eraser" ? brushSize * 1.5 : brushSize}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  )}
                </View>
              </ImageBackground>
            </ReactNativeZoomableView>
          </ViewShot>

          {/* Image loading indicator */}
          {!imageLoaded && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4081" />
              <Text style={styles.loadingText}>Loading your coloring page...</Text>
            </View>
          )}

          {/* Saving overlay */}
          {isSaving && (
            <View style={styles.savingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.savingText}>Saving your artwork...</Text>
            </View>
          )}

          {/* Success animation */}
          <Animated.View
            style={[
              styles.successAnimation,
              {
                opacity: successAnimation,
                transform: [
                  {
                    scale: successAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.successText}>Great job! 🎉</Text>
          </Animated.View>
        </View>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          {/* Tool selector */}
          <View style={styles.toolSelector}>
            {/* Brush tool */}
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === "brush" && styles.selectedTool]}
              onPress={() => selectTool("brush")}
            >
              <Ionicons name="brush" size={28} color={selectedTool === "brush" ? "#FF4081" : "#333"} />
            </TouchableOpacity>

            {/* Eraser tool */}
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === "eraser" && styles.selectedTool]}
              onPress={() => selectTool("eraser")}
            >
              <MaterialCommunityIcons name="eraser" size={28} color={selectedTool === "eraser" ? "#FF4081" : "#333"} />
            </TouchableOpacity>

            {/* Fill tool */}
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === "fill" && styles.selectedTool]}
              onPress={() => selectTool("fill")}
            >
              <Ionicons name="color-fill" size={28} color={selectedTool === "fill" ? "#FF4081" : "#333"} />
            </TouchableOpacity>

            {/* Clear button */}
            <TouchableOpacity style={[styles.toolButton, { backgroundColor: "#FF3B30" }]} onPress={clearCanvas}>
              <Ionicons name="trash-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Color palette toggle */}
          <TouchableOpacity
            style={[styles.paletteToggle, showColorPalette && styles.paletteToggleActive]}
            onPress={toggleColorPalette}
          >
            <Ionicons name="color-palette" size={28} color={showColorPalette ? "#FF4081" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* Color Palette (animated) */}
        <Animated.View
          style={[
            styles.colorPalette,
            {
              transform: [
                {
                  translateY: paletteAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
              opacity: paletteAnimation,
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>

          {/* Brush size selector */}
          <View style={styles.brushSizes}>
            {[10, 20, 30, 40].map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.brushButton, brushSize === size && styles.selectedBrush]}
                onPress={() => changeBrushSize(size)}
              >
                <View
                  style={[
                    styles.brushPreview,
                    {
                      width: size / 2,
                      height: size / 2,
                      backgroundColor: selectedColor,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 60,
    backgroundColor: "#FF4081",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  viewShot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  drawingArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  pathsLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  pathContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  toolSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  toolButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTool: {
    backgroundColor: "#FFF9C4",
    borderWidth: 2,
    borderColor: "#FF4081",
  },
  paletteToggle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  paletteToggleActive: {
    backgroundColor: "#FFF9C4",
    borderWidth: 2,
    borderColor: "#FF4081",
  },
  colorPalette: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  colorScroll: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#DDDDDD",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColor: {
    borderColor: "#FF4081",
    transform: [{ scale: 1.2 }],
  },
  brushSizes: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  brushButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#DDDDDD",
    marginHorizontal: 8,
  },
  selectedBrush: {
    borderColor: "#FF4081",
    backgroundColor: "#FFF9C4",
  },
  brushPreview: {
    borderRadius: 50,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    color: "#FF4081",
  },
  savingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
  },
  savingText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  exitButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  successAnimation: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 200,
    height: 100,
    marginLeft: -100,
    marginTop: -50,
    backgroundColor: "rgba(255, 64, 129, 0.9)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  successText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
})

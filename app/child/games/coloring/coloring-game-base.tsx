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
} from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useColorScheme } from "@/hooks/useColorScheme"
import Svg, { Polyline } from "react-native-svg"
import { useRouter } from "expo-router"
import ViewShot from "react-native-view-shot"
import * as MediaLibrary from "expo-media-library"
import * as Sharing from "expo-sharing"
import { Ionicons } from "@expo/vector-icons"

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
}

interface ColoringGameProps {
  imageSource: any
  pageName: string
  colors?: string[]
}

const DEFAULT_COLORS = [
  "#FFEB3B", // Yellow
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#673AB7", // Purple
  "#795548", // Brown
  "#607D8B", // Gray
  "#000000", // Black
  "#FFFFFF", // White
]

const { width, height } = Dimensions.get("window")

export default function ColoringGameScreen({ imageSource, pageName, colors = DEFAULT_COLORS }: ColoringGameProps) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const [selectedColor, setSelectedColor] = useState(colors[0])
  const [brushSize, setBrushSize] = useState(10)
  // Properly type the state variables
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const router = useRouter()

  // Create a ref for ViewShot
  const viewShotRef = useRef<ViewShot>(null)

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

  // Log when paths change
  useEffect(() => {
    console.log(`Paths updated. Count: ${paths.length}`)
  }, [paths])

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
      setCurrentPath((prevPath) => [...prevPath, { x: locationX, y: locationY }])
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0) {
        // Important: Use functional update to ensure we're working with the latest state
        setPaths((prevPaths) => [
          ...prevPaths,
          {
            id: Date.now().toString(), // Add unique ID
            path: currentPath,
            color: selectedColor,
            size: brushSize,
          },
        ])
        setCurrentPath([])
        setIsDrawing(false)
      }
    },
  })

  // Clear canvas
  const clearCanvas = () => {
    setPaths([])
  }

  // Change brush size
  const changeBrushSize = (size: number) => {
    setBrushSize(size)
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

          // Show success message
          Alert.alert(
            "Success!",
            `Your ${pageName} artwork has been saved to your gallery in the 'ColoringBook' album.`,
            [{ text: "Great!", style: "default" }],
          )
        } catch (error) {
          console.error("Error capturing or saving:", error)
          Alert.alert("Error", "Failed to save your artwork. Please try again.")
        } finally {
          setIsSaving(false)
        }
      }, 300)
    } catch (error) {
      console.error("Error in save process:", error)
      setIsSaving(false)
      Alert.alert("Error", "Something went wrong. Please try again.")
    }
  }

  // Share the image
  const shareImage = async () => {
    if (!viewShotRef.current) {
      Alert.alert("Error", "Cannot share at this time. Please try again.")
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
          Alert.alert("Error", "Failed to share your artwork. Please try again.")
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
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* Share button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
            onPress={shareImage}
            disabled={isSaving}
          >
            <Ionicons name="share-outline" size={20} color="white" />
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
              <Ionicons name="save-outline" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area with drawing canvas and color palette side by side */}
      <View style={styles.mainContent}>
        <View style={styles.canvasContainer}>
          {/* ViewShot wrapper to capture the canvas */}
          <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.viewShot}>
            {/* Background Image as a full container */}
            <ImageBackground
              source={imageSource}
              style={styles.backgroundImage}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
            >
              {/* Drawing area with pan responder */}
              <View style={styles.drawingArea} {...panResponder.panHandlers}>
                {/* Saved Paths Layer */}
                <View style={styles.pathsLayer} pointerEvents="none">
                  {paths.map((item) => (
                    <View key={item.id} style={styles.pathContainer}>
                      <Svg height="100%" width="100%">
                        <Polyline
                          points={item.path.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="none"
                          stroke={item.color}
                          strokeWidth={item.size}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  ))}
                </View>

                {/* Current Drawing Path Layer */}
                {currentPath.length > 0 && (
                  <View style={styles.pathContainer} pointerEvents="none">
                    <Svg height="100%" width="100%">
                      <Polyline
                        points={currentPath.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill="none"
                        stroke={selectedColor}
                        strokeWidth={brushSize}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                )}
              </View>
            </ImageBackground>
          </ViewShot>

          {/* Image loading indicator */}
          {!imageLoaded && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading coloring page...</Text>
            </View>
          )}

          {/* Saving overlay */}
          {isSaving && (
            <View style={styles.savingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.savingText}>Saving your artwork...</Text>
            </View>
          )}
        </View>

        {/* Color Palette on the right side with two columns */}
        <View style={styles.colorPalette}>
          <View style={styles.paletteColumns}>
            {/* Column 1: Colors */}
            <View style={styles.colorColumn}>
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
            </View>

            {/* Column 2: Brush sizes and clear button */}
            <View style={styles.toolsColumn}>
              {/* Brush size selector */}
              {[5, 10, 15, 20].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.brushButton, brushSize === size && styles.selectedBrush]}
                  onPress={() => changeBrushSize(size)}
                >
                  <View
                    style={[
                      styles.brushPreview,
                      {
                        width: size,
                        height: size,
                        backgroundColor: selectedColor,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}

              {/* Clear button */}
              <TouchableOpacity style={styles.clearButton} onPress={clearCanvas}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 60,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flexDirection: "row",
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
  colorPalette: {
    width: 120,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 10,
    justifyContent: "center",
    zIndex: 100,
  },
  paletteColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: "100%",
  },
  colorColumn: {
    justifyContent: "center",
    alignItems: "center",
  },
  toolsColumn: {
    justifyContent: "center",
    alignItems: "center",
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    marginVertical: 5,
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
  selectedColor: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.2 }],
  },
  brushButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginVertical: 5,
  },
  selectedBrush: {
    borderColor: "#FFFFFF",
  },
  brushPreview: {
    borderRadius: 50,
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "bold",
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
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  exitButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
})

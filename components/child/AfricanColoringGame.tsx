// import React, { useState, useRef, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Alert,
//   ScrollView,
//   ImageBackground,
//   PanResponder,
//   GestureResponderEvent,
//   PanResponderGestureState,
// } from 'react-native';
// import { StatusBar } from 'expo-status-bar';
// import Svg, { Path, G, Circle, Image as SvgImage } from 'react-native-svg';
// import ViewShot from 'react-native-view-shot';

// // Get screen dimensions
// const { width, height } = Dimensions.get('window');

// // Define color palette with African-inspired colors
// const COLORS = [
//   '#1E88E5', // Blue
//   '#00ACC1', // Teal
//   '#43A047', // Green
//   '#7CB342', // Light Green
//   '#C0CA33', // Lime
//   '#FDD835', // Yellow
//   '#FFB300', // Amber
//   '#FB8C00', // Orange
//   '#F4511E', // Deep Orange
//   '#E53935', // Red
//   '#8E24AA', // Purple
//   '#3949AB', // Indigo
//   '#000000', // Black
//   '#795548', // Brown
//   '#607D8B', // Blue Grey
//   '#FFFFFF', // White
// ];

// // Define templates
// const TEMPLATES = [
//   {
//     id: 'fox',
//     name: 'Cute Fox',
//     imageUrl: 'https://images.app.goo.gl/jypaMtkxT8eUtevj9', // Replace with actual URL
//   },
//   {
//     id: 'elephant',
//     name: 'African Elephant',
//     imageUrl: 'https://images.app.goo.gl/jypaMtkxT8eUtevj9', // Replace with actual URL
//   },
//   {
//     id: 'lion',
//     name: 'Majestic Lion',
//     imageUrl: 'https://images.app.goo.gl/jypaMtkxT8eUtevj9', // Replace with actual URL
//   },
// ];

// // Define types
// type Point = {
//   x: number;
//   y: number;
// };

// type Stroke = {
//   points: Point[];
//   color: string;
//   width: number;
// };

// type Template = {
//   id: string;
//   name: string;
//   imageUrl: string;
// };

// const DrawingColoringGame: React.FC = () => {
//   const [selectedColor, setSelectedColor] = useState<string>('#E53935');
//   const [brushSize, setBrushSize] = useState<number>(10);
//   const [strokes, setStrokes] = useState<Stroke[]>([]);
//   const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
//   const [currentTemplate, setCurrentTemplate] = useState<Template>(TEMPLATES[0]);
//   const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);
//   const [toolSelected, setToolSelected] = useState<'brush' | 'eraser'>('brush');
//   const [showTutorial, setShowTutorial] = useState<boolean>(true);
  
//   const viewShotRef = useRef<ViewShot>(null);
//   const canvasRef = useRef<View>(null);
  
//   // Calculate canvas dimensions
//   const canvasWidth = width - 20; // 10px margin on each side
//   const canvasHeight = height * 0.6; // 60% of screen height
  
//   // Set up PanResponder for drawing
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: (event: GestureResponderEvent) => {
//         const { locationX, locationY } = event.nativeEvent;
        
//         // Start a new stroke
//         const newStroke: Stroke = {
//           points: [{ x: locationX, y: locationY }],
//           color: toolSelected === 'eraser' ? '#FFFFFF' : selectedColor,
//           width: brushSize,
//         };
        
//         setCurrentStroke(newStroke);
//       },
//       onPanResponderMove: (event: GestureResponderEvent) => {
//         const { locationX, locationY } = event.nativeEvent;
        
//         // Add point to current stroke
//         if (currentStroke) {
//           setCurrentStroke({
//             ...currentStroke,
//             points: [...currentStroke.points, { x: locationX, y: locationY }],
//           });
//         }
//       },
//       onPanResponderRelease: () => {
//         // Add completed stroke to strokes array
//         if (currentStroke) {
//           setStrokes([...strokes, currentStroke]);
//           setCurrentStroke(null);
//         }
//       },
//     })
//   ).current;
  
//   // Handle save drawing
//   const handleSave = () => {
//     if (viewShotRef.current) {
//       viewShotRef.current.capture().then(uri => {
//         Alert.alert(
//           "Great Job!",
//           "Your colorful creation has been saved!",
//           [{ text: "OK" }]
//         );
//       });
//     }
//   };
  
//   // Handle reset drawing
//   const handleReset = () => {
//     setStrokes([]);
//   };
  
//   // Handle template change
//   const changeTemplate = (template: Template) => {
//     setCurrentTemplate(template);
//     setShowTemplateSelector(false);
//     handleReset();
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar style="dark" />
//       <ImageBackground 
//         source={{ uri: 'https://example.com/wooden-bg.jpg' }} 
//         style={styles.backgroundImage}
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity 
//             style={styles.backButton}
//             onPress={() => Alert.alert("Exit", "Do you want to exit without saving?", [
//               { text: "Cancel" },
//               { text: "Exit" }
//             ])}
//           >
//             <Text style={styles.backButtonText}>✕</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>{currentTemplate.name}</Text>
//           <TouchableOpacity 
//             style={styles.templateButton}
//             onPress={() => setShowTemplateSelector(!showTemplateSelector)}
//           >
//             <Text style={styles.templateButtonText}>🖼️</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Main Drawing Area */}
//         <ViewShot ref={viewShotRef} style={styles.drawingContainer}>
//           <View 
//             ref={canvasRef}
//             style={styles.canvas} 
//             {...panResponder.panHandlers}
//           >
//             {/* Template Image */}
//             <Svg width="100%" height="100%" style={styles.templateImage}>
//               <SvgImage
//                 href={{ uri: currentTemplate.imageUrl }}
//                 width="100%"
//                 height="100%"
//                 preserveAspectRatio="xMidYMid meet"
//               />
              
//               {/* Render completed strokes */}
//               {strokes.map((stroke, index) => (
//                 <Path
//                   key={index}
//                   d={generatePathD(stroke.points)}
//                   stroke={stroke.color}
//                   strokeWidth={stroke.width}
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   fill="none"
//                 />
//               ))}
              
//               {/* Render current stroke */}
//               {currentStroke && (
//                 <Path
//                   d={generatePathD(currentStroke.points)}
//                   stroke={currentStroke.color}
//                   strokeWidth={currentStroke.width}
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   fill="none"
//                 />
//               )}
//             </Svg>
//           </View>
//         </ViewShot>

//         {/* Brush Size Selector */}
//         <View style={styles.brushSizeContainer}>
//           <Text style={styles.brushSizeLabel}>Brush Size:</Text>
//           <View style={styles.brushSizes}>
//             <TouchableOpacity
//               style={[styles.brushSizeOption, brushSize === 5 && styles.selectedBrushSize]}
//               onPress={() => setBrushSize(5)}
//             >
//               <View style={[styles.brushSizePreview, { width: 5, height: 5 }]} />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.brushSizeOption, brushSize === 10 && styles.selectedBrushSize]}
//               onPress={() => setBrushSize(10)}
//             >
//               <View style={[styles.brushSizePreview, { width: 10, height: 10 }]} />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.brushSizeOption, brushSize === 15 && styles.selectedBrushSize]}
//               onPress={() => setBrushSize(15)}
//             >
//               <View style={[styles.brushSizePreview, { width: 15, height: 15 }]} />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.brushSizeOption, brushSize === 20 && styles.selectedBrushSize]}
//               onPress={() => setBrushSize(20)}
//             >
//               <View style={[styles.brushSizePreview, { width: 20, height: 20 }]} />
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Color Palette */}
//         <View style={styles.colorPalette}>
//           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//             {COLORS.map((color) => (
//               <TouchableOpacity
//                 key={color}
//                 style={[
//                   styles.colorOption,
//                   { backgroundColor: color },
//                   selectedColor === color && styles.selectedColor,
//                 ]}
//                 onPress={() => {
//                   setSelectedColor(color);
//                   setToolSelected('brush');
//                 }}
//               />
//             ))}
//           </ScrollView>
//         </View>

//         {/* Tools */}
//         <View style={styles.toolsContainer}>
//           <TouchableOpacity 
//             style={[styles.tool, toolSelected === 'brush' && styles.selectedTool]}
//             onPress={() => {
//               setToolSelected('brush');
//             }}
//           >
//             <Text style={styles.toolIcon}>🖌️</Text>
//           </TouchableOpacity>
//           <TouchableOpacity 
//             style={[styles.tool, toolSelected === 'eraser' && styles.selectedTool]}
//             onPress={() => {
//               setToolSelected('eraser');
//             }}
//           >
//             <Text style={styles.toolIcon}>🧽</Text>
//           </TouchableOpacity>
//           <TouchableOpacity 
//             style={styles.tool}
//             onPress={handleReset}
//           >
//             <Text style={styles.toolIcon}>🔄</Text>
//           </TouchableOpacity>
//           <TouchableOpacity 
//             style={styles.tool}
//             onPress={handleSave}
//           >
//             <Text style={styles.toolIcon}>💾</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Template Selector Modal */}
//         {showTemplateSelector && (
//           <View style={styles.templateSelector}>
//             <View style={styles.templateSelectorContent}>
//               <Text style={styles.templateSelectorTitle}>Choose a Template</Text>
//               {TEMPLATES.map((template) => (
//                 <TouchableOpacity
//                   key={template.id}
//                   style={styles.templateOption}
//                   onPress={() => changeTemplate(template)}
//                 >
//                   <Text style={styles.templateOptionText}>{template.name}</Text>
//                 </TouchableOpacity>
//               ))}
//               <TouchableOpacity
//                 style={styles.closeButton}
//                 onPress={() => setShowTemplateSelector(false)}
//               >
//                 <Text style={styles.closeButtonText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* Tutorial Modal */}
//         {showTutorial && (
//           <View style={styles.tutorialOverlay}>
//             <View style={styles.tutorialContent}>
//               <Text style={styles.tutorialTitle}>Welcome to African Coloring!</Text>
//               <Text style={styles.tutorialText}>
//                 Explore the beauty of African animals through coloring!
//               </Text>
//               <Text style={styles.tutorialText}>
//                 • Draw with your finger to color{'\n'}
//                 • Use the color palette to choose colors{'\n'}
//                 • Change brush size for different effects{'\n'}
//                 • Use the eraser to fix mistakes{'\n'}
//                 • Have fun coloring!
//               </Text>
//               <TouchableOpacity
//                 style={styles.tutorialButton}
//                 onPress={() => {
//                   setShowTutorial(false);
//                 }}
//               >
//                 <Text style={styles.tutorialButtonText}>Start Coloring!</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//       </ImageBackground>
//     </SafeAreaView>
//   );
// };

// // Helper function to generate SVG path data from points
// const generatePathD = (points: Point[]): string => {
//   if (points.length < 2) return '';
  
//   let d = `M ${points[0].x} ${points[0].y}`;
  
//   for (let i = 1; i < points.length; i++) {
//     d += ` L ${points[i].x} ${points[i].y}`;
//   }
  
//   return d;
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   backgroundImage: {
//     flex: 1,
//     resizeMode: 'cover',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 15,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//   },
//   backButtonText: {
//     fontSize: 20,
//     color: '#333',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   templateButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//   },
//   templateButtonText: {
//     fontSize: 20,
//   },
//   drawingContainer: {
//     margin: 10,
//     backgroundColor: 'white',
//     borderRadius: 20,
//     overflow: 'hidden',
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     height: height * 0.6,
//   },
//   canvas: {
//     flex: 1,
//     backgroundColor: 'white',
//   },
//   templateImage: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//   },
//   brushSizeContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.8)',
//     borderRadius: 20,
//     marginHorizontal: 10,
//     marginVertical: 5,
//     padding: 10,
//   },
//   brushSizeLabel: {
//     fontSize: 16,
//     marginRight: 10,
//     color: '#333',
//   },
//   brushSizes: {
//     flexDirection: 'row',
//   },
//   brushSizeOption: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 5,
//     borderWidth: 1,
//     borderColor: '#DDD',
//   },
//   selectedBrushSize: {
//     borderWidth: 2,
//     borderColor: '#333',
//     backgroundColor: '#F0F0F0',
//   },
//   brushSizePreview: {
//     backgroundColor: '#333',
//     borderRadius: 50,
//   },
//   colorPalette: {
//     height: 60,
//     backgroundColor: 'rgba(255, 255, 255, 0.8)',
//     borderRadius: 30,
//     marginHorizontal: 10,
//     marginBottom: 10,
//     paddingHorizontal: 10,
//     justifyContent: 'center',
//   },
//   colorOption: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     marginHorizontal: 5,
//     borderWidth: 1,
//     borderColor: '#DDD',
//   },
//   selectedColor: {
//     borderWidth: 3,
//     borderColor: '#333',
//   },
//   toolsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     padding: 10,
//     backgroundColor: 'rgba(255, 255, 255, 0.8)',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//   },
//   tool: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//   },
//   selectedTool: {
//     backgroundColor: '#FFD700',
//     borderWidth: 2,
//     borderColor: '#333',
//   },
//   toolIcon: {
//     fontSize: 24,
//   },
//   templateSelector: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   templateSelectorContent: {
//     width: '80%',
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 20,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//   },
//   templateSelectorTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     textAlign: 'center',
//   },
//   templateOption: {
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#EEE',
//   },
//   templateOptionText: {
//     fontSize: 16,
//   },
//   closeButton: {
//     marginTop: 15,
//     padding: 10,
//     backgroundColor: '#5A3CBE',
//     borderRadius: 10,
//     alignItems: 'center',
//   },
//   closeButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   tutorialOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   tutorialContent: {
//     width: '80%',
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 20,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//   },
//   tutorialTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     textAlign: 'center',
//     color: '#5A3CBE',
//   },
//   tutorialText: {
//     fontSize: 16,
//     marginBottom: 15,
//     lineHeight: 24,
//   },
//   tutorialButton: {
//     marginTop: 15,
//     padding: 15,
//     backgroundColor: '#5A3CBE',
//     borderRadius: 10,
//     alignItems: 'center',
//   },
//   tutorialButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
// });

// export default DrawingColoringGame;
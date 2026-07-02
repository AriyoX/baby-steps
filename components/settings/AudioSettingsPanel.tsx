import React from "react";
import {
  PanResponder,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { useAudio } from "@/context/AudioContext";
import { brandColors } from "@/constants/Brand";

interface ToggleControlProps {
  value: boolean;
  disabled?: boolean;
}

interface ToggleRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

interface AudioVolumeSliderProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  muted?: boolean;
}

interface AudioTrackControlProps {
  backgroundTracks: readonly { id: string; title: string }[];
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
}

const clampSliderValue = (value: number): number => Math.min(1, Math.max(0, value));

const getBackgroundColor = (color: string) => `${color}20`;

const ToggleControl: React.FC<ToggleControlProps> = ({ value, disabled = false }) => (
  <View
    style={{
      width: 52,
      height: 30,
      borderRadius: 15,
      padding: 3,
      backgroundColor: value ? brandColors.blue[200] : "#e5e7eb",
      opacity: disabled ? 0.6 : 1,
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: value ? brandColors.victoriaBlue : "#ffffff",
        transform: [{ translateX: value ? 22 : 0 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
        elevation: 2,
      }}
    />
  </View>
);

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  icon,
  iconColor,
  value,
  onChange,
  disabled = false,
}) => (
  <TouchableOpacity
    className="flex-row items-center px-4 py-4 border-b border-gray-100"
    onPress={() => onChange(!value)}
    activeOpacity={0.85}
    disabled={disabled}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled }}
    style={{ opacity: disabled ? 0.55 : 1 }}
  >
    <View
      className="w-10 h-10 rounded-full items-center justify-center mr-3"
      style={{ backgroundColor: getBackgroundColor(iconColor) }}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <Text className="flex-1 text-gray-800 text-base">{label}</Text>
    <ToggleControl value={value} disabled={disabled} />
  </TouchableOpacity>
);

const AudioVolumeSlider: React.FC<AudioVolumeSliderProps> = ({
  label,
  value,
  icon,
  iconColor,
  onChange,
  disabled = false,
  muted = false,
}) => {
  const trackRef = React.useRef<View>(null);
  const trackMetricsRef = React.useRef({ pageX: 0, width: 1, measured: false });
  const isDraggingRef = React.useRef(false);
  const [trackWidth, setTrackWidth] = React.useState(1);
  const clampedValue = clampSliderValue(value);
  const effectiveValue = muted ? 0 : clampedValue;
  const [displayValue, setDisplayValue] = React.useState(effectiveValue);
  const pendingDragValueRef = React.useRef(effectiveValue);
  const controlsDisabled = disabled || muted;
  const percent = Math.round(displayValue * 100);

  React.useEffect(() => {
    if (isDraggingRef.current) return;

    pendingDragValueRef.current = effectiveValue;
    setDisplayValue(effectiveValue);
  }, [effectiveValue]);

  const measureTrack = React.useCallback((afterMeasure?: () => void) => {
    if (!trackRef.current) {
      afterMeasure?.();
      return;
    }

    trackRef.current.measure((_x, _y, width, _height, pageX) => {
      if (Number.isFinite(width) && width > 1 && Number.isFinite(pageX)) {
        trackMetricsRef.current = { pageX, width, measured: true };
        setTrackWidth((currentWidth) =>
          Math.abs(currentWidth - width) > 0.5 ? width : currentWidth,
        );
      }

      afterMeasure?.();
    });
  }, []);

  const handleTrackLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;

      if (Number.isFinite(nextWidth) && nextWidth > 1) {
        trackMetricsRef.current = {
          ...trackMetricsRef.current,
          width: nextWidth,
        };
        setTrackWidth(nextWidth);
      }

      requestAnimationFrame(() => measureTrack());
    },
    [measureTrack],
  );

  const updateDraftFromPageX = React.useCallback(
    (pageX: number) => {
      if (controlsDisabled || !isDraggingRef.current || !Number.isFinite(pageX)) {
        return;
      }

      const metrics = trackMetricsRef.current;
      if (!metrics.measured || metrics.width <= 1) return;

      const nextValue = clampSliderValue((pageX - metrics.pageX) / metrics.width);
      pendingDragValueRef.current = nextValue;
      setDisplayValue(nextValue);
    },
    [controlsDisabled],
  );

  const beginDrag = React.useCallback(
    (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (controlsDisabled) return;

      isDraggingRef.current = true;
      const pageX = Number.isFinite(event.nativeEvent.pageX)
        ? event.nativeEvent.pageX
        : gestureState.x0;

      updateDraftFromPageX(pageX);
      measureTrack(() => updateDraftFromPageX(pageX));
    },
    [controlsDisabled, measureTrack, updateDraftFromPageX],
  );

  const updateDrag = React.useCallback(
    (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      updateDraftFromPageX(gestureState.moveX);
    },
    [updateDraftFromPageX],
  );

  const finishDrag = React.useCallback(
    (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (!isDraggingRef.current) return;

      if (Number.isFinite(gestureState.moveX) && gestureState.moveX > 0) {
        updateDraftFromPageX(gestureState.moveX);
      }

      const nextValue = pendingDragValueRef.current;
      isDraggingRef.current = false;

      if (controlsDisabled) {
        pendingDragValueRef.current = effectiveValue;
        setDisplayValue(effectiveValue);
        return;
      }

      setDisplayValue(nextValue);
      onChange(nextValue);
    },
    [controlsDisabled, effectiveValue, onChange, updateDraftFromPageX],
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !controlsDisabled,
        onMoveShouldSetPanResponder: () => !controlsDisabled,
        onPanResponderGrant: beginDrag,
        onPanResponderMove: updateDrag,
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      }),
    [beginDrag, controlsDisabled, finishDrag, updateDrag],
  );

  const stepVolume = (delta: number) => {
    if (controlsDisabled) return;

    const nextValue = clampSliderValue(clampedValue + delta);
    pendingDragValueRef.current = nextValue;
    setDisplayValue(nextValue);
    onChange(nextValue);
  };

  const thumbLeft =
    trackWidth <= 20
      ? 0
      : Math.max(0, Math.min(trackWidth - 20, trackWidth * displayValue - 10));

  return (
    <View className="px-4 py-4 border-b border-gray-100" style={{ opacity: disabled ? 0.55 : 1 }}>
      <View className="flex-row items-center mb-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getBackgroundColor(iconColor) }}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-800 text-base">{label}</Text>
        </View>
        <Text variant="medium" className="text-gray-500 text-sm">
          {percent}%
        </Text>
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
          onPress={() => stepVolume(-0.1)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color="#4b5563" />
        </TouchableOpacity>

        <View
          ref={trackRef}
          className="flex-1 h-9 justify-center"
          onLayout={handleTrackLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          {...panResponder.panHandlers}
        >
          <View className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${displayValue * 100}%`, backgroundColor: iconColor }}
            />
          </View>
          <View
            className="absolute w-5 h-5 rounded-full bg-white border-2"
            style={{
              left: thumbLeft,
              borderColor: iconColor,
            }}
          />
        </View>

        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center ml-3"
          onPress={() => stepVolume(0.1)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color="#4b5563" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AudioTrackControl: React.FC<AudioTrackControlProps> = ({
  backgroundTracks,
  selectedTrackId,
  onSelectTrack,
}) => {
  if (backgroundTracks.length <= 1) return null;

  const selectedBackgroundTrack =
    backgroundTracks.find((track) => track.id === selectedTrackId) ?? backgroundTracks[0];

  return (
    <View className="px-4 py-4">
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getBackgroundColor("#F59E0B") }}
        >
          <Ionicons name="musical-notes-outline" size={20} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-800 text-base">Background track</Text>
          <Text className="text-gray-500 text-sm mt-0.5">
            {selectedBackgroundTrack?.title ?? "Default"}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap mt-3">
        {backgroundTracks.map((track) => {
          const isSelected = track.id === selectedTrackId;
          return (
            <TouchableOpacity
              key={track.id}
              className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
              }`}
              onPress={() => onSelectTrack(track.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text className={isSelected ? "text-blue-700" : "text-gray-600"}>
                {track.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export function AudioSettingsPanel() {
  const {
    settings: audioSettings,
    isSettingsLoaded,
    backgroundTracks,
    setBackgroundMusicMuted,
    setBackgroundMusicVolume,
    setAppSoundsMuted,
    setAppSoundsVolume,
    selectBackgroundTrack,
  } = useAudio();
  const audioControlsDisabled = !isSettingsLoaded;

  return (
    <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <ToggleRow
        icon={audioSettings.backgroundMusicMuted ? "volume-mute" : "musical-notes"}
        iconColor="#F59E0B"
        label="Background music"
        value={!audioSettings.backgroundMusicMuted}
        onChange={(enabled) => setBackgroundMusicMuted(!enabled)}
        disabled={audioControlsDisabled}
      />
      <AudioVolumeSlider
        icon="musical-notes-outline"
        iconColor="#F59E0B"
        label="Music volume"
        value={audioSettings.backgroundMusicVolume}
        onChange={setBackgroundMusicVolume}
        disabled={audioControlsDisabled}
        muted={audioSettings.backgroundMusicMuted}
      />
      <ToggleRow
        icon={audioSettings.appSoundsMuted ? "volume-mute" : "volume-high"}
        iconColor="#3B82F6"
        label="App sounds"
        value={!audioSettings.appSoundsMuted}
        onChange={(enabled) => setAppSoundsMuted(!enabled)}
        disabled={audioControlsDisabled}
      />
      <AudioVolumeSlider
        icon="volume-high-outline"
        iconColor="#3B82F6"
        label="App sounds volume"
        value={audioSettings.appSoundsVolume}
        onChange={setAppSoundsVolume}
        disabled={audioControlsDisabled}
        muted={audioSettings.appSoundsMuted}
      />
      <AudioTrackControl
        backgroundTracks={backgroundTracks}
        selectedTrackId={audioSettings.selectedBackgroundTrackId}
        onSelectTrack={selectBackgroundTrack}
      />
    </View>
  );
}

import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GenericStoryRenderer } from "@/components/stories/GenericStoryRenderer";
import { useChild } from "@/context/ChildContext";
import {
  findStoryById,
  loadContentBundle,
  type ContentBundle,
} from "@/content/contentRepository";

export default function DynamicStoryScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { activeChild } = useChild();
  const [contentBundle, setContentBundle] = useState<ContentBundle | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStoryContent = async () => {
      setIsLoading(true);
      const result = await loadContentBundle(activeChild?.selected_language_code);

      if (isMounted) {
        setContentBundle(result.bundle);
        setIsLoading(false);
      }
    };

    loadStoryContent();

    return () => {
      isMounted = false;
    };
  }, [activeChild?.selected_language_code]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <GenericStoryRenderer story={findStoryById(contentBundle, storyId)} isLoading={isLoading} />
    </View>
  );
}

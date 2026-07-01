import React from "react";
import { Redirect } from "expo-router";

// Deprecated: Luganda story menus now use app/child/stories/[storyId].tsx with content_items rows.
export default function WalumbeStory() {
  return <Redirect href="/child/stories/walumbe" />;
}

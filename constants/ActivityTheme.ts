import { StyleSheet } from "react-native";
import { brandColors } from "./Brand";

export const activityColors = {
  canvas: "#0866B6",
  ink: "#0B3D82",
  action: "#9B65AD",
  paper: brandColors.white,
  outline: brandColors.equatorialGold,
  inset: brandColors.gold[50],
  muted: brandColors.neutral[600],
} as const;

export const activityStyles = StyleSheet.create({
  panel: {
    backgroundColor: activityColors.paper,
    borderRadius: 26,
  },
  card: {
    backgroundColor: activityColors.paper,
    borderColor: activityColors.outline,
    borderRadius: 22,
    borderWidth: 2,
    elevation: 3,
    shadowColor: activityColors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  roundControl: {
    backgroundColor: activityColors.paper,
    borderColor: activityColors.outline,
    borderRadius: 999,
    borderWidth: 2,
  },
  inset: {
    backgroundColor: activityColors.inset,
    borderRadius: 16,
    padding: 14,
  },
});

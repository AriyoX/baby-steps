import type { ComponentType } from "react";
import { View } from "react-native";
import { Text } from "@/components/StyledText";
import type {
  ItemResult,
  LearningLessonItem,
  ListenAndChooseItem,
  MechanicType,
  TapToLearnItem,
} from "@/content/learningHubTypes";
import { getMechanicLabel } from "@/content/learningHubRepository";
import { ListenAndChooseCard } from "./ListenAndChooseCard";
import { TapToLearnCard } from "./TapToLearnCard";

export type MechanicRendererProps = {
  item: LearningLessonItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

const TapToLearnRenderer = ({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: MechanicRendererProps) => {
  if (item.mechanic !== "tap_to_learn") {
    return (
      <UnsupportedMechanicNotice
        item={item}
        isLastItem={isLastItem}
        stageImageKey={stageImageKey}
        onComplete={onComplete}
      />
    );
  }

  return (
    <TapToLearnCard
      item={item as TapToLearnItem}
      isLastItem={isLastItem}
      stageImageKey={stageImageKey}
      onComplete={onComplete}
    />
  );
};

const ListenAndChooseRenderer = ({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: MechanicRendererProps) => {
  if (item.mechanic !== "listen_and_choose") {
    return (
      <UnsupportedMechanicNotice
        item={item}
        isLastItem={isLastItem}
        stageImageKey={stageImageKey}
        onComplete={onComplete}
      />
    );
  }

  return (
    <ListenAndChooseCard
      item={item as ListenAndChooseItem}
      isLastItem={isLastItem}
      stageImageKey={stageImageKey}
      onComplete={onComplete}
    />
  );
};

export const MECHANIC_RENDERERS: Partial<
  Record<MechanicType, ComponentType<MechanicRendererProps>>
> = {
  tap_to_learn: TapToLearnRenderer,
  listen_and_choose: ListenAndChooseRenderer,
};

export const UnsupportedMechanicNotice = ({ item }: MechanicRendererProps) => (
  <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 items-center">
    <Text variant="bold" className="text-primary-700 text-2xl text-center mb-2">
      Coming soon
    </Text>
    <Text className="text-neutral-600 text-base text-center leading-6">
      {getMechanicLabel(item.mechanic)} is being prepared.
    </Text>
  </View>
);

export const getMechanicRenderer = (
  mechanic: MechanicType,
): ComponentType<MechanicRendererProps> =>
  MECHANIC_RENDERERS[mechanic] ?? UnsupportedMechanicNotice;

export const hasMechanicRenderer = (mechanic: MechanicType): boolean =>
  Boolean(MECHANIC_RENDERERS[mechanic]);

import type { ItemResult } from "@/content/learningHubTypes";

export type LearningActivityType = "language";

export type LearningProgressReadiness = "local_only";

export interface LearningLessonCompletion {
  localId: string;

  // child_stage_progress mapping.
  childId: string;
  languageCode: string;
  activityType: LearningActivityType;
  stageId: string;
  levelId: string;
  status: "completed";

  // child_stage_progress fields.
  score?: number;
  stars?: number;
  attempts: number;
  completedAt: number;

  // progress_payload jsonb.
  progressPayload: {
    source?: "learning_hub";
    lessonId: string;
    stageTitle?: string;
    lessonTitle?: string;
    stageNumber?: number;
    lessonOrder?: number;
    stageLessonIds?: string[];
    mechanicTypes: string[];
    itemResults: ItemResult[];
    totalItems: number;
    correctItems: number;
    completedAt?: number;
    contentVersion?: string;
  };

  readiness: LearningProgressReadiness;
}

export interface LearningProgressSummary {
  childId: string;
  languageCode: string;
  activityType: LearningActivityType;

  // child_activity_progress-style aggregate fields.
  status: "not_started" | "in_progress" | "completed";
  attempts: number;
  lastStageId?: string;
  completedStageCount: number;

  completedLessonIds: string[];
  completedByLessonId: Record<string, LearningLessonCompletion>;
}

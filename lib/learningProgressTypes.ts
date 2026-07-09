import type { ItemResult } from "@/content/learningHubTypes";

export type LearningActivityType = "language";

export type LearningProgressReadiness = "local_only";

export interface LearningLessonCompletion {
  localId: string;

  // Future child_stage_progress mapping.
  childId: string;
  languageCode: string;
  activityType: LearningActivityType;
  stageId: string;
  levelId: string;
  status: "completed";

  // Future child_stage_progress fields.
  score?: number;
  stars?: number;
  attempts: number;
  completedAt: number;

  // Future progress_payload jsonb.
  progressPayload: {
    lessonId: string;
    mechanicTypes: string[];
    itemResults: ItemResult[];
    totalItems: number;
    correctItems: number;
    contentVersion?: string;
  };

  readiness: LearningProgressReadiness;
}

export interface LearningProgressSummary {
  childId: string;
  languageCode: string;
  activityType: LearningActivityType;

  // Future child_activity_progress-style aggregate fields.
  status: "not_started" | "in_progress" | "completed";
  attempts: number;
  lastStageId?: string;
  completedStageCount: number;

  completedLessonIds: string[];
  completedByLessonId: Record<string, LearningLessonCompletion>;
}

// ./achievements/achievementTypes.ts (or your correct path)

export interface AchievementDefinition {
  id: string; // uuid
  name: string;
  description: string;
  icon_name: string;
  activity_type: string;
  points: number;
  trigger_value?: number | string | null; 
  game_key?: string | null;             
  created_at?: string;
}

export interface ChildAchievement {
  id: string; // uuid
  child_id: string; // uuid
  achievement_id: string; // uuid
  earned_at: string;
  created_at?: string;
}
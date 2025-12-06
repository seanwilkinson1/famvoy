import type { Experience as DBExperience } from "@shared/schema";

export interface ExperienceCreator {
  id: number;
  name: string;
  avatar: string;
}

export interface ExperienceWithCreator extends DBExperience {
  creator?: ExperienceCreator | null;
}

export interface ExperienceWithFamily extends DBExperience {
  family?: string;
  familyAvatar?: string;
  creator?: ExperienceCreator | null;
}

export function formatExperience(exp: ExperienceWithCreator): ExperienceWithFamily {
  return {
    ...exp,
    family: exp.creator?.name || "A Family",
    familyAvatar: exp.creator?.avatar || exp.image,
  };
}

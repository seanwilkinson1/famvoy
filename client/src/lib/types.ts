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
}

export function formatExperience(exp: DBExperience, family?: string, avatar?: string): ExperienceWithFamily {
  return {
    ...exp,
    family: family || "Unknown Family",
    familyAvatar: avatar || exp.image,
  };
}

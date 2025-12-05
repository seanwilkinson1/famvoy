import type { Experience as DBExperience } from "@shared/schema";

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

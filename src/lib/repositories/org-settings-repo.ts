import { settingsRepo } from "@/lib/repositories/settings-repo";

export type OrgSettings = {
  displayName: string;
  brandColor: string;
  contentPremoderation: boolean;
};

const DEFAULTS: OrgSettings = {
  displayName: "",
  brandColor: "#8b5cf6",
  contentPremoderation: false,
};

function k(orgId: string, key: string) {
  return `org.${orgId}.${key}`;
}

export const orgSettingsRepo = {
  async get(orgId: string): Promise<OrgSettings> {
    const [displayName, brandColor, contentPremoderation] = await Promise.all([
      settingsRepo.get(k(orgId, "displayName")),
      settingsRepo.get(k(orgId, "brandColor")),
      settingsRepo.get(k(orgId, "contentPremoderation")),
    ]);
    return {
      displayName: (displayName as string) ?? DEFAULTS.displayName,
      brandColor: (brandColor as string) ?? DEFAULTS.brandColor,
      contentPremoderation: Boolean(contentPremoderation ?? DEFAULTS.contentPremoderation),
    };
  },

  async set(orgId: string, partial: Partial<OrgSettings>) {
    const tasks: Promise<any>[] = [];
    if (partial.displayName !== undefined) tasks.push(settingsRepo.set(k(orgId, "displayName"), partial.displayName));
    if (partial.brandColor !== undefined) tasks.push(settingsRepo.set(k(orgId, "brandColor"), partial.brandColor));
    if (partial.contentPremoderation !== undefined) tasks.push(settingsRepo.set(k(orgId, "contentPremoderation"), partial.contentPremoderation));
    await Promise.all(tasks);
    return { ok: true } as const;
  },
};

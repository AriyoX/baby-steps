export const COLORING_STUDIO_TUTORIAL_STORAGE_PREFIX =
  "@baby_steps_coloring_studio_tutorial_v2"

export const getColoringStudioTutorialStorageKey = (childId?: string): string => {
  const storageOwner = childId?.trim() || "guest"
  return `${COLORING_STUDIO_TUTORIAL_STORAGE_PREFIX}:${encodeURIComponent(storageOwner)}`
}

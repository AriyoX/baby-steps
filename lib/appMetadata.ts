import * as Application from "expo-application";
import Constants from "expo-constants";

export interface AppRuntimeMetadata {
  version: string;
  build: string;
}

export const getAppRuntimeMetadata = (): AppRuntimeMetadata => ({
  version:
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "Unavailable",
  build: Application.nativeBuildVersion ?? "Unavailable in this development client",
});

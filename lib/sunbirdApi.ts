export interface SunbirdTranslationResponse {
  translated_text?: string;
  result?: {
    translated_text?: string;
  };
  data?: {
    translated_text?: string;
  };
}

export const translateText = async (
  _text: string,
  _sourceLang = "en",
  _targetLang = "lug",
): Promise<SunbirdTranslationResponse> => {
  throw new Error(
    "Sunbird translation is disabled until it is routed through a server-side endpoint.",
  );
};

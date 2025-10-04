
  export const translateText = async (text: string, sourceLang = 'en', targetLang = 'lug') => {
    const res = await fetch('https://api.sunbird.ai/tasks/nllb_translate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer YOUR_ACCESS_TOKEN`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_language: sourceLang,
        target_language: targetLang,
        text: text,
      }),
    });
  
    const data = await res.json();
    return data;
  };
  
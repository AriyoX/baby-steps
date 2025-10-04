import axios from "axios";
import { Audio } from "expo-av";

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJTb2NjZXJEZXZDIiwiYWNjb3VudF90eXBlIjoiRnJlZSIsImV4cCI6NDg5ODIzNDY1MH0.R4KBL_aYqA1ZGXa6w8blGZDMErOXBWAdqGpLEPT24dY"; // replace this with your actual key

export const speakLuganda = async (text: string) => {
  try {
    const response = await axios.post(
      "https://api.sunbird.ai/v1/tts",
      {
        text,
        language: "luganda",
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const audioUrl = response.data.audio_url;

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if ((status as any).didJustFinish) {
        sound.unloadAsync();
      }
    });
  }catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
      alert("Failed to play Luganda speech: " + (error.response?.data?.detail || error.message));
    } else if (error instanceof Error) {
      console.error("General error:", error.message);
      alert("An error occurred: " + error.message);
    } else {
      console.error("Unknown error:", error);
      alert("Something went wrong.");
    }
  }
  
};

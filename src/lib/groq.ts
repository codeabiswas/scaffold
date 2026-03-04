import OpenAI from "openai";

let _groq: OpenAI | null = null;

export function getGroqClient(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

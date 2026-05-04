// Centralized configuration for AI services
export const MODEL = "llama-3.1-8b-instant";
export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

import axios from "axios";

/**
 * Єдина точка підключення фронтенду до API.
 * Змінні з префіксом NEXT_PUBLIC_ доступні і у браузері.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

// Тут надалі можна централізовано додати токен авторизації або логування помилок.
apiClient.interceptors.request.use((config) => config);

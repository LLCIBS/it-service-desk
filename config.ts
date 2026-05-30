import "dotenv/config";

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Значения-заглушки из .env.example. Их использование в production
 * означает, что секреты не были заданы — это критическая уязвимость
 * (подделка сессий, расшифровка хранимых секретов, дефолтные креды БД).
 */
const PLACEHOLDER_VALUES = new Set<string>([
  "change-me-to-a-long-random-string",
  "change-me-to-a-long-random-string-at-least-32-chars",
  "dev-secret-change-in-production",
  "postgresql://postgres:postgres@localhost:5432/vet",
  "MY_GEMINI_API_KEY",
  "MY_APP_URL",
]);

function isMissingOrPlaceholder(value: string | undefined): boolean {
  return !value || value.trim() === "" || PLACEHOLDER_VALUES.has(value.trim());
}

/**
 * Проверяет наличие обязательных секретов. В production падает с ошибкой,
 * если что-то не задано или осталось значением-заглушкой.
 * В dev — только предупреждает, чтобы не мешать локальной разработке.
 */
export function validateEnv(): void {
  const required: { name: string; minLength?: number }[] = [
    { name: "SESSION_SECRET", minLength: 32 },
    { name: "CREDENTIALS_ENCRYPTION_KEY", minLength: 32 },
    { name: "DATABASE_URL" },
  ];

  const problems: string[] = [];

  for (const { name, minLength } of required) {
    const value = process.env[name];
    if (isMissingOrPlaceholder(value)) {
      problems.push(`${name} не задан или использует значение-заглушку`);
    } else if (minLength && value!.length < minLength) {
      problems.push(`${name} должен быть не короче ${minLength} символов`);
    }
  }

  if (problems.length === 0) return;

  const message =
    "Небезопасная конфигурация окружения:\n - " + problems.join("\n - ");

  if (isProduction) {
    throw new Error(
      message +
        "\nЗадайте безопасные значения в переменных окружения перед запуском в production."
    );
  }

  console.warn("[security] " + message);
}

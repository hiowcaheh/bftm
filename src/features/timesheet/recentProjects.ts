/** Ostatnio używane projekty (localStorage) — trafiają na górę list wyboru. */
const RECENT_PROJECT_KEY = 'bftm-recent-projects';

export function recentProjectIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROJECT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function rememberProject(id: string) {
  localStorage.setItem(
    RECENT_PROJECT_KEY,
    JSON.stringify([id, ...recentProjectIds().filter((r) => r !== id)].slice(0, 5)),
  );
}

/** Sortowanie: ostatnio używane najpierw, reszta w dotychczasowej kolejności. */
export function byRecent<T extends { id: string }>(items: T[]): T[] {
  const recent = recentProjectIds();
  const rank = (id: string) => {
    const i = recent.indexOf(id);
    return i === -1 ? 99 : i;
  };
  return [...items].sort((a, b) => rank(a.id) - rank(b.id));
}

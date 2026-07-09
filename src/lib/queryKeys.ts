/**
 * Wspólna konwencja kluczy cache TanStack Query.
 * KAŻDY moduł czyta i inwaliduje klucze WYŁĄCZNIE przez ten plik —
 * dzięki temu mutacja w jednym module może odświeżyć widoki pozostałych
 * (np. dodanie godzin → pulpit + karta projektu + raporty).
 *
 * Konwencja: qk.<moduł>.<zapytanie>(...parametry)
 * Do inwalidacji „wszystkiego z modułu" służy qk.<moduł>.all.
 */
export const qk = {
  settings: {
    all: ['settings'] as const,
    public: () => ['settings', 'public'] as const,
    byKey: (key: string) => ['settings', 'key', key] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => ['profile', 'me'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpi: () => ['dashboard', 'kpi'] as const,
    today: () => ['dashboard', 'today'] as const,
    recent: () => ['dashboard', 'recent'] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: () => ['clients', 'list'] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (status?: string) => ['projects', 'list', status ?? 'all'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    photos: (id: string) => ['projects', 'photos', id] as const,
    activities: (id: string) => ['projects', 'activities', id] as const,
  },
  workHours: {
    all: ['workHours'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['workHours', 'list', filters ?? {}] as const,
    byProject: (projectId: string) =>
      ['workHours', 'project', projectId] as const,
    byEmployee: (employeeId: string) =>
      ['workHours', 'employee', employeeId] as const,
    journal: (from: string, to: string) =>
      ['workHours', 'journal', from, to] as const,
  },
  absences: {
    all: ['absences'] as const,
    list: (from?: string, to?: string) =>
      ['absences', 'list', from ?? '', to ?? ''] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: () => ['employees', 'list'] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
    compensation: (id: string) => ['employees', 'compensation', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['expenses', 'list', filters ?? {}] as const,
    byProject: (projectId: string) =>
      ['expenses', 'project', projectId] as const,
  },
  additionalWorks: {
    all: ['additionalWorks'] as const,
    byProject: (projectId: string) =>
      ['additionalWorks', 'project', projectId] as const,
  },
  offers: {
    all: ['offers'] as const,
    list: (status?: string) => ['offers', 'list', status ?? 'all'] as const,
    detail: (id: string) => ['offers', 'detail', id] as const,
  },
  reports: {
    all: ['reports'] as const,
    invoiceBatches: (projectId?: string) =>
      ['reports', 'invoiceBatches', projectId ?? 'all'] as const,
    monthly: (month: string) => ['reports', 'monthly', month] as const,
    profitability: (projectId: string) =>
      ['reports', 'profitability', projectId] as const,
  },
} as const;

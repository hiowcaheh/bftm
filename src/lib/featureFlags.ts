/**
 * Moduły ukryte na prośbę Mateusza (nieużywane) — kod i dane zostają,
 * wystarczy przestawić na true, żeby wróciły do menu i ekranów.
 */
export const FEATURES = {
  /** Paragony (Finanse → Paragony, kafelek kosztów, flagi expenses_*) — ukryte od 0.59.1 */
  receipts: false,
  /** Prace dodatkowe w szczegółach projektu — ukryte od 0.59.1 */
  additionalWorks: false,
} as const;

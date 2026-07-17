/**
 * Badging API — kółeczko z liczbą nieprzeczytanych na ikonce aplikacji.
 * Działa w zainstalowanej PWA (iOS 16.4+, Android/Chrome); gdzie indziej no-op.
 */
type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function syncAppBadge(unread: number): void {
  const nav = navigator as BadgeNavigator;
  if (unread > 0) {
    void nav.setAppBadge?.(unread).catch(() => {});
  } else {
    void nav.clearAppBadge?.().catch(() => {});
  }
}

import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';

interface AvatarProps {
  name: string;
  /** Ścieżka zdjęcia w buckecie avatars — jeśli jest, pokazujemy zdjęcie. */
  path?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

/** Publiczny URL zdjęcia profilowego (bucket avatars jest publiczny). */
export function avatarUrl(path: string): string {
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export function Avatar({ name, path, size = 'md', className }: AvatarProps) {
  if (path) {
    return (
      <img
        src={avatarUrl(path)}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

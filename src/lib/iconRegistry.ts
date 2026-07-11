import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Brush,
  Building2,
  CalendarClock,
  Camera,
  Car,
  Clock,
  Droplets,
  Fence,
  FileText,
  Globe,
  Hammer,
  HardHat,
  House,
  Images,
  Layers,
  Lightbulb,
  Mail,
  MapPin,
  PaintRoller,
  Paintbrush,
  Percent,
  Phone,
  Receipt,
  Ruler,
  Shield,
  ShieldCheck,
  Sun,
  Trees,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * Rejestr ikon do wyboru w Ustawieniach (np. usługi na stronie oferty).
 * Klucz zapisujemy w bazie jako tekst — komponent dobierany tutaj.
 */
export const ICONS: Record<string, ComponentType<LucideProps>> = {
  Layers,
  House,
  Hammer,
  Droplets,
  PaintRoller,
  Paintbrush,
  Brush,
  Wrench,
  Ruler,
  HardHat,
  Building2,
  Warehouse,
  Fence,
  Truck,
  Car,
  Shield,
  ShieldCheck,
  BadgeCheck,
  Sun,
  Trees,
  Lightbulb,
  Camera,
  Images,
  Clock,
  CalendarClock,
  Banknote,
  Receipt,
  Percent,
  BarChart3,
  TrendingUp,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
};

export const ICON_KEYS = Object.keys(ICONS);

export function iconByKey(key: string | undefined): ComponentType<LucideProps> {
  return (key && ICONS[key]) || Hammer;
}

import type { Tables, TablesInsert } from '@/types/database';

export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;

export const CLIENT_TYPE_LABELS: Record<Client['type'], string> = {
  company: 'Firma',
  private: 'Prywatny',
};

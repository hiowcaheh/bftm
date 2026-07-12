/**
 * Typy bazy danych BFTM — odzwierciedlają supabase/migrations/.
 * Utrzymywane ręcznie w tym samym kształcie, jaki produkuje
 * `supabase gen types typescript`; aktualizowane przy każdej migracji.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'employee';
export type ProjectStatus = 'offer' | 'active' | 'paused' | 'completed' | 'cancelled';
export type BillingType = 'hourly' | 'fixed' | 'mixed';
export type WorkHoursStatus = 'draft' | 'approved' | 'invoiced';
export type AbsenceType = 'sick' | 'vacation' | 'unpaid' | 'vab' | 'other';
export type ExpenseCategory = 'materials' | 'equipment' | 'fuel' | 'subcontractor' | 'other';
export type AdditionalWorkStatus = 'proposed' | 'approved' | 'rejected' | 'invoiced';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type ClientType = 'private' | 'company';

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  permissions: Json;
  active: boolean;
  must_change_password: boolean;
  avatar_path: string | null;
  last_seen_at: string | null;
  created_at: string;
}

type EmployeeCompensationRow = {
  id: string;
  profile_id: string;
  hourly_wage: number;
  valid_from: string;
  note: string | null;
  created_at: string;
}

type ClientRow = {
  id: string;
  name: string;
  type: ClientType;
  org_or_person_nr: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  reverse_vat: boolean;
  rot_eligible: boolean;
  notes: string | null;
  created_at: string;
}

type ProjectRow = {
  id: string;
  client_id: string | null;
  name: string;
  status: ProjectStatus;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  billing_type: BillingType;
  hourly_rate: number | null;
  fixed_value: number | null;
  estimated_hours: number | null;
  description: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

type ProjectInvoiceRow = {
  id: string;
  project_id: string;
  amount: number;
  sent_at: string;
  due_at: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
}

type WorkHoursRow = {
  id: string;
  project_id: string;
  employee_id: string;
  activity_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  status: WorkHoursStatus;
  invoice_batch_id: string | null;
  created_by: string | null;
  created_at: string;
}

type ProjectActivityRow = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

type AbsenceRow = {
  id: string;
  employee_id: string;
  date_from: string;
  date_to: string;
  type: AbsenceType;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

type ExpenseRow = {
  id: string;
  project_id: string | null;
  description: string;
  amount_net: number;
  vat_amount: number;
  amount_gross: number;
  category: ExpenseCategory;
  date: string;
  supplier: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
}

type AdditionalWorkRow = {
  id: string;
  project_id: string;
  description: string;
  value: number;
  vat_rate: number;
  date: string | null;
  status: AdditionalWorkStatus;
  note: string | null;
  created_at: string;
}

type OfferRow = {
  id: string;
  number: string;
  title: string | null;
  client_id: string | null;
  client_snapshot: Json | null;
  project_id: string | null;
  status: OfferStatus;
  issue_date: string | null;
  valid_until: string | null;
  reverse_vat: boolean;
  rot_enabled: boolean;
  rot_persons: number;
  notes: string | null;
  terms: string | null;
  guarantee: string | null;
  ata_info: string | null;
  travel_info: string | null;
  payment_days: number | null;
  public_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  view_count: number;
  responded_at: string | null;
  response_comment: string | null;
  created_at: string;
}

type OfferItemRow = {
  id: string;
  offer_id: string;
  position: number;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  is_labor: boolean;
  created_at: string;
}

type InvoiceBatchRow = {
  id: string;
  project_id: string;
  number: string;
  period_from: string;
  period_to: string;
  total_hours: number;
  total_net: number;
  pdf_path: string | null;
  note: string | null;
  created_at: string;
}

type ProjectPhotoRow = {
  id: string;
  project_id: string;
  path: string;
  caption: string | null;
  taken_at: string | null;
  created_by: string | null;
  created_at: string;
}

type PayslipRow = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  file_path: string;
  file_type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

type EmployeePrivateRow = {
  profile_id: string;
  personnummer: string | null;
  shirt_size: string | null;
  pants_size: string | null;
  shoe_size: string | null;
  updated_at: string;
}

type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

type SettingsRow = {
  key: string;
  value: Json;
  is_public: boolean;
  admin_only: boolean;
  updated_at: string;
}

type ActivityLogRow = {
  id: string;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: Json | null;
  created_at: string;
}

/** Insert = wymagane pola bez wartości domyślnych; Update = wszystko opcjonalne. */
type TableDef<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'full_name' | 'email'>
      >;
      employee_compensation: TableDef<
        EmployeeCompensationRow,
        Partial<EmployeeCompensationRow> &
          Pick<EmployeeCompensationRow, 'profile_id' | 'hourly_wage' | 'valid_from'>
      >;
      clients: TableDef<ClientRow, Partial<ClientRow> & Pick<ClientRow, 'name'>>;
      projects: TableDef<ProjectRow, Partial<ProjectRow> & Pick<ProjectRow, 'name'>>;
      project_invoices: TableDef<
        ProjectInvoiceRow,
        Partial<ProjectInvoiceRow> & Pick<ProjectInvoiceRow, 'project_id' | 'sent_at'>
      >;
      work_hours: TableDef<
        WorkHoursRow,
        Partial<WorkHoursRow> &
          Pick<WorkHoursRow, 'project_id' | 'employee_id' | 'date' | 'hours'>
      >;
      absences: TableDef<
        AbsenceRow,
        Partial<AbsenceRow> &
          Pick<AbsenceRow, 'employee_id' | 'date_from' | 'date_to' | 'type'>
      >;
      expenses: TableDef<
        ExpenseRow,
        Partial<ExpenseRow> & Pick<ExpenseRow, 'description' | 'category' | 'date'>
      >;
      additional_works: TableDef<
        AdditionalWorkRow,
        Partial<AdditionalWorkRow> & Pick<AdditionalWorkRow, 'project_id' | 'description'>
      >;
      offers: TableDef<OfferRow, Partial<OfferRow> & Pick<OfferRow, 'number'>>;
      offer_items: TableDef<
        OfferItemRow,
        Partial<OfferItemRow> & Pick<OfferItemRow, 'offer_id' | 'description'>
      >;
      invoice_batches: TableDef<
        InvoiceBatchRow,
        Partial<InvoiceBatchRow> &
          Pick<InvoiceBatchRow, 'project_id' | 'number' | 'period_from' | 'period_to'>
      >;
      project_activities: TableDef<
        ProjectActivityRow,
        Partial<ProjectActivityRow> & Pick<ProjectActivityRow, 'project_id' | 'name'>
      >;
      project_photos: TableDef<
        ProjectPhotoRow,
        Partial<ProjectPhotoRow> & Pick<ProjectPhotoRow, 'project_id' | 'path'>
      >;
      employee_private: TableDef<
        EmployeePrivateRow,
        Partial<EmployeePrivateRow> & Pick<EmployeePrivateRow, 'profile_id'>
      >;
      payslips: TableDef<
        PayslipRow,
        Partial<PayslipRow> &
          Pick<PayslipRow, 'employee_id' | 'year' | 'month' | 'file_path'>
      >;
      notifications: TableDef<
        NotificationRow,
        Partial<NotificationRow> & Pick<NotificationRow, 'recipient_id' | 'title'>
      >;
      settings: TableDef<SettingsRow, Partial<SettingsRow> & Pick<SettingsRow, 'key'>>;
      activity_log: TableDef<
        ActivityLogRow,
        Partial<ActivityLogRow> & Pick<ActivityLogRow, 'action' | 'entity'>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      has_perm: { Args: { flag: string }; Returns: boolean };
      is_active: { Args: Record<PropertyKey, never>; Returns: boolean };
      admin_create_employee: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_temp_password: string;
          p_hourly_wage?: number | null;
          p_valid_from?: string;
          p_permissions?: Json;
          p_personnummer?: string | null;
        };
        Returns: string;
      };
      admin_reset_password: {
        Args: { p_profile_id: string; p_temp_password: string };
        Returns: undefined;
      };
      admin_set_active: {
        Args: { p_profile_id: string; p_active: boolean };
        Returns: undefined;
      };
      finance_project_summary: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{
          project_id: string;
          name: string;
          color: string | null;
          status: ProjectStatus;
          billing_type: BillingType;
          hourly_rate: number | null;
          fixed_value: number | null;
          hours_range: number;
          labor_cost_range: number;
          hours_total: number;
          labor_cost_total: number;
          expenses_range: number;
          expenses_total: number;
          additional_approved: number;
          invoiced_total: number;
          paid_total: number;
          awaiting_total: number;
          paid_range_total: number;
          invoice_count: number;
          next_due_at: string | null;
        }>;
      };
      send_offer_email: {
        Args: { p_to: string; p_subject: string; p_html: string };
        Returns: undefined;
      };
      touch_last_seen: { Args: Record<PropertyKey, never>; Returns: undefined };
      offer_next_number: { Args: Record<PropertyKey, never>; Returns: string };
      offer_publish: { Args: { p_offer_id: string }; Returns: string };
      offer_ensure_token: { Args: { p_offer_id: string }; Returns: string };
      offer_public: { Args: { p_token: string; p_track?: boolean }; Returns: Json };
      offer_respond: {
        Args: { p_token: string; p_accept: boolean; p_comment?: string | null };
        Returns: undefined;
      };
      report_hours: { Args: { p_from: string; p_to: string }; Returns: Json };
      report_hours_total: { Args: { p_from: string; p_to: string }; Returns: number };
      report_share_create: {
        Args: {
          p_from: string;
          p_to: string;
          p_title?: string | null;
          p_include_amounts?: boolean;
        };
        Returns: string;
      };
      report_share_public: { Args: { p_token: string }; Returns: Json };
      finance_daily: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{
          day: string;
          hours: number;
          labor_cost: number;
          revenue: number;
          expenses: number;
        }>;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

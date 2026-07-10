export interface CompanyBranding {
  name: string;
  slogan?: string;
  logo_path: string | null;
}

export interface CompanyDetails {
  name: string;
  address: string;
  org_nr: string;
  vat_nr: string;
  f_skatt: boolean;
  bankgiro: string;
  plusgiro: string;
  iban: string;
  phone: string;
  email: string;
}

export const EMPTY_COMPANY_DETAILS: CompanyDetails = {
  name: '',
  address: '',
  org_nr: '',
  vat_nr: '',
  f_skatt: true,
  bankgiro: '',
  plusgiro: '',
  iban: '',
  phone: '',
  email: '',
};

/** settings.finance — narzuty pracodawcy i stawki VAT (Szwecja, edytowalne). */
export interface FinanceSettings {
  vat_default: number;
  vat_rates: number[];
  employer_fee_pct: number;
  vacation_pay_pct: number;
  overhead_pct: number;
  rot: { enabled: boolean; pct: number; cap_per_person: number };
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  vat_default: 25,
  vat_rates: [25, 12, 6, 0],
  employer_fee_pct: 31.42,
  vacation_pay_pct: 12,
  overhead_pct: 0,
  rot: { enabled: true, pct: 30, cap_per_person: 50000 },
};

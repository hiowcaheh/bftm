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

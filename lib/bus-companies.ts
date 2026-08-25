import type { TransitDataset } from '@/lib/types';

export interface BusCompany {
  name: string;
  /** Optional: not every operator publishes one, and we do not invent them. */
  url?: string;
  phone: string;
  /**
   * Translation key for a note under the number — call-tariff disclosures are
   * required alongside Portuguese landline numbers.
   */
  phoneNoteKey?: string;
  email: string;
  /** International number, digits only, for the `wa.me` link. */
  whatsapp?: string;
}

/**
 * The three São Miguel operators of the LEGACY network — contact data from the
 * legacy webapp info page.
 */
export const BUS_COMPANIES: BusCompany[] = [
  {
    name: 'Auto Viação Micaelense, Lda.',
    url: 'https://www.facebook.com/autoviacaomicaelensetransportes?locale=pt_PT',
    phone: '+351296301358',
    email: 'transportes@autoviacaomicaelense.pt',
  },
  {
    name: 'Varela & Companhia, Lda.',
    url: 'https://www.visitazores.com/en/explore/varela-e-companhia-lda',
    phone: '+351296301800',
    email: 'bensaude@bensaude.pt',
  },
  {
    name: 'Caetano Raposo e Pereiras, Lda.',
    url: 'https://www.crp-caetanoraposopereiras.pt/',
    phone: '+351296304260',
    email: 'turismo@crp.com.pt',
  },
];

/**
 * The single operator of the NEW network. One concession replaces the three
 * companies, so after the changeover the old numbers reach nobody who can
 * answer for the routes the app is showing.
 */
export const AZORESBUS_COMPANIES: BusCompany[] = [
  {
    name: 'AzoresBus',
    phone: '+351296097097',
    phoneNoteKey: 'contactBusLandlineNote',
    email: 'apoiocliente@azoresbus.pt',
    whatsapp: '351916060760',
  },
];

/**
 * Whose contacts to show, keyed on the network actually being displayed.
 *
 * Driven by the dataset rather than a date, for the same reason as everything
 * else in the changeover: a rider previewing the new network (or an admin
 * simulating the cutover) is looking at AzoresBus routes and must get the
 * AzoresBus number, and on the day itself this flips with no release.
 */
export function busCompaniesFor(dataset: TransitDataset | null | undefined): BusCompany[] {
  return dataset === 'azoresbus' ? AZORESBUS_COMPANIES : BUS_COMPANIES;
}

/** The `wa.me` deep link for a company's WhatsApp support line. */
export function whatsAppUrl(company: BusCompany): string | null {
  return company.whatsapp ? `https://wa.me/${company.whatsapp}` : null;
}

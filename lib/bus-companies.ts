export interface BusCompany {
  name: string;
  url: string;
  phone: string;
  email: string;
}

/** São Miguel bus operators — contact data from legacy webapp info page. */
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

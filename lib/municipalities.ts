export interface Municipality {
  key: string;
  labelKey: string;
}

export const MUNICIPALITIES: Municipality[] = [
  { key: 'ponta-delgada', labelKey: 'personalizeMunicipalityPontaDelgada' },
  { key: 'ribeira-grande', labelKey: 'personalizeMunicipalityRibeiraGrande' },
  { key: 'lagoa', labelKey: 'personalizeMunicipalityLagoa' },
  { key: 'vila-franca-do-campo', labelKey: 'personalizeMunicipalityVilaFranca' },
  { key: 'povoacao', labelKey: 'personalizeMunicipalityPovoacao' },
  { key: 'nordeste', labelKey: 'personalizeMunicipalityNordeste' },
];

export function getMunicipality(key: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.key === key);
}

export interface TariffSeedMasterEntry {
  id: string;
  htsCode8: string;
  htsCode10: string;
  description: string;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  sourceRevision: string;
  sourceUrl: string;
}

export interface TariffSeedItem {
  catalogId: string;
  canonicalHs6: string;
  profileName: string;
  confidenceMode: "high_confidence" | "low_confidence";
  defaultShipentegraUsd: number;
  usProfileId: string;
  title: string;
  description: string;
  keywords: string[];
  sourceType?: string;
  sourceVersion?: string;
  effectiveFrom?: number | null;
  effectiveTo?: number | null;
  masterEntry: TariffSeedMasterEntry;
}

export const US_TARIFF_SEED: TariffSeedItem[] = [
  {
    catalogId: 'catalog_711790',
    canonicalHs6: '711790',
    profileName: '925 gumus kolye',
    confidenceMode: 'high_confidence',
    defaultShipentegraUsd: 4.9,
    usProfileId: 'us_711790_2026r4',
    title: 'Imitation jewelry',
    description: 'Ince zincirli kolye ve aksesuar profili',
    keywords: ['kolye', 'gumus kolye', 'zincir', 'aksesuar'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    masterEntry: {
      id: 'master_711790_2026r4',
      htsCode8: '7117.90.75',
      htsCode10: '7117.90.7500',
      description: 'Imitation jewelry of base metal',
      generalDutyRate: 0.11,
      additionalDutyRate: 0,
      combinedDutyRate: 0.11,
      dutySummary: '%11.0 temel vergi + %0.0 ek tarife = toplam %11.0',
      sourceRevision: 'USITC HTS 2026 Revision 4',
      sourceUrl: 'https://www.usitc.gov/',
    },
  },
  {
    catalogId: 'catalog_420291',
    canonicalHs6: '420291',
    profileName: 'deri el cantasi',
    confidenceMode: 'high_confidence',
    defaultShipentegraUsd: 7.5,
    usProfileId: 'us_420291_2026r4',
    title: 'Leather handbags and similar containers',
    description: 'Deri aksesuar, el cantasi ve bileklik benzeri kucuk esyalar',
    keywords: ['deri', 'aksesuar', 'el cantasi', 'bileklik', 'moda'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    masterEntry: {
      id: 'master_420291_2026r4',
      htsCode8: '4202.91.00',
      htsCode10: '4202.91.0030',
      description: 'Leather handbags and similar containers',
      generalDutyRate: 0.08,
      additionalDutyRate: 0,
      combinedDutyRate: 0.08,
      dutySummary: '%8.0 temel vergi + %0.0 ek tarife = toplam %8.0',
      sourceRevision: 'USITC HTS 2026 Revision 4',
      sourceUrl: 'https://www.usitc.gov/',
    },
  },
  {
    catalogId: 'catalog_392690',
    canonicalHs6: '392690',
    profileName: 'plastik aksesuar',
    confidenceMode: 'low_confidence',
    defaultShipentegraUsd: 6.25,
    usProfileId: 'us_392690_2026r4',
    title: 'Other plastic articles',
    description: 'Plastik aksesuar ve kostum urunleri',
    keywords: ['plastik', 'aksesuar', 'kostum', 'hediyelik'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    masterEntry: {
      id: 'master_392690_2026r4',
      htsCode8: '3926.90.99',
      htsCode10: '3926.90.9989',
      description: 'Other plastic articles',
      generalDutyRate: 0.053,
      additionalDutyRate: 0,
      combinedDutyRate: 0.053,
      dutySummary: '%5.3 temel vergi + %0.0 ek tarife = toplam %5.3',
      sourceRevision: 'USITC HTS 2026 Revision 4',
      sourceUrl: 'https://www.usitc.gov/',
    },
  },
];

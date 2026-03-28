export interface TariffSeedUsProfile {
  id: string;
  htsusCode: string;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  summaryText: string;
  revisionLabel: string;
}

export interface TariffSeedItem {
  catalogId: string;
  canonicalHs6: string;
  title: string;
  description: string;
  keywords: string[];
  sourceType?: string;
  sourceVersion?: string;
  effectiveFrom?: number | null;
  effectiveTo?: number | null;
  usProfile: TariffSeedUsProfile;
}

export const US_TARIFF_SEED: TariffSeedItem[] = [
  {
    catalogId: 'catalog_711790',
    canonicalHs6: '711790',
    title: 'Imitation jewelry',
    description: 'Deri ve benzeri kostum takilar, bileklik ve kolyeler',
    keywords: ['taki', 'kolye', 'bileklik', 'deri taki', 'aksesuar'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    usProfile: {
      id: 'us_711790_2026r4',
      htsusCode: '7117.90.7500',
      generalDutyRate: 0.11,
      additionalDutyRate: 0,
      combinedDutyRate: 0.11,
      summaryText: '%11.0 temel vergi + %0.0 ek tarife = toplam %11.0',
      revisionLabel: 'USITC HTS 2026 Revision 4',
    },
  },
  {
    catalogId: 'catalog_420291',
    canonicalHs6: '420291',
    title: 'Leather handbags and similar containers',
    description: 'Deri aksesuar, el cantasi ve bileklik benzeri kucuk esyalar',
    keywords: ['deri', 'aksesuar', 'el cantasi', 'bileklik', 'moda'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    usProfile: {
      id: 'us_420291_2026r4',
      htsusCode: '4202.91.0030',
      generalDutyRate: 0.08,
      additionalDutyRate: 0,
      combinedDutyRate: 0.08,
      summaryText: '%8.0 temel vergi + %0.0 ek tarife = toplam %8.0',
      revisionLabel: 'USITC HTS 2026 Revision 4',
    },
  },
  {
    catalogId: 'catalog_392690',
    canonicalHs6: '392690',
    title: 'Other plastic articles',
    description: 'Plastik aksesuar ve kostum urunleri',
    keywords: ['plastik', 'aksesuar', 'kostum', 'hediyelik'],
    sourceType: 'seed',
    sourceVersion: '2026-r4',
    effectiveFrom: Date.parse('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    usProfile: {
      id: 'us_392690_2026r4',
      htsusCode: '3926.90.9989',
      generalDutyRate: 0.053,
      additionalDutyRate: 0,
      combinedDutyRate: 0.053,
      summaryText: '%5.3 temel vergi + %0.0 ek tarife = toplam %5.3',
      revisionLabel: 'USITC HTS 2026 Revision 4',
    },
  },
];

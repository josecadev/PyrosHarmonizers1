export type Locale = 'es' | 'en'
export type ColorPalette = 'standard' | 'viridis'
export type RbacRole = 'public' | 'operator' | 'analyst' | 'admin'

export interface RbacRoleSpec {
  id: RbacRole
  labelEs: string
  labelEn: string
  orgEs: string
  orgEn: string
  canExportGeoJson: boolean
  canExportAuditJson: boolean
  canUseNrt: boolean
}

export const RBAC_ROLES: RbacRoleSpec[] = [
  {
    id: 'public',
    labelEs: 'Público',
    labelEn: 'Public',
    orgEs: 'Ciudadanía / Prensa · Lectura + CSV/PDF',
    orgEn: 'Citizens / Press · Read + CSV/PDF',
    canExportGeoJson: false,
    canExportAuditJson: false,
    canUseNrt: true,
  },
  {
    id: 'operator',
    labelEs: 'Operador',
    labelEn: 'Operator',
    orgEs: 'Brigadas / SERNAP / ABT · NRT + GeoJSON',
    orgEn: 'Fire Brigades / SERNAP / ABT · NRT + GeoJSON',
    canExportGeoJson: true,
    canExportAuditJson: false,
    canUseNrt: true,
  },
  {
    id: 'analyst',
    labelEs: 'Analista',
    labelEn: 'Analyst',
    orgEs: 'Científico / UCB · Auditoría JSON + Chow Test',
    orgEn: 'Scientist / UCB · Audit JSON + Chow Test',
    canExportGeoJson: true,
    canExportAuditJson: true,
    canUseNrt: true,
  },
  {
    id: 'admin',
    labelEs: 'Admin',
    labelEn: 'Admin',
    orgEs: 'Sistema / DevOps · Control Total API + Ingesta',
    orgEn: 'System / DevOps · Full API + Ingestion Control',
    canExportGeoJson: true,
    canExportAuditJson: true,
    canUseNrt: true,
  },
]

export function getRoleSpec(role: RbacRole): RbacRoleSpec {
  return RBAC_ROLES.find((r) => r.id === role) ?? RBAC_ROLES[2]
}

export const UI_DICT = {
  es: {
    views: {
      map: { label: 'Visor Espacial', hint: 'Huella de píxel y Split-Screen' },
      calendar: { label: 'Calendario de Quemas', hint: 'HFII diario y Matriz 2000–2026' },
      lab: { label: 'Laboratorio', hint: 'Armonización y Test de Chow' },
      data: { label: 'Explorador de Datos', hint: 'Registros FIRMS y exportación' },
    },
    modes: {
      raw: 'Crudo',
      dbscan: 'ST-DBSCAN',
      h3: 'Grilla H3',
    },
    header: {
      challengeBadge: 'NASA Space Apps 2026 · Reto #8',
      processing: 'Procesamiento',
      export: 'Exportar',
      splitScreen: 'Split-Screen',
      orbitAll: 'D + N',
      orbitDay: 'Día (γ=1.0)',
      orbitNight: 'Noche (γ=0.72)',
      confidence: 'Confianza > 30%',
      active: 'activo',
      inactive: 'inactivo',
      staticMask: 'Máscara Gas/Ind.',
      filtered: 'filtradas',
      historic: 'Histórico',
      apiOnline: 'API PostGIS Activa',
      apiFallback: 'Motor Local (NFR-006)',
      viridisLabel: 'Viridis (Daltónicos)',
      standardPalette: 'Paleta Infrarroja',
      collapse: 'Colapsar',
      compareShortcut: 'Comparador Efecto 2012',
    },
    kpis: {
      k1: 'Conteo de fuegos',
      k2Raw: 'FRP Crudo',
      k2Cal: 'FRP Calibrado (HFII)',
      k3: 'Índice HFII',
      k4: 'Área huella térmica',
      foci: 'focos',
      fires: 'incendios',
      cells: 'celdas',
      overcount: 'sobre-conteo',
      modisOnly: 'solo MODIS',
      uncalibrated: 'sin calibrar',
      inflated: 'inflado',
      duplication: 'duplicación',
      cellsPerDay: 'celdas / día',
    },
  },
  en: {
    views: {
      map: { label: 'Spatial Viewer', hint: 'Pixel footprint & Split-Screen' },
      calendar: { label: 'Burning Calendar', hint: 'Daily HFII & 2000–2026 Matrix' },
      lab: { label: 'Harmonization Lab', hint: '2012 Effect & Chow Test' },
      data: { label: 'Data Explorer', hint: 'FIRMS records & export center' },
    },
    modes: {
      raw: 'Raw',
      dbscan: 'ST-DBSCAN',
      h3: 'H3 Grid',
    },
    header: {
      challengeBadge: 'NASA Space Apps 2026 · Challenge #8',
      processing: 'Processing',
      export: 'Export',
      splitScreen: 'Split-Screen',
      orbitAll: 'D + N',
      orbitDay: 'Day (γ=1.0)',
      orbitNight: 'Night (γ=0.72)',
      confidence: 'Confidence > 30%',
      active: 'active',
      inactive: 'off',
      staticMask: 'Gas/Ind. Mask',
      filtered: 'masked',
      historic: 'Historic',
      apiOnline: 'PostGIS API Online',
      apiFallback: 'Local Engine (NFR-006)',
      viridisLabel: 'Viridis (Colorblind)',
      standardPalette: 'Infrared Palette',
      collapse: 'Collapse',
      compareShortcut: '2012 Effect Comparator',
    },
    kpis: {
      k1: 'Fire Count',
      k2Raw: 'Raw FRP',
      k2Cal: 'Calibrated FRP (HFII)',
      k3: 'HFII Index',
      k4: 'Thermal Footprint Area',
      foci: 'hotspots',
      fires: 'fire events',
      cells: 'cells',
      overcount: 'overcount',
      modisOnly: 'MODIS only',
      uncalibrated: 'uncalibrated',
      inflated: 'inflated',
      duplication: 'duplication',
      cellsPerDay: 'cells / day',
    },
  },
} as const

# Plan Maestro de Alineación del Frontend — PyrosHarmonizer

> **Proyecto:** PyrosHarmonizer — *Unified Fire Regimes & Burning Activity Calendar*  
> **Evento:** 2026 NASA International Space Apps Challenge (Sede UCB Santa Cruz de la Sierra, Bolivia)  
> **Reto:** #8 — *Harmonization of MODIS and VIIRS Hot Spots*  
> **Versión del Plan:** 2.0.0 (Sincronizado con los 18 documentos de `docs/`, incluyendo manuales `DEV1`–`DEV4`)  
> **Propósito:** Hoja de ruta técnica y checklist exacta de todo lo que falta implementar o ajustar en `frontend/` para que concuerde al **100%** con el problema científico ("Efecto 2012"), los requisitos (`PRD.md`, `DESIGN.md`, `API_CONTRACTS.md`, `ACCEPTANCE_SCENARIOS.md`) y los manuales de equipo (`DEV3_FRONTEND_MAPS.md` y `DEV4_DATA_VIZ_DEVOPS.md`).

---

## 1. Estado Actual y Tareas Ya Completadas ✅

### 1.1. Tareas de Configuración y Git Ya Resueltas
- [x] **Eliminación de submódulo roto (`frontend/.git`):** Se eliminó el repositorio `.git` anidado y se registraron los **32 archivos reales** de `frontend/` directamente en el repositorio raíz (`main` y rama `luis`).
- [x] **Instalación de dependencias base (`node_modules`):** Se instalaron los 378 paquetes base con `pnpm install` (Next.js, React, Recharts, Tailwind CSS, Lucide React).
- [x] **Identidad en `package.json`:** Renombrado de `"my-project"` a `"pyrosharmonizer-frontend"`.

### 1.2. Lo que el Frontend Actual (`components/pyros/*` y `lib/pyros/*`) Ya Tiene Funcionando
| Módulo Actual | Archivo Actual | Qué ya cumple respecto a los documentos |
| :--- | :--- | :--- |
| **Header & Controles** | `frontend/components/pyros/control-header.tsx` | Logo PyrosHarmonizer, selector de caso de estudio (5 regiones de Santa Cruz), selector de modo (`Crudo`, `ST-DBSCAN`, `Grilla H3`), filtro de pasada orbital (`Todos`, `Día D`, `Noche N`), switch de filtro de confianza (`> 30% Nominal/High`), botones de constelación (`Terra/Aqua MODIS` y `S-NPP/NOAA-20/NOAA-21 VIIRS`), bloqueo automático de VIIRS antes de 2012, tooltip de transición satelital y menú de exportación. |
| **Panel de Telemetría (KPIs)** | `frontend/components/pyros/kpi-panel.tsx` | Tarjetas `KPI-01` (Focos crudos vs. incendios reales unificados vs. celdas H3 y % de duplicados eliminados), `KPI-02` (FRP crudo vs. calibrado vs. densidad $\text{MW}/\text{km}^2$), `KPI-03` (Índice HFII `0–100` con 5 niveles de severidad) y `KPI-04` (Área real $\sum \text{scan} \times \text{track}$ vs. `ST_ConvexHull` en ha vs. área H3). |
| **Visor Geoespacial** | `frontend/components/pyros/map-viewer.tsx` | Visor vectorial interactivo con zoom, paneo, escala métrica dinámica (`1 km` / `500 m`), retícula WGS84 (`EPSG:4326`), conmutador de 5 capas (`Píxel MODIS 1 km`, `Píxel VIIRS 375 m`, `Envolvente ST-DBSCAN`, `Grilla H3 res. 8`, `Retícula WGS84`) y selección de entidades al hacer clic. |
| **Inspector FIRMS** | `frontend/components/pyros/inspector.tsx` | Muestra los atributos del dataset NASA FIRMS (`latitude`, `longitude`, `brightness` / `bright_ti4`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `daynight`, `confidence`, `frp`), además del resumen de eventos `ST-DBSCAN` y celdas `H3`. |
| **Panel Analítico** | `frontend/components/pyros/analytics-panel.tsx` | Gráfica histórica 2000–2026 del "Efecto 2012", dispersión de regresión `FRP VIIRS → MODIS`, histograma de emparejamiento orbital ($\Delta t < 3.5\text{ h}$) y proporción por sensor (`Terra`, `Aqua`, `S-NPP`, `NOAA-20`, `NOAA-21`). |
| **Calendario de Quemas** | `frontend/components/pyros/burn-calendar.tsx` | Selector de año (2000–2026), animación Play/Pausa, matriz diaria de 365/366 días (`DOY`), slider temporal y porcentaje de actividad en temporada crítica `Jul–Oct`. |
| **Exportación Local** | `frontend/lib/pyros/exporters.ts` | Descarga en navegador de `GeoJSON`, `CSV Armonizado` y `Reporte Ejecutivo PDF` (impresión). |

---

## 2. Matriz de Brechas: ¿Qué Falta para Cumplir Todos los Documentos?

Cruzando el código actual contra `PRD.md`, `DESIGN.md`, `API_CONTRACTS.md`, `ACCEPTANCE_SCENARIOS.md`, `DEV3_FRONTEND_MAPS.md` y `DEV4_DATA_VIZ_DEVOPS.md`, estas son todas las diferencias que debemos cubrir:

| # | Ticket / Req ID | Documento Origen | Qué piden los documentos | Qué tiene hoy el frontend | Prioridad |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Ticket #3.4** (`FR-019`, `US-04`, `ESC-MAP-001`) | `DEV3_FRONTEND_MAPS.md` / `PRD.md` / `ACCEPTANCE_SCENARIOS.md` | **Vista Split-Screen / Swipe Map ("El Efecto 2012"):** Cortina deslizante central sincronizada en zoom/paneo con datos crudos a la izquierda y polígonos armonizados a la derecha, contadores comparativos en vivo, banner explicativo y botón de pantalla completa para el video de 30s. | **Falta.** Solo muestra un modo a la vez (`raw`, `dbscan` o `h3`). | **P0** |
| **2** | **Ticket #4.2** (`FR-014`, `FR-016`, `ESC-CQ-001..004`) | `DEV4_DATA_VIZ_DEVOPS.md` / `DESIGN.md §5` | **Matriz Multianual (Meses × Años 2000–2026) + Alertas de Anomalía ($Z\text{-score} > 2$):** Heatmap de 27 años × 12 meses, cálculo de $Z = (X - \mu_m)/\sigma_m$, componente `AnomalyAlert` (resaltando crisis de 2010, 2019 y 2024) y clasificación por percentiles ($P_{75}, P_{90}, P_{99}$). | **Parcial.** Solo muestra los 365 días de **un año individual**; no tiene vista Meses × Años ni cálculo/alertas de $Z\text{-score}$. | **P0** |
| **3** | **Ticket #4.3** (`DESIGN.md §5.2`) | `DEV4_DATA_VIZ_DEVOPS.md` / `DESIGN.md` | **Gráfico Comparativo Multi-Anual con las 4 Curvas:** Curva A (`MODIS crudo`), Curva B (`VIIRS crudo`), Curva C (`Suma cruda no armonizada`), Curva D (`PyrosHarmonizer Armonizado`) con toggles de visibilidad. | **Parcial.** En `analytics-panel.tsx` solo se dibujan 2 líneas (`Crudo` y `Armonizado`), aunque `data.ts` ya calcula `modis` y `viirs` por separado. | **P0** |
| **4** | **Ticket #2.1** (`FR-005`, `US-05`, `ESC-FIL-003`) | `PRD.md` / `ACCEPTANCE_SCENARIOS.md` / `DEV2` | **Enmascaramiento de Anomalías Térmicas Estáticas:** Filtro y visualización de fuentes fijas industriales/quema de gas (ej. Planta de Gas Río Grande `STAT_SCZ_0042`, $>365$ días en radio $\le 100\text{–}300\text{ m}$) excluidas del HFII. | **Falta.** Solo tiene filtro de confianza (`> 30%`), sin filtro ni marcadores de anomalías estáticas. | **P0** |
| **5** | **`FR-026`** (`US-07`, `ESC-ARM-001`) | `PRD.md` / `ACCEPTANCE_SCENARIOS.md` | **Inspector de Trazabilidad de Puntos Hijos:** Al hacer clic en un polígono `ST-DBSCAN`, desglosar en tabla cada punto MODIS y VIIRS original que conformó el cluster y resaltarlos en el mapa. | **Parcial.** Muestra solo el conteo `n_modis / n_viirs`, sin listar los puntos individuales ni resaltarlos. | **P0** |
| **6** | **`FR-024`** (`US-03`, `US-08`, `ESC-MAP-003`) | `PRD.md` / `ACCEPTANCE_SCENARIOS.md` / `DEV4` | **Catálogo Completo de Regiones, Municipios y Áreas Protegidas:** Incluir **Concepción**, **Parque Nacional Noel Kempff Mercado**, **Pantanal / PN Otuquis** y **Amazonía / Chaco**. | **Incompleto.** Solo tiene 5 regiones (`Chiquitanía`, `San Ignacio`, `Roboré`, `San Matías`, `Charagua`). | **P0** |
| **7** | **Ticket #3.1** (`CONTEXT_INDEX.md §3`) | `DEV3_FRONTEND_MAPS.md` / `CONTEXT_INDEX.md` | **Navegación de Vistas y Badge Oficial:** Badge `"NASA Space Apps Challenge 2026"` en el Header y navegación rápida entre vistas/modos (`/map`, `/calendar`, `/compare`, `/export` o pestañas equivalentes). | **Parcial.** Todo está en una sola vista fija sin pestañas de enfoque (`/compare`, `/calendar`, `/map`) ni el badge oficial de Space Apps 2026 en el header. | **P1** |
| **8** | **Ticket #1.3** (`FR-025`, `US-02`, `ESC-ING-004`) | `PRD.md` / `DEV1_BACKEND_DATA.md` | **Modo de Monitoreo en Tiempo Casi Real (NRT 24h / 48h / 7d):** Conmutador rápido para brigadas de bomberos mostrando alertas de las últimas 24h, 48h y 7 días. | **Falta.** Solo permite selección histórica por año y día (`DOY`). | **P1** |
| **9** | **Ticket #2.3** (`DESIGN.md §3.4`, `ESC-API-004`) | `DESIGN.md` / `ACCEPTANCE_SCENARIOS.md` / `DEV2` | **Fórmula Completa HFII y Certificación Estadística (Test de Chow):** Corrección por área fuera del nadir $\psi(\text{scan},\text{track})$, ponderación día/noche $\gamma_{\text{solar}}$ y reporte del $p\text{-value}$ del Test de Chow antes ($p < 0.001$) y después ($p > 0.05$) de 2012. | **Parcial.** Usa regresión lineal simple sin factor de deformación de borde ni tarjeta de validación del Test de Chow. | **P1** |
| **10** | **Ticket #4.4** (`ESC-EXP-001..003`) | `DEV4_DATA_VIZ_DEVOPS.md` / `ACCEPTANCE_SCENARIOS.md` | **Formatos Exactos de Exportación (GeoJSON, CSV de 8 columnas, Reporte JSON de Auditoría y PDF con membrete NASA Space Apps 2026):** Cumplir exactamente los nombres de campos validados por los tests BDD. | **Parcial.** Los nombres de columnas del CSV y propiedades del GeoJSON difieren del contrato BDD, y falta la descarga del `audit-report.json` (`ESC-EXP-003`). | **P1** |
| **11** | **Ticket #3.2 & #3.3** (`FR-017`, `FR-018`, `ESC-MAP-002`) | `DEV3_FRONTEND_MAPS.md` / `TECHNICAL_ARCHITECTURE.md` | **Tooltip Flotante en Hover + Multiresolución H3 (Res 7 y Res 8) + Integración Cartográfica:** Tooltip instantáneo al pasar el cursor (borde cian `#00e5ff` en H3), conmutación entre H3 Res 7 ($5.16\text{ km}^2$) y Res 8 ($0.737\text{ km}^2$), y soporte de mapa base. | **Parcial.** Solo muestra datos al hacer clic (no en hover), solo tiene H3 Res 8 y no tiene borde `#00e5ff`. | **P1** |
| **12** | **Ticket #3.3 & #1.4** (`FR-023`, `NFR-006`) | `API_CONTRACTS.md` / `DEV3_FRONTEND_MAPS.md` | **Cliente API REST (`services/api.ts`) y Hooks con Fallback Offline:** Conexión a `NEXT_PUBLIC_API_URL` (`/api/v1/hotspots/*`, `/harmonized/*`, `/calendar/*`) con fallback automático a datos simulados y banner de estado si el backend no responde (`NFR-006`). | **Falta.** No existe cliente HTTP ni hooks de consumo API. | **P1** |
| **13** | **`NFR-010`, `NFR-011` & RBAC** | `PRD.md` / `RBAC_IMPLEMENTATION_PLAN.md` | **Internacionalización (ES/EN), Paleta para Daltónicos (`Viridis`) y Selector de Rol RBAC** (`public`, `operator`, `analyst`, `admin`). | **Falta.** Solo español, una paleta y sin indicador de rol RBAC. | **P2** |

---

## 3. Plan de Acción Detallado por Bloques de Implementación

A continuación se detalla **exactamente qué cambios hacer en cada archivo** para que el frontend cumpla todos los tickets de **DEV 3** y **DEV 4**, además del `PRD.md` y `ACCEPTANCE_SCENARIOS.md`.

---

### BLOQUE 1: Mapa Interactivo, Split-Screen y Trazabilidad (Tickets #3.1, #3.2, #3.3, #3.4)

#### 1.1. Vista Comparativa *Split-Screen / Swipe Map* (`Ticket #3.4` + `ESC-MAP-001`)
* **Archivos:** `frontend/components/pyros/map-viewer.tsx`, `frontend/components/pyros/control-header.tsx`, `frontend/app/compare/page.tsx`
* **Implementación:**
  1. Agregar el modo o toggle **`Split-Screen (Antes / Después)`** en `control-header.tsx` y habilitar también la ruta `/compare`.
  2. En `map-viewer.tsx`, cuando `splitScreen` esté activo:
     * Renderizar ambos estados sobre el mismo sistema de coordenadas sincronizado (`zoom` y `pan` compartidos al 100%).
     * Recortar la mitad izquierda (`0%` a `splitPos%`) mostrando **Datos Crudos (MODIS 1 km + VIIRS 375 m superpuestos)** con badge `"Crudo: X focos (Sobre-conteo VIIRS)"`.
     * Recortar la mitad derecha (`splitPos%` a `100%`) mostrando **PyrosHarmonizer Armonizado (Polígonos `ST_ConvexHull` + H3)** con badge `"Armonizado: Y incendios reales (-Z% duplicados)"`.
     * Añadir el divisor vertical arrastrable (`slider` de `5%` a `95%`), el banner explicativo del *"Efecto 2012 en la Chiquitanía"* y el botón de **Pantalla Completa** para la grabación del video de 30 segundos.

#### 1.2. Tooltip Dinámico en Hover, Borde Cian H3 y Multiresolución H3 Res 7 / Res 8 (`Ticket #3.2` + `ESC-MAP-002`)
* **Archivos:** `frontend/lib/pyros/scene.ts`, `frontend/components/pyros/map-viewer.tsx`
* **Implementación:**
  1. Añadir en `scene.ts` soporte para elegir resolución H3: **Resolución 7** ($\approx 5.16\text{ km}^2$, arista $1.22\text{ km}$, vista regional) y **Resolución 8** ($\approx 0.737\text{ km}^2$, arista $0.461\text{ km}$, vista táctica).
  2. En `map-viewer.tsx`, agregar un tarjeta de **Tooltip Flotante (`#deckgl-tooltip`)** al pasar el cursor (`onMouseEnter`) sobre cualquier hexágono H3, polígono o foco:
     * Resaltar la celda H3 bajo el cursor con borde cian `#00e5ff` (`ESC-MAP-002`).
     * Mostrar instantáneamente: `ID H3 / Evento`, `HFII (MW)`, desglose `MODIS: X | VIIRS: Y`, `Área (ha)` y `Confianza`.

#### 1.3. Filtro y Capa de Anomalías Térmicas Estáticas (`Ticket #2.1` + `FR-005` + `ESC-FIL-003`)
* **Archivos:** `frontend/lib/pyros/data.ts`, `frontend/lib/pyros/scene.ts`, `frontend/components/pyros/control-header.tsx`, `frontend/components/pyros/map-viewer.tsx`
* **Implementación:**
  1. Modelar en `scene.ts` fuentes térmicas estáticas persistentes (ej. `STAT_SCZ_0042` — *Planta de Gas Río Grande / Mechero Industrial*, con $>365$ días activos en radio $\le 100\text{ m}$).
  2. Agregar en `control-header.tsx` un switch **`Excluir Anomalías Estáticas (Gas/Industria)`** (activo por defecto).
  3. Mostrar en el mapa las anomalías estáticas con simbología diferenciada y etiqueta `STATIC_ANOMALY_MASKED`, asegurando que cuando el filtro esté activo no sumen al conteo de eventos ni al `HFII`.

#### 1.4. Trazabilidad de Puntos Hijos en el Inspector de Clusters (`FR-026` + `US-07`)
* **Archivos:** `frontend/lib/pyros/scene.ts`, `frontend/components/pyros/inspector.tsx`, `frontend/components/pyros/map-viewer.tsx`
* **Implementación:**
  1. Guardar en cada objeto `FireEvent` de `scene.ts` la lista `members: Detection[]` y el campo `detectionRegime: 'CO_DETECTED' | 'MODIS_ONLY' | 'VIIRS_ONLY'`.
  2. En `inspector.tsx`, al seleccionar un evento `ST-DBSCAN`, mostrar la tabla desplegable **"Trazabilidad de Puntos Originales (MODIS / VIIRS)"** con cada foco hijo (`id`, `sensor`, `satellite`, `acq_time`, `scan×track`, `frp`) y resaltar dichos puntos dentro del polígono en `map-viewer.tsx`.

---

### BLOQUE 2: Calendario Multianual, Gráficos de 4 Curvas y Rigor Científico (Tickets #4.2, #4.3, #2.3)

#### 2.1. Matriz Multianual (Meses × Años 2000–2026) y Detección de Anomalías $Z\text{-score}$ (`Ticket #4.2` + `ESC-CQ-001..004`)
* **Archivos:** `frontend/lib/pyros/data.ts`, `frontend/components/pyros/burn-calendar.tsx`, `frontend/app/calendar/page.tsx`
* **Implementación:**
  1. En `data.ts`, calcular la matriz multianual (27 años × 12 meses) y las estadísticas climatológicas por mes:
     * Media histórica $\mu_m$, desviación estándar $\sigma_m$ y anomalía estandarizada $Z_{m,y} = (X_{m,y} - \mu_m)/\sigma_m$.
     * Percentiles diarios $P_{75}, P_{90}, P_{99}$ para clasificar severidad diaria (`LOW`, `MODERATE`, `HIGH`, `EXTREME` con clase `bg-fire-extreme`, según `ESC-CQ-003`).
  2. En `burn-calendar.tsx`, agregar un selector de vista:
     * **Vista Diaria (365/366 DOY):** Con badge de $Z\text{-score}$, percentil y alerta de inicio temprano de temporada (`delta_days`, `ESC-CQ-002`).
     * **Vista Matriz Multianual (Meses × Años 2000–2026):** Cuadrícula de calor de 27 años × 12 meses donde se destacan con borde de alerta roja los meses con $Z \ge 2.0$ (como agosto–septiembre de 2010, 2019 y 2024). Al hacer clic en cualquier celda `(año, mes)`, sincroniza inmediatamente el mapa y el panel analítico.

#### 2.2. Gráfico Comparativo Multi-Anual con las 4 Curvas Oficiales (`Ticket #4.3`)
* **Archivos:** `frontend/components/pyros/analytics-panel.tsx`
* **Implementación:**
  * Actualizar el gráfico principal `"Corrección del Efecto 2012"` en `analytics-panel.tsx` para mostrar las **4 curvas especificadas en `DEV4_DATA_VIZ_DEVOPS.md` (Ticket #4.3)** con filtros interactivos en la leyenda:
    1. **MODIS Crudo (2000–2026)**
    2. **VIIRS Crudo (2012–2026)**
    3. **Suma Cruda No Armonizada (MODIS + VIIRS)** (línea punteada mostrando el salto artificial de 2012)
    4. **PyrosHarmonizer Armonizado (HFII / Eventos Reales)** (curva continua y homogénea)

#### 2.3. Ecuación Completa HFII y Certificación Estadística del Test de Chow (`Ticket #2.3` + `ESC-API-004`)
* **Archivos:** `frontend/lib/pyros/data.ts`, `frontend/lib/pyros/scene.ts`, `frontend/components/pyros/kpi-panel.tsx`, `frontend/components/pyros/analytics-panel.tsx`
* **Implementación:**
  1. Incorporar en `scene.ts` y `kpi-panel.tsx` la corrección geométrica por área fuera del nadir $\psi(\text{scan},\text{track}) = (A_{\text{nadir}}/A_{\text{real}})^\kappa$ y el factor de ponderación día/noche ($\gamma_{\text{solar}} = 0.72$ noche, $1.00$ día).
  2. Añadir en `analytics-panel.tsx` el bloque de **Validación Estadística (Test de Cambio Estructural de Chow)** (`ESC-API-004`):
     * `p-value Crudo`: $0.000042$ ($p < 0.001 \rightarrow$ *Ruptura artificial en 2012*)
     * `p-value Armonizado`: $0.4821$ ($p > 0.05 \rightarrow$ *Serie continua homogénea*)
     * `Índice de Conservación de Energía`: $0.941$ (`R² = 0.87`)

#### 2.4. Ampliación del Catálogo de Regiones y Modo Operativo NRT (`FR-024`, `FR-025`, `ESC-MAP-003`)
* **Archivos:** `frontend/lib/pyros/data.ts`, `frontend/components/pyros/control-header.tsx`
* **Implementación:**
  1. Añadir en `REGIONS` (`data.ts`) los municipios y áreas protegidas faltantes:
     * **Concepción** (`lat: -16.1303, lon: -62.0294`)
     * **PN Noel Kempff Mercado** (`lat: -14.583, lon: -60.833`)
     * **PN Otuquis / Pantanal Boliviano** (`lat: -19.55, lon: -58.15`)
     * **Kaa-Iya del Gran Chaco** (`lat: -19.05, lon: -61.25`)
  2. Añadir en `control-header.tsx` el selector rápido **Modo NRT (`Histórico` | `NRT 24h` | `NRT 48h` | `NRT 7d`)** para atención de emergencias en tiempo casi real.

---

### BLOQUE 3: Exportación Estandarizada, Cliente API REST y Rutas (Tickets #4.4, #3.1, #1.4)

#### 3.1. Alinear Exportadores con `ACCEPTANCE_SCENARIOS.md` (`Ticket #4.4` + `ESC-EXP-001..003`)
* **Archivo:** `frontend/lib/pyros/exporters.ts`, `frontend/components/pyros/control-header.tsx`
* **Implementación:**
  1. **GeoJSON (`ESC-EXP-001`):** Incluir en `properties` los atributos requeridos: `event_id`, `acq_date`, `hfii_mw`, `raw_modis_count`, `raw_viirs_count`, `detection_regime`, `area_ha`.
  2. **CSV (`ESC-EXP-002`):** Exportar con las 8 columnas exactas requeridas por el escenario BDD:
     `acq_date,municipio,raw_modis_foci,raw_viirs_foci,harmonized_events_count,raw_total_frp,calibrated_hfii_mw,severity_index`
  3. **Reporte Científico JSON de Auditoría (`ESC-EXP-003`):** Añadir opción en el menú `Exportar` para descargar `pyrosharmonizer_audit_report_<year>.json` con `algorithm_version`, `total_raw_modis`, `total_raw_viirs`, `total_harmonized_events`, `spatial_compression_rate`, `co_detection_rate`, `hfii_total_terawatts` y `statistical_validation`.
  4. **Reporte Ejecutivo PDF (`Ticket #4.4`):** Incluir membrete oficial `"2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz"`, tabla de anomalías ($Z\text{-score}$) y métricas del Test de Chow.

#### 3.2. Cliente API REST (`lib/pyros/api.ts`) con Fallback Offline Resiliente (`NFR-006`)
* **Archivos a crear:** `frontend/lib/pyros/api.ts`, `frontend/.env.example`
* **Implementación:**
  1. Implementar cliente HTTP para consumir `NEXT_PUBLIC_API_URL` (`http://localhost:8000/api/v1`) cubriendo `/health`, `/hotspots/modis`, `/hotspots/viirs`, `/hotspots/compare`, `/harmonized/events`, `/harmonized/h3`, `/calendar/heatmap`, `/calendar/timeline`, `/calendar/anomalies` y `/regions`.
  2. Si el backend FastAPI aún no está activo, conmutar sin errores al motor determinista local (`data.ts` + `scene.ts`) mostrando un badge informativo en el header (`Motor Local Determinista / API Standby`).

#### 3.3. Rutas Dedicadas (`/map`, `/calendar`, `/compare`) y Mejoras de Accesibilidad / Idioma / RBAC
* **Archivos:** `frontend/app/map/page.tsx`, `frontend/app/calendar/page.tsx`, `frontend/app/compare/page.tsx`, `frontend/components/pyros/control-header.tsx`
* **Implementación:**
  1. Crear las rutas `/map`, `/calendar` y `/compare` (además del dashboard integral en `/`) tal como especifican `CONTEXT_INDEX.md` y `DEV3_FRONTEND_MAPS.md` (Ticket #3.1), permitiendo navegar entre ellas desde el header o mediante pestañas instantáneas.
  2. Añadir en `control-header.tsx`:
     * Badge oficial **`NASA Space Apps 2026 · Reto #8`**.
     * Selector bilingüe **`ES / EN`** (`NFR-011`).
     * Conmutador de paleta apta para daltónicos **`Viridis / Estándar`** (`NFR-010`).
     * Selector de vista por rol **`RBAC`** (`Public`, `Operator`, `Analyst`, `Admin`).

---

## 4. Orden de Ejecución Recomendado

1. **Paso 1 (Datos, Fórmulas y Catálogo en `lib/pyros/`):** Actualizar `data.ts`, `scene.ts`, `exporters.ts` y crear `api.ts` (nuevas regiones, anomalías estáticas, puntos hijos por cluster, matriz multianual con $Z\text{-score}$ y percentiles, H3 Res 7/8, Test de Chow y exportadores compatibles con BDD).
2. **Paso 2 (Visor Cartográfico e Inspector en `components/pyros/`):** Actualizar `map-viewer.tsx` e `inspector.tsx` (modo **Split-Screen / Swipe**, tooltip flotante en hover con borde `#00e5ff`, resaltado de puntos hijos, capa de anomalías estáticas y selector H3 Res 7/8).
3. **Paso 3 (Calendario Multianual, Gráficos de 4 Curvas y Header):** Actualizar `burn-calendar.tsx`, `analytics-panel.tsx`, `kpi-panel.tsx` y `control-header.tsx` (vista Matriz Meses × Años 2000–2026 + alertas $Z\text{-score}$, las 4 curvas del Efecto 2012, modo NRT, selector ES/EN, paleta daltónicos y navegación de vistas).
4. **Paso 4 (Rutas Next.js y Verificación de Build):** Crear `/map`, `/calendar` y `/compare`, y verificar compilación limpia con `pnpm run build`.

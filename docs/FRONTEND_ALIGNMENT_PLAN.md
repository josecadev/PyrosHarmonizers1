# Plan Maestro de Alineación del Frontend — PyrosHarmonizer

> **Proyecto:** PyrosHarmonizer — *Unified Fire Regimes & Burning Activity Calendar*  
> **Evento:** 2026 NASA International Space Apps Challenge (Sede UCB Santa Cruz de la Sierra, Bolivia)  
> **Reto:** #8 — *Harmonization of MODIS and VIIRS Hot Spots*  
> **Propósito del Documento:** Auditoría técnica exhaustiva y hoja de ruta paso a paso para alinear al 100% el frontend actual (`frontend/`) con el problema científico, los requisitos del producto (`PRD.md`), el diseño algorítmico (`DESIGN.md`), la arquitectura (`TECHNICAL_ARCHITECTURE.md`), los contratos de API (`API_CONTRACTS.md`) y los escenarios de aceptación (`ACCEPTANCE_SCENARIOS.md`).

---

## 1. Diagnóstico del Estado Actual del Frontend

El frontend actual ubicado en `frontend/` es un dashboard analítico interactivo construido con **Next.js (App Router), React, TypeScript, Tailwind CSS y Recharts**.

### 1.1. Lo que YA cumple y está bien implementado
| Componente Actual | Archivo | Requisitos Cubiertos |
| :--- | :--- | :--- |
| **Header de Control y Filtros** | `frontend/components/pyros/control-header.tsx` | Selector de caso de estudio, conmutador de 3 modos (`Crudo`, `ST-DBSCAN`, `Grilla H3`), filtro de pasada orbital (`Todos`, `Día D`, `Noche N`), switch de filtro de confianza (`> 30% Nominal/High`), toggles por constelación (`Terra/Aqua MODIS` y `S-NPP/NOAA-20/NOAA-21 VIIRS`), bloqueo automático de VIIRS antes de 2012 (`VIIRS_START = 2012`), tooltip de transición satelital y menú de exportación. |
| **Panel de Telemetría (KPIs)** | `frontend/components/pyros/kpi-panel.tsx` | `KPI-01` (Focos crudos vs. eventos unificados vs. celdas H3 y porcentaje de reducción de duplicación), `KPI-02` (FRP crudo vs. calibrado vs. densidad $\text{MW}/\text{km}^2$ y ecuación de regresión), `KPI-03` (Índice HFII `0–100` con barra semafórica de 5 niveles) y `KPI-04` (Área de huella térmica real $\sum \text{scan} \times \text{track}$ vs. `ST_ConvexHull` vs. área H3). |
| **Visor Geoespacial de Huellas** | `frontend/components/pyros/map-viewer.tsx` | Lienzo vectorial interactivo con zoom, paneo, escala métrica dinámica (`1 km` / `500 m`), retícula WGS84 (`EPSG:4326`), conmutador de 5 capas (`Píxel MODIS 1 km`, `Píxel VIIRS 375 m`, `Envolvente ST-DBSCAN`, `Grilla H3 res. 8`, `Retícula WGS84`) y selección interactiva de entidades. |
| **Inspector de Metadatos FIRMS** | `frontend/components/pyros/inspector.tsx` | Despliegue de las columnas oficiales del dataset NASA FIRMS (`latitude`, `longitude`, `brightness` / `bright_ti4`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `daynight`, `confidence`, `frp`), además de atributos de eventos unificados y celdas H3. |
| **Panel Analítico ("Efecto 2012")** | `frontend/components/pyros/analytics-panel.tsx` | Serie histórica 2000–2026 comparando `Crudo MODIS + VIIRS` vs. `Armonizado` con hito `S-NPP (2012)`, gráfico de dispersión `Regresión FRP VIIRS → MODIS`, histograma de `Emparejamiento orbital (Δt < 3.5 h)` y barra de proporción por satélite (`Terra`, `Aqua`, `S-NPP`, `NOAA-20`, `NOAA-21`). |
| **Calendario de Actividad de Quemas** | `frontend/components/pyros/burn-calendar.tsx` | Selector anual (2000–2026), animación temporal (`Reproducir` / `Pausa`), cuadrícula diaria de 365/366 días (`DOY`), slider interactivo y cálculo de concentración en ventana crítica `Jul–Oct`. |
| **Exportadores de Datos** | `frontend/lib/pyros/exporters.ts` | Descarga funcional en cliente de `GeoJSON` (polígonos según modo activo), `CSV Armonizado` y `Reporte Ejecutivo PDF` (vista de impresión). |

---

## 2. Matriz de Brechas (Lo que falta para concordar al 100% con los Documentos)

Al contrastar el código actual con los 14 documentos de `docs/`, se identifican **4 categorías de brechas**:

| Categoría | ID en Docs | Requisito / Especificación en Documentos | Estado en Frontend Actual | Prioridad |
| :--- | :--- | :--- | :--- | :---: |
| **UX / Mapa** | `FR-019` / `US-04` / `ESC-MAP-001` | **Vista Comparativa Dividida (*Split-Screen / Swipe*)**: Divisor deslizante sincronizado que compara lado a lado los datos crudos (izquierda) vs. los eventos armonizados (derecha). | **Falta.** Solo permite ver un modo a la vez (`raw`, `dbscan` o `h3`). | **P0 (Crítico)** |
| **Calendario** | `FR-014` / `FR-016` / `ESC-CQ-001..004` | **Matriz Multianual (Meses × Años) y Detección de Anomalías ($Z\text{-score}$)**: Cálculo de $Z = (X - \mu)/\sigma$, alerta roja cuando $Z \ge 2.0$ y clasificación por percentiles ($P_{75}, P_{90}, P_{99}$). | **Parcial.** Muestra días de 1 solo año a la vez sin $Z\text{-score}$, sin alertas de anomalía ni vista matricial Meses × Años (2000–2026). | **P0 (Crítico)** |
| **Calidad** | `FR-005` / `US-05` / `ESC-FIL-003` | **Enmascaramiento de Anomalías Térmicas Estáticas**: Filtro y visualización de fuentes térmicas fijas (mecheros de gas/industria como Planta Río Grande, volcanes) excluidas del HFII. | **Falta.** Solo existe el filtro de confianza (`> 30%`), pero no el filtro ni capa de anomalías estáticas. | **P0 (Crítico)** |
| **Inspector** | `FR-026` / `US-07` / `ESC-ARM-001` | **Trazabilidad de Puntos Hijos del Cluster**: Al hacer clic en un polígono `ST-DBSCAN`, mostrar la lista detallada de cada punto original MODIS y VIIRS absorbido y resaltarlos en el mapa. | **Parcial.** El inspector muestra el conteo (`n_modis / n_viirs`), pero no la tabla de detecciones hijas ni las resalta. | **P0 (Crítico)** |
| **Regiones** | `FR-024` / `US-03` / `ESC-MAP-003` | **Catálogo Completo de Municipios y Áreas Protegidas**: Incluir el municipio de **Concepción** y Áreas Protegidas (**PN Noel Kempff Mercado**, **PN Kaa-Iya**, **PN Otuquis / Pantanal**). | **Incompleto.** Solo tiene 5 regiones (`Chiquitanía`, `San Ignacio`, `Roboré`, `San Matías`, `Charagua`). | **P0 (Crítico)** |
| **Monitoreo** | `FR-025` / `US-02` / `ESC-ING-004` | **Modo NRT (Near Real-Time 24h / 48h / 7d)**: Selector rápido de monitoreo operativo para brigadas de emergencia con alertas de las últimas 24h/48h/7d. | **Falta.** Solo permite navegar por año y día del año (`DOY`). | **P1 (Alto)** |
| **Ciencia / KPIs**| `DESIGN.md §3.4` / `ESC-API-004` | **Fórmula Completa HFII y Test de Continuidad (Chow Test)**: Corrección por área fuera del nadir $\psi(\text{scan}, \text{track})$, factor solar $\gamma_{\text{solar}}$ y métrica $p\text{-value}$ del Test de Chow antes/después de 2012. | **Parcial.** Usa regresión lineal simple sin mostrar el factor de corrección cenital/día-noche ni el $p\text{-value}$ del Test de Chow. | **P1 (Alto)** |
| **Exportación** | `ESC-EXP-001` / `ESC-EXP-002` / `ESC-EXP-003` | **Contratos Exactos de Exportación GeoJSON, CSV y JSON de Auditoría**: Propiedades canónicas en GeoJSON, 8 columnas exactas en CSV y reporte científico JSON de calibración. | **Difiere en nombres de columnas** y falta el exportador JSON de auditoría científica (`ESC-EXP-003`). | **P1 (Alto)** |
| **Arquitectura / API** | `FR-023` / `NFR-006` / `API_CONTRACTS.md` | **Cliente REST API + Fallback Offline con Banner**: Hooks conectados a `/api/v1/*` con respaldo en caché local y banner informativo si la API/FIRMS no está disponible. | **Falta.** No hay capa de servicio HTTP (`services/api.ts`) ni indicador de estado de conexión API/Offline. | **P1 (Alto)** |
| **Cartografía** | `FR-017` / `FR-018` / `ESC-MAP-002` | **Mapbox GL JS + Deck.gl + `h3-js` y Multiresolución H3 (Res 7 y Res 8)**: Índices H3 reales y conmutación entre H3 Res 7 (departamental) y Res 8 (local) con tooltip completo al hacer hover. | **Parcial.** Usa visor SVG propio con IDs H3 simulados, solo Res 8 y sin tooltip flotante en hover. | **P2 (Medio)** |
| **Accesibilidad / i18n / RBAC** | `NFR-010` / `NFR-011` / `RBAC_IMPLEMENTATION_PLAN.md` | **Soporte Bilingüe (ES/EN), Paletas para Daltonismo y Selector de Rol RBAC** (`public`, `operator`, `analyst`, `admin`). | **Falta.** Solo español, una sola paleta térmica y sin visualización de permisos por rol. | **P2 (Medio)** |
| **Repositorio** | `README.md` / `CONTEXT_INDEX.md` | **Limpieza de Git y Nombres de Paquete**: Sin `.git` anidado en `frontend/`, nombre de paquete correcto en `package.json`. | Existe un `frontend/.git` anidado y `package.json` se llama `"my-project"`. | **P1 (Alto)** |

---

## 3. Plan de Trabajo Detallado para el Frontend (Paso a Paso)

A continuación se detalla **todo lo que hay que construir o modificar** en el frontend para alcanzar el 100% de concordancia con los documentos y el problema.

---

### FASE 1: Funcionalidades Críticas de Visualización y Dominio (P0)

#### 1.1. Implementar Modo Comparativo *Split-Screen* (Antes vs. Después)
* **Documentos de referencia:** `PRD.md` (`FR-019`, `US-04`), `IMPLEMENTATION_PLAN.md` (Fase 4.2), `ACCEPTANCE_SCENARIOS.md` (`ESC-MAP-001`).
* **Archivos a modificar:**
  * `frontend/components/pyros/control-header.tsx`
  * `frontend/components/pyros/map-viewer.tsx`
  * `frontend/components/pyros/dashboard.tsx`
* **Qué hacer:**
  1. Añadir un botón/toggle **"Comparar (Split-Screen)"** en la barra superior de `control-header.tsx`.
  2. En `map-viewer.tsx`, cuando el modo `splitScreen` esté activo, renderizar dos capas sincronizadas con la misma transformación `pan` y `zoom` (`viewState.left == viewState.right`), divididas por una barra vertical deslizable (`slider` de `0%` a `100%` mediante `clipPath` o contenedor superpuesto):
     * **Lado Izquierdo (Crudo):** Píxeles MODIS (1 km) + ráfaga de píxeles VIIRS (375 m) superpuestos, mostrando la etiqueta de sobre-conteo.
     * **Lado Derecho (Armonizado):** Polígonos unificados `ST-DBSCAN` (`ST_ConvexHull`) y/o celdas `H3` con su HFII calibrado.

#### 1.2. Evolucionar el Calendario de Quemas: Matriz Multianual (Meses × Años) + Anomalías $Z\text{-score}$
* **Documentos de referencia:** `PRD.md` (`FR-014`, `FR-016`, `US-03`, §5.4), `DESIGN.md` (§5.1–5.3), `ACCEPTANCE_SCENARIOS.md` (`ESC-CQ-001` a `ESC-CQ-004`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/data.ts`
  * `frontend/components/pyros/burn-calendar.tsx`
* **Qué hacer:**
  1. En `data.ts`, agregar el cálculo estadístico para cada día y cada mes $(m, y)$ frente a la línea base histórica:
     * Media histórica $\mu_m$, desviación estándar $\sigma_m$ y puntaje estandarizado:
       $$Z_{m,y} = \frac{\text{HFII}_{m,y} - \mu_m}{\sigma_m}$$
     * Clasificación semafórica de anomalía:
       * $Z \le 0$: Normal (Verde)
       * $0 < Z \le 1$: Moderada (Amarillo)
       * $1 < Z \le 2$: Alerta Naranja
       * $Z > 2$: **Alerta Roja / Anomalía Extrema** (`alert_level = 'RED'`)
     * Percentiles diarios $P_{75}, P_{90}, P_{99}$ (`ESC-CQ-003`).
  2. En `burn-calendar.tsx`, permitir alternar entre dos vistas:
     * **Vista Diaria (365/366 días del año activo):** Con indicador del $Z\text{-score}$, percentil y badge de alerta de anomalía estacional (ej. inicio temprano de temporada crítica).
     * **Vista Matriz Multianual (Meses Ene–Dic × Años 2000–2026):** Heatmap histórico donde hacer clic en cualquier celda `(año, mes)` carga inmediatamente ese período en el visor y muestra la comparativa *Antes vs. Después* (ej. crisis de agosto–septiembre 2019 y 2024).

#### 1.3. Añadir Filtro y Capa de Anomalías Térmicas Estáticas (Quema de Gas / Industria)
* **Documentos de referencia:** `PRD.md` (`FR-005`, `US-05`), `DESIGN.md` (§3.1), `ACCEPTANCE_SCENARIOS.md` (`ESC-FIL-003`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/data.ts`
  * `frontend/lib/pyros/scene.ts`
  * `frontend/components/pyros/control-header.tsx`
  * `frontend/components/pyros/map-viewer.tsx`
  * `frontend/components/pyros/inspector.tsx`
* **Qué hacer:**
  1. Generar en `scene.ts` fuentes térmicas estáticas persistentes (ej. `STAT_SCZ_0042` — Planta de Gas / Mechero Industrial con persistencia $>365$ días en radio $\le 100\text{–}300\text{ m}$).
  2. Añadir en `control-header.tsx` un switch **`Máscara Anomalías Estáticas (Gas/Industria)`** (activo por defecto).
  3. Cuando el filtro esté activo, marcar dichas detecciones como `static_anomaly_masked` y excluirlas del cálculo de `events`, `calFrp` y `HFII`, permitiendo verlas en el mapa como marcadores industriales enmascarados al activar su capa.

#### 1.4. Desglose y Trazabilidad de Puntos Hijos en el Inspector de Clusters
* **Documentos de referencia:** `PRD.md` (`FR-026`, `US-07`), `ACCEPTANCE_SCENARIOS.md` (`ESC-ARM-001`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/scene.ts`
  * `frontend/components/pyros/inspector.tsx`
  * `frontend/components/pyros/map-viewer.tsx`
* **Qué hacer:**
  1. En `scene.ts`, incluir dentro de cada `FireEvent` el arreglo `memberDetections: Detection[]` y el régimen de detección (`CO_DETECTED` | `MODIS_ONLY` | `VIIRS_ONLY`).
  2. En `inspector.tsx`, cuando el usuario selecciona un polígono `ST-DBSCAN`, mostrar una sección desplegable/tabla **"Trazabilidad de Detecciones Originales"** listando cada foco hijo (`id`, `sensor`, `satellite`, `acq_time`, `scan × track`, `frp`, `confidence`).
  3. En `map-viewer.tsx`, al seleccionar un `FireEvent`, resaltar los centroides y huellas originales de MODIS y VIIRS que quedaron dentro de ese `ST_ConvexHull`.

#### 1.5. Completar el Catálogo de Municipios, Ecorregiones y Áreas Protegidas
* **Documentos de referencia:** `PRD.md` (`FR-024`, `US-01`, `US-03`, `US-08`), `DESIGN.md` (§5.4), `ACCEPTANCE_SCENARIOS.md` (`ESC-MAP-003`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/data.ts`
* **Qué hacer:**
  * Ampliar `REGIONS` en `data.ts` categorizándolas por tipo (`Ecorregión`, `Municipio`, `Área Protegida SNAP`):
    1. `chiquitania`: **Chiquitanía - General** (Ecorregión)
    2. `san-ignacio`: **San Ignacio de Velasco** (Municipio)
    3. `concepcion`: **Concepción** (`lat: -16.1303, lon: -62.0294`, Municipio — requerido por `US-08` y `ESC-MAP-003`)
    4. `robore`: **Roboré** (Municipio)
    5. `san-matias`: **San Matías** (Municipio)
    6. `charagua`: **Charagua Iyambae** (Municipio)
    7. `noel-kempff`: **PN Noel Kempff Mercado** (`lat: -14.583, lon: -60.833`, Área Protegida — requerido por `US-03`)
    8. `otuquis-pantanal`: **PN Otuquis / Pantanal Boliviano** (`lat: -19.55, lon: -58.15`, Área Protegida)

---

### FASE 2: Alineación Científica, Modo NRT y Exportación Estandarizada (P1)

#### 2.1. Modo de Monitoreo en Tiempo Casi Real (NRT: 24h / 48h / 7d)
* **Documentos de referencia:** `PRD.md` (`FR-003`, `FR-025`, `US-02`), `ACCEPTANCE_SCENARIOS.md` (`ESC-ING-004`).
* **Archivos a modificar:**
  * `frontend/components/pyros/control-header.tsx`
  * `frontend/components/pyros/dashboard.tsx`
* **Qué hacer:**
  * Añadir un selector rápido **Modo Operativo NRT** (`Histórico 2000–2026` | `NRT 24h` | `NRT 48h` | `NRT 7d`) que posicione automáticamente la vista en los pases orbitales más recientes, mostrando latencia NRT (`1–3 h post-adquisición LANCE`) y priorización táctica de frentes activos para brigadas.

#### 2.2. Armonización de la Fórmula HFII y Certificación Estadística del "Efecto 2012"
* **Documentos de referencia:** `PRD.md` (§5.3, `KPI-02`), `DESIGN.md` (§3.4), `ACCEPTANCE_SCENARIOS.md` (`ESC-API-004`, `ESC-CAL-001..004`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/data.ts`
  * `frontend/lib/pyros/scene.ts`
  * `frontend/components/pyros/kpi-panel.tsx`
  * `frontend/components/pyros/analytics-panel.tsx`
* **Qué hacer:**
  1. Incorporar en el cálculo de energía de cada evento en `scene.ts` la corrección por área fuera del nadir $\psi(\text{scan}, \text{track}) = (A_{\text{nadir}} / A_i)^\kappa$ y el factor de ponderación solar día/noche ($\gamma_{\text{solar}}$), manteniendo la compatibilidad retroactiva pre-2012 ($\text{HFII} = \sum \text{FRP}_{\text{MODIS}}$ cuando $N_{\text{VIIRS}} = 0$).
  2. Mostrar en `analytics-panel.tsx` (bajo la gráfica del "Efecto 2012") las métricas de validación estadística exigidas por `ESC-API-004`:
     * **Test de Chow (Crudo):** $p < 0.001$ (*Quiebre instrumental detectado en 2012*).
     * **Test de Chow (Armonizado):** $p = 0.482 > 0.05$ (*Continuidad temporal homogénea certificada*).

#### 2.3. Estandarizar los Exportadores (GeoJSON, CSV y Reporte JSON de Auditoría)
* **Documentos de referencia:** `API_CONTRACTS.md` (§2.5), `ACCEPTANCE_SCENARIOS.md` (`ESC-EXP-001`, `ESC-EXP-002`, `ESC-EXP-003`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/exporters.ts`
  * `frontend/components/pyros/control-header.tsx`
* **Qué hacer:**
  1. **GeoJSON (`ESC-EXP-001`):** Asegurar que las propiedades de cada `Feature` en modo armonizado incluyan exactamente: `event_id`, `acq_date`, `hfii_mw`, `raw_modis_count`, `raw_viirs_count`, `detection_regime` (`CO_DETECTED` | `MODIS_ONLY` | `VIIRS_ONLY`) y `area_ha`.
  2. **CSV (`ESC-EXP-002`):** Ajustar las columnas exportadas al contrato exacto:
     ```csv
     acq_date,municipio,raw_modis_foci,raw_viirs_foci,harmonized_events_count,raw_total_frp,calibrated_hfii_mw,severity_index
     ```
  3. **Reporte de Auditoría Científica JSON (`ESC-EXP-003`):** Añadir una cuarta opción en el menú `Exportar` para descargar el certificado JSON de calibración (`algorithm_version`, `total_raw_modis`, `total_raw_viirs`, `total_harmonized_events`, `spatial_compression_rate`, `co_detection_rate`, `chow_test_p_value_raw`, `chow_test_p_value_harmonized`).

---

### FASE 3: Arquitectura Cliente API, Multiresolución H3 y Pulido (P1 / P2)

#### 3.1. Cliente API REST con Resiliencia y Fallback Local (`NFR-006`)
* **Documentos de referencia:** `API_CONTRACTS.md` (23 endpoints), `PRD.md` (`FR-023`, `NFR-006`), `CONTEXT_INDEX.md` (§3).
* **Archivos a crear/modificar:**
  * `frontend/lib/pyros/api.ts` (nuevo)
  * `frontend/components/pyros/control-header.tsx`
* **Qué hacer:**
  * Crear el cliente HTTP tipado apuntando a `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'` para los endpoints principales (`/health`, `/hotspots/modis`, `/hotspots/viirs`, `/harmonized/events`, `/harmonized/h3`, `/calendar/heatmap`, `/calendar/timeline`, `/calendar/anomalies`, `/regions`).
  * Implementar fallback automático al motor determinista local cuando el backend no esté levantado, mostrando un indicador de estado no bloqueante (`Modo Demo Local / Caché Offline` vs. `API Conectada`) conforme a `NFR-006`.

#### 3.2. Multiresolución H3 (Res 7 y Res 8) y Tooltip Flotante en el Mapa
* **Documentos de referencia:** `PRD.md` (`FR-012`, `FR-013`, `US-06`), `DESIGN.md` (§4.2), `ACCEPTANCE_SCENARIOS.md` (`ESC-MAP-002`).
* **Archivos a modificar:**
  * `frontend/lib/pyros/scene.ts`
  * `frontend/components/pyros/map-viewer.tsx`
* **Qué hacer:**
  * Soportar conmutación entre **H3 Resolución 7** ($\approx 5.16\text{ km}^2$, vista regional/zoom bajo) y **H3 Resolución 8** ($\approx 0.737\text{ km}^2$, vista local/zoom alto).
  * Añadir tooltip flotante instantáneo al pasar el cursor (`onMouseEnter`/`onPointerMove`) sobre cualquier celda hexagonal o polígono, mostrando `h3_index`, `HFII (MW)`, desglose `MODIS / VIIRS` y área, resaltando el borde en color cian (`#00e5ff`) según `ESC-MAP-002`.

#### 3.3. Internacionalización (ES / EN), Paleta Accesible y Contexto RBAC
* **Documentos de referencia:** `PRD.md` (`NFR-009`, `NFR-010`, `NFR-011`), `RBAC_IMPLEMENTATION_PLAN.md` (§2, §3).
* **Qué hacer:**
  * Añadir selector de idioma **ES / EN** en el header (`NFR-011`).
  * Añadir selector de paleta perceptual apta para daltónicos (`Viridis / Inferno` vs. `Ámbar / Carmesí`) (`NFR-010`).
  * Añadir selector/indicador de perfil de usuario (**RBAC**: `Public`, `Operator / Bombero`, `Analyst / Investigador`, `Admin`) que adapte las acciones de ingesta/exportación según la matriz de permisos de `RBAC_IMPLEMENTATION_PLAN.md`.

#### 3.4. Higiene del Repositorio y Configuración
* **Qué hacer:**
  1. Eliminar el directorio `.git` anidado dentro de `frontend/.git` para que todo el código de `frontend/` quede versionado directamente en el repositorio raíz `C:\PyrosHarmonizers1\.git`.
  2. Cambiar `"name": "my-project"` a `"name": "pyrosharmonizer-frontend"` en `frontend/package.json`.
  3. Actualizar la sección de estructura de carpetas en `README.md` para reflejar fielmente la organización del proyecto.

---

## 4. Resumen de Priorización Sugerida

1. **Sprint Inmediato (P0 — Impacto directo en evaluación y escenarios BDD):**
   * Modo **Split-Screen** en el mapa (`ESC-MAP-001`).
   * **Matriz Multianual + Anomalías $Z\text{-score}$** en el Calendario de Quemas (`ESC-CQ-001..004`).
   * **Filtro de Anomalías Térmicas Estáticas** (mecheros de gas/industria) (`ESC-FIL-003`).
   * **Trazabilidad de puntos hijos** en el Inspector de Clusters (`US-07`).
   * Nuevas regiones (**Concepción**, **PN Noel Kempff Mercado**, **PN Otuquis**) (`ESC-MAP-003`).
2. **Sprint Técnico (P1 — Rigor científico e interoperabilidad):**
   * Modo **NRT (24h/48h/7d)** (`FR-025`).
   * Fórmula completa **HFII** ($\psi$ área + $\gamma_{\text{solar}}$) y **Test de Chow ($p\text{-value}$)** (`ESC-API-004`).
   * Estandarización de **columnas CSV, propiedades GeoJSON y Reporte JSON de Auditoría** (`ESC-EXP-001..003`).
   * **Cliente API REST** con fallback local (`NFR-006`) y limpieza de `frontend/.git`.
3. **Sprint de Pulido (P2 — Diferenciadores extra):**
   * Multiresolución **H3 Res 7 / Res 8** + tooltip flotante en hover (`ESC-MAP-002`).
   * Selector **ES / EN**, paleta daltónicos (`Viridis`) y simulador de rol **RBAC**.

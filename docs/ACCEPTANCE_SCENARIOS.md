# 🛰️ PyrosHarmonizer — Especificación de Escenarios de Aceptación BDD
## Unified Fire Regimes & Burning Activity Calendar

---

### 📋 Metadatos del Documento y Contexto del Proyecto

- **Evento:** 2026 NASA International Space Apps Challenge — Sede Santa Cruz de la Sierra (Universidad Católica Boliviana "San Pablo" - UCB), 14-15 Noviembre 2026.
- **Reto Oficial:** Challenge #8 — *Harmonization of MODIS and VIIRS Hot Spots* (Nivel Intermedio/Avanzado — 606 equipos globales en competencia).
- **Solución Propuesta:** **PyrosHarmonizer** — Sistema geoespacial de armonización espacio-temporal, calibración radiativa (HFII) y generación del Calendario Unificado de Actividad de Quemas.
- **Caso de Estudio Crítico:** *"El Efecto 2012 en la Chiquitanía"* (Santa Cruz, Bolivia: municipios de San Ignacio de Velasco, Roboré, Concepción, San Matías, Charagua).
- **Problema Científico:** Discrepancia dimensional y radiométrica entre **MODIS** (resolución de 1 km, en servicio desde 1999/2002) y **VIIRS** (resolución de 375 m en bandas I / 750 m en bandas M, operativo desde finales de 2011/2012). VIIRS reporta entre 3× y 5× más detecciones para un mismo incendio y una suma no lineal de Fire Radiative Power (FRP), causando una ruptura artificial en las series temporales históricas a partir de 2012.
- **Stack Tecnológico:**
  - **Base de Datos & Motor Espacial:** PostgreSQL 16 + PostGIS 3.4 (funciones `ST_ClusterDBSCAN`, `ST_DWithin`, `ST_ConvexHull`, `ST_Centroid`, `ST_Area`).
  - **Backend & Procesamiento:** Python 3.12, FastAPI, GeoPandas, Shapely, Scikit-Learn, H3-Py (Uber H3 Hexagonal Hierarchical Spatial Index).
  - **Frontend & Visualización:** React 18 / Next.js 14, Tailwind CSS, Mapbox GL JS, Deck.gl, Recharts, Plotly.js.
  - **Fuentes de Datos:** NASA LANCE / FIRMS (MODIS Collection 6.1 Terra/Aqua, VIIRS 375m Suomi-NPP, NOAA-20, NOAA-21) vía CSV por lotes y API REST NRT.
- **Equipo de Desarrollo (4-6 Integrantes):**
  - Lead Backend & Data Engineer
  - Lead Frontend & UX/UI Designer
  - Geospatial Analyst & Data Scientist
  - DevOps & Cloud Integration Lead

---

## 📑 Índice de Escenarios BDD

1. [Módulo 1: Ingesta de Datos Satelitales (5 Escenarios)](#1-módulo-de-ingesta-de-datos-satelitales-firms)
2. [Módulo 2: Filtrado de Calidad y Detección de Anomalías (4 Escenarios)](#2-módulo-de-filtrado-de-calidad-y-detección-de-anomalías)
3. [Módulo 3: Armonización Espacio-Temporal ST-DBSCAN y Fusión Poligonal (6 Escenarios)](#3-módulo-de-armonización-espacio-temporal-st-dbscan)
4. [Módulo 4: Calibración Energética FRP → HFII (4 Escenarios)](#4-módulo-de-calibración-energética-frp--hfii)
5. [Módulo 5: Grilla Hexagonal Uber H3 (3 Escenarios)](#5-módulo-de-indexación-hexagonal-uber-h3)
6. [Módulo 6: Calendario de Actividad de Quemas (Fire Calendar) (4 Escenarios)](#6-módulo-de-calendario-de-actividad-de-quemas-fire-calendar)
7. [Módulo 7: Exportación de Datos e Interoperabilidad (3 Escenarios)](#7-módulo-de-exportación-de-datos-e-interoperabilidad)
8. [Módulo 8: Mapa Interactivo y Experiencia de Usuario (3 Escenarios)](#8-módulo-de-mapa-interactivo-y-visualización)
9. [Módulo 9: API REST (FastAPI) y Microservicios (4 Escenarios)](#9-módulo-de-api-rest-fastapi-y-servicios-analíticos)
10. [Matriz de Trazabilidad y Cobertura de Aceptación](#10-matriz-de-trazabilidad-y-criterios-de-éxito-del-hackathon)

---

## 1. Módulo de Ingesta de Datos Satelitales (FIRMS)

Este módulo gestiona la carga de archivos históricos y en tiempo real (NRT) provenientes de NASA FIRMS, garantizando el parseo estricto, la normalización de tipos y la inserción transaccional en PostgreSQL/PostGIS.

```
Esquema de Columnas FIRMS CSV Estándar:
latitude, longitude, brightness/bright_ti4, bright_ti5, scan, track, acq_date, acq_time, satellite, instrument, confidence, frp, daynight, version
```

---

### ESC-ING-001: Ingesta Masiva de Archivo CSV MODIS C6.1 para Bolivia (50,000 registros)
- **ID:** `ESC-ING-001`
- **Etiquetas:** `@ingestion @modis @postgis @p0`
- **Título:** Ingesta masiva y generación de geometría espacial de registros MODIS C6.1 en tabla `raw_modis_hotspots`.
- **Dado** que se dispone del archivo oficial NASA FIRMS `MODIS_C6_1_Bolivia_2023.csv` con exactamente 50,000 registros correspondientes a detecciones de los satélites Terra y Aqua sobre territorio boliviano,
- **Y** que la tabla `raw_modis_hotspots` en PostgreSQL 16 está configurada con la columna geográfica `geom GEOMETRY(Point, 4326)`,
- **Cuando** el Lead Data Engineer ejecuta el pipeline de ingesta batch mediante el comando:
  ```bash
  python -m app.cli.ingest --source modis --file data/MODIS_C6_1_Bolivia_2023.csv --batch-size 5000
  ```
- **Entonces** el pipeline inserta 50,000 registros en la tabla `raw_modis_hotspots` en un tiempo inferior a 45 segundos,
- **Y** cada registro posee un punto geométrico calculado a partir de `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`,
- **Y** el log de auditoría en `ingestion_logs` registra el estado `COMPLETED` con 50,000 filas procesadas y 0 errores.
- **Datos Esperados Específicos:**
  - Registro de muestra procesado:
    ```json
    {
      "latitude": -16.3214,
      "longitude": -60.9821,
      "brightness": 328.4,
      "scan": 1.2,
      "track": 1.1,
      "acq_date": "2023-08-15",
      "acq_time": "1430",
      "satellite": "Aqua",
      "instrument": "MODIS",
      "confidence": 85,
      "version": "6.1NRT",
      "bright_t31": 298.1,
      "frp": 42.6,
      "daynight": "D",
      "geom_wkt": "SRID=4326;POINT(-60.9821 -16.3214)"
    }
    ```
- **Criterio de Validación Técnica:**
  Ejecutar en PostgreSQL:
  ```sql
  SELECT count(*) AS total_validos,
         count(*) FILTER (WHERE geom IS NULL OR ST_SRID(geom) != 4326) AS errores_geom
  FROM raw_modis_hotspots 
  WHERE ingestion_batch_id = 'MODIS_BOL_2023_001';
  ```
  *Resultado Requerido:* `total_validos = 50000`, `errores_geom = 0`.

---

### ESC-ING-002: Ingesta y Mapeo Especializado de Registros VIIRS 375m (Suomi-NPP / NOAA-20 / NOAA-21)
- **ID:** `ESC-ING-002`
- **Etiquetas:** `@ingestion @viirs @schema_mapping @p0`
- **Título:** Normalización de canales infrarrojos `bright_ti4`, `bright_ti5` y categorización de confianza en VIIRS 375m.
- **Dado** un lote de datos CSV de VIIRS 375m (`VNP14IMGTDL_NRT_Bolivia.csv`) emitido por Suomi-NPP que contiene columnas de temperatura de brillo de alta resolución (`bright_ti4` canal térmico 3.75 µm y `bright_ti5` canal térmico 11.45 µm),
- **Cuando** el microservicio de ingesta procesa el archivo hacia la tabla `raw_viirs_hotspots`,
- **Entonces** las temperaturas `bright_ti4` y `bright_ti5` se registran en grados Kelvin como tipo `NUMERIC(6,2)`,
- **Y** el campo `confidence` alfanumérico (`"l"`, `"n"`, `"h"`) se mapea a la escala canónica estandarizada:
  - `"l"` → `"low"`
  - `"n"` → `"nominal"`
  - `"h"` → `"high"`
- **Y** el satélite se identifica inequívocamente como `"N"` (Suomi-NPP), `"J1"` (NOAA-20 / JPSS-1) o `"J2"` (NOAA-21 / JPSS-2).
- **Datos Esperados Específicos:**
  - Mapeo de entrada:
    `latitude: -17.4521, longitude: -61.2319, bright_ti4: 367.0, bright_ti5: 301.2, confidence: "n", satellite: "N"`
  - Mapeo en tabla destino `raw_viirs_hotspots`:
    ```json
    {
      "bright_ti4": 367.00,
      "bright_ti5": 301.20,
      "confidence_level": "nominal",
      "satellite_name": "Suomi-NPP",
      "resolution_meters": 375
    }
    ```
- **Criterio de Validación Técnica:**
  ```sql
  SELECT DISTINCT confidence_level FROM raw_viirs_hotspots;
  ```
  *Resultado Requerido:* Conjunto exacto conteniendo únicamente `{'low', 'nominal', 'high'}`, sin valores nulos ni abreviaciones crudas (`'l'`, `'n'`, `'h'`).

---

### ESC-ING-003: Rechazo Seguro de CSV Corrupto o con Columnas Faltantes
- **ID:** `ESC-ING-003`
- **Etiquetas:** `@ingestion @error_handling @resilience @p1`
- **Título:** Detección de inconsistencia estructural en archivo CSV y registro en `ingestion_logs`.
- **Dado** un archivo subido `FIRMS_corrupted_sample.csv` al cual le faltan las columnas obligatorias `scan`, `track` y `frp`,
- **Cuando** el worker de ingesta intenta validar el encabezado contra el esquema Pydantic `FIRMSInputSchema`,
- **Entonces** la transacción de base de datos se aborta de forma atómica (`ROLLBACK`),
- **Y** no se inserta ninguna fila parcial en las tablas raw,
- **Y** se genera un registro en `ingestion_logs` con `status = 'FAILED'`, `error_code = 'SCHEMA_VALIDATION_ERROR'` y detalle:
  `"Columnas requeridas faltantes: ['scan', 'track', 'frp']"`.
- **Datos Esperados Específicos:**
  - Código HTTP retornado al frontend/operador: `422 Unprocessable Entity`.
  - Objeto de respuesta JSON:
    ```json
    {
      "success": false,
      "error": "SCHEMA_VALIDATION_ERROR",
      "message": "Estructura CSV no compatible con NASA FIRMS C6.1 / VIIRS 375m",
      "missing_fields": ["scan", "track", "frp"],
      "file_name": "FIRMS_corrupted_sample.csv"
    }
    ```
- **Criterio de Validación Técnica:**
  ```sql
  SELECT status, error_details 
  FROM ingestion_logs 
  WHERE file_name = 'FIRMS_corrupted_sample.csv'
  ORDER BY created_at DESC LIMIT 1;
  ```
  *Resultado Requerido:* `status = 'FAILED'` y `error_details` contiene la lista de campos faltantes.

---

### ESC-ING-004: Ingesta NRT Automatizada vía NASA FIRMS REST API (Santa Cruz 24h)
- **ID:** `ESC-ING-004`
- **Etiquetas:** `@ingestion @firms_api @nrt @realtime @p1`
- **Título:** Consulta a API REST de NASA FIRMS con clave MAP_KEY para el Bounding Box de Santa Cruz.
- **Dado** que se cuenta con una clave válida de API de NASA FIRMS configurada en la variable de entorno `NASA_FIRMS_MAP_KEY`,
- **Y** el Bounding Box del departamento de Santa Cruz, Bolivia: `west=-64.5, south=-20.5, east=-57.5, north=-13.5`,
- **Cuando** el cron job del backend ejecuta el endpoint de sincronización NRT cada 6 horas:
  ```bash
  curl -X POST "http://localhost:8000/api/v1/sync/firms-nrt?source=VIIRS_NOAA20_NRT&days=1"
  ```
- **Entonces** el sistema consume la URL de FIRMS `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/-64.5,-20.5,-57.5,-13.5/1`,
- **Y** procesa la respuesta en memoria mediante streaming para evitar saturación de RAM,
- **Y** actualiza la capa activa de focos de las últimas 24 horas con latencia de procesamiento < 3.5 segundos para 1,500 puntos.
- **Datos Esperados Específicos:**
  - Registros recibidos: entre 500 y 3,000 detecciones activas NRT.
  - Atributos obligatorios validados: `acq_date = CURRENT_DATE` o `CURRENT_DATE - INTERVAL '1 day'`, `confidence IN ('nominal', 'high')`.
- **Criterio de Validación Técnica:**
  Verificar que la fecha de adquisición más reciente en `raw_viirs_hotspots` coincida con la fecha UTC actual de captura satelital:
  ```sql
  SELECT max(acq_date) AS fecha_maxima 
  FROM raw_viirs_hotspots 
  WHERE ingestion_source = 'FIRMS_API_NRT';
  ```
  *Resultado Requerido:* `fecha_maxima >= CURRENT_DATE - 1`.

---

### ESC-ING-005: Control de Idempotencia y Prevención de Duplicados en Re-ingesta
- **ID:** `ESC-ING-005`
- **Etiquetas:** `@ingestion @idempotency @integrity @p1`
- **Título:** Detección de archivos duplicados por huella criptográfica SHA-256 y nombre de archivo.
- **Dado** que el archivo `MODIS_SantaCruz_Agosto2024.csv` ya fue ingestada previamente y cuenta con registro `SUCCESS` en `ingestion_logs` con hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
- **Cuando** un usuario o pipeline intenta reenviar o cargar exactamente el mismo archivo,
- **Entonces** el sistema calcula el hash SHA-256 en tiempo de precarga,
- **Y** determina que el archivo ya existe en la base de datos sin alterar los registros existentes,
- **Y** responde con código HTTP `200 OK` y mensaje indicando que el procesamiento fue omitido por duplicidad (`status = 'SKIPPED_DUPLICATE'`).
- **Datos Esperados Específicos:**
  ```json
  {
    "status": "SKIPPED_DUPLICATE",
    "file_name": "MODIS_SantaCruz_Agosto2024.csv",
    "original_ingestion_date": "2026-11-14T10:15:30Z",
    "rows_affected": 0
  }
  ```
- **Criterio de Validación Técnica:**
  El número total de filas en `raw_modis_hotspots` antes y después de la segunda llamada debe ser exactamente idéntico:
  ```sql
  -- Pre-ejecución: 12,430 filas
  -- Re-ejecución...
  SELECT count(*) FROM raw_modis_hotspots WHERE batch_file = 'MODIS_SantaCruz_Agosto2024.csv';
  -- Post-ejecución: exactamente 12,430 filas.
  ```

---

## 2. Módulo de Filtrado de Calidad y Detección de Anomalías

Este módulo depura el ruido térmico, descarta falsos positivos por baja emisividad y aísla fuentes térmicas industriales o geológicas continuas para no alterar el régimen natural de incendios forestales.

---

### ESC-FIL-001: Exclusión de Detecciones MODIS de Baja Confianza (< 30%)
- **ID:** `ESC-FIL-001`
- **Etiquetas:** `@quality @modis @confidence_filter @p0`
- **Título:** Filtrado de registros MODIS con confianza inferior al umbral mínimo del 30%.
- **Dado** un conjunto de 1,000 registros crudos de MODIS importados en `raw_modis_hotspots`, donde 15 registros poseen un valor de `confidence < 30` (típicamente causados por reflejos solares en cuerpos de agua o nubes cirro reflectantes),
- **Cuando** se ejecuta la etapa de pre-procesamiento del pipeline de armonización:
  ```python
  cleaned_df = quality_filter.filter_modis_confidence(raw_df, min_confidence=30)
  ```
- **Entonces** se descartan exactamente los 15 registros de baja confianza para las fases posteriores de clustering,
- **Y** los 985 registros restantes (con `confidence >= 30`) avanzan a la tabla de trabajo temporal `stg_filtered_hotspots`,
- **Y** cada registro excluido queda registrado con `exclusion_reason = 'MODIS_CONFIDENCE_BELOW_30'`.
- **Datos Esperados Específicos:**
  - Total inicial: 1,000.
  - Excluidos: 15.
  - Válidos para clustering: 985.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT count(*) FROM stg_filtered_hotspots 
  WHERE instrument = 'MODIS' AND confidence < 30;
  ```
  *Resultado Requerido:* Retorna exactamente `0`.

---

### ESC-FIL-002: Exclusión de Registros VIIRS con Confianza "low" Preservando Auditoría
- **ID:** `ESC-FIL-002`
- **Etiquetas:** `@quality @viirs @audit_trail @p1`
- **Título:** Segregación de puntos VIIRS con nivel `"low"` sin eliminarlos de la capa raw para auditoría científica.
- **Dado** una tabla `raw_viirs_hotspots` con 5,000 detecciones que incluyen 350 registros con `confidence_level = 'low'`, 3,200 con `'nominal'` y 1,450 con `'high'`,
- **Cuando** se ejecuta el filtro de admisión a la armonización espacial,
- **Entonces** los 350 registros con nivel `'low'` son marcados con `is_harmonizable = FALSE` en la base de datos,
- **Y** se conservan intactos en la tabla física `raw_viirs_hotspots` para reproducibilidad y verificación de falsos negativos,
- **Y** únicamente los 4,650 registros con confianza `'nominal'` o `'high'` pasan al clusterizador ST-DBSCAN.
- **Datos Esperados Específicos:**
  - Registros clasificados como elegibles: 4,650.
  - Registros preservados pero no elegibles: 350.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT count(*) FROM raw_viirs_hotspots WHERE is_harmonizable = TRUE AND confidence_level = 'low';
  ```
  *Resultado Requerido:* `0`.
  ```sql
  SELECT count(*) FROM raw_viirs_hotspots WHERE confidence_level = 'low';
  ```
  *Resultado Requerido:* `350`.

---

### ESC-FIL-003: Detección y Marcado de Anomalías Térmicas Estáticas (Gas Flaring / Quema Industrial)
- **ID:** `ESC-FIL-003`
- **Etiquetas:** `@quality @static_anomaly @gas_flaring @chiquitania @p0`
- **Título:** Identificación de fuentes térmicas estáticas repetitivas (> 365 días en radio de 100m).
- **Dado** un punto caliente ubicado en las coordenadas de la planta de gas de Río Grande en Santa Cruz (`lat: -18.0452, lng: -63.1254`) que ha generado detecciones térmicas consistentes durante más de 365 días en un radio de ±100 metros a lo largo de un período multianual,
- **Cuando** se ejecuta el algoritmo de detección de anomalías estáticas `detect_static_thermal_sources()` con parámetros:
  - `radius_meters = 100`
  - `min_persistence_days = 365`
  - `min_detections = 50`
- **Entonces** el sistema clasifica las coordenadas como una fuente térmica persistente no forestal,
- **Y** le asigna el flag `is_static_anomaly = TRUE` y `anomaly_type = 'GAS_FLARING_OR_INDUSTRIAL'`,
- **Y** excluye todas sus ocurrencias del cómputo del Calendario de Quemas de vegetación silvestre.
- **Datos Esperados Específicos:**
  - Registro de anomalía en tabla `static_thermal_anomalies`:
    ```json
    {
      "anomaly_id": "STAT_SCZ_0042",
      "center_geom": "POINT(-63.1254 -18.0452)",
      "total_active_days": 412,
      "span_days": 730,
      "classification": "INDUSTRIAL_FLARING",
      "is_active_filter": true
    }
    ```
- **Criterio de Validación Técnica:**
  Verificar que ningún evento clasificado como anomalía estática figure en la tabla consolidada `harmonized_fire_events`:
  ```sql
  SELECT count(*) 
  FROM harmonized_fire_events h
  JOIN static_thermal_anomalies s
    ON ST_DWithin(h.geom::geography, s.center_geom::geography, 100);
  ```
  *Resultado Requerido:* `0`.

---

### ESC-FIL-004: Tratamiento de Registros con FRP Cero o Nulo
- **ID:** `ESC-FIL-004`
- **Etiquetas:** `@quality @frp_null @edge_cases @p1`
- **Título:** Manejo de observaciones con `frp = 0` o `NULL` preservando conteo espacial sin corromper el HFII.
- **Dado** una muestra de 20 registros satelitales donde 3 focos presentan `frp IS NULL` y 2 focos presentan `frp = 0.0` debido a problemas momentáneos de saturación del detector o fallas en el algoritmo de inversión radiativa,
- **Cuando** se calcula el índice armonizado HFII durante la agregación,
- **Entonces** dichos 5 registros son excluidos estrictamente de la media ponderada y suma de energía radiativa (`HFII`),
- **Y** se mantienen en la base como detecciones físicas válidas contabilizadas en la métrica `total_raw_points_count`,
- **Y** se genera un warning en el reporte de calidad: `"FRP_UNAVAILABLE_IN_5_POINTS"`.
- **Datos Esperados Específicos:**
  - Muestra: 20 puntos totales.
  - Puntos con FRP válido: 15 (Suma de FRP = 450.0 MW).
  - Promedio de FRP calculado: `450.0 / 15 = 30.0 MW` (no `450.0 / 20 = 22.5 MW`).
  - Atributo en evento armonizado: `frp_imputation_flag = TRUE`.
- **Criterio de Validación Técnica:**
  Comprobar que no existen valores NaN o nulos propagados en el campo `hfii_mw` del evento armonizado:
  ```sql
  SELECT count(*) FROM harmonized_fire_events 
  WHERE hfii_mw IS NULL OR isnan(hfii_mw);
  ```
  *Resultado Requerido:* `0`.

---

## 3. Módulo de Armonización Espacio-Temporal (ST-DBSCAN)

El núcleo algorítmico de PyrosHarmonizer unifica las observaciones heterogéneas de MODIS y VIIRS mediante ST-DBSCAN (Spatio-Temporal Density-Based Spatial Clustering of Applications with Noise), generando polígonos convexos envolventes que representan el incendio real unificado.

---

### ESC-ARM-001: Agrupamiento Multi-Sensor Dentro de Radio de 500m y Ventana Δt < 3h
- **ID:** `ESC-ARM-001`
- **Etiquetas:** `@harmonization @st_dbscan @clustering @core @p0`
- **Título:** Fusión exitosa de 5 puntos VIIRS 375m y 1 punto MODIS 1km pertenecientes al mismo frente de fuego.
- **Dado** 1 punto de calor MODIS registrado en la Chiquitanía (San Ignacio) a las `14:15 UTC` con coordenadas `(-16.3500, -61.1200)`,
- **Y** 5 puntos de calor VIIRS 375m registrados a las `15:45 UTC` (diferencia temporal $\Delta t = 1.5$ horas) situados a distancias de 120m, 210m, 340m, 420m y 480m respecto al centroide de MODIS,
- **Cuando** se ejecuta el algoritmo ST-DBSCAN con hiperparámetros:
  - $\varepsilon_{\text{spatial}} = 750\text{ metros}$
  - $\Delta t_{\text{temporal}} = 3.0\text{ horas}$
  - $\text{min\_samples} = 1$
- **Entonces** los 6 puntos (1 MODIS + 5 VIIRS) son asignados exactamente al mismo identificador de cluster: `cluster_id = 'CL_20260815_SCZ_0089'`,
- **Y** se genera un único evento unificado en `harmonized_fire_events` que referencia los 6 puntos hijos.
- **Datos Esperados Específicos:**
  - Cluster generado:
    ```json
    {
      "cluster_id": "CL_20260815_SCZ_0089",
      "modis_points_count": 1,
      "viirs_points_count": 5,
      "total_raw_detections": 6,
      "time_span_minutes": 90,
      "spatial_dispersion_meters": 480
    }
    ```
- **Criterio de Validación Técnica:**
  ```sql
  SELECT count(DISTINCT cluster_id) AS total_clusters,
         count(*) AS total_puntos
  FROM stg_clustered_hotspots
  WHERE raw_point_id IN ('MOD_01', 'VII_01', 'VII_02', 'VII_03', 'VII_04', 'VII_05');
  ```
  *Resultado Requerido:* `total_clusters = 1` y `total_puntos = 6`.

---

### ESC-ARM-002: Segregación Espacial Estricta para Puntos Fuera del Radio Máximo (1,200m)
- **ID:** `ESC-ARM-002`
- **Etiquetas:** `@harmonization @spatial_separation @st_dbscan @p0`
- **Título:** No agrupamiento de puntos VIIRS a 1,200m de distancia de un punto MODIS contemporáneo.
- **Dado** 1 punto MODIS en `(-16.5000, -61.0000)` registrado a las `14:00 UTC`,
- **Y** 2 puntos VIIRS en `(-16.5108, -61.0000)` (distancia geodésica calculada: 1,200 metros) registrados a las `14:20 UTC` ($\Delta t = 20\text{ min}$),
- **Cuando** se ejecuta ST-DBSCAN con radio espacial $\varepsilon = 800\text{ m}$,
- **Entonces** el algoritmo separa los puntos espaciales en 2 clusters independientes,
- **Y** el punto MODIS forma el `cluster_A`, mientras que los 2 puntos VIIRS forman el `cluster_B`,
- **Y** no existe contaminación ni fusión forzada de focos distantes.
- **Datos Esperados Específicos:**
  - Distancia calculada por PostGIS: `ST_Distance(geom_modis::geography, geom_viirs::geography) = 1200.4 metros`.
  - Umbral de clustering: `800 metros`.
  - Resultado: `cluster_id_modis != cluster_id_viirs`.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT cluster_id, array_agg(instrument) AS instrumentos
  FROM stg_clustered_hotspots
  WHERE raw_point_id IN ('MOD_FAR_01', 'VII_FAR_01', 'VII_FAR_02')
  GROUP BY cluster_id;
  ```
  *Resultado Requerido:* 2 filas distintas: una con `{'MODIS'}` y otra con `{'VIIRS', 'VIIRS'}`.

---

### ESC-ARM-003: Segregación Temporal Estricta para Focos Co-localizados pero Desfasados (Δt = 5h)
- **ID:** `ESC-ARM-003`
- **Etiquetas:** `@harmonization @temporal_separation @st_dbscan @p0`
- **Título:** No agrupamiento de detecciones en la misma coordenada con diferencia temporal superior a la ventana máxima.
- **Dado** 1 punto MODIS matutino capturado por Terra a las `10:30 UTC` en `(-17.2000, -60.8000)`,
- **Y** 2 puntos VIIRS vespertinos capturados por NOAA-20 a las `15:30 UTC` exactamente en la misma ubicación (diferencia temporal $\Delta t = 5.0\text{ horas}$),
- **Cuando** se procesa la ventana temporal máxima de coalescencia configurada en 3.5 horas,
- **Entonces** el sistema determina que el paso satelital corresponde a un ciclo de reactivación térmica o avance de frente independiente,
- **Y** genera 2 eventos temporales distintos con diferente timestamp canónico:
  - Evento 1: `start_time = 10:30 UTC`
  - Evento 2: `start_time = 15:30 UTC`.
- **Datos Esperados Específicos:**
  - $\Delta t = 300\text{ minutos} > 210\text{ minutos}$ (umbral de 3.5h).
  - Número de clusters generados: 2.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT count(DISTINCT cluster_id) 
  FROM stg_clustered_hotspots 
  WHERE raw_point_id IN ('MOD_MORNING', 'VII_AFTERNOON');
  ```
  *Resultado Requerido:* Retorna exactamente `2`.

---

### ESC-ARM-004: Fusión Poligonal con ConvexHull para Clusters Multi-Sensor
- **ID:** `ESC-ARM-004`
- **Etiquetas:** `@harmonization @convexhull @geometry @postgis @p0`
- **Título:** Creación de polígono envolvente convexo unificado con área y perímetro calculados en proyección métrica.
- **Dado** un cluster validado que contiene 7 puntos calientes (2 MODIS y 5 VIIRS) distribuidos espacialmente en un radio de 600m en el municipio de Roboré,
- **Cuando** el pipeline ejecuta la etapa de fusión geométrica:
  ```sql
  ST_ConvexHull(ST_Collect(geom)) AS unified_footprint
  ```
- **Entonces** se genera una geometría de tipo `POLYGON` en EPSG:4326 que encierra la totalidad de los 7 puntos,
- **Y** se calcula el área en hectáreas proyectando a EPSG:32720 (UTM Zona 20S - Bolivia):
  ```sql
  ST_Area(ST_Transform(unified_footprint, 32720)) / 10000.0 AS burned_area_ha
  ```
- **Y** el campo `geom_type` en la tabla maestra se registra como `'POLYGON'`, conservando el centroide para consultas rápidas.
- **Datos Esperados Específicos:**
  - Puntos dentro del polígono: exactamente 7.
  - Vértices del ConvexHull: entre 4 y 7 vértices cerrados.
  - Área calculada esperada: entre 35.0 y 85.0 hectáreas.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT ST_GeometryType(geom) AS tipo_geom,
         ST_Contains(geom, ST_SetSRID(ST_MakePoint(-60.4501, -17.8501), 4326)) AS contiene_punto_interno
  FROM harmonized_fire_events 
  WHERE event_id = 'EVT_ROBORE_2026_01';
  ```
  *Resultado Requerido:* `tipo_geom = 'ST_Polygon'` y `contiene_punto_interno = TRUE`.

---

### ESC-ARM-005: Tratamiento de Fuegos Pequeños Detectados Exclusivamente por VIIRS (Sub-píxel MODIS)
- **ID:** `ESC-ARM-005`
- **Etiquetas:** `@harmonization @viirs_only @small_fires @subpixel @p1`
- **Título:** Normalización de eventos térmicos detectados únicamente por VIIRS 375m por debajo del umbral de detección de MODIS 1km.
- **Dado** 2 puntos VIIRS contemporáneos con FRP bajo (ej. $3.2\text{ MW}$ y $4.1\text{ MW}$) que no tienen ninguna detección coincidente de MODIS (debido a que la energía total del foco no alcanzó el umbral mínimo de detección de 10-15 MW del sensor MODIS a 1 km),
- **Cuando** se ejecuta el proceso de armonización para el período 2012-2026,
- **Entonces** se genera un evento clasificado como `detection_regime = 'VIIRS_ONLY'`,
- **Y** el sistema aplica la función de probabilidad de no-detección MODIS:
  $$P(\text{MODIS\_detect} \mid \text{FRP}_{\text{VIIRS}}) < 0.05$$
- **Y** se asigna una geometría con buffer de 187.5m (medio píxel VIIRS) para no sobreestimar el área quemada,
- **Y** el HFII se calcula calibrando la sensibilidad fina de VIIRS a la escala base de MODIS.
- **Datos Esperados Específicos:**
  - `event_id`: `'EVT_VIIRS_SMALL_094'`.
  - `detection_regime`: `'VIIRS_ONLY'`.
  - `modis_equivalent_detected`: `false`.
  - `hfii_mw`: Valor calibrado entre $2.5\text{ MW}$ y $4.0\text{ MW}$.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT count(*) 
  FROM harmonized_fire_events 
  WHERE detection_regime = 'VIIRS_ONLY' 
    AND raw_modis_count = 0 
    AND raw_viirs_count > 0;
  ```
  *Resultado Requerido:* Registros existentes y clasificados coherentemente con flags correspondientes.

---

### ESC-ARM-006: Tratamiento de la Serie Histórica Pre-2012 Compuesta Exclusivamente por MODIS
- **ID:** `ESC-ARM-006`
- **Etiquetas:** `@harmonization @modis_only @historical @baseline @p0`
- **Título:** Preservación íntegra de la línea base histórica 2000-2011 sin distorsión por ausencia de VIIRS.
- **Dado** un conjunto de 8,500 puntos calientes correspondientes a los incendios del año 2004 en la Chiquitanía (antes del lanzamiento de Suomi-NPP en octubre de 2011),
- **Cuando** se procesa la serie a través del motor de armonización de PyrosHarmonizer,
- **Entonces** todos los eventos se catalogan como `detection_regime = 'MODIS_ONLY'`,
- **Y** el valor del Índice Armonizado de Intensidad de Fuego (`HFII`) adopta directamente el valor de `frp_modis` corregido por el área de píxel según scan/track,
- **Y** el número de incendios armonizados no experimenta penalizaciones artificiales, manteniendo la continuidad matemática con la serie post-2012.
- **Datos Esperados Específicos:**
  - Período: `2004-08-01` a `2004-10-31`.
  - `detection_regime`: `'MODIS_ONLY'`.
  - Factor de ajuste cruzado: $1.0000$ (sin ponderador VIIRS).
  - Integridad histórica preservada al 100%.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT avg(abs(hfii_mw - raw_modis_frp_total)) AS error_absoluto_medio
  FROM harmonized_fire_events 
  WHERE acq_date BETWEEN '2000-01-01' AND '2011-12-31';
  ```
  *Resultado Requerido:* `error_absoluto_medio = 0.00` (tolerancia: $< 10^{-4}$).

---

## 4. Módulo de Calibración Energética FRP → HFII

El **Harmonized Fire Intensity Index (HFII)** resuelve la discrepancia energética donde múltiples píxeles de VIIRS suman un FRP nominalmente inflado en comparación con la medición integrada de MODIS sobre la misma columna térmica.

---

### ESC-CAL-001: Calibración Cruzada Multi-Píxel VIIRS vs MODIS (50 MW MODIS vs 180 MW VIIRS)
- **ID:** `ESC-CAL-001`
- **Etiquetas:** `@calibration @hfii @frp @cross_sensor @p0`
- **Título:** Normalización de energía acumulada cuando 3 píxeles VIIRS suman 180 MW frente a 50 MW de MODIS.
- **Dado** un cluster coincidente donde 1 observación de MODIS reporta $\text{FRP}_{\text{MODIS}} = 50.0\text{ MW}$,
- **Y** 3 observaciones de VIIRS 375m sobre el mismo fuego reportan $\text{FRP}_{\text{VIIRS}} = [65.0, 55.0, 60.0]\text{ MW}$, sumando $\sum \text{FRP}_{\text{VIIRS}} = 180.0\text{ MW}$,
- **Cuando** se aplica el modelo de calibración empírica no lineal de PyrosHarmonizer:
  $$\text{HFII} = \alpha \cdot \text{FRP}_{\text{MODIS}} + (1 - \alpha) \cdot \left( \beta \cdot \sum \text{FRP}_{\text{VIIRS}} \right)$$
  con factores calibrados para bosque seco chiquitano ($\alpha = 0.65, \beta = 0.32$),
- **Entonces** el valor final de HFII calculado se sitúa en el rango estricto de **$40.0\text{ MW}$ a $60.0\text{ MW}$** (valor esperado: $\approx 51.1\text{ MW}$),
- **Y** se evita el sobreconteo energético de 180 MW que distorsionaría el régimen térmico.
- **Datos Esperados Específicos:**
  - $\text{FRP}_{\text{MODIS}} = 50.0\text{ MW}$
  - $\sum \text{FRP}_{\text{VIIRS}} = 180.0\text{ MW}$
  - $\text{HFII}_{\text{calculado}} = 0.65(50) + 0.35(0.32 \times 180) = 32.5 + 20.16 = 52.66\text{ MW}$
  - Margen de aceptación: $[40.0, 60.0]\text{ MW}$.
- **Criterio de Validación Técnica:**
  ```python
  hfii = compute_calibrated_hfii(modis_frp=50.0, viirs_frp_list=[65.0, 55.0, 60.0])
  assert 40.0 <= hfii <= 60.0, f"HFII fuera de rango de convergencia: {hfii}"
  ```
  *Resultado Requerido:* Aserción exitosa sin lanzar `AssertionError`.

---

### ESC-CAL-002: Corrección por Régimen de Captura Nocturno (`daynight = 'N'`)
- **ID:** `ESC-CAL-002`
- **Etiquetas:** `@calibration @night_correction @radiometry @p1`
- **Título:** Aplicación de ponderador de fondo térmico para detecciones nocturnas (ajuste $\pm 15\%$).
- **Dado** un evento de incendio registrado durante el paso nocturno del satélite Aqua (`daynight = 'N'`) con un FRP nominal de $40.0\text{ MW}$,
- **Cuando** se calcula el HFII,
- **Entonces** el sistema detecta la ausencia de radiación solar directa y la menor temperatura de fondo del suelo (background temperature $T_b < 290\text{ K}$),
- **Y** aplica el coeficiente de calibración nocturna $k_{\text{night}} = 0.88$ (reducción del 12% para compensar el mayor contraste térmico del sensor en la noche),
- **Y** el valor resultante se ajusta a:
  $$\text{HFII}_{\text{nocturno}} = 40.0 \times 0.88 = 35.2\text{ MW}$$
- **Datos Esperados Específicos:**
  - Entrada: `frp = 40.0`, `daynight = 'N'`.
  - Salida: `hfii = 35.2 MW`, `night_adjustment_applied = true`.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT hfii_mw, raw_modis_frp_total, calibration_factors->>'night_factor' AS factor_noche
  FROM harmonized_fire_events 
  WHERE daynight_flag = 'N' AND event_id = 'EVT_NIGHT_001';
  ```
  *Resultado Requerido:* `factor_noche = '0.88'` y `hfii_mw = 35.2`.

---

### ESC-CAL-003: Corrección Geométrica por Deformación de Píxel Fuera de Nadir (Scan = 2.0, Track = 4.8)
- **ID:** `ESC-CAL-003`
- **Etiquetas:** `@calibration @bow_tie_effect @pixel_footprint @modis @p0`
- **Título:** Corrección por distorsión de píxel MODIS en borde de barrido ($scan=2.0\text{ km}$, $track=4.8\text{ km} \rightarrow \text{Área } 9.6\text{ km}^2$).
- **Dado** una detección MODIS en el borde de la franja orbital con parámetros de scan y track extremos: `scan = 2.0`, `track = 4.8`,
- **Cuando** el algoritmo evalúa la densidad de flujo de potencia radiativa,
- **Entonces** el sistema computa el área real de la huella del píxel:
  $$\text{Área}_{\text{real}} = scan \times track = 2.0 \times 4.8 = 9.6\text{ km}^2$$
- **Y** compara contra el área ideal en el nadir ($1.0\text{ km} \times 1.0\text{ km} = 1.0\text{ km}^2$),
- **Y** aplica la corrección geométrica de atenuación/dispersión de energía por efecto *bow-tie*, evitando sobreestimar el área quemada real en un factor de $9.6\times$.
- **Datos Esperados Específicos:**
  - Área calculada del píxel: $9.60\text{ km}^2$ ($960\text{ ha}$).
  - Factor de corrección geométrica $C_{\text{geom}} = \sqrt{1.0 / (scan \times track)} = \sqrt{1.0 / 9.6} \approx 0.3227$.
- **Criterio de Validación Técnica:**
  ```python
  pixel_area = calculate_modis_pixel_area(scan=2.0, track=4.8)
  assert round(pixel_area, 2) == 9.60
  ```
  *Resultado Requerido:* `pixel_area = 9.60 km²`.

---

### ESC-CAL-004: Asignación Directa de FRP para Detecciones de Sensor Único
- **ID:** `ESC-CAL-004`
- **Etiquetas:** `@calibration @single_sensor @fallback @p1`
- **Título:** Cálculo de HFII en eventos compuestos exclusivamente por un único sensor sin calibración cruzada espuria.
- **Dado** un evento aislado detectado únicamente por VIIRS con 1 píxel y $\text{FRP} = 14.5\text{ MW}$, sin ninguna otra detección satelital en la ventana espacio-temporal,
- **Cuando** se invoca el módulo de calibración,
- **Entonces** el sistema identifica que el número de sensores activos es $N_{\text{sensores}} = 1$,
- **Y** no ejecuta la función de regresión multivariante para evitar artefactos matemáticos,
- **Y** asigna el HFII directamente escalado por el factor base del sensor:
  $$\text{HFII} = \text{FRP}_{\text{VIIRS}} \times \gamma_{\text{VIIRS\_standalone}} = 14.5 \times 0.95 = 13.775\text{ MW}$$
- **Datos Esperados Específicos:**
  - `cross_calibration_applied`: `false`.
  - `single_sensor_type`: `'VIIRS_375'`.
  - `hfii_mw`: `13.78`.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT cross_calibration_applied, hfii_mw 
  FROM harmonized_fire_events 
  WHERE event_id = 'EVT_ISOLATED_SINGLE_01';
  ```
  *Resultado Requerido:* `cross_calibration_applied = FALSE` y `hfii_mw = 13.78`.

---

## 5. Módulo de Indexación Hexagonal (Uber H3)

La agregación mediante Uber H3 permite discretizar el espacio geográfico en teselas hexagonales multirresolución, eliminando sesgos de límites administrativos y habilitando convoluciones temporales eficientes.

---

### ESC-H3-001: Asignación de Índice H3 Resolución 7 para Coordenadas de Santa Cruz
- **ID:** `ESC-H3-001`
- **Etiquetas:** `@h3 @spatial_index @resolution_7 @p0`
- **Título:** Conversión de coordenadas geográficas en la Chiquitanía a índice alfanumérico H3 de Resolución 7 (~5.16 km² de área).
- **Dado** un evento de calor centrado en las coordenadas `lat = -17.8000, lng = -63.2000` (cercanías de Santa Cruz de la Sierra),
- **Cuando** el servicio de indexación espacial ejecuta la función H3 a Resolución 7:
  ```python
  h3_index = h3.latlng_to_cell(-17.8000, -63.2000, res=7)
  ```
- **Entonces** se obtiene un identificador hexadecimal canónico válido de 15 caracteres (ej. `'878952865ffffff'`),
- **Y** el índice es verificado como válido mediante `h3.is_valid_cell(h3_index) == True`,
- **Y** el centroide del hexágono coincide con las coordenadas originales con un error espacial inferior a 1,200 metros.
- **Datos Esperados Específicos:**
  - Latitud: `-17.8000`.
  - Longitud: `-63.2000`.
  - Resolución H3: `7`.
  - Formato de índice: Cadena hexadecimal que inicia con `'87'`.
- **Criterio de Validación Técnica:**
  ```python
  import h3
  index = h3.latlng_to_cell(-17.8000, -63.2000, 7)
  assert h3.is_valid_cell(index)
  assert h3.get_resolution(index) == 7
  ```
  *Resultado Requerido:* Ambas aserciones se cumplen estrictamente.

---

### ESC-H3-002: Agregación de Densidad y Normalización en Celda H3-R8 con 50 Puntos MODIS y 200 Puntos VIIRS
- **ID:** `ESC-H3-002`
- **Etiquetas:** `@h3 @density @normalization @resolution_8 @p0`
- **Título:** Agregación armónica en celda H3-R8 (~0.74 km²) con alta concentración simultánea de focos MODIS y VIIRS.
- **Dado** una celda hexagonal H3 en resolución 8 que durante una jornada registra 50 detecciones crudas de MODIS y 200 detecciones crudas de VIIRS para el mismo incendio en San Matías,
- **Cuando** se calcula la capa de densidad agregada diaria en la tabla `h3_daily_fire_density`,
- **Entonces** la celda se marca como `is_active = TRUE`,
- **Y** el campo `raw_points_count` refleja $250$,
- **Y** el campo `harmonized_events_count` refleja únicamente el número de frentes reales agrupados (ej. entre 3 y 8 eventos),
- **Y** la métrica `normalized_frp_density_mw_km2` representa el HFII dividido por el área de la celda ($0.737\text{ km}^2$), garantizando comparabilidad con datos históricos previos a 2012.
- **Datos Esperados Específicos:**
  - `h3_index`: `'8889528651fffff'`.
  - `raw_points_count`: `250`.
  - `harmonized_events_count`: `<= 10`.
  - `is_active`: `true`.
  - `normalized_hfii_density`: Calculado en base a HFII armonizado, no en base a la suma cruda de 250 puntos.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT raw_points_count, harmonized_events_count, is_active
  FROM h3_daily_fire_density 
  WHERE h3_index = '8889528651fffff' AND acq_date = '2026-09-02';
  ```
  *Resultado Requerido:* `raw_points_count = 250`, `harmonized_events_count BETWEEN 1 AND 10`, `is_active = TRUE`.

---

### ESC-H3-003: Agregación Espacio-Temporal Mensual sin Sobre-Conteo por Doble Sensor
- **ID:** `ESC-H3-003`
- **Etiquetas:** `@h3 @monthly_aggregation @group_by @no_double_count @p0`
- **Título:** Agrupamiento mensual `GROUP BY h3_index, acq_date` asegurando fidelidad estadística sin duplicación de días-fuego.
- **Dado** un mes completo de observaciones satelitales (31 días en agosto) para una región boscosa en Concepción,
- **Cuando** se ejecuta la consulta de análisis espacio-temporal:
  ```sql
  SELECT h3_index, acq_date, count(*) AS total_dias_activos
  FROM h3_daily_fire_density
  WHERE acq_date BETWEEN '2024-08-01' AND '2024-08-31' AND is_active = TRUE
  GROUP BY h3_index, acq_date;
  ```
- **Entonces** cada celda H3 contabiliza a lo sumo 1 registro de actividad por día (`acq_date`),
- **Y** la presencia simultánea de pasadas diurnas y nocturnas de Terra, Aqua, Suomi-NPP y NOAA-20 no incrementa artificialmente el conteo de días con fuego activo,
- **Y** el total mensual acumulado de días con fuego para cualquier celda no supera el número de días del mes ($\le 31$).
- **Datos Esperados Específicos:**
  - Máximo `dias_activos` mensual posible para cualquier hexágono: $31$.
  - Duplicados en `(h3_index, acq_date)`: exactamente $0$.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT h3_index, acq_date, count(*) 
  FROM h3_daily_fire_density
  GROUP BY h3_index, acq_date
  HAVING count(*) > 1;
  ```
  *Resultado Requerido:* Retorna exactamente `0` filas (integridad de clave primaria compuesta).

---

## 6. Módulo de Calendario de Actividad de Quemas (Fire Calendar)

El Calendario de Quemas unificado proporciona una matriz visual y estadística de los 365 días del año a lo largo de 26 años de registro (2000-2026), permitiendo a guardaparques y autoridades evaluar anomalías climáticas sin la distorsión del año 2012.

---

### ESC-CQ-001: Generación de Matriz Anual de Actividad sin Ruptura Estructural en 2012
- **ID:** `ESC-CQ-001`
- **Etiquetas:** `@calendar @matrix @trend_continuity @chiquitania @p0`
- **Título:** Continuidad temporal en la serie 2000-2026 eliminando el salto artificial de detección en 2012.
- **Dado** la serie histórica completa de incendios para el departamento de Santa Cruz entre el 1 de enero de 2000 y el 31 de diciembre de 2025,
- **Cuando** se genera la matriz analítica del Calendario de Quemas calculando la métrica de `Frecuencia Diaria Normalizada de Eventos (FDNE)` antes y después de 2012,
- **Entonces** la ratio entre la media de detecciones 2013-2015 y la media 2009-2011 en los datos crudos muestra un salto artificial de $+340\%$ ($3.4\times$),
- **Y** en la serie procesada por PyrosHarmonizer la variación entre ambos trienios normalizados por condiciones meteorológicas se mantiene en un rango físico razonable de $\pm 25\%$,
- **Y** la matriz visual anual renderiza 365 celdas por año con continuidad cromática homogénea.
- **Datos Esperados Específicos:**
  - Ratio de salto crudo: $\frac{\text{Conteo Crudo } 2013}{\text{Conteo Crudo } 2011} \approx 3.8$.
  - Ratio armonizado PyrosHarmonizer: $\frac{\text{Eventos Armonizados } 2013}{\text{Eventos Armonizados } 2011} \approx 1.12$.
- **Criterio de Validación Técnica:**
  ```python
  jump_ratio_raw = raw_counts_2013 / raw_counts_2011
  jump_ratio_harmonized = harmonized_counts_2013 / harmonized_counts_2011
  assert jump_ratio_raw >= 3.0
  assert 0.75 <= jump_ratio_harmonized <= 1.35
  ```
  *Resultado Requerido:* Ambas aserciones se cumplen, validando la supresión del Efecto 2012.

---

### ESC-CQ-002: Detección y Alerta de Alteración Fenológica de la Temporada de Fuego
- **ID:** `ESC-CQ-002`
- **Etiquetas:** `@calendar @phenology @early_warning @climate_change @p1`
- **Título:** Alerta temprana por inicio anticipado de la temporada de incendios respecto al promedio histórico 2000-2025.
- **Dado** que la fecha histórica promedio de inicio de la temporada crítica de quemas en la Chiquitanía se sitúa en la semana epidemiológica 31 (primeros días de agosto),
- **Cuando** en el año 2026 el acumulado móvil de HFII supera el percentil 90 histórico durante la semana 26 (fines de junio),
- **Entonces** el motor de análisis del calendario genera un indicador de anomalía fenológica:
  `phenological_anomaly = 'EARLY_FIRE_SEASON_ONSET'`,
- **Y** calcula el adelanto temporal en días: `days_advanced = 35`,
- **Y** emite un payload de alerta para el dashboard de tomadores de decisiones en Santa Cruz.
- **Datos Esperados Específicos:**
  - Semana actual: 26.
  - Semana media histórica: 31.
  - Estado: `'CRITICAL_EARLY_WARNING'`.
  - Anomalía de HFII respecto a la media de junio: $+185\%$.
- **Criterio de Validación Técnica:**
  ```json
  {
    "region": "Chiquitania_Santa_Cruz",
    "alert_level": "RED",
    "metric": "PHENOLOGICAL_SHIFT",
    "historical_mean_start_doy": 215,
    "current_year_start_doy": 180,
    "delta_days": -35
  }
  ```
  *Resultado Requerido:* Respuesta JSON emitida con `alert_level = 'RED'` y `delta_days = -35`.

---

### ESC-CQ-003: Clasificación de Severidad Diaria por Percentiles de HFII (Bajo, Moderado, Alto, Extremo)
- **ID:** `ESC-CQ-003`
- **Etiquetas:** `@calendar @severity @percentiles @classification @p1`
- **Título:** Clasificación del nivel de severidad diaria del fuego basada en los percentiles P75, P90 y P99 de HFII acumulado.
- **Dado** el cálculo diario de HFII total acumulado en el departamento de Santa Cruz,
- **Cuando** se asigna la categoría de severidad al día calendario según la distribución estadística de los últimos 20 años:
  - $\text{HFII} < P_{75} \rightarrow \text{Bajo}$
  - $P_{75} \le \text{HFII} < P_{90} \rightarrow \text{Moderado}$
  - $P_{90} \le \text{HFII} < P_{99} \rightarrow \text{Alto}$
  - $\text{HFII} \ge P_{99} \rightarrow \text{Extremo}$
- **Entonces** un día con $\text{HFII} = 14,500\text{ MW}$ (donde $P_{90} = 8,200\text{ MW}$ y $P_{99} = 13,800\text{ MW}$) es clasificado como `'EXTREMO'`,
- **Y** la celda del calendario adquiere la clase visual CSS `bg-fire-extreme` (#7f1d1d) con tooltip informativo.
- **Datos Esperados Específicos:**
  - Fecha evaluada: `2024-09-08`.
  - `total_daily_hfii_mw`: `14500.0`.
  - `severity_level`: `'EXTREME'`.
  - `percentile_rank`: `0.994`.
- **Criterio de Validación Técnica:**
  ```python
  severity = classify_daily_severity(daily_hfii=14500.0, p75=4500.0, p90=8200.0, p99=13800.0)
  assert severity == "EXTREME"
  ```
  *Resultado Requerido:* `severity == "EXTREME"`.

---

### ESC-CQ-004: Comparación Interactiva "Before / After Harmonization" para la Crisis de 2019
- **ID:** `ESC-CQ-004`
- **Etiquetas:** `@calendar @comparison @case_study_2019 @chiquitania @p0`
- **Título:** Verificación del modo de contraste "Antes vs Después" para los mega-incendios de agosto-septiembre 2019 en la Chiquitanía.
- **Dado** el registro de la catástrofe de incendios de agosto de 2019 en Santa Cruz,
- **Cuando** el usuario activa el toggle de comparación en la interfaz del Calendario de Quemas,
- **Entonces** el sistema presenta dos series sincronizadas:
  1. *Capa Cruda:* Picos desproporcionados de más de 45,000 focos VIIRS diarios sin consolidación.
  2. *Capa Armonizada:* 6,800 frentes de fuego convexos unificados con energía radiativa real integrada (HFII).
- **Y** el gráfico de área muestra con claridad la reducción del ruido muestral y la preservación de la dinámica física del fuego.
- **Datos Esperados Específicos:**
  - Reducción del conteo de entidades: entre $65\%$ y $82\%$ de compactación de eventos sin pérdida de superficie real.
  - Correlación espacial con cicatrices de quema Sentinel-2/Burned Area: $R^2 > 0.88$.
- **Criterio de Validación Técnica:**
  ```sql
  SELECT sum(raw_points_count) AS total_crudo,
         count(*) AS total_armonizado,
         (count(*)::float / sum(raw_points_count)::float) AS factor_compresion
  FROM harmonized_fire_events
  WHERE acq_date BETWEEN '2019-08-01' AND '2019-08-31';
  ```
  *Resultado Requerido:* `factor_compresion BETWEEN 0.18 AND 0.35`.

---

## 7. Módulo de Exportación de Datos e Interoperabilidad

Permite a investigadores, ONG y entidades de protección ambiental (como ABT, SERNAP y Gobernación de Santa Cruz) descargar datos abiertos estructurados en formatos interoperables según lineamientos NASA OGC.

---

### ESC-EXP-001: Exportación en Formato GeoJSON Estándar con Polígonos ConvexHull y Atributos HFII
- **ID:** `ESC-EXP-001`
- **Etiquetas:** `@export @geojson @gis @interoperability @p0`
- **Título:** Generación de FeatureCollection GeoJSON cumpliendo especificación RFC 7946 con geometrías poligonales.
- **Dado** una solicitud de exportación para los eventos del municipio de San Ignacio de Velasco entre `2026-08-01` y `2026-08-15`,
- **Cuando** el cliente consume el endpoint `GET /api/v1/export/geojson?municipio=San_Ignacio&start_date=2026-08-01&end_date=2026-08-15`,
- **Entonces** el servidor genera un archivo descargable con encabezado `Content-Type: application/geo+json`,
- **Y** el payload corresponde a un `FeatureCollection` válido donde cada `Feature` posee geometría `Polygon` en WGS84,
- **Y** cada objeto incluye propiedades canónicas: `event_id`, `acq_date`, `hfii_mw`, `raw_modis_count`, `raw_viirs_count`, `detection_regime`, `area_ha`.
- **Datos Esperados Específicos:**
  - Estructura JSON:
    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [[[-61.12, -16.35], [-61.11, -16.34], [-61.10, -16.36], [-61.12, -16.35]]]
          },
          "properties": {
            "event_id": "EVT_SCZ_2026_0901",
            "acq_date": "2026-08-10",
            "hfii_mw": 58.4,
            "raw_modis_count": 2,
            "raw_viirs_count": 6,
            "detection_regime": "CO_DETECTED",
            "area_ha": 62.4
          }
        }
      ]
    }
    ```
- **Criterio de Validación Técnica:**
  Validar el archivo exportado con la librería geojson oficial:
  ```python
  import geojson
  data = geojson.loads(response_text)
  assert data.is_valid
  assert data["type"] == "FeatureCollection"
  assert len(data["features"]) > 0
  ```
  *Resultado Requerido:* Validación GeoJSON estricta sin errores de topología.

---

### ESC-EXP-002: Exportación de Serie Temporal en CSV Normalizado para Modelado Climático
- **ID:** `ESC-EXP-002`
- **Etiquetas:** `@export @csv @time_series @data_science @p1`
- **Título:** Generación de serie temporal tabular normalizada con métricas diarias por municipio.
- **Dado** una consulta analítica multianual (2000-2025) agregada a nivel de municipio y día,
- **Cuando** se solicita la descarga en formato CSV vía `GET /api/v1/export/timeseries/csv`,
- **Entonces** el sistema envía un stream CSV con codificación UTF-8 y delimitador por comas,
- **Y** la primera línea incluye exactamente los encabezados:
  `acq_date,municipio,raw_modis_foci,raw_viirs_foci,harmonized_events_count,raw_total_frp,calibrated_hfii_mw,severity_index`,
- **Y** los valores decimales usan punto (`.`) y no contienen filas vacías ni valores de cadena no escapados.
- **Datos Esperados Específicos:**
  - Línea de muestra:
    `2023-09-14,Robore,12,48,15,640.2,210.5,HIGH`
- **Criterio de Validación Técnica:**
  ```python
  import pandas as pd
  df = pd.read_csv("exported_timeseries.csv")
  expected_cols = [
      "acq_date", "municipio", "raw_modis_foci", "raw_viirs_foci",
      "harmonized_events_count", "raw_total_frp", "calibrated_hfii_mw", "severity_index"
  ]
  assert list(df.columns) == expected_cols
  assert not df.isnull().values.any()
  ```
  *Resultado Requerido:* Esquema de columnas idéntico y cero valores nulos.

---

### ESC-EXP-003: Generación de Reporte Científico Sintético en JSON de Calibración
- **ID:** `ESC-EXP-003`
- **Etiquetas:** `@export @audit_report @metadata @reproducibility @p1`
- **Título:** Exportación de informe de auditoría metodológica con métricas de compresión, ratios de co-detección y varianza de HFII.
- **Dado** la culminación de un ciclo de armonización para una campaña de incendios en Bolivia,
- **Cuando** un usuario científico solicita el reporte de calibración en `GET /api/v1/export/audit-report?year=2024`,
- **Entonces** el sistema responde con un documento JSON que certifica:
  - Total de puntos crudos procesados (desglosado por sensor).
  - Tasa global de compresión espacial ($1 - \frac{\text{eventos}}{\text{puntos\_crudos}}$).
  - Porcentaje de focos co-detectados vs detecciones de sensor único.
  - Coeficientes de calibración empíricos utilizados y versión de los algoritmos.
- **Datos Esperados Específicos:**
  ```json
  {
    "year": 2024,
    "algorithm_version": "PyrosHarmonizer_v1.2_ST-DBSCAN",
    "total_raw_modis": 18450,
    "total_raw_viirs": 74210,
    "total_harmonized_events": 24110,
    "spatial_compression_rate": 0.7398,
    "co_detection_rate": 0.612,
    "hfii_total_terawatts": 1.482,
    "run_timestamp": "2026-11-14T14:30:00Z"
  }
  ```
- **Criterio de Validación Técnica:**
  Comprobar la coherencia aritmética del reporte:
  $$\text{spatial\_compression\_rate} = 1 - \frac{24110}{18450 + 74210} = 1 - 0.2602 = 0.7398$$
  *Resultado Requerido:* Coincidencia exacta en 4 decimales.

---

## 8. Módulo de Mapa Interactivo y Experiencia de Usuario (Frontend)

El frontend en Next.js 14 / React 18 utiliza capas aceleradas por GPU mediante Deck.gl y Mapbox GL JS para ofrecer visualizaciones de alta tasa de refresco (60 FPS) aún con más de 100,000 primitivas espaciales.

---

### ESC-MAP-001: Visualización Comparativa con Split-Screen / Slider (Crudo vs Armonizado)
- **ID:** `ESC-MAP-001`
- **Etiquetas:** `@ui @deck_gl @split_screen @visualization @p0`
- **Título:** Renderizado sincrónico de doble visor interactivo comparando la dispersión cruda vs los polígonos armonizados.
- **Dado** que el usuario se sitúa en la vista de mapa interactivo en `/map` sobre la región de San Matías,
- **Cuando** activa el modo `"Comparación Dividida (Split Screen)"` y desplaza el control deslizante (slider) horizontal al 50%,
- **Entonces** el panel izquierdo renderiza la capa cruda con puntos dispersos de MODIS (círculos rojos de 1 km) y VIIRS (círculos amarillos de 375 m) evidenciando sobreposición masiva,
- **Y** el panel derecho renderiza simultáneamente los polígonos convexos armonizados con contornos suavizados y coloreados por intensidad HFII,
- **Y** las operaciones de paneo y zoom de ambos mapas permanecen matemáticamente sincronizadas a 60 cuadros por segundo sin desfase de coordenadas.
- **Datos Esperados Específicos:**
  - Visor Izquierdo: $\approx 1,200$ puntos puntuales crudos superpuestos.
  - Visor Derecho: $\approx 180$ polígonos continuos no redundantes.
  - Sincronización de cámara: `viewState.left == viewState.right`.
- **Criterio de Validación Técnica:**
  Prueba E2E con Playwright:
  ```typescript
  await page.click('button#btn-split-screen');
  const leftCenter = await page.evaluate(() => window.mapLeft.getCenter());
  const rightCenter = await page.evaluate(() => window.mapRight.getCenter());
  expect(leftCenter.lat).toBeCloseTo(rightCenter.lat, 4);
  expect(leftCenter.lng).toBeCloseTo(rightCenter.lng, 4);
  ```
  *Resultado Requerido:* Coincidencia de centros en ambos visores dentro de tolerancia de 0.0001°.

---

### ESC-MAP-002: Visualización Hexagonal H3 con Mapa de Calor Cromático y Tooltip Dinámico
- **ID:** `ESC-MAP-002`
- **Etiquetas:** `@ui @h3_layer @deck_gl @tooltip @ux @p1`
- **Título:** Representación de celdas H3 coloreadas por severidad con despliegue de tooltip multi-sensor al hacer hover.
- **Dado** la capa de hexágonos Uber H3 cargada en Deck.gl mediante `H3HexagonLayer`,
- **Cuando** el usuario posa el cursor (hover) sobre la celda hexagonal activa `'878952865ffffff'`,
- **Entonces** la celda se resalta con un borde cian `#00e5ff`,
- **Y** se despliega una tarjeta de tooltip flotante en menos de 50 ms conteniendo:
  - Identificador H3 y resolución.
  - Nivel de Intensidad Armonizada (`HFII: 142.8 MW`).
  - Desglose de sensores: `MODIS: 2 detecciones`, `VIIRS: 9 detecciones`.
  - Área total estimada y fecha de mayor actividad.
- **Datos Esperados Específicos:**
  - Color de relleno de la celda en escala de calor: RGBA `[220, 38, 38, 200]` (fuego intenso).
  - Contenido textual del tooltip verificado contra las propiedades del objeto geoespacial.
- **Criterio de Validación Técnica:**
  ```typescript
  const tooltipText = await page.locator('#deckgl-tooltip').textContent();
  expect(tooltipText).toContain('HFII: 142.8 MW');
  expect(tooltipText).toContain('MODIS: 2');
  expect(tooltipText).toContain('VIIRS: 9');
  ```
  *Resultado Requerido:* Tooltip visible con datos coincidentes con el payload del backend.

---

### ESC-MAP-003: Filtrado Dinámico por Rango Temporal Multianual y Selector de Municipio
- **ID:** `ESC-MAP-003`
- **Etiquetas:** `@ui @dynamic_filters @react @performance @p0`
- **Título:** Actualización reactiva del mapa al filtrar por municipio de Santa Cruz y ventana temporal sin recarga de página.
- **Dado** la aplicación web en su vista principal con los datos cargados a nivel departamental,
- **Cuando** el usuario selecciona en los controles laterales:
  - Municipio: `"Concepción"`
  - Rango de fechas: `2010-01-01` a `2024-12-31`
- **Entonces** el mapa anima suavemente la cámara (`flyTo`) hacia el centroide de Concepción `(-16.1303, -62.0294)` con nivel de zoom `9.5`,
- **Y** el componente React actualiza la query de Deck.gl sin recargar la página web en menos de 400 ms,
- **Y** la leyenda inferior actualiza la estadística sumaria: `"Concepción: 14,210 eventos armonizados detectados"`.
- **Datos Esperados Específicos:**
  - Bounding Box centrado en Concepción.
  - Tiempo de respuesta de actualización de la capa: $< 400\text{ ms}$.
- **Criterio de Validación Técnica:**
  ```typescript
  await page.selectOption('select#municipio-selector', 'Concepcion');
  await page.waitForSelector('.stat-summary-concepcion');
  const count = await page.locator('#stat-event-count').innerText();
  expect(parseInt(count)).toBeGreaterThan(0);
  ```
  *Resultado Requerido:* Transición de cámara completada y contador numérico actualizado.

---

## 9. Módulo de API REST (FastAPI) y Servicios Analíticos

Microservicios asíncronos construidos en FastAPI bajo OpenAPI 3.1, con validación estricta Pydantic v2 y respuestas serializadas en JSON / GeoJSON optimizado.

---

### ESC-API-001: Endpoint `GET /api/v1/hotspots/harmonized` con Filtrado Espacio-Temporal y Paginación
- **ID:** `ESC-API-001`
- **Etiquetas:** `@api @fastapi @pagination @bbox @p0`
- **Título:** Consulta paginada de eventos armonizados filtrados por Bounding Box geográfico y rango temporal.
- **Dado** que la API de PyrosHarmonizer se encuentra operativa en el puerto 8000,
- **Cuando** un cliente efectúa una petición HTTP:
  ```http
  GET /api/v1/hotspots/harmonized?bbox=-62.5,-18.0,-60.0,-16.0&start_date=2023-08-01&end_date=2023-08-31&page=1&limit=50 HTTP/1.1
  Host: localhost:8000
  Accept: application/json
  ```
- **Entonces** el servicio retorna código de estado `200 OK` en menos de 250 ms,
- **Y** el cuerpo de la respuesta contiene un objeto JSON con metadatos de paginación (`total_items`, `total_pages`, `current_page`) y una lista de exactamente 50 elementos o menos en el campo `data`,
- **Y** todas las geometrías de los eventos retornados se encuentran estrictamente contenidas dentro del Bounding Box especificado.
- **Datos Esperados Específicos:**
  ```json
  {
    "status": "success",
    "pagination": {
      "total_items": 1420,
      "total_pages": 29,
      "current_page": 1,
      "page_size": 50
    },
    "data": [
      {
        "event_id": "EVT_2023_0815_001",
        "acq_date": "2023-08-15",
        "latitude": -16.8421,
        "longitude": -61.2314,
        "hfii_mw": 78.4,
        "detection_regime": "CO_DETECTED"
      }
    ]
  }
  ```
- **Criterio de Validación Técnica:**
  ```python
  response = client.get("/api/v1/hotspots/harmonized", params={
      "bbox": "-62.5,-18.0,-60.0,-16.0",
      "start_date": "2023-08-01",
      "end_date": "2023-08-31",
      "page": 1,
      "limit": 50
  })
  assert response.status_code == 200
  data = response.json()
  assert len(data["data"]) <= 50
  assert data["pagination"]["total_items"] > 0
  ```
  *Resultado Requerido:* Código 200 y validación de contrato JSON.

---

### ESC-API-002: Endpoint `GET /api/v1/analytics/fire-calendar` para Estructura de Matriz Diaria
- **ID:** `ESC-API-002`
- **Etiquetas:** `@api @calendar @fastapi @analytics @p0`
- **Título:** Extracción de matriz anual estructurada por día y mes para alimentar el componente web Fire Calendar.
- **Dado** una solicitud de visualización del calendario histórico para el año 2024 en el departamento de Santa Cruz,
- **Cuando** el frontend solicita `GET /api/v1/analytics/fire-calendar?year=2024&region=Santa_Cruz`,
- **Entonces** la API retorna una lista de 366 objetos (año bisiesto 2024),
- **Y** cada objeto incluye:
  - `doy`: Día del año (1 a 366).
  - `date`: Cadena ISO `'2024-MM-DD'`.
  - `harmonized_events`: Conteo de eventos consolidados.
  - `total_hfii`: Sumatoria de intensidad calórica en MW.
  - `severity_level`: Nivel cualitativo (`'LOW'`, `'MODERATE'`, `'HIGH'`, `'EXTREME'`).
  - `is_season_peak`: Booleano indicando si supera el percentil 95.
- **Datos Esperados Específicos:**
  - Longitud exacta del array `calendar_days`: 366 elementos.
  - Tiempo de procesamiento en caché: $< 80\text{ ms}$.
- **Criterio de Validación Técnica:**
  ```python
  res = client.get("/api/v1/analytics/fire-calendar?year=2024")
  assert res.status_code == 200
  items = res.json()["calendar_days"]
  assert len(items) == 366
  assert items[0]["doy"] == 1
  assert items[-1]["doy"] == 366
  ```
  *Resultado Requerido:* Exactamente 366 días estructurados consecutivamente.

---

### ESC-API-003: Endpoint `POST /api/v1/harmonize/batch` para Ejecución Asíncrona de ST-DBSCAN
- **ID:** `ESC-API-003`
- **Etiquetas:** `@api @async @batch_processing @celery_or_background @p1`
- **Título:** Despacho de tarea asíncrona de clustering espacial sobre partición mensual con monitorización de estado.
- **Dado** un lote masivo pendiente de armonizar correspondiente al mes de septiembre de 2024 (más de 80,000 detecciones crudas combinadas),
- **Cuando** el administrador envía la orden de procesamiento:
  ```http
  POST /api/v1/harmonize/batch HTTP/1.1
  Content-Type: application/json

  {
    "start_date": "2024-09-01",
    "end_date": "2024-09-30",
    "spatial_epsilon_meters": 750,
    "temporal_window_hours": 3.0
  }
  ```
- **Entonces** la API responde de inmediato con código HTTP `202 Accepted` y un `task_id` único (UUIDv4),
- **Y** el procesamiento se delega a un BackgroundTask / Worker asíncrono sin bloquear el event loop principal de FastAPI,
- **Y** sucesivas consultas a `GET /api/v1/harmonize/tasks/{task_id}` retornan el porcentaje de avance (`progress_percentage`: 0% a 100%) hasta culminar en estado `'SUCCESS'`.
- **Datos Esperados Específicos:**
  - Código HTTP inmediato: `202 Accepted`.
  - Objeto de respuesta:
    ```json
    {
      "task_id": "7b9d88a1-3142-4b20-9cb5-ef561491aa22",
      "status": "QUEUED",
      "estimated_duration_seconds": 45,
      "check_status_url": "/api/v1/harmonize/tasks/7b9d88a1-3142-4b20-9cb5-ef561491aa22"
    }
    ```
- **Criterio de Validación Técnica:**
  ```python
  res = client.post("/api/v1/harmonize/batch", json={"start_date": "2024-09-01", "end_date": "2024-09-30"})
  assert res.status_code == 202
  task_id = res.json()["task_id"]
  assert task_id is not None
  ```
  *Resultado Requerido:* Respuesta 202 inmediata con UUID de tarea válido.

---

### ESC-API-004: Endpoint `GET /api/v1/metrics/bias-correction` para Certificación del Efecto 2012
- **ID:** `ESC-API-004`
- **Etiquetas:** `@api @metrics @bias_correction @audit @space_apps_judging @p0`
- **Título:** Endpoint para que los jueces del NASA Space Apps Challenge verifiquen la eliminación matemática del sesgo 2012.
- **Dado** la necesidad de demostrar empíricamente a los evaluadores del reto la eficacia de la solución,
- **When** se consulta el endpoint evaluativo:
  ```http
  GET /api/v1/metrics/bias-correction?region=Chiquitania HTTP/1.1
  ```
- **Then** el endpoint retorna los coeficientes estadísticos calculados entre 2000 y 2026:
  - `raw_step_change_p_value`: Valor p del test de Chow / Mann-Kendall demostrando quiebre artificial en la serie cruda ($p < 0.001$).
  - `harmonized_step_change_p_value`: Valor p en la serie armonizada demostrando ausencia de discontinuidad artificial ($p > 0.40$).
  - `f_score_clustering`: Métrica de consistencia de agrupamiento ($\ge 0.89$).
  - `mean_compression_ratio`: Ratio de fusión de píxeles redundantes ($\approx 0.28$).
- **Datos Esperados Específicos:**
  ```json
  {
    "metric_summary": "Evaluación de Corrección del Salto Instrumental 2012",
    "region": "Chiquitania, Santa Cruz, Bolivia",
    "evaluation_period": "2000-2026",
    "raw_data_break_detected": true,
    "raw_jump_magnitude_multiplier": 3.42,
    "harmonized_series_continuous": true,
    "harmonized_jump_magnitude_multiplier": 1.08,
    "statistical_validation": {
      "chow_test_p_value_raw": 0.000042,
      "chow_test_p_value_harmonized": 0.4821,
      "energy_conservation_index": 0.941
    }
  }
  ```
- **Criterio de Validación Técnica:**
  `chow_test_p_value_raw < 0.01` Y `chow_test_p_value_harmonized > 0.05`, demostrando contundentemente que la discontinuidad instrumental fue corregida de forma estadísticamente significativa.

---

## 10. Matriz de Trazabilidad y Criterios de Éxito del Hackathon

La siguiente matriz mapea los 36 escenarios BDD con los objetivos de evaluación del **2026 NASA International Space Apps Challenge (Reto #8)** y los entregables del equipo:

| Módulo Funcional | Códigos de Escenario BDD | Requisito del Reto NASA #8 | Entregable Asociado | Responsable del Equipo |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ingesta de Datos** | `ESC-ING-001` al `ESC-ING-005` | Procesamiento de productos LANCE/FIRMS (MODIS C6.1 y VIIRS 375m) | Pipeline ETL Python / Base PostgreSQL + PostGIS | Lead Backend / Data Engineer |
| **2. Filtrado de Calidad** | `ESC-FIL-001` al `ESC-FIL-004` | Depuración de baja confianza y fuentes térmicas estáticas | Script de limpieza espacial y tabla de anomalías | Geospatial Analyst |
| **3. Armonización ST** | `ESC-ARM-001` al `ESC-ARM-006` | Fusión de resoluciones dispares (1km vs 375m) y co-detecciones | Motor ST-DBSCAN + Polígonos ConvexHull PostGIS | Lead Backend / Geospatial Analyst |
| **4. Calibración FRP** | `ESC-CAL-001` al `ESC-CAL-004` | Integración física de energía de fuego sin sobreconteo | Algoritmo de calibración radiativa HFII | Geospatial Analyst / Data Scientist |
| **5. Indexación H3** | `ESC-H3-001` al `ESC-H3-003` | Discretización multirresolución continua e interoperable | Módulo H3-Py y vistas agregadas SQL | Lead Backend / DevOps |
| **6. Calendario de Quemas** | `ESC-CQ-001` al `ESC-CQ-004` | Régimen unificado de fuego y calendario multianual 2000-2026 | Matriz interactiva de severidad (Next.js / Recharts) | Lead Frontend / UX Designer |
| **7. Exportación** | `ESC-EXP-001` al `ESC-EXP-003` | Datos abiertos para científicos y autoridades ambientales | Endpoints GeoJSON RFC 7946 y CSV | Lead Backend / Data Engineer |
| **8. Mapa Interactivo** | `ESC-MAP-001` al `ESC-MAP-003` | Experiencia visual clara del Efecto 2012 y frentes reales | Visor Deck.gl + Mapbox GL JS (Split-Screen) | Lead Frontend / UX Designer |
| **9. API REST** | `ESC-API-001` al `ESC-API-004` | Despliegue en la nube y verificación de jueces en vivo | API FastAPI en Railway / Frontend en Vercel | DevOps / Integration Lead |

---

## 📐 Fórmulas Matemáticas y Definiciones Operativas de Aceptación

### 1. Distancia Espacio-Temporal ST-DBSCAN ($D_{st}$)
Para dos observaciones satelitales $p_i = (\mathbf{x}_i, t_i)$ y $p_j = (\mathbf{y}_j, t_j)$:
$$D_{st}(p_i, p_j) = \sqrt{\left(\frac{\text{dist}_{\text{geodésica}}(\mathbf{x}_i, \mathbf{y}_j)}{\varepsilon_{\text{spatial}}}\right)^2 + \left(\frac{|t_i - t_j|}{\Delta t_{\text{temporal}}}\right)^2}$$
- **Condición de Coalescencia:** $D_{st}(p_i, p_j) \le 1.0$, con $\varepsilon_{\text{spatial}} = 750\text{ m}$ y $\Delta t_{\text{temporal}} = 3.5\text{ horas}$.

### 2. Índice Armonizado de Intensidad de Fuego (HFII)
Para un cluster que agrupa observaciones simultáneas de MODIS y VIIRS:
$$\text{HFII} = w_m \cdot \text{FRP}_{\text{MODIS}} \cdot \psi(scan, track) + w_v \cdot \left( \sum_{k=1}^{N_v} \text{FRP}_{\text{VIIRS}, k} \cdot \theta_k \right) \cdot \Omega_{\text{night}}$$
- Donde:
  - $\psi(scan, track) = \sqrt{\frac{1.0}{scan \times track}}$ es el factor de compensación de área por distorsión periférica (*bow-tie effect*).
  - $\theta_k$ es el factor de saturación y peso espacial relativo del píxel VIIRS dentro del radio de influencia del fuego.
  - $\Omega_{\text{night}}$ toma el valor de $0.88$ si $daynight = 'N'$ o $1.00$ si $daynight = 'D'$.
  - $w_m$ y $w_v$ son ponderadores bayesianos calibrados empíricamente ($w_m + w_v = 1.0$).

---

> **Certificación de Calidad del Documento:**
> Este documento de especificación formal de escenarios BDD constituye el marco contractual de validación y pruebas de aceptación para el proyecto **PyrosHarmonizer** en el marco del 2026 NASA International Space Apps Challenge. Cualquier pull request o commit en el repositorio oficial de GitHub debe verificar satisfactoriamente estos criterios para su integración y posterior despliegue continuo.

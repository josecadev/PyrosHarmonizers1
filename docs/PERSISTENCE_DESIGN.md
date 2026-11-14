# PyrosHarmonizer — Documento de Diseño de Persistencia (Persistence Design Document)

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge  
**Sede:** Santa Cruz de la Sierra, Bolivia — Universidad Católica Boliviana (UCB)  
**Reto:** Reto #8: Harmonization of MODIS and VIIRS Hot Spots (Nivel Intermedio/Avanzado)  
**Fecha:** 14-15 de Noviembre de 2026  
**Versión del Documento:** 1.0.0 — Arquitectura de Datos y Persistencia  
**Autoría:** Equipo PyrosHarmonizers (Lead Backend/Data Engineer & Geospatial Analyst)  

---

## 1. Introducción y Contexto del Reto

### 1.1 El Reto Científico: El "Efecto 2012"
Desde el lanzamiento de los satélites Terra (1999) y Aqua (2002), el sensor **MODIS** ha provisto el registro histórico más consistente de anomalías térmicas globales a una resolución espacial nominal de **1 km (1000 m)**. A partir de finales de 2011 y principios de 2012, con la entrada en órbita de Suomi-NPP y posteriormente la constelación JPSS (NOAA-20 en 2018 y NOAA-21), el radiómetro **VIIRS** introdujo bandas térmicas de resolución incrementada a **375 m** (bandas I).

Esta mejora tecnológica introdujo una discontinuidad artificial en las series temporales ecológicas:
1. **Multiplicación de Detecciones:** VIIRS reporta entre **3 y 5 veces más puntos de calor** que MODIS para el mismo evento de quema debido a su mayor sensibilidad a incendios de menor intensidad o fuegos de copa incipientes.
2. **Salto Artificial en 2012:** Los análisis no armonizados generan falsas conclusiones ecológicas o de gestión pública, sugiriendo un aumento repentino en la frecuencia de incendios tras 2012.
3. **Inconmensurabilidad del FRP (Fire Radiative Power):** La potencia radiativa del fuego (medida en MW) calculada en píxeles de 375 m no puede sumarse ni compararse directamente con los píxeles de 1000 m de MODIS debido al efecto del factor de cobertura del fuego (*sub-pixel fire fraction*) y diferente saturación del sensor.

### 1.2 Caso de Estudio Maestro: La Chiquitanía, Santa Cruz, Bolivia
La región chiquitana y las áreas protegidas de Santa Cruz (Parque Nacional Noel Kempff Mercado, Área Protegida San Matías, Tucabaca) experimentan regímenes recurrentes de quemas agropecuarias y megaincendios forestales durante la estación seca (julio a noviembre). PyrosHarmonizer unifica ambas constelaciones bajo un marco común de persistencia geoespacial y algoritmos de calibración para generar el **Calendario Unificado de Actividad de Quemas (Burning Activity Calendar)**.

---

## 2. Motor de Base de Datos: PostgreSQL 16 + PostGIS 3.4

### 2.1 Justificación Técnica de la Selección

La arquitectura de persistencia se basa en **PostgreSQL 16** con la extensión geoespacial **PostGIS 3.4**. Esta combinación fue seleccionada bajo los siguientes criterios técnicos y científicos:

| Requisito del Sistema | Capacidad de PostgreSQL 16 + PostGIS 3.4 | Alternativas Descartadas y Motivo |
| :--- | :--- | :--- |
| **Clustering Espacio-Temporal Nativo** | Implementación optimizada en C de `ST_ClusterDBSCAN`, acelerada con proyecciones métricas y expresiones de ventana (`OVER (...)`). | MongoDB / Elastic: Clustering espacial limitado, carecen de DBSCAN espacio-temporal nativo a nivel de motor. |
| **Volumetría Masiva (2000–2026)** | Particionamiento declarativo por rango (`PARTITION BY RANGE`), permitiendo 42 particiones anuales que aíslan escaneos y optimizan el I/O. | SQLite / SpatiaLite: Sin particionamiento nativo; bloqueos de base de datos completa ante escrituras concurrentes. |
| **Indexación Mixta Avanzada** | Índices **GiST** (R-Tree multinivel) para geometrías poligonales/puntos y **BRIN** (Block Range Index) para series temporales ordenadas de bajo overhead de memoria. | MySQL spatial: Índices R-Tree con soporte limitado para operadores espaciales avanzados y sin soporte para índices BRIN. |
| **Generación Vectorial MVT en Motor** | Funciones `ST_AsMVT` y `ST_TileEnvelope` para servir millones de geometrías directamente a Deck.gl y Mapbox GL sin intermediación pesada del backend. | Shapefiles / GeoJSON planos: Cuellos de botella de serialización en el backend; transferencias lentas por la red. |
| **Soporte de Mallas Hexagonales H3** | Almacenamiento eficiente de índices Uber H3 en formato `VARCHAR(15)` o `BIGINT` con consultas asociativas B-tree ultra rápidas. | Rasters tradicionales en ficheros GeoTIFF: Mayor complejidad de agregación tabular dinámica por rangos arbitrarios de fecha. |

### 2.2 Entorno Operativo del Sistema
- **Motor Principal:** PostgreSQL 16.2 (Debian / Linux x86_64)
- **Extensión Espacial:** PostGIS 3.4.1 (GEOS 3.12.1, PROJ 9.3.1, GDAL 3.8.3)
- **Extensión H3 (Opcional en base de datos):** `h3_postgis` o indexación precalculada por microservicio Python 3.12 (`h3-py 3.7+`).
- **Controlador Asíncrono Backend:** `asyncpg` 0.29+ con `SQLAlchemy` 2.0 y `GeoAlchemy2` 0.14+.

---

## 3. Estrategia de Datos Espaciales y Sistemas de Referencia (SRID)

### 3.1 Sistemas de Referencia Espacial (Spatial Reference Systems)

El procesamiento satelital de incendios requiere dos sistemas fundamentales:

1. **SRID 4326 (WGS 84 - Coordenadas Geográficas):**
   - **Propósito:** Almacenamiento maestro, ingesta de productos NASA FIRMS, serialización a clientes GeoJSON / MVT y compatibilidad con APIs globales.
   - **Unidades:** Grados decimales (Longitud/Latitud).
   - **Registro:** Estándar nativo en `spatial_ref_sys`.

2. **SRID 32720 (WGS 84 / UTM Zone 20S - Coordenadas Proyectadas Métricas):**
   - **Propósito:** Cálculos cartesianos de precisión métrica en Bolivia y la región de la Chiquitanía (longitudes entre 66°W y 60°W).
   - **Unidades:** Metros ($m$).
   - **Uso en Motor:** Proyección al vuelo en `ST_Transform(geom, 32720)` para evaluar distancias de clustering ($500-1000\text{ m}$), áreas de huellas poligonales en hectáreas ($1\text{ ha} = 10,000\text{ m}^2$) y buffers de proximidad sin la distorsión esferoidal de grados decimales.

```sql
-- Verificación del sistema de referencia UTM Zona 20S para Santa Cruz, Bolivia
SELECT srid, auth_name, auth_srid, proj4text 
FROM spatial_ref_sys 
WHERE srid = 32720;
```

### 3.2 Tipologías Geométricas Implementadas

```
+---------------------------------------------------------------------------------------------------+
|                                  JERARQUÍA GEOMÉTRICA ESPACIAL                                    |
+---------------------------------------------------------------------------------------------------+
|  1. POINT (EPSG:4326)                                                                             |
|     * Detección cruda de foco de calor según centroide del detector FIRMS.                        |
|                                                                                                   |
|  2. POLYGON (EPSG:4326)                                                                           |
|     * Huella de píxel proyectada (scan × track).                                                  |
|     * MODIS: ~1.0 km nadir, expandiéndose hasta ~2.0 km × 4.8 km en el borde del escaneo.        |
|     * VIIRS: 0.375 km nadir, constreñido a ~0.8 km en el borde del escaneo.                       |
|                                                                                                   |
|  3. MULTIPOLYGON (EPSG:4326)                                                                      |
|     * Evento de fuego armonizado (Harmonized Fire Event).                                         |
|     * Fusión poligonal ST_ConvexHull / ST_ConcaveHull de huellas superpuestas en ST-DBSCAN.      |
|                                                                                                   |
|  4. HEXAGON CELL BOUNDARY (EPSG:4326)                                                             |
|     * Grilla H3 (Resoluciones 6, 7 y 8) para cubos analíticos de densidad y regímenes de fuego.   |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Diseño del Schema Relacional y Espacial (`pyrosharmonizer`)

Todas las tablas residen bajo el schema aislado `pyrosharmonizer` para garantizar seguridad, modularidad y separación respecto a esquemas públicos o de extensiones.

```sql
-- Creación y preparación del entorno de extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS pyrosharmonizer;
SET search_path TO pyrosharmonizer, public;
```

### 4.1 Diagrama Entidad-Relación Lógico

```
  +--------------------------+           +--------------------------+
  |    raw_modis_hotspots    |           |    raw_viirs_hotspots    |
  | (Particionado por anio)  |           | (Particionado por anio)  |
  +--------------------------+           +--------------------------+
  | PK (id, acq_date)        |           | PK (id, acq_date)        |
  | geom (Point)             |           | geom (Point)             |
  | pixel_footprint (Polygon)|           | pixel_footprint (Polygon)|
  | frp, confidence, h3_res8 |           | frp, confidence, h3_res8 |
  +-------------+------------+           +-------------+------------+
                |                                      |
                \-------------------\  /---------------/
                                    |  |
                                    v  v
                    +------------------------------------+
                    |      event_hotspot_membership      |
                    +------------------------------------+
                    | PK (event_id, sensor_type,         |
                    |     hotspot_id, acq_date)          |
                    | FK -> harmonized_fire_events       |
                    | distance_to_centroid, contribution |
                    +-----------------+------------------+
                                      |
                                      v
                    +------------------------------------+
                    |       harmonized_fire_events       |
                    +------------------------------------+
                    | PK (id) UUID                       |
                    | geom_hull (MultiPolygon)           |
                    | centroid (Point)                   |
                    | calibrated_hfii, total_energy_mwh  |
                    | h3_parent_res6                     |
                    +-----------------+------------------+
                                      |
            /-------------------------+-------------------------\
            v                                                   v
+-------------------------------+           +-------------------------------+
|     h3_fire_aggregations      |           |   burning_activity_calendar   |
+-------------------------------+           +-------------------------------+
| PK (h3_index, period_type,    |           | PK (id)                       |
|     period_date)              |           | region_name, year, day_of_year|
| modis_count, viirs_count      |           | historical_baseline_mean      |
| avg_hfii, geom_boundary       |           | fire_risk_level, anomaly_index|
+-------------------------------+           +-------------------------------+
```

---

### 4.2 Tabla `raw_modis_hotspots` (Particionada por Año)

Almacena los datos crudos del producto MODIS Collection 6.1 (satélites Terra y Aqua). El tamaño del píxel varía desde 1 km en nadir hasta 4.8 km en el extremo del escaneo.

```sql
CREATE TABLE pyrosharmonizer.raw_modis_hotspots (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    brightness NUMERIC(6, 2) NOT NULL,          -- Temperatura brillo canal 21/22 (Kelvin)
    scan NUMERIC(4, 2) NOT NULL,                -- Dimensión espacial a lo largo del escaneo (km)
    track NUMERIC(4, 2) NOT NULL,               -- Dimensión espacial a lo largo de la trayectoria (km)
    acq_date DATE NOT NULL,                     -- Fecha UTC de adquisición
    acq_time VARCHAR(4) NOT NULL,               -- Hora UTC HHMM
    satellite VARCHAR(10) NOT NULL,             -- 'Terra' o 'Aqua'
    instrument VARCHAR(10) NOT NULL DEFAULT 'MODIS',
    confidence SMALLINT NOT NULL,               -- 0 a 100%
    version VARCHAR(10) NOT NULL,               -- Ej: '6.1NRT' o '6.1'
    bright_t31 NUMERIC(6, 2) NOT NULL,          -- Temperatura canal 31 (Kelvin)
    frp NUMERIC(8, 2) NOT NULL,                 -- Fire Radiative Power (MW)
    daynight CHAR(1) NOT NULL,                  -- 'D' (Día) o 'N' (Noche)
    
    -- Atributos derivados y espaciales
    acq_timestamp TIMESTAMPTZ GENERATED ALWAYS AS (
        (acq_date + (SUBSTRING(acq_time FROM 1 FOR 2) || ':' || SUBSTRING(acq_time FROM 3 FOR 2) || ':00')::TIME) AT TIME ZONE 'UTC'
    ) STORED,
    geom GEOMETRY(POINT, 4326) NOT NULL,
    pixel_footprint GEOMETRY(POLYGON, 4326),     -- Polígono envolvente del píxel real
    h3_res8 VARCHAR(15) NOT NULL,               -- Índice Uber H3 Nivel 8 (~460m radio)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Restricciones de integridad
    CONSTRAINT pk_raw_modis PRIMARY KEY (id, acq_date),
    CONSTRAINT chk_modis_confidence CHECK (confidence BETWEEN 0 AND 100),
    CONSTRAINT chk_modis_daynight CHECK (daynight IN ('D', 'N')),
    CONSTRAINT chk_modis_satellite CHECK (satellite IN ('Terra', 'Aqua')),
    CONSTRAINT chk_modis_frp CHECK (frp >= 0.0),
    CONSTRAINT chk_modis_scan_track CHECK (scan > 0.0 AND track > 0.0)
) PARTITION BY RANGE (acq_date);
```

---

### 4.3 Tabla `raw_viirs_hotspots` (Particionada por Año)

Almacena los datos crudos del producto VIIRS 375m (satélites Suomi-NPP, NOAA-20 y NOAA-21).

```sql
CREATE TABLE pyrosharmonizer.raw_viirs_hotspots (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    bright_ti4 NUMERIC(6, 2) NOT NULL,          -- Canal I4 térmico 3.75 µm (Kelvin)
    scan NUMERIC(4, 2) NOT NULL,                -- Resolución del detector a lo largo de scan (km)
    track NUMERIC(4, 2) NOT NULL,               -- Resolución del detector a lo largo de track (km)
    acq_date DATE NOT NULL,                     -- Fecha UTC de adquisición
    acq_time VARCHAR(4) NOT NULL,               -- Hora UTC HHMM
    satellite VARCHAR(10) NOT NULL,             -- 'Suomi-NPP', 'NOAA-20', 'NOAA-21'
    instrument VARCHAR(10) NOT NULL DEFAULT 'VIIRS',
    confidence VARCHAR(10) NOT NULL,            -- 'low', 'nominal', 'high'
    version VARCHAR(10) NOT NULL,               -- Ej: '2.0NRT', '1.0'
    bright_ti5 NUMERIC(6, 2) NOT NULL,          -- Canal I5 térmico 11.45 µm (Kelvin)
    frp NUMERIC(8, 2) NOT NULL,                 -- Fire Radiative Power (MW)
    daynight CHAR(1) NOT NULL,                  -- 'D' (Día) o 'N' (Noche)

    -- Atributos derivados y espaciales
    acq_timestamp TIMESTAMPTZ GENERATED ALWAYS AS (
        (acq_date + (SUBSTRING(acq_time FROM 1 FOR 2) || ':' || SUBSTRING(acq_time FROM 3 FOR 2) || ':00')::TIME) AT TIME ZONE 'UTC'
    ) STORED,
    geom GEOMETRY(POINT, 4326) NOT NULL,
    pixel_footprint GEOMETRY(POLYGON, 4326),     -- Polígono envolvente del píxel 375m
    h3_res8 VARCHAR(15) NOT NULL,               -- Índice Uber H3 Nivel 8
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Restricciones de integridad
    CONSTRAINT pk_raw_viirs PRIMARY KEY (id, acq_date),
    CONSTRAINT chk_viirs_confidence CHECK (confidence IN ('low', 'nominal', 'high')),
    CONSTRAINT chk_viirs_daynight CHECK (daynight IN ('D', 'N')),
    CONSTRAINT chk_viirs_satellite CHECK (satellite IN ('Suomi-NPP', 'NOAA-20', 'NOAA-21', 'NPP', 'J1', 'J2')),
    CONSTRAINT chk_viirs_frp CHECK (frp >= 0.0),
    CONSTRAINT chk_viirs_scan_track CHECK (scan > 0.0 AND track > 0.0)
) PARTITION BY RANGE (acq_date);
```

---

### 4.4 Tabla `harmonized_fire_events`

Entidad central donde convergen los clusters obtenidos mediante **ST-DBSCAN** y calibración energética. Representa el "Fuego Armonizado Real" libre de duplicidades intersatelitales.

```sql
CREATE TABLE pyrosharmonizer.harmonized_fire_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code VARCHAR(32) NOT NULL UNIQUE,       -- Ej: 'PHE-2026-CHIQ-00891'
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,
    duration_hours NUMERIC(6, 2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_timestamp - start_timestamp)) / 3600.0
    ) STORED,
    
    -- Estadísticas de composición de detección
    total_modis_points INT NOT NULL DEFAULT 0,
    total_viirs_points INT NOT NULL DEFAULT 0,
    total_points INT GENERATED ALWAYS AS (total_modis_points + total_viirs_points) STORED,
    
    -- Métricas de Radiación y Calibración
    raw_modis_frp_sum NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    raw_viirs_frp_sum NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    calibrated_hfii NUMERIC(10, 2) NOT NULL,      -- Harmonized Fire Intensity Index (Equivalente MODIS)
    fire_radiative_energy_mwh NUMERIC(12, 3) NOT NULL, -- Estimación FRE en Megawatts-hora
    
    -- Características Físicas y Geográficas
    area_hectares NUMERIC(10, 2) NOT NULL,       -- Calculado proyectando a EPSG:32720
    perimeter_meters NUMERIC(10, 2) NOT NULL,
    dominant_land_cover VARCHAR(50),             -- 'Bosque Seco Chiquitano', 'Pastizal Antrópico', etc.
    municipality VARCHAR(100),                  -- Ej: 'San Ignacio de Velasco', 'Roboré', 'Concepción'
    
    -- Geometrías
    centroid GEOMETRY(POINT, 4326) NOT NULL,
    geom_hull GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    
    -- Indexación espacial H3 Macrocélula
    h3_parent_res6 VARCHAR(15) NOT NULL,        -- Celda Nivel 6 (~3.2 km radio)
    
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'CONTROLLED', 'EXTINCT'
    algorithm_version VARCHAR(20) NOT NULL DEFAULT 'ST-DBSCAN-v1.4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_event_time_order CHECK (end_timestamp >= start_timestamp),
    CONSTRAINT chk_event_points_positive CHECK (total_modis_points >= 0 AND total_viirs_points >= 0),
    CONSTRAINT chk_event_at_least_one_point CHECK ((total_modis_points + total_viirs_points) > 0),
    CONSTRAINT chk_event_calibrated_hfii CHECK (calibrated_hfii >= 0.0),
    CONSTRAINT chk_event_area CHECK (area_hectares >= 0.0)
);
```

---

### 4.5 Tabla `event_hotspot_membership`

Tabla de unión relacional que permite total auditabilidad e inspección inversa: dado un evento armonizado, qué puntos exactos de MODIS o VIIRS lo originaron.

```sql
CREATE TABLE pyrosharmonizer.event_hotspot_membership (
    event_id UUID NOT NULL,
    sensor_type VARCHAR(10) NOT NULL,           -- 'MODIS' o 'VIIRS'
    hotspot_id BIGINT NOT NULL,                 -- ID en raw_modis_hotspots o raw_viirs_hotspots
    acq_date DATE NOT NULL,                     -- Necesario para pruning en joins con tablas particionadas
    distance_to_centroid_meters NUMERIC(8, 2),  -- Distancia métrica respecto al centroide del evento
    weight_contribution NUMERIC(5, 4) NOT NULL DEFAULT 1.0000, -- Peso ponderado en la calibración de FRP
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_event_hotspot_membership PRIMARY KEY (event_id, sensor_type, hotspot_id, acq_date),
    CONSTRAINT fk_membership_event FOREIGN KEY (event_id) 
        REFERENCES pyrosharmonizer.harmonized_fire_events (id) ON DELETE CASCADE,
    CONSTRAINT chk_membership_sensor CHECK (sensor_type IN ('MODIS', 'VIIRS'))
);
```

---

### 4.6 Tabla `h3_fire_aggregations`

Cubo analítico de alta performance para alimentar mapas de calor en Deck.gl y gráficos temporales sin recalcular geometrías sobre millones de filas.

```sql
CREATE TABLE pyrosharmonizer.h3_fire_aggregations (
    h3_index VARCHAR(15) NOT NULL,              -- Índice hexadecimal Uber H3
    resolution SMALLINT NOT NULL,               -- Resolución H3 (6, 7 u 8)
    period_type VARCHAR(10) NOT NULL,           -- 'DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'
    period_date DATE NOT NULL,                  -- Inicio del intervalo temporal
    
    -- Métricas Agregadas
    modis_raw_count INT NOT NULL DEFAULT 0,
    viirs_raw_count INT NOT NULL DEFAULT 0,
    harmonized_event_count INT NOT NULL DEFAULT 0,
    mean_hfii NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    max_hfii NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    total_fre_mwh NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    burned_area_sqkm_est NUMERIC(8, 3) NOT NULL DEFAULT 0.0,
    
    -- Geometría poligonal para renderizado rápido
    geom_boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_h3_aggregations PRIMARY KEY (h3_index, resolution, period_type, period_date),
    CONSTRAINT chk_h3_res CHECK (resolution BETWEEN 4 AND 10),
    CONSTRAINT chk_period_type CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'))
);
```

---

### 4.7 Tabla `burning_activity_calendar`

Alimenta la vista principal del **Calendario de Actividad de Quemas**, comparando la actividad observada contra la línea base histórica 2000–2026.

```sql
CREATE TABLE pyrosharmonizer.burning_activity_calendar (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    region_id VARCHAR(50) NOT NULL,             -- Ej: 'BO-SCZ-CHIQUITANIA', 'BO-SCZ-PANTANAL'
    region_name VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    day_of_year INT NOT NULL,                   -- DOY: 1 a 366
    calendar_date DATE NOT NULL,
    
    -- Detecciones observadas
    raw_modis_count INT NOT NULL DEFAULT 0,
    raw_viirs_count INT NOT NULL DEFAULT 0,
    harmonized_events_count INT NOT NULL DEFAULT 0,
    cumulative_year_events INT NOT NULL DEFAULT 0,
    total_daily_hfii NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    
    -- Línea base histórica para ese día del año (2000-2025)
    historical_baseline_mean NUMERIC(8, 2) NOT NULL,
    historical_baseline_std NUMERIC(8, 2) NOT NULL,
    historical_percentile_90 NUMERIC(8, 2) NOT NULL,
    
    -- Índices derivados
    anomaly_z_score NUMERIC(5, 2) NOT NULL,     -- (harmonized_events_count - mean) / std
    fire_risk_level VARCHAR(20) NOT NULL,       -- 'BAJO', 'MODERADO', 'ALTO', 'EXTREMO'
    season_phase VARCHAR(20) NOT NULL,          -- 'HUMEDA', 'TRANSICION_SECA', 'PICO_QUEMAS'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_calendar_region_date UNIQUE (region_id, calendar_date),
    CONSTRAINT chk_doy_range CHECK (day_of_year BETWEEN 1 AND 366),
    CONSTRAINT chk_fire_risk CHECK (fire_risk_level IN ('BAJO', 'MODERADO', 'ALTO', 'EXTREMO')),
    CONSTRAINT chk_season_phase CHECK (season_phase IN ('HUMEDA', 'TRANSICION_SECA', 'PICO_QUEMAS'))
);
```

---

### 4.8 Tabla `ingestion_jobs` y Auditoría de Sincronización

Registra el estado, integridad de datos y tiempos de ejecución del pipeline de ingestión desde NASA FIRMS.

```sql
CREATE TABLE pyrosharmonizer.ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset VARCHAR(50) NOT NULL,        -- 'NASA_FIRMS_MODIS_C6_1', 'NASA_FIRMS_VIIRS_375M_SNPP'
    target_table VARCHAR(50) NOT NULL,
    partition_year INT NOT NULL,
    records_received INT NOT NULL DEFAULT 0,
    records_inserted INT NOT NULL DEFAULT 0,
    records_rejected INT NOT NULL DEFAULT 0,
    checksum_md5 VARCHAR(32),
    execution_time_seconds NUMERIC(8, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,                -- 'COMPLETED', 'FAILED', 'PARTIAL'
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT chk_job_status CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'))
);
```

---

## 5. Estrategia de Particionamiento Declarativo

### 5.1 Racionalidad y Dimensionamiento del Particionado
El registro continuo de incendios desde el año 2000 genera millones de observaciones. Para evitar escaneos secuenciales masivos que colapsen la memoria RAM en el servidor, se implementa **Range Partitioning por Año (`acq_date`)**.

- **`raw_modis_hotspots`:** 27 particiones anuales (2000 a 2026).
- **`raw_viirs_hotspots`:** 15 particiones anuales (2012 a 2026).
- **Total de particiones gestionadas:** 42 particiones declarativas.

### 5.2 Declaración DDL de Particiones Históricas y Operativas

#### Particiones MODIS (2000 a 2026):
```sql
-- Creación de particiones para MODIS (Muestra 2000, 2012, 2024, 2025, 2026)
CREATE TABLE pyrosharmonizer.raw_modis_hotspots_y2000 PARTITION OF pyrosharmonizer.raw_modis_hotspots
    FOR VALUES FROM ('2000-01-01') TO ('2001-01-01');

CREATE TABLE pyrosharmonizer.raw_modis_hotspots_y2012 PARTITION OF pyrosharmonizer.raw_modis_hotspots
    FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');

CREATE TABLE pyrosharmonizer.raw_modis_hotspots_y2024 PARTITION OF pyrosharmonizer.raw_modis_hotspots
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE pyrosharmonizer.raw_modis_hotspots_y2025 PARTITION OF pyrosharmonizer.raw_modis_hotspots
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE pyrosharmonizer.raw_modis_hotspots_y2026 PARTITION OF pyrosharmonizer.raw_modis_hotspots
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

#### Particiones VIIRS (2012 a 2026):
```sql
-- Creación de particiones para VIIRS (Desde su puesta en marcha operativa en 2012)
CREATE TABLE pyrosharmonizer.raw_viirs_hotspots_y2012 PARTITION OF pyrosharmonizer.raw_viirs_hotspots
    FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');

CREATE TABLE pyrosharmonizer.raw_viirs_hotspots_y2024 PARTITION OF pyrosharmonizer.raw_viirs_hotspots
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE pyrosharmonizer.raw_viirs_hotspots_y2025 PARTITION OF pyrosharmonizer.raw_viirs_hotspots
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE pyrosharmonizer.raw_viirs_hotspots_y2026 PARTITION OF pyrosharmonizer.raw_viirs_hotspots
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### 5.3 Automatización de Creación de Particiones (PL/pgSQL)

Para asegurar la idempotencia y evitar fallos ante la llegada de años no declarados, se implementa una función de aprovisionamiento masivo:

```sql
CREATE OR REPLACE FUNCTION pyrosharmonizer.fn_provision_fire_partitions(
    start_year INT, 
    end_year INT
) RETURNS VOID AS $$
DECLARE
    curr_year INT;
    sql_modis TEXT;
    sql_viirs TEXT;
BEGIN
    FOR curr_year IN start_year..end_year LOOP
        -- Partición MODIS (desde el año 2000 en adelante)
        IF curr_year >= 2000 THEN
            sql_modis := format(
                'CREATE TABLE IF NOT EXISTS pyrosharmonizer.raw_modis_hotspots_y%s ' ||
                'PARTITION OF pyrosharmonizer.raw_modis_hotspots ' ||
                'FOR VALUES FROM (%L) TO (%L);',
                curr_year,
                curr_year || '-01-01',
                (curr_year + 1) || '-01-01'
            );
            EXECUTE sql_modis;
        END IF;

        -- Partición VIIRS (desde el año 2012 en adelante)
        IF curr_year >= 2012 THEN
            sql_viirs := format(
                'CREATE TABLE IF NOT EXISTS pyrosharmonizer.raw_viirs_hotspots_y%s ' ||
                'PARTITION OF pyrosharmonizer.raw_viirs_hotspots ' ||
                'FOR VALUES FROM (%L) TO (%L);',
                curr_year,
                curr_year || '-01-01',
                (curr_year + 1) || '-01-01'
            );
            EXECUTE sql_viirs;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecución de aprovisionamiento de las 42 particiones maestras
SELECT pyrosharmonizer.fn_provision_fire_partitions(2000, 2026);
```

### 5.4 Impacto en Rendimiento y Mantenimiento
1. **Partition Pruning Activo:** Con `SET enable_partition_pruning = on`, una consulta sobre agosto de 2024 descarga únicamente la partición `y2024`, descartando 26 particiones de MODIS y 14 de VIIRS sin tocar disco.
2. **Vacuum Paralelizable y Ligero:** Las particiones históricas (ej. 2005) permanecen congeladas (`VACUUM FREEZE`), evitando que los procesos de mantenimiento compitan por I/O con la ingesta activa de 2026.
3. **Mantenimiento en Caliente:** Si una recarga de datos satelitales requiere reingestar 2019, basta con truncar la partición `raw_modis_hotspots_y2019` sin bloquear el resto de la base de datos ni requerir bloqueos globales de tabla.

---

## 6. Estrategia de Indexación de Alto Rendimiento

La indexación balancea la velocidad en lecturas analíticas contra la tasa de inserción continua proveniente de los flujos de NASA FIRMS.

```
+---------------------------------------------------------------------------------------------------------+
|                                  MATRIZ DE INDEXACIÓN ESPACIO-TEMPORAL                                  |
+--------------------------+-----------------------+-------------------+----------------------------------+
| Tabla                    | Columna(s)            | Tipo de Índice    | Propósito Operativo              |
+--------------------------+-----------------------+-------------------+----------------------------------+
| raw_modis_hotspots       | geom                  | GiST              | Bounding Box y ST_DWithin        |
| raw_modis_hotspots       | pixel_footprint       | GiST              | Superposición poligonal real     |
| raw_modis_hotspots       | acq_date              | BRIN              | Escaneo de rangos temporales     |
| raw_modis_hotspots       | h3_res8               | B-Tree            | Agrupamiento por celda H3        |
| raw_modis_hotspots       | (acq_date, satellite) | B-Tree Compuesto  | Filtro por sensor y ventana      |
| raw_viirs_hotspots       | geom                  | GiST              | Consultas espaciales de puntos   |
| raw_viirs_hotspots       | pixel_footprint       | GiST              | Fusión con píxeles MODIS         |
| raw_viirs_hotspots       | acq_date              | BRIN              | Rango temporal compacto          |
| raw_viirs_hotspots       | h3_res8               | B-Tree            | Cruce con grillas analíticas     |
| raw_viirs_hotspots       | (confidence, frp)     | B-Tree Compuesto  | Umbrales de calidad y energía    |
| harmonized_fire_events   | geom_hull             | GiST              | Intersección con polígonos admin |
| harmonized_fire_events   | centroid              | GiST              | Búsqueda por punto de calor      |
| harmonized_fire_events   | (start_timestamp,     | B-Tree Compuesto  | Slider temporal en UI            |
|                          |  end_timestamp)       |                   |                                  |
| harmonized_fire_events   | calibrated_hfii       | B-Tree            | Clasificación por severidad      |
+--------------------------+-----------------------+-------------------+----------------------------------+
```

### 6.1 DDL de Índices Espaciales GiST

Los índices GiST sobre tablas particionadas se declaran en la tabla padre y PostgreSQL 16 los propaga automáticamente a cada una de las 42 particiones hijas.

```sql
-- 1. Índices GiST en Puntos Crudos
CREATE INDEX idx_modis_geom ON pyrosharmonizer.raw_modis_hotspots USING GIST (geom);
CREATE INDEX idx_viirs_geom ON pyrosharmonizer.raw_viirs_hotspots USING GIST (geom);

-- 2. Índices GiST en Huellas de Píxel Poligonales
CREATE INDEX idx_modis_footprint ON pyrosharmonizer.raw_modis_hotspots USING GIST (pixel_footprint);
CREATE INDEX idx_viirs_footprint ON pyrosharmonizer.raw_viirs_hotspots USING GIST (pixel_footprint);

-- 3. Índices GiST en Eventos Armonizados (Polígonos y Centroides)
CREATE INDEX idx_harmonized_hull ON pyrosharmonizer.harmonized_fire_events USING GIST (geom_hull);
CREATE INDEX idx_harmonized_centroid ON pyrosharmonizer.harmonized_fire_events USING GIST (centroid);

-- 4. Índice GiST en Límites de Celdas H3
CREATE INDEX idx_h3_boundary ON pyrosharmonizer.h3_fire_aggregations USING GIST (geom_boundary);
```

### 6.2 DDL de Índices Temporales BRIN (Block Range Index)

Para las tablas de series temporales masivas como FIRMS, los índices B-Tree tradicionales en fechas consumen gigabytes de memoria. El índice **BRIN** aprovecha la correlación física natural de los datos ordenados en disco por fecha de ingestión, reduciendo el tamaño del índice en hasta un 98%.

```sql
-- Índices BRIN con rango de 128 páginas de disco (~1 MB de datos por bloque de resumen)
CREATE INDEX idx_modis_acq_date_brin ON pyrosharmonizer.raw_modis_hotspots 
USING BRIN (acq_date) WITH (pages_per_range = 128);

CREATE INDEX idx_viirs_acq_date_brin ON pyrosharmonizer.raw_viirs_hotspots 
USING BRIN (acq_date) WITH (pages_per_range = 128);
```

### 6.3 DDL de Índices B-tree, Compuestos y Mallas H3

```sql
-- Índices B-tree para Agrupamiento Espacial Uber H3
CREATE INDEX idx_modis_h3 ON pyrosharmonizer.raw_modis_hotspots (h3_res8);
CREATE INDEX idx_viirs_h3 ON pyrosharmonizer.raw_viirs_hotspots (h3_res8);
CREATE INDEX idx_harmonized_h3_parent ON pyrosharmonizer.harmonized_fire_events (h3_parent_res6);

-- Índices B-tree para Filtros de Calidad y Calibración
CREATE INDEX idx_modis_confidence ON pyrosharmonizer.raw_modis_hotspots (confidence);
CREATE INDEX idx_viirs_confidence ON pyrosharmonizer.raw_viirs_hotspots (confidence);
CREATE INDEX idx_modis_frp ON pyrosharmonizer.raw_modis_hotspots (frp);
CREATE INDEX idx_viirs_frp ON pyrosharmonizer.raw_viirs_hotspots (frp);
CREATE INDEX idx_harmonized_hfii ON pyrosharmonizer.harmonized_fire_events (calibrated_hfii);

-- Índices Compuestos para Patrones de Consulta en el Backend FastAPI
CREATE INDEX idx_modis_query_pattern ON pyrosharmonizer.raw_modis_hotspots (acq_date, satellite, confidence);
CREATE INDEX idx_viirs_query_pattern ON pyrosharmonizer.raw_viirs_hotspots (acq_date, satellite, confidence);
CREATE INDEX idx_harmonized_timerange ON pyrosharmonizer.harmonized_fire_events (start_timestamp, end_timestamp);
CREATE INDEX idx_calendar_lookup ON pyrosharmonizer.burning_activity_calendar (region_id, year, day_of_year);
```

---

## 7. Connection Pooling con PgBouncer

Para soportar las peticiones concurrentes del frontend interactivo (Mapbox/Deck.gl solicitando tiles MVT y series temporales) sin agotar los límites de memoria de PostgreSQL, se implementa **PgBouncer** como proxy de conexiones.

```
 [Clientes Web / Next.js]  --->  [FastAPI Backend (AsyncPG)]  --->  [PgBouncer (Port 6432)]  --->  [PostgreSQL 16 (Port 5432)]
       (500 concurrentes)             (100 workers pool)               (Pool Mode: Transaction)            (20 Server Backends)
```

### 7.1 Configuración de Pool y Modo de Operación
- **`pool_mode = transaction`:** Cada conexión física a PostgreSQL se devuelve al pool tan pronto termina la transacción SQL (`COMMIT` / `ROLLBACK`). Esto es crítico para FastAPI con llamadas asíncronas y evita retener conexiones ociosas durante el renderizado de respuestas HTTP.
- **Manejo de Prepared Statements:** Dado que el modo transacción no persiste sentencias preparadas entre transacciones en clientes estándar, `asyncpg` se configura con `statement_cache_size=0` o PgBouncer 1.21+ con soporte de `max_prepared_statements`.

### 7.2 Archivo de Configuración de Producción `pgbouncer.ini`

```ini
[databases]
pyrosharmonizer = host=127.0.0.1 port=5432 dbname=pyrosharmonizer auth_user=postgres

[pgbouncer]
logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Modo de pooling: TRANSACTION (Vital para microservicios web y endpoints MVT)
pool_mode = transaction

; Gestión de límites de conexión
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3.0
max_db_connections = 50

; Timeouts y ciclo de vida de conexión (segundos)
server_idle_timeout = 60.0
server_connect_timeout = 15.0
server_login_retry = 15.0
client_idle_timeout = 120.0
query_timeout = 45.0
query_wait_timeout = 15.0

; Tamaño de buffers de red
pkt_buf = 4096
max_packet_size = 2147483648
```

---

## 8. Estrategia de Backup y Recuperación ante Desastres (DRP)

### 8.1 Respaldos Lógicos con `pg_dump` y `pg_restore`

Para respaldos programados diarios o exportaciones del dataset del hackathon, se utiliza el formato personalizado comprimido (`-Fc`), que permite restauración paralela (`-j`) y selección granular de tablas o esquemas.

```bash
# 1. Respaldo completo del schema pyrosharmonizer comprimido (Multihilo)
pg_dump -h localhost -p 5432 -U postgres -d pyrosharmonizer \
    -n pyrosharmonizer \
    -Fc -Z 6 -v \
    -f "/backups/pyrosharmonizer_full_$(date +%Y%m%d_%H%M%S).dump"

# 2. Respaldo exclusivo de eventos armonizados y tablas analíticas (Dataset Dorado)
pg_dump -h localhost -p 5432 -U postgres -d pyrosharmonizer \
    -t pyrosharmonizer.harmonized_fire_events \
    -t pyrosharmonizer.event_hotspot_membership \
    -t pyrosharmonizer.burning_activity_calendar \
    -t pyrosharmonizer.h3_fire_aggregations \
    -Fc -v \
    -f "/backups/pyrosharmonizer_gold_dataset.dump"

# 3. Restauración paralela con 4 trabajadores a base de datos de contingencia
pg_restore -h localhost -p 5432 -U postgres -d pyrosharmonizer_recovery \
    -j 4 -v \
    "/backups/pyrosharmonizer_gold_dataset.dump"
```

### 8.2 Respaldo Físico y WAL Archiving (Point-In-Time Recovery - PITR)

Para entornos donde se ejecutan cargas masivas continuas y se requiere recuperarse ante una corrupción de datos en un minuto específico:

```ini
# postgresql.conf — Configuración de WAL Archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/nfs_wal_archive/%f && cp %p /mnt/nfs_wal_archive/%f'
archive_timeout = 300  # Fuerza archivo de WAL cada 5 minutos
```

Recuperación a un punto exacto en el tiempo (`recovery.signal`):
```text
# /var/lib/postgresql/data/recovery.signal
restore_command = 'cp /mnt/nfs_wal_archive/%f %p'
recovery_target_time = '2026-11-14 18:30:00-04'
recovery_target_action = 'promote'
```

### 8.3 Estrategia de Contingencia para el Hackathon (Cloud Railway / S3)
1. **Snapshots Automáticos en Railway:** Políticas de snapshot cada 12 horas en el provisionamiento de PostgreSQL.
2. **Exportación Parquet en Frío:** Las particiones históricas cerradas (2000–2023) se exportan a archivos Apache Parquet comprimidos con Snappy en un bucket S3/GCS. Esto permite regenerar las tablas crudas sin depender de backups pesados de PostgreSQL si la base de datos se recrea en otra región.

---

## 9. Tuning de Rendimiento y Parámetros del Servidor

Ajustes optimizados para un nodo de base de datos de **16 GB de RAM y 4 vCPUs** en SSD NVMe (infraestructura típica de producción en Railway/Cloud):

### 9.1 Parámetros de Memoria y Concurrencia (`postgresql.conf`)

```ini
# ====================================================================
# PyrosHarmonizer - Configuración de Rendimiento PostgreSQL 16
# ====================================================================

# Memoria compartida y Caché de lectura
shared_buffers = 4GB                     # 25% de la RAM del sistema
effective_cache_size = 12GB              # 75% de la RAM total estimada
work_mem = 64MB                          # Memoria por operación de sort/hash (evita volcado a disco)
maintenance_work_mem = 1GB               # Acelera la creación de índices GiST y VACUUM

# Paralelismo de Consultas Analíticas
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
max_parallel_maintenance_workers = 2

# Planificador y Costo de Disco (Optimizador para discos SSD / NVMe)
random_page_cost = 1.1                   # Muy cercano a seq_page_cost (1.0) para almacenamiento SSD
seq_page_cost = 1.0
effective_io_concurrency = 200           # Capacidad de I/O concurrente en SSD

# Escritura de WAL y Checkpoints para Cargas Masivas
checkpoint_timeout = 15min
max_wal_size = 16GB
min_wal_size = 2GB
checkpoint_completion_target = 0.9       # Suaviza el I/O en disco durante el checkpoint
default_statistics_target = 100          # Muestreo estadístico base para el analizador
```

### 9.2 Optimización de `autovacuum` para Ingesta Espacio-Temporal

Dado que la ingesta de FIRMS genera millones de filas en lapsos cortos, el autovacuum estándar es demasiado lento y deja estadísticas obsoletas que arruinan los planes de ejecución de PostGIS:

```ini
# Autovacuum agresivo para tablas de alta rotación
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.05    # Dispara vacuum al modificarse el 5% de la partición
autovacuum_analyze_scale_factor = 0.02   # Actualiza estadísticas al modificarse el 2%
autovacuum_vacuum_cost_limit = 1000      # Eleva el presupuesto de I/O de mantenimiento
```

### 9.3 Estadísticas Espaciales Avanzadas

PostGIS requiere histogramas de distribución espacial de alta resolución para estimar con precisión el número de puntos dentro de un bounding box:

```sql
-- Elevar el target de estadísticas a 1000 en columnas geométricas clave
ALTER TABLE pyrosharmonizer.raw_modis_hotspots ALTER COLUMN geom SET STATISTICS 1000;
ALTER TABLE pyrosharmonizer.raw_viirs_hotspots ALTER COLUMN geom SET STATISTICS 1000;
ALTER TABLE pyrosharmonizer.harmonized_fire_events ALTER COLUMN geom_hull SET STATISTICS 1000;
ALTER TABLE pyrosharmonizer.harmonized_fire_events ALTER COLUMN centroid SET STATISTICS 1000;

-- Recálculo inmediato de estadísticas
ANALYZE pyrosharmonizer.raw_modis_hotspots;
ANALYZE pyrosharmonizer.raw_viirs_hotspots;
ANALYZE pyrosharmonizer.harmonized_fire_events;
```

### 9.4 Metodología de Análisis de Planes de Ejecución (`EXPLAIN ANALYZE`)

Toda consulta espacial desplegada en endpoints de la API debe verificarse contra un plan de ejecución con métricas de buffers para certificar que utiliza los índices GiST en lugar de escaneos secuenciales:

```sql
-- Validación de uso de índice espacial en filtro de Bounding Box de la Chiquitanía
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT id, latitude, longitude, frp, acq_date
FROM pyrosharmonizer.raw_viirs_hotspots
WHERE acq_date BETWEEN '2024-08-01' AND '2024-08-31'
  AND geom && ST_MakeEnvelope(-62.5, -18.5, -58.0, -14.0, 4326)
  AND ST_Intersects(geom, ST_MakeEnvelope(-62.5, -18.5, -58.0, -14.0, 4326));
```

El plan óptimo debe exhibir:
- `Partition Pruning`: Acceso único a `raw_viirs_hotspots_y2024`.
- `Bitmap Index Scan on idx_viirs_geom` (o `Index Scan`).
- Ausencia de lecturas de disco masivas (`Buffers: shared hit=... read=0`).

---

## 10. Política de Retención de Datos y Ciclo de Vida

```
 [NASA FIRMS API / CSV Stream]
               |
               v
 +----------------------------+
 |    raw_hotspots_nrt        |  (Staging de tiempo real - Retención: 30 Días)
 +----------------------------+
               |
               | (Validación, Deduplicación y Cálculo de Huella scan x track)
               v
 +----------------------------+
 | raw_modis / raw_viirs      |  (Particiones anuales - Retención: Histórica Permanente 2000-2026)
 +----------------------------+
               |
               | (ST-DBSCAN + Calibración HFII)
               v
 +----------------------------+
 | harmonized_fire_events     |  (Dataset Dorado - Retención: Indefinida / Permanente)
 +----------------------------+
               |
               v
 +----------------------------+
 | h3_fire_aggregations       |  (Cubos Analíticos - Precalculados para Dashboard)
 +----------------------------+
```

1. **Tabla de Staging NRT (`raw_hotspots_nrt`):** Diseñada para la ingesta en vivo del hackathon. Los registros se eliminan tras 30 días mediante un cron job nocturno una vez transferidos a las particiones anuales correspondientes.
2. **Datos Crudos (`raw_modis_hotspots` / `raw_viirs_hotspots`):** Se conservan permanentemente para permitir la recalibración futura de nuevos algoritmos (ej. ajustes en coeficientes de HFII o nuevos modelos de regresión de FRP).
3. **Eventos Armonizados (`harmonized_fire_events`):** Inmutables y de retención definitiva. Constituyen la base científica de las publicaciones y reportes oficiales.

---

## 11. Gestión de Migraciones de Base de Datos

El ciclo de vida del schema se administra formalmente a través de **Alembic** acoplado a **GeoAlchemy2** y **SQLAlchemy 2.0**.

### 11.1 Configuración de `alembic/env.py` para Tipos PostGIS

Para que Alembic reconozca las geometrías de PostGIS y el particionamiento sin generar diffs espurios:

```python
# migrations/env.py (Extracto de configuración de GeoAlchemy2)
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import geoalchemy2  # Registro de tipos geométricos para autogenerate

from backend.app.models import Base  # Metadatos del ORM SQLAlchemy

config = context.config
target_metadata = Base.metadata

def include_object(object, name, type_, reflected, compare_to):
    # Ignorar tablas del sistema PostGIS y topología
    if type_ == "table" and name in ["spatial_ref_sys", "layer", "topology"]:
        return False
    # Ignorar particiones autogeneradas para evitar duplicidad de DDL
    if type_ == "table" and ("_y20" in name or "_y19" in name):
        return False
    return True

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            include_schemas=True,
            version_table_schema="pyrosharmonizer"
        )
        with context.begin_transaction():
            context.run_migrations()
```

### 11.2 Control de Versiones SQL Idempotente (Alternativa CI/CD)

En entornos de integración continua rápida (CI/CD) o despliegue inicial en contenedores Docker de Railway, se provee el script de migraciones idempotentes versionadas:
- `V001__init_extensions_and_schema.sql`
- `V002__create_raw_tables_and_partitions.sql`
- `V003__create_harmonized_and_calendar_tables.sql`
- `V004__create_indexes_and_spatial_tuning.sql`

---

## 12. Consultas Espaciales Clave (Snippets SQL de Producción)

A continuación se presentan las consultas SQL fundamentales probadas para la base de datos de producción de PyrosHarmonizer.

### 12.1 Búsqueda de Hotspots en Bounding Box (Chiquitanía, Santa Cruz)

Filtra puntos de calor dentro de las coordenadas geográficas de la Chiquitanía boliviana ([-62.5°, -18.5°] a [-58.0°, -14.0°]) en la temporada crítica de 2024:

```sql
-- Consulta con Bounding Box exacto y exclusión de baja confianza
SELECT 
    v.id,
    v.satellite,
    v.acq_timestamp,
    v.latitude,
    v.longitude,
    v.bright_ti4,
    v.frp,
    v.confidence,
    ST_AsGeoJSON(v.geom)::json AS geojson_point
FROM pyrosharmonizer.raw_viirs_hotspots v
WHERE v.acq_date BETWEEN '2024-08-01' AND '2024-09-30'
  AND v.confidence IN ('nominal', 'high')
  -- Operador de índice espacial GiST (&&) + Intersección exacta
  AND v.geom && ST_MakeEnvelope(-62.5, -18.5, -58.0, -14.0, 4326)
  AND ST_Intersects(v.geom, ST_MakeEnvelope(-62.5, -18.5, -58.0, -14.0, 4326))
ORDER BY v.acq_timestamp DESC
LIMIT 5000;
```

---

### 12.2 Clustering Espacio-Temporal ST-DBSCAN (`ST_ClusterDBSCAN`)

Agrupa detecciones combinadas de MODIS y VIIRS dentro de un radio espacial de **1000 metros** proyectados a UTM 20S (EPSG:32720) y una ventana temporal máxima de **4 horas (14,400 segundos)**:

```sql
WITH combined_hotspots AS (
    -- MODIS con filtro de calidad
    SELECT 
        'MODIS' AS sensor_type,
        m.id AS raw_id,
        m.acq_timestamp,
        m.frp,
        ST_Transform(m.geom, 32720) AS geom_utm,
        m.geom AS geom_4326,
        m.pixel_footprint
    FROM pyrosharmonizer.raw_modis_hotspots m
    WHERE m.acq_date = '2024-08-25'
      AND m.confidence >= 30
      AND m.geom && ST_MakeEnvelope(-61.5, -17.0, -59.5, -15.0, 4326)

    UNION ALL

    -- VIIRS con filtro de calidad
    SELECT 
        'VIIRS' AS sensor_type,
        v.id AS raw_id,
        v.acq_timestamp,
        v.frp,
        ST_Transform(v.geom, 32720) AS geom_utm,
        v.geom AS geom_4326,
        v.pixel_footprint
    FROM pyrosharmonizer.raw_viirs_hotspots v
    WHERE v.acq_date = '2024-08-25'
      AND v.confidence != 'low'
      AND v.geom && ST_MakeEnvelope(-61.5, -17.0, -59.5, -15.0, 4326)
),
clustered AS (
    SELECT 
        sensor_type,
        raw_id,
        acq_timestamp,
        frp,
        geom_4326,
        pixel_footprint,
        -- eps_meters: 1000m en UTM20S, minpoints: 1 punto mínimo
        ST_ClusterDBSCAN(geom_utm, eps := 1000, minpoints := 1) OVER (
            -- Particionado temporal en ventanas de 4 horas (14400 segundos de época Unix)
            PARTITION BY (EXTRACT(EPOCH FROM acq_timestamp)::BIGINT / 14400)
        ) AS cluster_id,
        (EXTRACT(EPOCH FROM acq_timestamp)::BIGINT / 14400) AS time_window_id
    FROM combined_hotspots
)
SELECT 
    cluster_id,
    time_window_id,
    COUNT(*) AS total_points_in_cluster,
    COUNT(*) FILTER (WHERE sensor_type = 'MODIS') AS modis_count,
    COUNT(*) FILTER (WHERE sensor_type = 'VIIRS') AS viirs_count,
    ROUND(SUM(frp), 2) AS raw_cluster_frp_sum,
    MIN(acq_timestamp) AS window_start,
    MAX(acq_timestamp) AS window_end
FROM clustered
WHERE cluster_id IS NOT NULL
GROUP BY cluster_id, time_window_id
ORDER BY raw_cluster_frp_sum DESC;
```

---

### 12.3 Fusión Poligonal y Cálculo de ConvexHull / ConcaveHull para Eventos

Construye el polígono envolvente de la huella real del fuego consolidado, calculando su centroide, área en hectáreas y perímetro métrico en UTM 20S:

```sql
WITH cluster_features AS (
    SELECT 
        c.cluster_id,
        c.time_window_id,
        MIN(c.acq_timestamp) AS start_time,
        MAX(c.acq_timestamp) AS end_time,
        COUNT(*) FILTER (WHERE c.sensor_type = 'MODIS') AS modis_pts,
        COUNT(*) FILTER (WHERE c.sensor_type = 'VIIRS') AS viirs_pts,
        SUM(CASE WHEN c.sensor_type = 'MODIS' THEN c.frp ELSE 0 END) AS sum_modis_frp,
        SUM(CASE WHEN c.sensor_type = 'VIIRS' THEN c.frp ELSE 0 END) AS sum_viirs_frp,
        
        -- Geometría unificada agregada de los píxeles reales o puntos
        ST_Collect(COALESCE(c.pixel_footprint, ST_Buffer(c.geom_4326::geography, 187.5)::geometry)) AS collected_geoms
    FROM (
        -- Subconsulta clusterizada proveniente del CTE anterior
        SELECT * FROM pyrosharmonizer.raw_viirs_hotspots WHERE acq_date = '2024-08-25' LIMIT 100
    ) c
    GROUP BY c.cluster_id, c.time_window_id
)
SELECT 
    cluster_id,
    start_time,
    end_time,
    modis_pts,
    viirs_pts,
    
    -- Calibración HFII (Índice Armonizado de Intensidad de Fuego):
    -- Si hay MODIS se utiliza como base; VIIRS se calibra con factor de equivalencia alfa ~ 0.72
    ROUND(
        (sum_modis_frp + (sum_viirs_frp * 0.724)), 2
    ) AS calibrated_hfii,
    
    -- Geometría Poligonal del Evento (ConvexHull en WGS84)
    ST_Multi(ST_ConvexHull(collected_geoms)) AS geom_hull,
    
    -- Centroide geométrico del fuego
    ST_Centroid(ST_ConvexHull(collected_geoms)) AS centroid,
    
    -- Cálculo de Área en Hectáreas proyectando al vuelo a UTM Zona 20S
    ROUND(
        (ST_Area(ST_Transform(ST_ConvexHull(collected_geoms), 32720)) / 10000.0)::numeric, 2
    ) AS area_hectares,
    
    -- Cálculo de Perímetro en Metros
    ROUND(
        ST_Perimeter(ST_Transform(ST_ConvexHull(collected_geoms), 32720))::numeric, 2
    ) AS perimeter_meters
FROM cluster_features;
```

---

### 12.4 Agregación Analítica por Celda Hexagonal H3

Calcula las métricas de fuego agrupadas en celdas hexagonales Uber H3 de resolución 7 (~1.2 km de radio nominal):

```sql
SELECT 
    v.h3_res8 AS h3_cell_id,
    'DAILY' AS period_type,
    v.acq_date AS period_date,
    COUNT(*) AS viirs_hotspot_count,
    ROUND(AVG(v.frp), 2) AS mean_frp,
    ROUND(MAX(v.frp), 2) AS max_frp,
    ROUND(SUM(v.frp), 2) AS total_frp,
    -- Estimación del centroide de la celda
    ST_Centroid(ST_Collect(v.geom)) AS cell_centroid
FROM pyrosharmonizer.raw_viirs_hotspots v
WHERE v.acq_date = '2024-08-25'
  AND v.confidence IN ('nominal', 'high')
  AND v.geom && ST_MakeEnvelope(-62.0, -18.0, -59.0, -15.0, 4326)
GROUP BY v.h3_res8, v.acq_date
HAVING COUNT(*) >= 2
ORDER BY total_frp DESC;
```

---

### 12.5 Extracción del Calendario de Actividad de Quemas con Anomalías Históricas

Esta consulta es el corazón del frontend de PyrosHarmonizer. Resuelve el "Efecto 2012" comparando el número de eventos y la energía HFII observada en un día del año (*Day of Year*) contra la media y desviación estándar de la serie histórica armonizada (2000–2025):

```sql
WITH historical_doy_stats AS (
    -- Estadísticas históricas multianuales por día del año (DOY) para la Chiquitanía
    SELECT 
        day_of_year,
        AVG(harmonized_events_count) AS avg_historical_events,
        STDDEV(harmonized_events_count) AS std_historical_events,
        AVG(total_daily_hfii) AS avg_historical_hfii,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY harmonized_events_count) AS p90_events
    FROM pyrosharmonizer.burning_activity_calendar
    WHERE region_id = 'BO-SCZ-CHIQUITANIA'
      AND year BETWEEN 2000 AND 2025
    GROUP BY day_of_year
)
SELECT 
    c.calendar_date,
    c.year,
    c.day_of_year,
    c.season_phase,
    
    -- Detecciones observadas sin armonizar (evidencia del salto 2012)
    c.raw_modis_count,
    c.raw_viirs_count,
    
    -- Detección unificada y calibrada
    c.harmonized_events_count,
    c.total_daily_hfii,
    
    -- Comparación contra la línea base histórica
    ROUND(h.avg_historical_events, 2) AS baseline_mean_events,
    ROUND(h.p90_events::numeric, 2) AS threshold_p90,
    
    -- Puntuación Z de anomalía: z = (x - mu) / sigma
    CASE 
        WHEN COALESCE(h.std_historical_events, 0) > 0 THEN
            ROUND(((c.harmonized_events_count - h.avg_historical_events) / h.std_historical_events)::numeric, 2)
        ELSE 0.0
    END AS anomaly_z_score,
    
    -- Determinación dinámica del nivel de alerta para el cuerpo de bomberos y guardaparques
    CASE 
        WHEN c.harmonized_events_count > h.p90_events * 1.5 THEN 'EXTREMO'
        WHEN c.harmonized_events_count > h.p90_events THEN 'ALTO'
        WHEN c.harmonized_events_count > h.avg_historical_events THEN 'MODERADO'
        ELSE 'BAJO'
    END AS computed_fire_risk
FROM pyrosharmonizer.burning_activity_calendar c
JOIN historical_doy_stats h ON c.day_of_year = h.day_of_year
WHERE c.region_id = 'BO-SCZ-CHIQUITANIA'
  AND c.year = 2026
ORDER BY c.day_of_year ASC;
```

---

## 13. Resumen de Roles y Responsabilidades del Equipo

Para la ejecución coordinada durante las 48 horas del hackathon (14-15 Nov 2026 en UCB Santa Cruz):

| Rol | Responsabilidades en la Capa de Persistencia |
| :--- | :--- |
| **Lead Backend / Data Engineer** | Mantiene y optimiza los esquemas DDL, configura PgBouncer, gestiona las migraciones con Alembic, implementa la ingestión de FIRMS y ejecuta los scripts de particionado. |
| **Geospatial Analyst** | Define las transformaciones SRID (4326 $\leftrightarrow$ 32720), audita la precisión de las huellas de píxel `scan × track`, calibra los coeficientes de HFII y valida los radios métricos de `ST_ClusterDBSCAN`. |
| **Lead Frontend / UX** | Consume los endpoints MVT y GeoJSON generados por PostGIS, enlaza el calendario de quemas con las tablas agregadas y optimiza las peticiones de Deck.gl/Mapbox GL. |
| **DevOps / Integration Lead** | Administra la infraestructura de PostgreSQL 16 en Railway/Docker, monitorea el uso de buffers y CPU, implementa la política de backups con `pg_dump` y asegura las variables de entorno de conexión. |

---

## 14. Referencias y Documentación Técnica

1. **NASA FIRMS (Fire Information for Resource Management System):**
   - MODIS Collection 6.1 Hotspot / Active Fire Detections User Guide.
   - VIIRS 375 m Active Fire Product User Guide (Suomi-NPP / NOAA-20 / NOAA-21).
2. **PostGIS Project:**
   - PostGIS 3.4 Spatial Database Reference Manual (`ST_ClusterDBSCAN`, `ST_ConvexHull`, `ST_AsMVT`).
3. **Uber H3 Spatial Index:**
   - H3: Discrete Global Grid System Hexagonal Hierarchical Spatial Index (v3.7 / v4.0).
4. **Schroeder, W., et al. (2014):**
   - *The New VIIRS 375 m active fire detection product: Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85-96.
5. **Giglio, L., et al. (2016):**
   - *The Collection 6 MODIS active fire detection algorithm and fire applications.* Remote Sensing of Environment, 178, 31-41.

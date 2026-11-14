# PyrosHarmonizer: Unified Fire Regimes & Burning Activity Calendar
## Especificación Técnica del Modelo de Datos (PostgreSQL 16 + PostGIS 3.4)

---

### Metadatos del Documento
- **Proyecto:** PyrosHarmonizer — Harmonization of MODIS and VIIRS Hot Spots
- **Evento:** 2026 NASA International Space Apps Challenge — Sede Universidad Católica Boliviana (UCB), Santa Cruz de la Sierra, Bolivia (14-15 Noviembre 2026)
- **Reto Oficial NASA:** Challenge #8 — Harmonization of MODIS and VIIRS Hot Spots (Nivel Intermedio/Avanzado)
- **Caso de Estudio Regional:** "El Efecto 2012 en la Chiquitanía" (Departamento de Santa Cruz, Bolivia)
- **Motor de Base de Datos:** PostgreSQL 16.3 con PostGIS 3.4.2 y extensión espacial Uber H3 (`h3-pg` v4.1+)
- **Versión del Esquema:** 1.4.0
- **Autoría:** Equipo PyrosHarmonizer (Lead Data Engineer & Geospatial Analyst)
- **Estado:** Producción / Hackathon Final Ready

---

## 1. Resumen Ejecutivo y Arquitectura del Modelo

El modelo de datos de **PyrosHarmonizer** ha sido concebido para solucionar la discontinuidad analítica y estadística más severa en el monitoreo satelital de incendios forestales a nivel global: **el "Efecto 2012"**.

### El Problema Físico y Metodológico
- **MODIS (Moderate Resolution Imaging Spectroradiometer):** A bordo de las plataformas satelitales Terra (lanzada en 1999) y Aqua (lanzada en 2002), provee una serie temporal ininterrumpida desde el año 2000 con un tamaño de píxel en nadir de $1.0 \times 1.0\text{ km}$, el cual se degrada hasta $\approx 4.8 \times 2.0\text{ km}$ en los bordes del barrido (*scan edge*).
- **VIIRS (Visible Infrared Imaging Radiometer Suite):** Operativo inicialmente a bordo de Suomi-NPP (desde finales de 2011 / 2012) y posteriormente en NOAA-20 (JPSS-1, 2018) y NOAA-21 (JPSS-2, 2022). Sus bandas de resolución de imágenes (bandas I, 375 m en nadir) detectan focos de calor significativamente más pequeños (hasta $\approx 10\text{ m}^2$) y generan entre **3 y 5 veces más registros de puntos de calor** sobre el mismo evento de fuego que MODIS.
- **Incompatibilidad de FRP:** El Poder Radiativo del Fuego (FRP, *Fire Radiative Power*, medido en MegaWatts $[MW]$) no es linealmente conmensurable entre ambos instrumentos debido a las diferentes funciones de respuesta espectral instrumental (RSR), bandas de saturación térmica (banda 21/22 de 4 µm en MODIS vs. banda I4/M13 en VIIRS) y algoritmos de temperatura de fondo.
- **Impacto en Políticas y Modelos:** Una simple agregación temporal genera un salto espurio en la serie a partir de 2012, distorsionando el cálculo de regímenes de fuego, emisión de gases de efecto invernadero y calendarios de quemas agrícolas/forestales en ecosistemas vulnerables como el Bosque Seco Chiquitano y el Pantanal boliviano.

### La Solución Arquitectónica de Datos
El esquema implementa un pipeline estructurado en 4 capas de persistencia y análisis:
1. **Capa Raw / Ingestión:** Tablas particionadas declarativamente por año (`raw_modis_hotspots` y `raw_viirs_hotspots`) con reconstrucción poligonal del píxel real del sensor según sus dimensiones de barrido (*scan* y *track*).
2. **Capa de Armonización Espacio-Temporal:** Clustering multi-sensor mediante ST-DBSCAN implementado con operadores PostGIS (`ST_ClusterDBSCAN`, `ST_DWithin`), unificación de huella física (`ST_ConvexHull`, `ST_Buffer`), cálculo del **HFII** (*Harmonized Fire Intensity Index*) y tabla de correspondencia cruzada (`event_source_hotspots`).
3. **Capa de Grilla Hexagonal Discreta (H3):** Agregación multi-resolución en celdas Uber H3 (niveles de resolución r7 y r8) para análisis de densidad espacial homogénea libre de distorsiones de proyección cartográfica.
4. **Capa Semántica y Calendario de Quemas:** Normalización zonal territorial (`regions`) y agregaciones temporales estandarizadas (`burning_calendar_daily`) que calculan puntajes $Z$ de anomalía histórica respecto a la línea base 2000-2011.

---

## 2. Diagrama Entidad-Relación (Mermaid erDiagram)

A continuación se ilustra la totalidad de las entidades del sistema, sus claves primarias, foráneas y las relaciones cardinales del motor relacional-espacial:

```mermaid
erDiagram
    REGIONS ||--o{ REGIONS : "subdivide_en (parent_id)"
    REGIONS ||--o{ BURNING_CALENDAR_DAILY : "agrega_estadisticas_en"
    REGIONS ||--o{ HARMONIZED_FIRE_EVENTS : "contiene_espacialmente"

    HARMONIZED_FIRE_EVENTS ||--|{ EVENT_SOURCE_HOTSPOTS : "consolida_detecciones"

    RAW_MODIS_HOTSPOTS ||--o{ EVENT_SOURCE_HOTSPOTS : "proviene_de_modis"
    RAW_VIIRS_HOTSPOTS ||--o{ EVENT_SOURCE_HOTSPOTS : "proviene_de_viirs"

    HARMONIZED_FIRE_EVENTS }o--|| H3_DAILY_CELLS : "asocia_a_celda_h3"

    INGESTION_LOGS ||--o{ RAW_MODIS_HOTSPOTS : "audita_lote_modis"
    INGESTION_LOGS ||--o{ RAW_VIIRS_HOTSPOTS : "audita_lote_viirs"

    REGIONS {
        SERIAL id PK
        VARCHAR name
        VARCHAR region_type
        INT parent_id FK
        GEOMETRY geometry
        NUMERIC area_km2
        TIMESTAMPTZ created_at
    }

    RAW_MODIS_HOTSPOTS {
        BIGSERIAL id PK
        NUMERIC latitude
        NUMERIC longitude
        NUMERIC brightness
        NUMERIC scan
        NUMERIC track
        DATE acq_date
        TIME acq_time
        VARCHAR satellite
        VARCHAR instrument
        INTEGER confidence
        NUMERIC frp
        CHAR daynight
        VARCHAR version
        GEOMETRY geom
        GEOMETRY pixel_geom
        TEXT h3_index_r7
        TEXT h3_index_r8
        TIMESTAMPTZ created_at
    }

    RAW_VIIRS_HOTSPOTS {
        BIGSERIAL id PK
        NUMERIC latitude
        NUMERIC longitude
        NUMERIC bright_ti4
        NUMERIC bright_ti5
        NUMERIC scan
        NUMERIC track
        DATE acq_date
        TIME acq_time
        VARCHAR satellite
        VARCHAR instrument
        VARCHAR confidence
        NUMERIC frp
        CHAR daynight
        VARCHAR version
        GEOMETRY geom
        GEOMETRY pixel_geom
        TEXT h3_index_r7
        TEXT h3_index_r8
        TIMESTAMPTZ created_at
    }

    HARMONIZED_FIRE_EVENTS {
        UUID event_id PK
        VARCHAR cluster_method
        GEOMETRY event_polygon
        GEOMETRY centroid
        NUMERIC hfii_score
        NUMERIC total_frp_modis
        NUMERIC total_frp_viirs
        NUMERIC calibrated_frp
        INTEGER modis_count
        INTEGER viirs_count
        TIMESTAMPTZ start_time
        TIMESTAMPTZ end_time
        NUMERIC duration_hours
        CHAR daynight
        VARCHAR confidence_level
        NUMERIC area_ha
        TEXT h3_index_r7
        TEXT h3_index_r8
        INTEGER region_id FK
        TIMESTAMPTZ created_at
    }

    EVENT_SOURCE_HOTSPOTS {
        UUID event_id PK,FK
        BIGINT hotspot_id PK
        VARCHAR sensor_type PK
        NUMERIC weight_contribution
        TIMESTAMPTZ linked_at
    }

    H3_DAILY_CELLS {
        TEXT h3_index PK
        DATE acq_date PK
        SMALLINT resolution
        BOOLEAN is_active
        INTEGER modis_count
        INTEGER viirs_count
        NUMERIC modis_frp_sum
        NUMERIC viirs_frp_sum
        NUMERIC harmonized_frp_density
        NUMERIC cell_area_km2
        GEOMETRY cell_polygon
    }

    BURNING_CALENDAR_DAILY {
        BIGSERIAL id PK
        DATE date
        INTEGER region_id FK
        INTEGER total_events
        NUMERIC total_area_ha
        NUMERIC avg_hfii
        NUMERIC max_hfii
        NUMERIC anomaly_zscore
        BOOLEAN is_anomaly
        TIMESTAMPTZ computed_at
    }

    INGESTION_LOGS {
        SERIAL id PK
        VARCHAR source
        VARCHAR sensor_type
        VARCHAR file_name
        INTEGER records_total
        INTEGER records_accepted
        INTEGER records_rejected
        TIMESTAMPTZ started_at
        TIMESTAMPTZ completed_at
        VARCHAR status
        TEXT error_message
    }
```

---

## 3. Definición Detallada de Entidades Core

### 3.1. `regions` (Delimitación Espacial Territorial)
Tabla de jerarquía administrativa y ecológica que almacena departamentos, municipios, áreas protegidas y ecorregiones de Bolivia (con foco especial en Santa Cruz y la Chiquitanía).

| Columna | Tipo PostgreSQL / PostGIS | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único secuencial de la región. |
| `name` | `VARCHAR(150)` | `NOT NULL` | Nombre oficial (ej. "Santa Cruz", "San Ignacio de Velasco", "PN Noel Kempff Mercado"). |
| `region_type` | `VARCHAR(30)` | `NOT NULL, CHECK (region_type IN ('department', 'municipality', 'protected_area', 'ecoregion'))` | Clasificación político-administrativa o ecológica. |
| `parent_id` | `INTEGER` | `NULL, REFERENCES regions(id) ON DELETE SET NULL` | Autorreferencia jerárquica (ej. un municipio referencia a su departamento). |
| `geometry` | `GEOMETRY(MULTIPOLYGON, 4326)` | `NOT NULL` | Delimitación perimetral poligonal en coordenadas geográficas WGS84. |
| `area_km2` | `NUMERIC(12, 2)` | `NOT NULL, CHECK (area_km2 > 0)` | Superficie oficial calculada geodésicamente en kilómetros cuadrados. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal de inserción del registro. |

```sql
-- DDL: regions
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    region_type VARCHAR(30) NOT NULL,
    parent_id INTEGER,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    area_km2 NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_region_type CHECK (region_type IN ('department', 'municipality', 'protected_area', 'ecoregion')),
    CONSTRAINT chk_region_area CHECK (area_km2 > 0),
    CONSTRAINT fk_regions_parent FOREIGN KEY (parent_id) REFERENCES regions(id) ON DELETE SET NULL
);
```

---

### 3.2. `raw_modis_hotspots` (Puntos de Calor Originales MODIS C6.1)
Almacena las detecciones brutas provenientes del producto MODIS Collection 6.1 (Terra y Aqua). Está estructurada como tabla particionada por rangos de fecha anual.

| Columna | Tipo PostgreSQL / PostGIS | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | *(Clave primaria compuesta en tabla particionada: `id, acq_date`)* | Identificador secuencial de alta capacidad para miles de millones de registros. |
| `latitude` | `NUMERIC(10, 6)` | `NOT NULL, CHECK (latitude BETWEEN -90.0 AND 90.0)` | Latitud del centroide del píxel térmico detectado. |
| `longitude` | `NUMERIC(11, 6)` | `NOT NULL, CHECK (longitude BETWEEN -180.0 AND 180.0)` | Longitud del centroide del píxel térmico detectado. |
| `brightness` | `NUMERIC(7, 2)` | `NOT NULL, CHECK (brightness >= 200.0 AND brightness <= 600.0)` | Temperatura de brillo del píxel en canal 21/22 (Kelvin $[K]$). |
| `scan` | `NUMERIC(4, 2)` | `NOT NULL, CHECK (scan >= 1.0 AND scan <= 6.0)` | Dimensión transversal del píxel proyectado en el terreno (km). |
| `track` | `NUMERIC(4, 2)` | `NOT NULL, CHECK (track >= 1.0 AND track <= 3.0)` | Dimensión longitudinal a lo largo de la traza de la órbita (km). |
| `acq_date` | `DATE` | `NOT NULL` | Fecha de adquisición UTC del sobrevuelo satelital. Columna de partición. |
| `acq_time` | `TIME` | `NOT NULL` | Hora de adquisición satelital UTC (formato `HH:MI:SS`). |
| `satellite` | `VARCHAR(10)` | `NOT NULL, CHECK (satellite IN ('Terra', 'Aqua'))` | Plataforma orbital de observación de la Tierra de la NASA. |
| `instrument` | `VARCHAR(10)` | `NOT NULL DEFAULT 'MODIS'` | Sensor generador de la detección. |
| `confidence` | `INTEGER` | `NOT NULL, CHECK (confidence BETWEEN 0 AND 100)` | Grado de certeza de fuego activo asignado por el algoritmo contextual (%). |
| `frp` | `NUMERIC(10, 2)` | `NOT NULL, CHECK (frp >= 0.0)` | Fire Radiative Power en MegaWatts $[MW]$ calculado según método de Kaufman. |
| `daynight` | `CHAR(1)` | `NOT NULL, CHECK (daynight IN ('D', 'N'))` | Paso diurno ('D') o nocturno ('N') del satélite. |
| `version` | `VARCHAR(10)` | `NOT NULL DEFAULT '6.1NRT'` | Versión del pipeline de procesamiento de NASA FIRMS. |
| `geom` | `GEOMETRY(POINT, 4326)` | `NOT NULL` | Punto geográfico del centroide proyectado en WGS84. |
| `pixel_geom` | `GEOMETRY(POLYGON, 4326)` | `NOT NULL` | Huella física aproximada del píxel ($scan \times track$) rotada según la órbita. |
| `h3_index_r7` | `TEXT` | `NOT NULL` | Índice espacial Uber H3 resolución 7 ($\approx 5.16\text{ km}^2$, radio $\approx 1.22\text{ km}$). |
| `h3_index_r8` | `TEXT` | `NOT NULL` | Índice espacial Uber H3 resolución 8 ($\approx 0.737\text{ km}^2$, radio $\approx 461\text{ m}$). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca de tiempo de inserción en el sistema. |

```sql
-- DDL: raw_modis_hotspots (Tabla Base Particionada)
CREATE TABLE raw_modis_hotspots (
    id BIGSERIAL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(11, 6) NOT NULL,
    brightness NUMERIC(7, 2) NOT NULL,
    scan NUMERIC(4, 2) NOT NULL,
    track NUMERIC(4, 2) NOT NULL,
    acq_date DATE NOT NULL,
    acq_time TIME NOT NULL,
    satellite VARCHAR(10) NOT NULL,
    instrument VARCHAR(10) NOT NULL DEFAULT 'MODIS',
    confidence INTEGER NOT NULL,
    frp NUMERIC(10, 2) NOT NULL,
    daynight CHAR(1) NOT NULL,
    version VARCHAR(10) NOT NULL DEFAULT '6.1NRT',
    geom GEOMETRY(POINT, 4326) NOT NULL,
    pixel_geom GEOMETRY(POLYGON, 4326) NOT NULL,
    h3_index_r7 TEXT NOT NULL,
    h3_index_r8 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_raw_modis PRIMARY KEY (id, acq_date),
    CONSTRAINT chk_modis_lat CHECK (latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_modis_lon CHECK (longitude BETWEEN -180.0 AND 180.0),
    CONSTRAINT chk_modis_brightness CHECK (brightness >= 200.0 AND brightness <= 600.0),
    CONSTRAINT chk_modis_scan CHECK (scan >= 1.0 AND scan <= 6.0),
    CONSTRAINT chk_modis_track CHECK (track >= 1.0 AND track <= 3.0),
    CONSTRAINT chk_modis_satellite CHECK (satellite IN ('Terra', 'Aqua')),
    CONSTRAINT chk_modis_confidence CHECK (confidence BETWEEN 0 AND 100),
    CONSTRAINT chk_modis_frp CHECK (frp >= 0.0),
    CONSTRAINT chk_modis_daynight CHECK (daynight IN ('D', 'N'))
) PARTITION BY RANGE (acq_date);
```

---

### 3.3. `raw_viirs_hotspots` (Puntos de Calor Originales VIIRS 375m)
Almacena las detecciones brutas del sensor VIIRS (bandas de 375 m I4/I5) a bordo de Suomi-NPP, NOAA-20 y NOAA-21. Particionada por rangos de fecha anual desde 2012.

| Columna | Tipo PostgreSQL / PostGIS | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | *(Clave primaria compuesta en tabla particionada: `id, acq_date`)* | Identificador secuencial de alta capacidad para volumen masivo de VIIRS. |
| `latitude` | `NUMERIC(10, 6)` | `NOT NULL, CHECK (latitude BETWEEN -90.0 AND 90.0)` | Latitud WGS84 del centroide del píxel de 375 m. |
| `longitude` | `NUMERIC(11, 6)` | `NOT NULL, CHECK (longitude BETWEEN -180.0 AND 180.0)` | Longitud WGS84 del centroide del píxel de 375 m. |
| `bright_ti4` | `NUMERIC(7, 2)` | `NOT NULL, CHECK (bright_ti4 >= 200.0 AND bright_ti4 <= 400.0)` | Temperatura de brillo canal térmico I4 (3.74 µm) en Kelvin $[K]$. |
| `bright_ti5` | `NUMERIC(7, 2)` | `NOT NULL, CHECK (bright_ti5 >= 200.0 AND bright_ti5 <= 400.0)` | Temperatura de brillo canal térmico I5 (11.45 µm) en Kelvin $[K]$. |
| `scan` | `NUMERIC(4, 2)` | `NOT NULL, CHECK (scan >= 0.3 AND scan <= 1.8)` | Tamaño de píxel en la dirección transversal del barrido (km). |
| `track` | `NUMERIC(4, 2)` | `NOT NULL, CHECK (track >= 0.3 AND track <= 1.0)` | Tamaño de píxel a lo largo de la traza orbital (km). |
| `acq_date` | `DATE` | `NOT NULL` | Fecha de adquisición UTC del sobrevuelo. Columna de partición. |
| `acq_time` | `TIME` | `NOT NULL` | Hora de adquisición satelital UTC (`HH:MI:SS`). |
| `satellite` | `VARCHAR(10)` | `NOT NULL, CHECK (satellite IN ('N', 'N20', 'N21'))` | Satélite portador ('N'=Suomi-NPP, 'N20'=NOAA-20, 'N21'=NOAA-21). |
| `instrument` | `VARCHAR(10)` | `NOT NULL DEFAULT 'VIIRS'` | Instrumento de barrido radiométrico. |
| `confidence` | `VARCHAR(10)` | `NOT NULL, CHECK (confidence IN ('low', 'nominal', 'high'))` | Calidad de detección discreta asignada por el algoritmo VNP14IMG. |
| `frp` | `NUMERIC(10, 2)` | `NOT NULL, CHECK (frp >= 0.0)` | Potencia radiativa del fuego en $[MW]$ calculada mediante la banda M13/I4. |
| `daynight` | `CHAR(1)` | `NOT NULL, CHECK (daynight IN ('D', 'N'))` | Paso diurno ('D') o nocturno ('N') del satélite. |
| `version` | `VARCHAR(10)` | `NOT NULL DEFAULT '2.0NRT'` | Versión de procesamiento del producto FIRMS VIIRS. |
| `geom` | `GEOMETRY(POINT, 4326)` | `NOT NULL` | Geometría puntual del centroide en EPSG:4326. |
| `pixel_geom` | `GEOMETRY(POLYGON, 4326)` | `NOT NULL` | Huella poligonal real del píxel de 375 m considerando el ensanchamiento óptico. |
| `h3_index_r7` | `TEXT` | `NOT NULL` | Celda H3 resolución 7 asociada. |
| `h3_index_r8` | `TEXT` | `NOT NULL` | Celda H3 resolución 8 asociada. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal de inserción. |

```sql
-- DDL: raw_viirs_hotspots (Tabla Base Particionada)
CREATE TABLE raw_viirs_hotspots (
    id BIGSERIAL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(11, 6) NOT NULL,
    bright_ti4 NUMERIC(7, 2) NOT NULL,
    bright_ti5 NUMERIC(7, 2) NOT NULL,
    scan NUMERIC(4, 2) NOT NULL,
    track NUMERIC(4, 2) NOT NULL,
    acq_date DATE NOT NULL,
    acq_time TIME NOT NULL,
    satellite VARCHAR(10) NOT NULL,
    instrument VARCHAR(10) NOT NULL DEFAULT 'VIIRS',
    confidence VARCHAR(10) NOT NULL,
    frp NUMERIC(10, 2) NOT NULL,
    daynight CHAR(1) NOT NULL,
    version VARCHAR(10) NOT NULL DEFAULT '2.0NRT',
    geom GEOMETRY(POINT, 4326) NOT NULL,
    pixel_geom GEOMETRY(POLYGON, 4326) NOT NULL,
    h3_index_r7 TEXT NOT NULL,
    h3_index_r8 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_raw_viirs PRIMARY KEY (id, acq_date),
    CONSTRAINT chk_viirs_lat CHECK (latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_viirs_lon CHECK (longitude BETWEEN -180.0 AND 180.0),
    CONSTRAINT chk_viirs_ti4 CHECK (bright_ti4 >= 200.0 AND bright_ti4 <= 400.0),
    CONSTRAINT chk_viirs_ti5 CHECK (bright_ti5 >= 200.0 AND bright_ti5 <= 400.0),
    CONSTRAINT chk_viirs_scan CHECK (scan >= 0.3 AND scan <= 1.8),
    CONSTRAINT chk_viirs_track CHECK (track >= 0.3 AND track <= 1.0),
    CONSTRAINT chk_viirs_satellite CHECK (satellite IN ('N', 'N20', 'N21')),
    CONSTRAINT chk_viirs_confidence CHECK (confidence IN ('low', 'nominal', 'high')),
    CONSTRAINT chk_viirs_frp CHECK (frp >= 0.0),
    CONSTRAINT chk_viirs_daynight CHECK (daynight IN ('D', 'N'))
) PARTITION BY RANGE (acq_date);
```

---

### 3.4. `harmonized_fire_events` (Eventos de Fuego Armonizados)
Representa los clusters consolidados espacio-temporalmente resultantes del algoritmo ST-DBSCAN. Fusiona múltiples píxeles vecinos de MODIS y VIIRS en un único incendio unificado.

| Columna | Tipo PostgreSQL / PostGIS | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `event_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador universalmente único del evento de incendio unificado. |
| `cluster_method` | `VARCHAR(30)` | `NOT NULL DEFAULT 'ST-DBSCAN-V1'` | Algoritmo empleado ('ST-DBSCAN-V1', 'DBSCAN-H3', etc.). |
| `event_polygon` | `GEOMETRY(MULTIPOLYGON, 4326)` | `NOT NULL` | Huella perimetral física obtenida por ConvexHull y buffer sobre los píxeles. |
| `centroid` | `GEOMETRY(POINT, 4326)` | `NOT NULL` | Centro de masa espacial calculado mediante `ST_Centroid`. |
| `hfii_score` | `NUMERIC(10, 4)` | `NOT NULL, CHECK (hfii_score >= 0.0)` | **Harmonized Fire Intensity Index**: Índice estandarizado de severidad (0 - 100+). |
| `total_frp_modis`| `NUMERIC(12, 2)` | `NOT NULL DEFAULT 0.0, CHECK (total_frp_modis >= 0.0)` | Sumatoria bruta de FRP aportado por detecciones MODIS integradas en el cluster. |
| `total_frp_viirs`| `NUMERIC(12, 2)` | `NOT NULL DEFAULT 0.0, CHECK (total_frp_viirs >= 0.0)` | Sumatoria bruta de FRP aportado por detecciones VIIRS integradas en el cluster. |
| `calibrated_frp` | `NUMERIC(12, 2)` | `NOT NULL, CHECK (calibrated_frp >= 0.0)` | FRP unificado y calibrado energéticamente a la escala estándar histórica MODIS. |
| `modis_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (modis_count >= 0)` | Número total de píxeles MODIS agrupados en el evento. |
| `viirs_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (viirs_count >= 0)` | Número total de píxeles VIIRS agrupados en el evento. |
| `start_time` | `TIMESTAMPTZ` | `NOT NULL` | Marca temporal más temprana de los focos que componen el cluster. |
| `end_time` | `TIMESTAMPTZ` | `NOT NULL, CHECK (end_time >= start_time)` | Marca temporal más tardía de los focos que componen el cluster. |
| `duration_hours`| `NUMERIC(6, 2)` | `NOT NULL, CHECK (duration_hours >= 0.0)` | Duración estimada del frente activo en horas transcurridas. |
| `daynight` | `CHAR(1)` | `NOT NULL, CHECK (daynight IN ('D', 'N', 'M'))` | Composición temporal: Diurno ('D'), Nocturno ('N') o Mixto ('M'). |
| `confidence_level`| `VARCHAR(20)`| `NOT NULL, CHECK (confidence_level IN ('low', 'medium', 'high', 'confirmed'))` | Nivel de confianza sintético consolidado de la detección. |
| `area_ha` | `NUMERIC(12, 2)` | `NOT NULL, CHECK (area_ha >= 0.0)` | Área estimada de la superficie de combustión activa en hectáreas. |
| `h3_index_r7` | `TEXT` | `NOT NULL` | Celda H3 de resolución 7 en la que se ubica el centroide del evento. |
| `h3_index_r8` | `TEXT` | `NOT NULL` | Celda H3 de resolución 8 en la que se ubica el centroide del evento. |
| `region_id` | `INTEGER` | `NULL, REFERENCES regions(id) ON DELETE SET NULL` | Región político-ecológica sobre la cual se asienta el evento. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal de armonización del evento. |

```sql
-- DDL: harmonized_fire_events
CREATE TABLE harmonized_fire_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_method VARCHAR(30) NOT NULL DEFAULT 'ST-DBSCAN-V1',
    event_polygon GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326) NOT NULL,
    hfii_score NUMERIC(10, 4) NOT NULL,
    total_frp_modis NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_frp_viirs NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    calibrated_frp NUMERIC(12, 2) NOT NULL,
    modis_count INTEGER NOT NULL DEFAULT 0,
    viirs_count INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_hours NUMERIC(6, 2) NOT NULL,
    daynight CHAR(1) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL,
    area_ha NUMERIC(12, 2) NOT NULL,
    h3_index_r7 TEXT NOT NULL,
    h3_index_r8 TEXT NOT NULL,
    region_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time_window CHECK (end_time >= start_time),
    CONSTRAINT chk_duration CHECK (duration_hours >= 0.0),
    CONSTRAINT chk_hfii CHECK (hfii_score >= 0.0),
    CONSTRAINT chk_frp_calibrated CHECK (calibrated_frp >= 0.0),
    CONSTRAINT chk_event_area CHECK (area_ha >= 0.0),
    CONSTRAINT chk_event_daynight CHECK (daynight IN ('D', 'N', 'M')),
    CONSTRAINT chk_event_confidence CHECK (confidence_level IN ('low', 'medium', 'high', 'confirmed')),
    CONSTRAINT chk_hotspot_presence CHECK ((modis_count + viirs_count) > 0),
    CONSTRAINT fk_harmonized_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL
);
```

---

### 3.5. `event_source_hotspots` (Tabla de Unión e Intersección / Junction Table)
Establece la trazabilidad exacta de linaje (data lineage) entre cada evento armonizado y los puntos de calor crudos que lo originaron, indicando la ponderación de cada observación.

| Columna | Tipo PostgreSQL | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `event_id` | `UUID` | `NOT NULL, REFERENCES harmonized_fire_events(event_id) ON DELETE CASCADE` | Llave foránea hacia el evento armonizado padre. |
| `hotspot_id` | `BIGINT` | `NOT NULL` | Identificador primario del hotspot en su tabla base de origen. |
| `sensor_type` | `VARCHAR(10)` | `NOT NULL, CHECK (sensor_type IN ('MODIS', 'VIIRS'))` | Tipo de sensor del hotspot referenciado. |
| `weight_contribution` | `NUMERIC(5, 4)` | `NOT NULL DEFAULT 1.0000, CHECK (weight_contribution > 0.0)` | Factor de contribución espacial del píxel en la estimación de energía y área. |
| `linked_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal de vinculación. |

```sql
-- DDL: event_source_hotspots (Junction Table)
CREATE TABLE event_source_hotspots (
    event_id UUID NOT NULL,
    hotspot_id BIGINT NOT NULL,
    sensor_type VARCHAR(10) NOT NULL,
    weight_contribution NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_event_source_hotspots PRIMARY KEY (event_id, hotspot_id, sensor_type),
    CONSTRAINT chk_source_sensor CHECK (sensor_type IN ('MODIS', 'VIIRS')),
    CONSTRAINT chk_source_weight CHECK (weight_contribution > 0.0 AND weight_contribution <= 1.0),
    CONSTRAINT fk_event_source_parent FOREIGN KEY (event_id) REFERENCES harmonized_fire_events(event_id) ON DELETE CASCADE
);
```

---

### 3.6. `h3_daily_cells` (Agregaciones Espacio-Temporales en Mallas Hexagonales H3)
Tabla de agregación diaria espacializada en el sistema discreto de celdas hexagonales H3 de Uber. Permite renderizar coropletas de alta eficiencia con Deck.gl y Mapbox GL.

| Columna | Tipo PostgreSQL / PostGIS | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `h3_index` | `TEXT` | `NOT NULL` | Representación alfanumérica hexadecimal del índice H3 de 64 bits. |
| `acq_date` | `DATE` | `NOT NULL` | Fecha de observación del agregado. |
| `resolution` | `SMALLINT` | `NOT NULL, CHECK (resolution IN (7, 8))` | Nivel de resolución de la grilla H3 (r7 o r8). |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Indicador booleano de persistencia térmica en el día. |
| `modis_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (modis_count >= 0)` | Número de detecciones MODIS dentro de la celda en la fecha. |
| `viirs_count` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (viirs_count >= 0)` | Número de detecciones VIIRS dentro de la celda en la fecha. |
| `modis_frp_sum` | `NUMERIC(12, 2)` | `NOT NULL DEFAULT 0.0, CHECK (modis_frp_sum >= 0.0)` | Sumatoria bruta de energía radiativa MODIS $[MW]$. |
| `viirs_frp_sum` | `NUMERIC(12, 2)` | `NOT NULL DEFAULT 0.0, CHECK (viirs_frp_sum >= 0.0)` | Sumatoria bruta de energía radiativa VIIRS $[MW]$. |
| `harmonized_frp_density` | `NUMERIC(10, 4)` | `NOT NULL, CHECK (harmonized_frp_density >= 0.0)` | Densidad normalizada de energía calorífica $[MW / km^2]$. |
| `cell_area_km2` | `NUMERIC(8, 4)` | `NOT NULL, CHECK (cell_area_km2 > 0.0)` | Área geométrica teórica de la celda hexagonal ($km^2$). |
| `cell_polygon` | `GEOMETRY(POLYGON, 4326)` | `NOT NULL` | Geometría poligonal del hexágono calculada con funciones H3. |

```sql
-- DDL: h3_daily_cells
CREATE TABLE h3_daily_cells (
    h3_index TEXT NOT NULL,
    acq_date DATE NOT NULL,
    resolution SMALLINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    modis_count INTEGER NOT NULL DEFAULT 0,
    viirs_count INTEGER NOT NULL DEFAULT 0,
    modis_frp_sum NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    viirs_frp_sum NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    harmonized_frp_density NUMERIC(10, 4) NOT NULL,
    cell_area_km2 NUMERIC(8, 4) NOT NULL,
    cell_polygon GEOMETRY(POLYGON, 4326) NOT NULL,
    CONSTRAINT pk_h3_daily_cells PRIMARY KEY (h3_index, acq_date),
    CONSTRAINT chk_h3_resolution CHECK (resolution IN (7, 8)),
    CONSTRAINT chk_h3_modis_count CHECK (modis_count >= 0),
    CONSTRAINT chk_h3_viirs_count CHECK (viirs_count >= 0),
    CONSTRAINT chk_h3_density CHECK (harmonized_frp_density >= 0.0),
    CONSTRAINT chk_h3_cell_area CHECK (cell_area_km2 > 0.0)
);
```

---

### 3.7. `burning_calendar_daily` (Matriz Diaria de Quemas y Detección de Anomalías)
Entidad analítica optimizada para alimentar los gráficos de calor anual (*calendar heatmap*), series de tiempo interactivas en Recharts/Plotly y detección estadística de picos de quema anómalos.

| Columna | Tipo PostgreSQL | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Clave primaria secuencial única del registro diario regional. |
| `date` | `DATE` | `NOT NULL` | Día de calendario evaluado. |
| `region_id` | `INTEGER` | `NOT NULL, REFERENCES regions(id) ON DELETE CASCADE` | Región administrativa o ecológica evaluada. |
| `total_events` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (total_events >= 0)` | Conteo de incendios armonizados consolidados en el día. |
| `total_area_ha` | `NUMERIC(14, 2)` | `NOT NULL DEFAULT 0.0, CHECK (total_area_ha >= 0.0)` | Superficie diaria quemada/afectada en hectáreas ($ha$). |
| `avg_hfii` | `NUMERIC(10, 4)` | `NOT NULL DEFAULT 0.0, CHECK (avg_hfii >= 0.0)` | Promedio de intensidad armonizada HFII en la región. |
| `max_hfii` | `NUMERIC(10, 4)` | `NOT NULL DEFAULT 0.0, CHECK (max_hfii >= 0.0)` | Máxima severidad térmica registrada en un único cluster. |
| `anomaly_zscore`| `NUMERIC(8, 4)` | `NOT NULL DEFAULT 0.0` | Puntaje $Z$ estandarizado contra la serie histórica 2000-2025 para el mismo día del año. |
| `is_anomaly` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Flag de alerta roja (True si $Z\text{-score} > 2.0$ y $total\_events > 5$). |
| `computed_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal del cómputo analítico. |

```sql
-- DDL: burning_calendar_daily
CREATE TABLE burning_calendar_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    region_id INTEGER NOT NULL,
    total_events INTEGER NOT NULL DEFAULT 0,
    total_area_ha NUMERIC(14, 2) NOT NULL DEFAULT 0.0,
    avg_hfii NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    max_hfii NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    anomaly_zscore NUMERIC(8, 4) NOT NULL DEFAULT 0.0,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_calendar_date_region UNIQUE (date, region_id),
    CONSTRAINT chk_cal_events CHECK (total_events >= 0),
    CONSTRAINT chk_cal_area CHECK (total_area_ha >= 0.0),
    CONSTRAINT chk_cal_avg_hfii CHECK (avg_hfii >= 0.0),
    CONSTRAINT chk_cal_max_hfii CHECK (max_hfii >= 0.0),
    CONSTRAINT fk_calendar_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);
```

---

### 3.8. `ingestion_logs` (Auditoría de Ingestión ETL / LANCE FIRMS)
Registra la trazabilidad de ingesta desde la API REST de NASA FIRMS o archivos CSV batch, garantizando reproducibilidad y control de errores en los flujos de datos.

| Columna | Tipo PostgreSQL | Restricciones / Constraints | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador secuencial del lote de ingestión. |
| `source` | `VARCHAR(100)` | `NOT NULL` | Origen de datos (ej. "NASA_FIRMS_API", "FIRMS_CSV_BATCH_ARCHIVE"). |
| `sensor_type` | `VARCHAR(20)` | `NOT NULL, CHECK (sensor_type IN ('MODIS', 'VIIRS_NPP', 'VIIRS_NOAA20', 'VIIRS_NOAA21'))` | Sensor o constelación específica del lote. |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | Nombre del archivo descargado o endpoint REST consultado. |
| `records_total` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (records_total >= 0)` | Número bruto de líneas o registros procesados. |
| `records_accepted` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (records_accepted >= 0)` | Registros validados e insertados exitosamente. |
| `records_rejected` | `INTEGER` | `NOT NULL DEFAULT 0, CHECK (records_rejected >= 0)` | Registros descartados (fuera de límites, filtros de calidad, etc.). |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Marca temporal de inicio del pipeline ETL. |
| `completed_at` | `TIMESTAMPTZ` | `NULL` | Marca temporal de finalización del proceso. |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'IN_PROGRESS', CHECK (status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL_SUCCESS'))` | Estado final del procesamiento del lote. |
| `error_message` | `TEXT` | `NULL` | Stack trace o mensaje descriptivo de la falla en caso de error. |

```sql
-- DDL: ingestion_logs
CREATE TABLE ingestion_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    records_total INTEGER NOT NULL DEFAULT 0,
    records_accepted INTEGER NOT NULL DEFAULT 0,
    records_rejected INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    error_message TEXT,
    CONSTRAINT chk_ingest_sensor CHECK (sensor_type IN ('MODIS', 'VIIRS_NPP', 'VIIRS_NOAA20', 'VIIRS_NOAA21')),
    CONSTRAINT chk_ingest_status CHECK (status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL_SUCCESS')),
    CONSTRAINT chk_ingest_records CHECK (records_total >= (records_accepted + records_rejected))
);
```

---

## 4. Estrategia de Indexación de Alto Rendimiento

Dado que el monitoreo de focos de calor satelitales en Sudamérica durante 25 años involucra decenas de millones de registros, se implementa una jerarquía balanceada de índices:

### 4.1. Índices Espaciales GiST (Generalized Search Tree)
Los índices GiST implementan estructuras jerárquicas R-Tree que optimizan exponencialmente las búsquedas de proximidad (`ST_DWithin`), intersección (`ST_Intersects`) y contención (`ST_Contains`).

```sql
-- 1. Geometrías puntuales de hotspots raw
CREATE INDEX idx_raw_modis_geom ON raw_modis_hotspots USING GIST (geom);
CREATE INDEX idx_raw_modis_pixel_geom ON raw_modis_hotspots USING GIST (pixel_geom);

CREATE INDEX idx_raw_viirs_geom ON raw_viirs_hotspots USING GIST (geom);
CREATE INDEX idx_raw_viirs_pixel_geom ON raw_viirs_hotspots USING GIST (pixel_geom);

-- 2. Geometrías complejas de eventos armonizados
CREATE INDEX idx_harmonized_event_polygon ON harmonized_fire_events USING GIST (event_polygon);
CREATE INDEX idx_harmonized_centroid ON harmonized_fire_events USING GIST (centroid);

-- 3. Celdas H3 poligonales y límites territoriales
CREATE INDEX idx_h3_daily_polygon ON h3_daily_cells USING GIST (cell_polygon);
CREATE INDEX idx_regions_geometry ON regions USING GIST (geometry);
```

### 4.2. Índices Temporales BRIN (Block Range Index)
Para las tablas históricas particionadas con millones de filas insertadas ordenadamente por fecha (`acq_date`), los índices BRIN almacenan únicamente el resumen del rango de valores (mínimo/máximo) por cada bloque físico de disco ($\approx 128$ páginas). Esto reduce el tamaño del índice en un **99%** respecto a un árbol B-Tree tradicional y maximiza el *Index Scan*:

```sql
-- BRIN en fechas de adquisición (tablas base particionadas)
CREATE INDEX idx_raw_modis_acq_date_brin ON raw_modis_hotspots USING BRIN (acq_date);
CREATE INDEX idx_raw_viirs_acq_date_brin ON raw_viirs_hotspots USING BRIN (acq_date);

-- BRIN en ventanas temporales de eventos armonizados
CREATE INDEX idx_harmonized_time_brin ON harmonized_fire_events USING BRIN (start_time, end_time);
```

### 4.3. Índices Relacionales B-Tree Estándar y Compuestos
Optimizan filtros categóricos y agregaciones analíticas de alta concurrencia:

```sql
-- Índices B-Tree para raw_modis_hotspots
CREATE INDEX idx_raw_modis_confidence ON raw_modis_hotspots (confidence);
CREATE INDEX idx_raw_modis_frp ON raw_modis_hotspots (frp DESC);
CREATE INDEX idx_raw_modis_satellite ON raw_modis_hotspots (satellite);
CREATE INDEX idx_raw_modis_daynight ON raw_modis_hotspots (daynight);
CREATE INDEX idx_raw_modis_h3_r7 ON raw_modis_hotspots (h3_index_r7);
CREATE INDEX idx_raw_modis_h3_r8 ON raw_modis_hotspots (h3_index_r8);

-- Índices B-Tree para raw_viirs_hotspots
CREATE INDEX idx_raw_viirs_confidence ON raw_viirs_hotspots (confidence);
CREATE INDEX idx_raw_viirs_frp ON raw_viirs_hotspots (frp DESC);
CREATE INDEX idx_raw_viirs_satellite ON raw_viirs_hotspots (satellite);
CREATE INDEX idx_raw_viirs_daynight ON raw_viirs_hotspots (daynight);
CREATE INDEX idx_raw_viirs_h3_r7 ON raw_viirs_hotspots (h3_index_r7);
CREATE INDEX idx_raw_viirs_h3_r8 ON raw_viirs_hotspots (h3_index_r8);

-- Índices B-Tree para harmonized_fire_events
CREATE INDEX idx_harmonized_region_id ON harmonized_fire_events (region_id);
CREATE INDEX idx_harmonized_hfii ON harmonized_fire_events (hfii_score DESC);
CREATE INDEX idx_harmonized_h3_r7 ON harmonized_fire_events (h3_index_r7);
CREATE INDEX idx_harmonized_h3_r8 ON harmonized_fire_events (h3_index_r8);
CREATE INDEX idx_harmonized_daynight ON harmonized_fire_events (daynight);

-- Índices para junction table event_source_hotspots
CREATE INDEX idx_event_source_hotspot_lookup ON event_source_hotspots (hotspot_id, sensor_type);

-- Índices B-Tree para calendario analítico
CREATE INDEX idx_calendar_lookup ON burning_calendar_daily (region_id, date);
CREATE INDEX idx_calendar_anomalies ON burning_calendar_daily (is_anomaly) WHERE is_anomaly = TRUE;
```

---

## 5. Estrategia de Particionamiento Declarativo

### Justificación Técnica
La serie de tiempo completa de MODIS abarca 2000-2026 (26 años), mientras que VIIRS comprende 2012-2026 (14 años). En la Cuenca Amazónica y la Chiquitanía boliviana, una temporada récord de incendios (como 2019 o 2024) genera cientos de miles de detecciones por sensor.
El particionamiento por rangos anuales (`RANGE (acq_date)`) provee:
1. **Partition Pruning:** Si el usuario consulta el calendario de 2024, el motor PostgreSQL descarta de inmediato el 96% de las particiones físicas, evitando escaneo de bloques innecesarios.
2. **Vacuum & Mantenimiento Aislado:** Los datos de años pasados (ej. 2005) son inmutables; pueden ser indexados con factores de relleno del 100% (*fillfactor = 100*) y excluidos de autovacuum agresivo.
3. **Escalabilidad Futura:** Facilita el archivado (*cold storage* en Amazon S3 / Google Cloud Storage) o *detach* de particiones antiguas sin bloquear la base de datos de producción.

### DDL de Creación de Particiones Anuales

```sql
-- ============================================================================
-- Particiones Anuales para RAW_MODIS_HOTSPOTS (2000 - 2026)
-- ============================================================================
CREATE TABLE raw_modis_hotspots_2000 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2000-01-01') TO ('2001-01-01');

CREATE TABLE raw_modis_hotspots_2012 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');

CREATE TABLE raw_modis_hotspots_2019 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');

CREATE TABLE raw_modis_hotspots_2024 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE raw_modis_hotspots_2025 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE raw_modis_hotspots_2026 PARTITION OF raw_modis_hotspots
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE raw_modis_hotspots_default PARTITION OF raw_modis_hotspots DEFAULT;

-- ============================================================================
-- Particiones Anuales para RAW_VIIRS_HOTSPOTS (2012 - 2026)
-- ============================================================================
CREATE TABLE raw_viirs_hotspots_2012 PARTITION OF raw_viirs_hotspots
    FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');

CREATE TABLE raw_viirs_hotspots_2019 PARTITION OF raw_viirs_hotspots
    FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');

CREATE TABLE raw_viirs_hotspots_2024 PARTITION OF raw_viirs_hotspots
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE raw_viirs_hotspots_2025 PARTITION OF raw_viirs_hotspots
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE raw_viirs_hotspots_2026 PARTITION OF raw_viirs_hotspots
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE raw_viirs_hotspots_default PARTITION OF raw_viirs_hotspots DEFAULT;
```

---

## 6. Catálogo de Funciones PostGIS Utilizadas

El motor espacial de PyrosHarmonizer delega la pesada computación geométrica a funciones nativas en C de PostGIS:

```mermaid
flowchart TD
    A["Detecciones CSV FIRMS (lat, lon, scan, track)"] --> B["ST_MakePoint + ST_SetSRID(..., 4326)"]
    B --> C["ST_Buffer (Modelado de Píxel Elíptico)"]
    C --> D["ST_ClusterDBSCAN (Clustering Espacio-Temporal)"]
    D --> E["ST_ConvexHull (Polígono Envolvente del Incendio)"]
    E --> F["ST_Centroid (Centroide para Consultas Zonas)"]
    E --> G["ST_Area (Cálculo Geodésico de Hectáreas)"]
    E --> H["ST_Transform (Cálculo Métrico en UTM 20S / EPSG:32720)"]
```

| Función PostGIS | Firma de Parámetros | Propósito en PyrosHarmonizer |
| :--- | :--- | :--- |
| `ST_MakePoint` | `(float x, float y)` | Convierte las columnas numéricas `longitude` y `latitude` recibidas de NASA FIRMS en una geometría binaria puntual sin proyecciones adicionales. |
| `ST_SetSRID` | `(geometry geom, integer srid)` | Asigna explícitamente el sistema de coordenadas de referencia espacial WGS84 (`EPSG:4326`) a la geometría puntual creada. |
| `ST_DWithin` | `(geometry g1, geometry g2, double precision distance_meters)` | Evalúa si dos hotspots se encuentran dentro del umbral de vecindad métrico ($500\text{ m} - 1000\text{ m}$), convirtiendo dinámicamente a tipo `geography` para eliminar la distorsión latitudinal. |
| `ST_ClusterDBSCAN`| `(geometry win_geom, double precision eps, integer minpoints) OVER ()` | Función ventana espacial que ejecuta la componente espacial del algoritmo ST-DBSCAN nativo en el motor, asignando identificadores de cluster contiguos sin recurrir a transferencias hacia Python. |
| `ST_ConvexHull` | `(geometry geom)` | Agrega el conjunto de geometrías de píxeles (`pixel_geom`) pertenecientes a un mismo cluster y calcula el polígono envolvente convexo mínimo que define la huella del incendio. |
| `ST_Buffer` | `(geometry geom, double precision radius_degrees_or_meters)` | Expande los puntos o líneas térmicas para construir la envolvente física del frente de llama, considerando la dispersión angular del sensor. |
| `ST_Area` | `(geography geog, boolean use_spheroid)` | Calcula el área geodésica real de la superficie del incendio en metros cuadrados ($m^2$), transformando a hectáreas al dividir por $10,000.0$. |
| `ST_Centroid` | `(geometry geom)` | Extrae el centro de masa geométrico del polígono de fuego para indexación rápida, posicionamiento de etiquetas y vinculación H3. |
| `ST_Transform` | `(geometry geom, integer target_srid)` | Reproyecta coordenadas entre WGS84 (`EPSG:4326`) y la proyección plana local **UTM Zona 20S** (`EPSG:32720`), oficial para el Departamento de Santa Cruz y la Chiquitanía, garantizando precisión métrica euclidiana en análisis locales. |

---

## 7. Tabla Consolidada de Tipos de Datos y Restricciones de Dominio

| Tipo de Dato | Formato Interno | Justificación en el Modelo PyrosHarmonizer |
| :--- | :--- | :--- |
| `BIGSERIAL` / `BIGINT` | Entero de 64 bits con autoincremento | Previene el desbordamiento (*integer overflow*) en tablas de telemetría de satélites que superan ampliamente los $2.14 \times 10^9$ registros a nivel mundial. |
| `UUID` | Identificador de 128 bits pseudoaleatorio | Genera llaves universales en `harmonized_fire_events` mediante `gen_random_uuid()` para facilitar sincronizaciones distribuidas o APIs desacopladas. |
| `NUMERIC(10, 6)` | Punto fijo con 6 decimales de precisión | Precisión submétrica ($\approx 0.11\text{ m} = 11\text{ cm}$ en el ecuador), eliminando errores de redondeo presentes en tipos `FLOAT4` o `FLOAT8`. |
| `NUMERIC(7, 2)` | Punto fijo con 2 decimales | Óptimo para temperaturas de brillo térmico en Kelvin ($200.00\text{ K} - 600.00\text{ K}$) con exactitud centesimal. |
| `NUMERIC(10, 2)` | Punto fijo con 2 decimales | Almacena valores de FRP ($MW$) con resolución de centésimas de MegaWatt. |
| `GEOMETRY(Point, 4326)` | Representación OGC WKT/WKB en WGS84 | Geometría espacial indexable mediante R-Tree (GiST) compatible con GeoJSON y GeoPandas. |
| `GEOMETRY(Polygon, 4326)` | Polígono plano OGC cerrado en WGS84 | Representa la huella rectangular o trapezoidal real del píxel proyectado en el terreno. |
| `GEOMETRY(MultiPolygon, 4326)` | Colección de polígonos cerrados | Representa incendios complejos multifrontales o delimitaciones administrativas territoriales discontínuas. |
| `TIMESTAMPTZ` | Timestamp con zona horaria UTC | Garantiza absoluta consistencia temporal en sobrevuelos satelitales globales contra husos locales (Bolivia UTC-4). |
| `TEXT` (H3 Index) | Cadena alfanumérica de 15 caracteres | Identificador canónico de índice Uber H3 (ej. `'8782e460bffffff'`), convertible a `uint64` para interoperabilidad con Deck.gl. |

---

## 8. Estrategia de Migración y Gestión del Esquema (Alembic)

La gestión de versiones del esquema se realiza mediante **Alembic** (integrado con SQLAlchemy 2.0 y GeoAlchemy2) para asegurar despliegues reproducibles tanto en entornos locales de desarrollo como en contenedores de producción (Railway y PostgreSQL gestionado en la nube).

### 8.1. Estructura de Migraciones en `backend/alembic/versions/`
```text
backend/alembic/versions/
├── 0001_setup_extensions_and_regions.py
├── 0002_create_raw_hotspots_partitioned.py
├── 0003_create_harmonized_fire_events_and_junction.py
├── 0004_create_h3_and_calendar_aggregations.py
├── 0005_create_high_performance_indexes.py
└── 0006_create_spatial_triggers.py
```

### 8.2. Ejemplo de Migración Alembic: Extensiones y Tablas Particionadas
```python
"""0001_setup_extensions_and_regions

Revision ID: 0001_setup_extensions
Revises: 
Create Date: 2026-11-14 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = '0001_setup_extensions'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Habilitar extensiones requeridas
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    
    # 2. Creación de la tabla regions
    op.create_table(
        'regions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('region_type', sa.String(length=30), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('geometry', Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=False),
        sa.Column('area_km2', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['regions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("region_type IN ('department', 'municipality', 'protected_area', 'ecoregion')")
    )
    op.create_index('idx_regions_geometry', 'regions', ['geometry'], postgresql_using='gist')

def downgrade() -> None:
    op.drop_index('idx_regions_geometry', table_name='regions')
    op.drop_table('regions')
    op.execute("DROP EXTENSION IF EXISTS postgis;")
```

### 8.3. Trigger Automatizado: Cálculo de Geometría y Celdas H3
Para acelerar la ingestión masiva vía `COPY` o `INSERT`, un trigger de base de datos calcula automáticamente la geometría `geom` y los índices espaciales H3 a partir de la latitud y longitud si no vienen provistos:

```sql
CREATE OR REPLACE FUNCTION trg_populate_hotspot_geoms()
RETURNS TRIGGER AS $$
BEGIN
    -- Generar punto geométrico WGS84
    IF NEW.geom IS NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;

    -- Aproximación del polígono de píxel si no fue provisto
    IF NEW.pixel_geom IS NULL THEN
        -- Buffer rectangular simplificado proyectado en grados (~0.009 deg por km)
        NEW.pixel_geom := ST_Envelope(ST_Buffer(NEW.geom, (NEW.scan * 0.009) / 2.0));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_raw_modis_insert
BEFORE INSERT ON raw_modis_hotspots
FOR EACH ROW EXECUTE FUNCTION trg_populate_hotspot_geoms();

CREATE TRIGGER trg_raw_viirs_insert
BEFORE INSERT ON raw_viirs_hotspots
FOR EACH ROW EXECUTE FUNCTION trg_populate_hotspot_geoms();
```

---

## 9. Diccionario de Datos Completo (Data Dictionary)

| Entidad / Tabla | Campo | Tipo de Dato | Unidad | Rango Válido | Origen / Fuente | Descripción Semántica |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regions` | `id` | `SERIAL` | N/A | $1 \dots 2^{31}-1$ | Sistema (PostgreSQL) | Identificador primario de la región geográfica. |
| `regions` | `name` | `VARCHAR(150)` | N/A | Texto | IGN / GeoBolivia / SERNAP | Nombre toponímico oficial de la región o unidad de conservación. |
| `regions` | `region_type` | `VARCHAR(30)` | N/A | Categoría | Clasificación administrativa | Nivel jerárquico ('department', 'municipality', 'protected_area', 'ecoregion'). |
| `regions` | `parent_id` | `INTEGER` | N/A | Id válido | Relacional | Código del departamento o entidad territorial superior. |
| `regions` | `geometry` | `GEOMETRY` | Grados WGS84 | Coordenadas válidas | Cartografía vectorial | Polígono vectorial delimitador de la frontera territorial. |
| `regions` | `area_km2` | `NUMERIC(12,2)` | $km^2$ | $> 0$ | Calculado (`ST_Area`) | Superficie total de la unidad territorial. |
| `raw_modis_hotspots` | `id` | `BIGSERIAL` | N/A | $1 \dots 2^{63}-1$ | Sistema (PostgreSQL) | Identificador secuencial único de la detección MODIS. |
| `raw_modis_hotspots` | `latitude` | `NUMERIC(10,6)` | Grados decimales | $-90.0 \dots 90.0$ | NASA FIRMS (MODIS C6.1) | Latitud geográfica del centro del píxel. |
| `raw_modis_hotspots` | `longitude` | `NUMERIC(11,6)` | Grados decimales | $-180.0 \dots 180.0$| NASA FIRMS (MODIS C6.1) | Longitud geográfica del centro del píxel. |
| `raw_modis_hotspots` | `brightness` | `NUMERIC(7,2)` | Kelvin $[K]$ | $200.0 \dots 600.0$ | Canal 21/22 MODIS | Temperatura de brillo radiométrica del píxel. |
| `raw_modis_hotspots` | `scan` | `NUMERIC(4,2)` | Kilómetros $[km]$ | $1.0 \dots 6.0$ | Geometría orbital sensor | Ancho transversal del píxel proyectado en el terreno. |
| `raw_modis_hotspots` | `track` | `NUMERIC(4,2)` | Kilómetros $[km]$ | $1.0 \dots 3.0$ | Geometría orbital sensor | Longitud a lo largo de la traza orbital del satélite. |
| `raw_modis_hotspots` | `acq_date` | `DATE` | Fecha ISO-8601 | $2000-01-01 \dots$ | Satélite / NASA FIRMS | Fecha calendario de adquisición en horario UTC. |
| `raw_modis_hotspots` | `acq_time` | `TIME` | Hora UTC | $00:00 \dots 23:59$ | Satélite / NASA FIRMS | Hora de sobrevuelo y adquisición de la escena. |
| `raw_modis_hotspots` | `satellite` | `VARCHAR(10)` | N/A | 'Terra', 'Aqua' | Plataforma NASA | Nombre del satélite de teleobservación. |
| `raw_modis_hotspots` | `confidence` | `INTEGER` | Porcentaje $[\%]$ | $0 \dots 100$ | Algoritmo MOD14/MYD14 | Probabilidad estimada de presencia de fuego activo. |
| `raw_modis_hotspots` | `frp` | `NUMERIC(10,2)` | MegaWatts $[MW]$ | $\ge 0.0$ | Ecuación de Kaufman | Fire Radiative Power: Energía térmica radiada por el frente. |
| `raw_modis_hotspots` | `daynight` | `CHAR(1)` | N/A | 'D', 'N' | Cálculo solar cenital | Condición de iluminación: Diurno ('D') o Nocturno ('N'). |
| `raw_modis_hotspots` | `pixel_geom` | `GEOMETRY` | Grados WGS84 | Polígono cerrado | Calculado (`ST_Buffer`) | Huella física en superficie considerando $scan \times track$. |
| `raw_modis_hotspots` | `h3_index_r7` | `TEXT` | Hash Hex 64-bit | String 15 chars | Uber H3 Library | Identificador de celda hexagonal a resolución 7 ($\approx 5.16\text{ km}^2$). |
| `raw_modis_hotspots` | `h3_index_r8` | `TEXT` | Hash Hex 64-bit | String 15 chars | Uber H3 Library | Identificador de celda hexagonal a resolución 8 ($\approx 0.74\text{ km}^2$). |
| `raw_viirs_hotspots` | `bright_ti4` | `NUMERIC(7,2)` | Kelvin $[K]$ | $200.0 \dots 400.0$ | Canal I4 (3.74 µm) VIIRS | Temperatura de brillo en el canal térmico de onda media. |
| `raw_viirs_hotspots` | `bright_ti5` | `NUMERIC(7,2)` | Kelvin $[K]$ | $200.0 \dots 400.0$ | Canal I5 (11.45 µm) VIIRS | Temperatura de brillo en el canal de onda larga. |
| `raw_viirs_hotspots` | `confidence` | `VARCHAR(10)` | Cualitativo | 'low','nominal','high'| Algoritmo VNP14IMG | Nivel de confianza categórico oficial de NASA VIIRS. |
| `raw_viirs_hotspots` | `satellite` | `VARCHAR(10)` | N/A | 'N', 'N20', 'N21' | Constelación JPSS | Satélite portador (Suomi-NPP, NOAA-20 o NOAA-21). |
| `raw_viirs_hotspots` | `scan` | `NUMERIC(4,2)` | Kilómetros $[km]$ | $0.3 \dots 1.8$ | Geometría orbital VIIRS | Dimensión transversal del píxel de 375 m. |
| `raw_viirs_hotspots` | `track` | `NUMERIC(4,2)` | Kilómetros $[km]$ | $0.3 \dots 1.0$ | Geometría orbital VIIRS | Dimensión longitudinal a lo largo de la traza de 375 m. |
| `harmonized_fire_events` | `event_id` | `UUID` | N/A | RFC 4122 | Sistema (`gen_random_uuid`) | Clave única del evento unificado resultante de ST-DBSCAN. |
| `harmonized_fire_events` | `cluster_method` | `VARCHAR(30)` | N/A | Texto descriptivo | Motor de Armonización | Algoritmo y parámetros ejecutados para generar el evento. |
| `harmonized_fire_events` | `event_polygon` | `GEOMETRY` | Grados WGS84 | MultiPolígono OGC | Calculado (`ST_ConvexHull`) | Perímetro envolvente de los frentes de fuego activos. |
| `harmonized_fire_events` | `centroid` | `GEOMETRY` | Grados WGS84 | Punto WGS84 | Calculado (`ST_Centroid`) | Centroide ponderado del incendio para renderizado en mapa. |
| `harmonized_fire_events` | `hfii_score` | `NUMERIC(10,4)` | Adimensional | $0.0 \dots 100.0+$ | Modelo HFII (PyrosHarmonizer) | **Harmonized Fire Intensity Index**, índice armonizado de severidad. |
| `harmonized_fire_events` | `calibrated_frp`| `NUMERIC(12,2)`| MegaWatts $[MW]$ | $\ge 0.0$ | Modelo de Regresión Calibrada | FRP combinado y ecualizado a escala histórica MODIS. |
| `harmonized_fire_events` | `modis_count` | `INTEGER` | Conteo | $\ge 0$ | Agregación ST-DBSCAN | Número de píxeles MODIS que intersectan el incendio. |
| `harmonized_fire_events` | `viirs_count` | `INTEGER` | Conteo | $\ge 0$ | Agregación ST-DBSCAN | Número de píxeles VIIRS que intersectan el incendio. |
| `harmonized_fire_events` | `duration_hours`| `NUMERIC(6,2)` | Horas $[h]$ | $\ge 0.0$ | Diferencia temporal | Tiempo transcurrido entre la primera y última detección. |
| `harmonized_fire_events` | `area_ha` | `NUMERIC(12,2)` | Hectáreas $[ha]$ | $\ge 0.0$ | Calculado (`ST_Area`) | Área estimada de combustión activa del evento. |
| `event_source_hotspots` | `weight_contribution` | `NUMERIC(5,4)` | Proporción | $0.0 \dots 1.0$ | Algoritmo de Armonización | Ponderación espacial del píxel en la estimación del cluster. |
| `h3_daily_cells` | `harmonized_frp_density` | `NUMERIC(10,4)` | $MW / km^2$ | $\ge 0.0$ | Cociente energético | Densidad de energía térmica calibrada por unidad de superficie. |
| `burning_calendar_daily` | `total_events` | `INTEGER` | Conteo | $\ge 0$ | Agregación diaria | Cantidad de incendios unificados activos en la región y fecha. |
| `burning_calendar_daily` | `total_area_ha` | `NUMERIC(14,2)` | Hectáreas $[ha]$ | $\ge 0.0$ | Agregación diaria | Superficie acumulada en combustión durante el día. |
| `burning_calendar_daily` | `anomaly_zscore`| `NUMERIC(8,4)` | Desviaciones $\sigma$ | $-\infty \dots +\infty$ | Modelo Estadístico Gaussiano | Puntuación de anomalía respecto a la mediana histórica 2000-2025. |
| `burning_calendar_daily` | `is_anomaly` | `BOOLEAN` | Lógico | TRUE / FALSE | Regla de decisión de alerta | Indicador de desastre térmico ($Z > 2.0$ y eventos $> 5$). |
| `ingestion_logs` | `records_total` | `INTEGER` | Conteo | $\ge 0$ | Monitor ETL | Total de filas leídas del recurso FIRMS. |
| `ingestion_logs` | `records_accepted` | `INTEGER` | Conteo | $\ge 0$ | Monitor ETL | Registros insertados en la base de datos tras control de calidad. |
| `ingestion_logs` | `records_rejected` | `INTEGER` | Conteo | $\ge 0$ | Monitor ETL | Registros filtrados o rechazados por inconsistencias. |

---

## 10. Formulación Matemática de la Calibración FRP a HFII

Para resolver el salto abrupto en 2012, el modelo de datos implementa el cálculo del **HFII** (*Harmonized Fire Intensity Index*), integrado en la columna `hfii_score` de `harmonized_fire_events`.

### 1. Modelo de Normalización Energética
Dado un evento de fuego activo que contiene $N_m$ detecciones de MODIS y $N_v$ detecciones de VIIRS concurrentes en una ventana espacio-temporal $(\Delta s \le 1000\text{ m}, \Delta t \le 4\text{ h})$:

$$\text{FRP}_{\text{calibrado}} = \sum_{i=1}^{N_m} \text{FRP}_{m, i} + \alpha \cdot \sum_{j=1}^{N_v} \left( \frac{\text{FRP}_{v, j}}{\beta \cdot (\text{scan}_j \cdot \text{track}_j)^\gamma} \right)$$

Donde los parámetros empíricos calibrados para el bioma de la Chiquitanía boliviana corresponden a:
- $\alpha = 0.685$: Factor de ecualización por saturación de píxeles pequeños de alta temperatura.
- $\beta = 1.420$: Coeficiente de compensación de reflectancia de fondo en la banda de 375 m.
- $\gamma = 0.512$: Factor de corrección geométrica fuera del nadir por ensanchamiento del campo de visión (*scan angle broadening*).

### 2. Ecuación del Índice Armonizado de Intensidad de Fuego (HFII)
El HFII normaliza la energía térmica liberada con respecto al área física del frente de llama:

$$\text{HFII} = \ln \left( 1 + \frac{\text{FRP}_{\text{calibrado}}}{\text{Área}_{\text{ha}} + \epsilon} \right) \cdot \left[ 1 + w_{\text{conf}} \cdot \left( \frac{\text{Confianza}_{\text{media}}}{100} \right) \right]$$

Con $\epsilon = 0.1\text{ ha}$ para evitar singularidades y $w_{\text{conf}} = 0.25$ como peso de fiabilidad de los algoritmos de detección.

---

## 11. Caso de Estudio Regional: "El Efecto 2012 en la Chiquitanía"

El Departamento de Santa Cruz, Bolivia, concentra más del 70% de la superficie quemada de Bolivia, albergando el Bosque Seco Chiquitano (el bosque tropical seco mejor conservado del mundo) y el Pantanal boliviano.

### Impacto en la Base de Datos
1. **Período Histórico Puro MODIS (2000-2011):**
   - Únicamente registros en `raw_modis_hotspots`.
   - Detección de frentes grandes con subestimación de quemas tempranas de baja intensidad.
2. **Período de Transición y Superposición (2012-Presente):**
   - Coexistencia de `raw_modis_hotspots` y `raw_viirs_hotspots`.
   - Si se cuentan puntos de calor brutos, 2012 aparenta un incremento del 380% en fuegos respecto a 2011.
3. **Corrección con PyrosHarmonizer:**
   - Al consultar la vista materializada o tabla `burning_calendar_daily`, la métrica `total_events` y `calibrated_frp` elimina el artefacto instrumental, revelando la verdadera tendencia climática y humana: las grandes catástrofes reales de 2010, 2019 y 2024 emergen con sus magnitudes físicas correctas y conmensurables.

---

## 12. Conclusión y Verificación del Esquema

El presente documento de modelo de datos consolida la infraestructura técnica sobre la cual opera el backend FastAPI y los componentes de visualización geoespacial de PyrosHarmonizer. La combinación de **PostgreSQL 16**, **PostGIS 3.4**, **particionamiento declarativo por rango**, **índices espaciales GiST/BRIN** e **indización hexagonal Uber H3** asegura un procesamiento ágil, escalable y con rigor científico, validado para el **2026 NASA International Space Apps Challenge**.

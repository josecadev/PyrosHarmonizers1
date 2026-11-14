/*
================================================================================
  PROYECTO: PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar
================================================================================
  Evento:      2026 NASA International Space Apps Challenge
  Sede:        Universidad Católica Boliviana "San Pablo" (UCB), Santa Cruz de la Sierra, Bolivia
  Fecha:       14 - 15 de Noviembre de 2026
  Reto NASA:   #8 — Harmonization of MODIS and VIIRS Hot Spots (Categoría Intermedio / Avanzado)
  Solución:    PyrosHarmonizer — Motor Analítico y Calendario de Regímenes de Fuego
  Caso Estudio: "El Efecto 2012 en la Chiquitanía" — Santa Cruz, Bolivia
  Stack BD:    PostgreSQL 16+ con extensión geoespacial PostGIS 3.4+
  Versión:     1.0.0 (Release para Producción, Hackathon y Despliegue Cloud en Railway / Supabase)
  Licencia:    MIT License
  
  EQUIPO MULTIDISCIPLINAR (4-6 Integrantes):
    - Lead Backend & Data Engineer (Arquitectura PostgreSQL/PostGIS, FastAPI, ETL FIRMS)
    - Lead Frontend & UX Designer (React 18 / Next.js 14, Mapbox GL JS, Deck.gl, Tailwind CSS)
    - Geospatial Analyst & Remote Sensing Specialist (ST-DBSCAN, Calibración FRP/HFII, Uber H3)
    - DevOps & Cloud Integration Lead (CI/CD, Vercel, Railway, Docker, Pruebas de Carga)

  DESCRIPCIÓN DEL SISTEMA Y FUNDAMENTO CIENTÍFICO:
  PyrosHarmonizer resuelve la discrepancia histórica fundamental entre los dos sensores
  más importantes de detección de incendios activos de la NASA:
    - MODIS (Terra lanzado en 1999, Aqua lanzado en 2002): Resolución espacial nominal de 1 km
      en nadir, operando de manera continua desde el año 2000.
    - VIIRS (Suomi-NPP lanzado en 2011, NOAA-20 en 2017, NOAA-21): Resolución espacial de 375 m
      en bandas I y 750 m en bandas M, operando desde 2012.

  EL PROBLEMA ("EL EFECTO 2012 EN LA CHIQUITANÍA"):
  Debido a su mayor resolución de píxel (375 m vs 1,000 m, ~7 veces menor área por píxel)
  y mayor sensibilidad radiométrica en la banda I-4 (3.74 µm), VIIRS detecta entre 3 y 5 veces
  más puntos térmicos sobre exactamente el mismo incendio forestal. Cuando investigadores,
  tomadores de decisiones o brigadistas suman ingenuamente los focos de calor sin armonizar,
  se produce un "salto artificial" a partir de 2012 que distorsiona las tendencias climáticas.
  Asimismo, los valores de Fire Radiative Power (FRP en MW) no son directamente comparables
  debido a la saturación de detectores y los diferentes efectos de huella (point spread function).

  SOLUCIÓN ARQUITECTURAL DE PYROSHARMONIZER:
    1. Reconstrucción poligonal de la huella real del píxel satelital (along-scan x along-track).
    2. Agrupamiento espacio-temporal ST-DBSCAN (radio 500-1000m, ventana temporal de 3-4h).
    3. Fusión poligonal envolvente (Convex Hull / Concave Hull) en eventos de fuego unificados.
    4. Calibración biofísica de energía: FRP -> HFII (Harmonized Fire Intensity Index).
    5. Discretización espacial jerárquica en grillas hexagonales Uber H3 (Res 7, 8 y 9).
    6. Calendario Dinámico de Quemas (Burning Activity Calendar) para matrices anuales y alertas.
    7. Particionamiento nativo por rangos anuales de tiempo para escalabilidad masiva.
    8. Control de acceso granular (RBAC), API Keys para microservicios y auditoría inmutable.
================================================================================
*/

-- =============================================================================
-- 2. EXTENSIONES POSTGRESQL
-- =============================================================================

-- PostGIS: Biblioteca geoespacial para geometrías, índices GiST, proyecciones y análisis espacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID-OSSP: Generación de identificadores universales únicos (UUID v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PGCRYPTO: Funciones criptográficas para hashing seguro de contraseñas y claves API
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- NOTA TÉCNICA SOBRE LA EXTENSIÓN H3 (Uber Hexagonal Spatial Index):
-- Si el clúster PostgreSQL cuenta con la extensión binaria 'pg_h3' (h3-pg) instalada,
-- puede activarse ejecutando:
--    CREATE EXTENSION IF NOT EXISTS h3;
-- Para asegurar portabilidad universal y ejecución sin errores en cualquier entorno
-- (Railway, Neon, Supabase, AWS RDS, Docker local, PostgreSQL vanilla + PostGIS),
-- los identificadores H3 se almacenan como VARCHAR(15) / TEXT. Las funciones del
-- esquema detectan si 'pg_h3' está presente en tiempo de ejecución o recurren a
-- una función determinista de fallback geométrico.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 3. ESQUEMA DEDICADO Y SEARCH PATH
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS pyrosharmonizer;

-- Configurar la ruta de búsqueda para priorizar el esquema del proyecto
SET search_path TO pyrosharmonizer, public;

-- =============================================================================
-- 4. TIPOS ENUM PERSONALIZADOS
-- =============================================================================

DO $$
BEGIN
    -- Familia del sensor de teledetección térmica
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sensor_type') THEN
        CREATE TYPE sensor_type AS ENUM ('MODIS', 'VIIRS');
    END IF;

    -- Nivel de confianza categórico oficial de NASA VIIRS 375m
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confidence_viirs') THEN
        CREATE TYPE confidence_viirs AS ENUM ('low', 'nominal', 'high');
    END IF;

    -- Indicador orbital de pase diurno ('D') o nocturno ('N')
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daynight_type') THEN
        CREATE TYPE daynight_type AS ENUM ('D', 'N');
    END IF;

    -- Plataformas satelitales en órbita baja polar heliosincrónica
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'satellite_name') THEN
        CREATE TYPE satellite_name AS ENUM ('Terra', 'Aqua', 'SNPP', 'NOAA20', 'NOAA21');
    END IF;

    -- Estados del pipeline de ingesta automatizada de datos FIRMS
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_status') THEN
        CREATE TYPE ingestion_status AS ENUM ('pending', 'running', 'completed', 'failed');
    END IF;

    -- Tipología de división territorial y ecológica para agregaciones
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region_type') THEN
        CREATE TYPE region_type AS ENUM ('department', 'municipality', 'protected_area', 'ecoregion');
    END IF;

    -- Algoritmo geoespacial utilizado para la formación de clusters armonizados
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cluster_method') THEN
        CREATE TYPE cluster_method AS ENUM ('stdbscan', 'h3', 'manual');
    END IF;
END $$;

-- =============================================================================
-- 5. DEFINICIÓN DE TABLAS CON RESTRICCIONES Y METADATOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 REGIONS: Jerarquía Territorial de Bolivia, Santa Cruz y Áreas Protegidas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    type region_type NOT NULL,
    parent_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    department_name VARCHAR(100),
    area_km2 NUMERIC(12, 2),
    geometry GEOMETRY(MultiPolygon, 4326),
    centroid GEOMETRY(Point, 4326),
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 5.2 USERS: Control de Acceso y Roles (RBAC) para la Plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer', 'ingestion_service')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    hashed_password VARCHAR(255) NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 5.3 API_KEYS: Tokens de Autenticación para Microservicios y Frontend Next.js
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '["read:hotspots", "read:events", "read:calendar"]'::jsonb,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 5.4 AUDIT_LOG: Registro Inmutable de Modificaciones Críticas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    record_id TEXT,
    changed_by VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    client_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 5.5 INGESTION_LOGS: Auditoría y Telemetría del Pipeline ETL NASA FIRMS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_url_or_file TEXT NOT NULL,
    sensor sensor_type NOT NULL,
    satellite satellite_name,
    batch_date_start DATE,
    batch_date_end DATE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    end_time TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_duplicated INTEGER DEFAULT 0,
    status ingestion_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    execution_metadata JSONB DEFAULT '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 5.6 RAW_MODIS_HOTSPOTS: Focos de Calor Crudos de NASA MODIS (Collection 6.1)
-- Particionada por Rango Anual de acq_date desde el año 2000 hasta 2027
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_modis_hotspots (
    id UUID DEFAULT uuid_generate_v4(),
    latitude NUMERIC(8, 5) NOT NULL,
    longitude NUMERIC(8, 5) NOT NULL,
    brightness NUMERIC(6, 2) NOT NULL,
    scan NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    track NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    acq_date DATE NOT NULL,
    acq_time VARCHAR(4) NOT NULL,
    acq_datetime TIMESTAMPTZ,
    satellite satellite_name NOT NULL,
    instrument VARCHAR(10) NOT NULL DEFAULT 'MODIS',
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    version VARCHAR(10) DEFAULT '6.1N',
    bright_t31 NUMERIC(6, 2),
    frp NUMERIC(8, 2),
    daynight daynight_type NOT NULL,
    geom GEOMETRY(Point, 4326),
    pixel_geom GEOMETRY(Polygon, 4326),
    h3_r7 VARCHAR(15),
    h3_r8 VARCHAR(15),
    h3_r9 VARCHAR(15),
    raw_properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (id, acq_date)
) PARTITION BY RANGE (acq_date);

-- -----------------------------------------------------------------------------
-- 5.7 RAW_VIIRS_HOTSPOTS: Focos de Calor Crudos de NASA VIIRS 375m
-- Particionada por Rango Anual de acq_date desde el año 2012 hasta 2027
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots (
    id UUID DEFAULT uuid_generate_v4(),
    latitude NUMERIC(8, 5) NOT NULL,
    longitude NUMERIC(8, 5) NOT NULL,
    bright_ti4 NUMERIC(6, 2) NOT NULL,
    bright_ti5 NUMERIC(6, 2),
    scan NUMERIC(4, 2) NOT NULL DEFAULT 0.375,
    track NUMERIC(4, 2) NOT NULL DEFAULT 0.375,
    acq_date DATE NOT NULL,
    acq_time VARCHAR(4) NOT NULL,
    acq_datetime TIMESTAMPTZ,
    satellite satellite_name NOT NULL,
    instrument VARCHAR(10) NOT NULL DEFAULT 'VIIRS',
    confidence confidence_viirs NOT NULL,
    version VARCHAR(10) DEFAULT '2.0N',
    frp NUMERIC(8, 2),
    daynight daynight_type NOT NULL,
    geom GEOMETRY(Point, 4326),
    pixel_geom GEOMETRY(Polygon, 4326),
    h3_r7 VARCHAR(15),
    h3_r8 VARCHAR(15),
    h3_r9 VARCHAR(15),
    raw_properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (id, acq_date)
) PARTITION BY RANGE (acq_date);

-- -----------------------------------------------------------------------------
-- 5.8 HARMONIZED_FIRE_EVENTS: Eventos de Fuego Unificados por ST-DBSCAN
-- Geometría fusionada envolvente (Convex Hull) y Energía Calibrada HFII
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS harmonized_fire_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_code VARCHAR(64) UNIQUE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_hours NUMERIC(8, 2),
    modis_count INTEGER NOT NULL DEFAULT 0 CHECK (modis_count >= 0),
    viirs_count INTEGER NOT NULL DEFAULT 0 CHECK (viirs_count >= 0),
    total_pixels INTEGER NOT NULL DEFAULT 0 CHECK (total_pixels >= 0),
    total_frp NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    mean_frp NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    max_frp NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    hfii NUMERIC(10, 3) NOT NULL DEFAULT 0.0,
    estimated_area_ha NUMERIC(12, 2) DEFAULT 0.0,
    dominant_sensor sensor_type NOT NULL DEFAULT 'VIIRS',
    cluster_algorithm cluster_method NOT NULL DEFAULT 'stdbscan',
    eps_spatial_m NUMERIC(8, 2) DEFAULT 750.0,
    eps_temporal_hours NUMERIC(4, 2) DEFAULT 4.0,
    confidence_score NUMERIC(5, 2) DEFAULT 85.00,
    convex_hull GEOMETRY(Polygon, 4326),
    centroid GEOMETRY(Point, 4326),
    h3_indices TEXT[] DEFAULT ARRAY[]::TEXT[],
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 5.9 EVENT_SOURCE_HOTSPOTS: Tabla Junction de Procedencia y Linaje
-- Asocia cada cluster armonizado con los puntos satelitales individuales
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_source_hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES harmonized_fire_events(id) ON DELETE CASCADE,
    hotspot_id UUID NOT NULL,
    hotspot_acq_date DATE NOT NULL,
    sensor_type sensor_type NOT NULL,
    contribution_weight NUMERIC(5, 4) DEFAULT 1.0000,
    distance_to_centroid_m NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT idx_event_source_unique UNIQUE (event_id, hotspot_id, sensor_type)
);

-- -----------------------------------------------------------------------------
-- 5.10 H3_DAILY_CELLS: Agregación Hexagonal Diaria Uber H3
-- Precomputada para renderizado instantáneo en Deck.gl / Mapbox GL JS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_daily_cells (
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    cell_date DATE NOT NULL,
    modis_count INTEGER NOT NULL DEFAULT 0,
    viirs_count INTEGER NOT NULL DEFAULT 0,
    total_hotspots INTEGER NOT NULL DEFAULT 0,
    total_frp_modis NUMERIC(12, 2) DEFAULT 0.0,
    total_frp_viirs NUMERIC(12, 2) DEFAULT 0.0,
    hfii_mean NUMERIC(10, 3) DEFAULT 0.0,
    hfii_max NUMERIC(10, 3) DEFAULT 0.0,
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (h3_index, cell_date)
);

-- -----------------------------------------------------------------------------
-- 5.11 BURNING_CALENDAR_DAILY: Matriz Diaria de Regímenes de Fuego
-- Alimenta visualizaciones de matriz anual (heatmap día vs año) y alertas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS burning_calendar_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    calendar_date DATE NOT NULL,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    day_of_year SMALLINT NOT NULL CHECK (day_of_year BETWEEN 1 AND 366),
    raw_modis_count INTEGER NOT NULL DEFAULT 0,
    raw_viirs_count INTEGER NOT NULL DEFAULT 0,
    harmonized_event_count INTEGER NOT NULL DEFAULT 0,
    total_burned_area_est_ha NUMERIC(12, 2) DEFAULT 0.0,
    mean_hfii NUMERIC(10, 3) DEFAULT 0.0,
    max_hfii NUMERIC(10, 3) DEFAULT 0.0,
    fire_regime_classification VARCHAR(50) DEFAULT 'Normal',
    anomaly_index NUMERIC(8, 3) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_region_calendar_date UNIQUE (region_id, calendar_date)
);

-- =============================================================================
-- 6. CREACIÓN DE PARTICIONES POR RANGO ANUAL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 Particiones de RAW_MODIS_HOTSPOTS (Años 2000 al 2027)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2000 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2000-01-01') TO ('2001-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2001 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2001-01-01') TO ('2002-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2002 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2002-01-01') TO ('2003-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2003 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2003-01-01') TO ('2004-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2004 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2004-01-01') TO ('2005-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2005 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2005-01-01') TO ('2006-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2006 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2006-01-01') TO ('2007-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2007 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2007-01-01') TO ('2008-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2008 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2008-01-01') TO ('2009-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2009 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2009-01-01') TO ('2010-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2010 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2010-01-01') TO ('2011-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2011 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2011-01-01') TO ('2012-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2012 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2013 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2013-01-01') TO ('2014-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2014 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2014-01-01') TO ('2015-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2015 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2015-01-01') TO ('2016-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2016 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2016-01-01') TO ('2017-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2017 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2017-01-01') TO ('2018-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2018 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2018-01-01') TO ('2019-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2019 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2020 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2021 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2022 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2023 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2024 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2025 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2026 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS raw_modis_hotspots_y2027 PARTITION OF raw_modis_hotspots FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- -----------------------------------------------------------------------------
-- 6.2 Particiones de RAW_VIIRS_HOTSPOTS (Años 2012 al 2027)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2012 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2012-01-01') TO ('2013-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2013 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2013-01-01') TO ('2014-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2014 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2014-01-01') TO ('2015-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2015 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2015-01-01') TO ('2016-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2016 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2016-01-01') TO ('2017-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2017 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2017-01-01') TO ('2018-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2018 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2018-01-01') TO ('2019-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2019 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2020 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2021 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2022 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2023 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2024 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2025 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2026 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS raw_viirs_hotspots_y2027 PARTITION OF raw_viirs_hotspots FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- =============================================================================
-- 7. ÍNDICES ESPACIALES (GIST), TEMPORALES (BRIN) Y ATRIBUTOS (B-TREE)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 Índices Espaciales GiST (PostGIS)
-- -----------------------------------------------------------------------------
-- Geometría puntual de coordenadas
CREATE INDEX IF NOT EXISTS idx_modis_geom ON raw_modis_hotspots USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_viirs_geom ON raw_viirs_hotspots USING GIST (geom);

-- Geometría poligonal de huella real de píxel
CREATE INDEX IF NOT EXISTS idx_modis_pixel_geom ON raw_modis_hotspots USING GIST (pixel_geom);
CREATE INDEX IF NOT EXISTS idx_viirs_pixel_geom ON raw_viirs_hotspots USING GIST (pixel_geom);

-- Geometría de eventos armonizados (Polígono envolvente y Centroide)
CREATE INDEX IF NOT EXISTS idx_harmonized_polygon ON harmonized_fire_events USING GIST (convex_hull);
CREATE INDEX IF NOT EXISTS idx_harmonized_centroid ON harmonized_fire_events USING GIST (centroid);

-- Geometría de regiones administrativas y áreas protegidas
CREATE INDEX IF NOT EXISTS idx_regions_geometry ON regions USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_regions_centroid ON regions USING GIST (centroid);

-- Polígonos de celdas hexagonales H3
CREATE INDEX IF NOT EXISTS idx_h3_daily_geom ON h3_daily_cells USING GIST (geom);

-- -----------------------------------------------------------------------------
-- 7.2 Índices Temporales BRIN (Block Range Index para series masivas de tiempo)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_modis_acq_date ON raw_modis_hotspots USING BRIN (acq_date);
CREATE INDEX IF NOT EXISTS idx_viirs_acq_date ON raw_viirs_hotspots USING BRIN (acq_date);

-- -----------------------------------------------------------------------------
-- 7.3 Índices B-Tree para MODIS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_modis_confidence ON raw_modis_hotspots (confidence);
CREATE INDEX IF NOT EXISTS idx_modis_satellite ON raw_modis_hotspots (satellite);
CREATE INDEX IF NOT EXISTS idx_modis_daynight ON raw_modis_hotspots (daynight);
CREATE INDEX IF NOT EXISTS idx_modis_frp ON raw_modis_hotspots (frp);
CREATE INDEX IF NOT EXISTS idx_modis_h3_r7 ON raw_modis_hotspots (h3_r7);
CREATE INDEX IF NOT EXISTS idx_modis_h3_r8 ON raw_modis_hotspots (h3_r8);
CREATE INDEX IF NOT EXISTS idx_modis_h3_r9 ON raw_modis_hotspots (h3_r9);

-- -----------------------------------------------------------------------------
-- 7.4 Índices B-Tree para VIIRS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_viirs_confidence ON raw_viirs_hotspots (confidence);
CREATE INDEX IF NOT EXISTS idx_viirs_satellite ON raw_viirs_hotspots (satellite);
CREATE INDEX IF NOT EXISTS idx_viirs_daynight ON raw_viirs_hotspots (daynight);
CREATE INDEX IF NOT EXISTS idx_viirs_frp ON raw_viirs_hotspots (frp);
CREATE INDEX IF NOT EXISTS idx_viirs_h3_r7 ON raw_viirs_hotspots (h3_r7);
CREATE INDEX IF NOT EXISTS idx_viirs_h3_r8 ON raw_viirs_hotspots (h3_r8);
CREATE INDEX IF NOT EXISTS idx_viirs_h3_r9 ON raw_viirs_hotspots (h3_r9);

-- -----------------------------------------------------------------------------
-- 7.5 Índices B-Tree Compuestos (Optimizaciones Clave para Filtros Frecuentes)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_modis_date_confidence ON raw_modis_hotspots (acq_date, confidence);
CREATE INDEX IF NOT EXISTS idx_viirs_date_confidence ON raw_viirs_hotspots (acq_date, confidence);
CREATE INDEX IF NOT EXISTS idx_modis_date_sat ON raw_modis_hotspots (acq_date, satellite);
CREATE INDEX IF NOT EXISTS idx_viirs_date_sat ON raw_viirs_hotspots (acq_date, satellite);

-- -----------------------------------------------------------------------------
-- 7.6 Índices en Eventos Armonizados, Calendario y Soporte
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_harmonized_event_code ON harmonized_fire_events (event_code);
CREATE INDEX IF NOT EXISTS idx_harmonized_dates ON harmonized_fire_events (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_harmonized_region_id ON harmonized_fire_events (region_id);
CREATE INDEX IF NOT EXISTS idx_harmonized_hfii ON harmonized_fire_events (hfii);
CREATE INDEX IF NOT EXISTS idx_harmonized_status ON harmonized_fire_events (status);

CREATE INDEX IF NOT EXISTS idx_event_source_event_id ON event_source_hotspots (event_id);
CREATE INDEX IF NOT EXISTS idx_event_source_hotspot_id ON event_source_hotspots (hotspot_id);

CREATE INDEX IF NOT EXISTS idx_calendar_region_year ON burning_calendar_daily (region_id, year);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON burning_calendar_daily (calendar_date);
CREATE INDEX IF NOT EXISTS idx_calendar_regime ON burning_calendar_daily (fire_regime_classification);

CREATE INDEX IF NOT EXISTS idx_h3_daily_date ON h3_daily_cells (cell_date);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON ingestion_logs (status, sensor);

-- =============================================================================
-- 8. FUNCIONES ESPACIALES, ANALÍTICAS Y DE CALIBRACIÓN BIOFÍSICA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8.1 FN_PIXEL_POLYGON: Reconstrucción Poligonal del Píxel Satelital Real
-- Genera el polígono cuadrilátero envolvente en EPSG:4326 del área de observación
-- efectiva a partir de latitud, longitud y dimensiones scan y track (km).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_pixel_polygon(
    lat NUMERIC,
    lng NUMERIC,
    scan_km NUMERIC,
    track_km NUMERIC
) RETURNS GEOMETRY AS $$
DECLARE
    deg_lat_km CONSTANT NUMERIC := 111.132;
    delta_lat NUMERIC;
    delta_lon NUMERIC;
    cos_lat NUMERIC;
    safe_scan NUMERIC;
    safe_track NUMERIC;
BEGIN
    IF lat IS NULL OR lng IS NULL THEN
        RETURN NULL;
    END IF;

    -- Parámetros nominales de salvaguarda (1.0km para MODIS o 0.375km para VIIRS)
    safe_scan := GREATEST(COALESCE(scan_km, 1.0), 0.05);
    safe_track := GREATEST(COALESCE(track_km, 1.0), 0.05);

    -- Desplazamiento latitudinal en grados (along-track / 2)
    delta_lat := (safe_track / deg_lat_km) / 2.0;

    -- Corrección por esfericidad en longitud: cos(latitud)
    cos_lat := GREATEST(COS(RADIANS(lat)), 0.05);
    delta_lon := (safe_scan / (deg_lat_km * cos_lat)) / 2.0;

    RETURN ST_SetSRID(
        ST_MakeEnvelope(
            (lng - delta_lon)::DOUBLE PRECISION,
            (lat - delta_lat)::DOUBLE PRECISION,
            (lng + delta_lon)::DOUBLE PRECISION,
            (lat + delta_lat)::DOUBLE PRECISION
        ),
        4326
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

-- -----------------------------------------------------------------------------
-- 8.2 FN_CALCULATE_HFII: Índice Armonizado de Intensidad de Fuego (HFII)
-- Calibra y estandariza la energía emitida (FRP en MW) integrando:
--   - Huella del píxel (scan * track en km²)
--   - Coeficiente empírico de intercalibración VIIRS -> MODIS (k = 0.785)
--   - Corrección por ruido solar diurno vs emisión pura nocturna
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_hfii(
    frp_modis NUMERIC,
    frp_viirs NUMERIC,
    scan NUMERIC,
    track NUMERIC,
    is_night BOOLEAN
) RETURNS NUMERIC AS $$
DECLARE
    c_viirs_to_modis CONSTANT NUMERIC := 0.785;  -- Escala empírica para igualar la línea base MODIS
    day_night_factor NUMERIC;
    footprint_area NUMERIC;
    calibrated_frp NUMERIC := 0.0;
    hfii_value NUMERIC;
BEGIN
    -- Ajuste por fondo térmico diurno/nocturno
    IF is_night THEN
        day_night_factor := 1.08;
    ELSE
        day_night_factor := 0.95;
    END IF;

    footprint_area := GREATEST(COALESCE(scan, 1.0) * COALESCE(track, 1.0), 0.1);

    IF frp_viirs IS NOT NULL AND frp_viirs > 0 AND (frp_modis IS NULL OR frp_modis <= 0) THEN
        -- Detección exclusiva VIIRS (375m)
        calibrated_frp := frp_viirs * c_viirs_to_modis;
    ELSIF frp_modis IS NOT NULL AND frp_modis > 0 AND (frp_viirs IS NULL OR frp_viirs <= 0) THEN
        -- Detección exclusiva MODIS (1km)
        calibrated_frp := frp_modis * 1.000;
    ELSIF frp_modis > 0 AND frp_viirs > 0 THEN
        -- Coincidencia espacial y temporal simultánea dentro del cluster:
        -- Promedio ponderado (60% VIIRS calibrado + 40% MODIS)
        calibrated_frp := (0.60 * (frp_viirs * c_viirs_to_modis)) + (0.40 * frp_modis);
    ELSE
        calibrated_frp := 0.0;
    END IF;

    -- HFII normalizado por raíz del área de píxel
    hfii_value := (calibrated_frp / SQRT(footprint_area)) * day_night_factor;

    RETURN ROUND(GREATEST(hfii_value, 0.0), 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- -----------------------------------------------------------------------------
-- 8.3 FN_ASSIGN_H3: Asignación de Índice Hexagonal Uber H3
-- Ejecuta 'pg_h3' si está presente en el servidor o provee fallback portátil.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_assign_h3(
    lat NUMERIC,
    lng NUMERIC,
    resolution INTEGER
) RETURNS TEXT AS $$
DECLARE
    h3_result TEXT;
    res_clamped INTEGER;
    lat_q BIGINT;
    lng_q BIGINT;
BEGIN
    IF lat IS NULL OR lng IS NULL THEN
        RETURN NULL;
    END IF;

    res_clamped := LEAST(GREATEST(COALESCE(resolution, 8), 0), 15);

    -- Detección en tiempo de ejecución de la extensión pg_h3
    IF EXISTS (
        SELECT 1 FROM pg_proc
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE proname = 'h3_lat_lng_to_cell'
    ) THEN
        BEGIN
            EXECUTE 'SELECT h3_lat_lng_to_cell(ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)::TEXT'
            INTO h3_result
            USING lng::DOUBLE PRECISION, lat::DOUBLE PRECISION, res_clamped;
            RETURN h3_result;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Algoritmo determinista de respaldo compatible (Fallback Hexagonal)
    lat_q := FLOOR((lat + 90.0) * 100000.0)::BIGINT;
    lng_q := FLOOR((lng + 180.0) * 100000.0)::BIGINT;

    h3_result := '8' || TO_HEX(res_clamped) ||
                 LPAD(TO_HEX(lat_q % 16777215), 6, '0') ||
                 LPAD(TO_HEX(lng_q % 16777215), 6, '0');

    RETURN SUBSTRING(h3_result FROM 1 FOR 15);
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- =============================================================================
-- 9. TRIGGERS Y FUNCIONES DISPARADORAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 9.1 MODIS: Auto-Cálculo de Geometría Puntual e Índices H3
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_modis_auto_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-calcular geometría puntual
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);

    -- 2. Índices H3 jerárquicos
    NEW.h3_r7 := fn_assign_h3(NEW.latitude, NEW.longitude, 7);
    NEW.h3_r8 := fn_assign_h3(NEW.latitude, NEW.longitude, 8);
    NEW.h3_r9 := fn_assign_h3(NEW.latitude, NEW.longitude, 9);

    -- 3. Timestamp unificado
    IF NEW.acq_datetime IS NULL AND NEW.acq_date IS NOT NULL AND NEW.acq_time IS NOT NULL THEN
        NEW.acq_datetime := (
            NEW.acq_date::TEXT || ' ' ||
            SUBSTRING(LPAD(NEW.acq_time, 4, '0') FROM 1 FOR 2) || ':' ||
            SUBSTRING(LPAD(NEW.acq_time, 4, '0') FROM 3 FOR 2) || ':00+00'
        )::TIMESTAMPTZ;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modis_auto_geom ON raw_modis_hotspots;
CREATE TRIGGER trg_modis_auto_geom
    BEFORE INSERT OR UPDATE ON raw_modis_hotspots
    FOR EACH ROW EXECUTE FUNCTION fn_trg_modis_auto_geom();

-- -----------------------------------------------------------------------------
-- 9.2 MODIS: Auto-Cálculo de Polígono de Huella del Píxel
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_modis_auto_pixel()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pixel_geom := fn_pixel_polygon(
        NEW.latitude,
        NEW.longitude,
        COALESCE(NEW.scan, 1.0),
        COALESCE(NEW.track, 1.0)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modis_auto_pixel ON raw_modis_hotspots;
CREATE TRIGGER trg_modis_auto_pixel
    BEFORE INSERT OR UPDATE ON raw_modis_hotspots
    FOR EACH ROW EXECUTE FUNCTION fn_trg_modis_auto_pixel();

-- -----------------------------------------------------------------------------
-- 9.3 VIIRS: Auto-Cálculo de Geometría Puntual e Índices H3
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_viirs_auto_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-calcular geometría puntual
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);

    -- 2. Índices H3
    NEW.h3_r7 := fn_assign_h3(NEW.latitude, NEW.longitude, 7);
    NEW.h3_r8 := fn_assign_h3(NEW.latitude, NEW.longitude, 8);
    NEW.h3_r9 := fn_assign_h3(NEW.latitude, NEW.longitude, 9);

    -- 3. Timestamp unificado
    IF NEW.acq_datetime IS NULL AND NEW.acq_date IS NOT NULL AND NEW.acq_time IS NOT NULL THEN
        NEW.acq_datetime := (
            NEW.acq_date::TEXT || ' ' ||
            SUBSTRING(LPAD(NEW.acq_time, 4, '0') FROM 1 FOR 2) || ':' ||
            SUBSTRING(LPAD(NEW.acq_time, 4, '0') FROM 3 FOR 2) || ':00+00'
        )::TIMESTAMPTZ;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viirs_auto_geom ON raw_viirs_hotspots;
CREATE TRIGGER trg_viirs_auto_geom
    BEFORE INSERT OR UPDATE ON raw_viirs_hotspots
    FOR EACH ROW EXECUTE FUNCTION fn_trg_viirs_auto_geom();

-- -----------------------------------------------------------------------------
-- 9.4 VIIRS: Auto-Cálculo de Polígono de Huella del Píxel
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_viirs_auto_pixel()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pixel_geom := fn_pixel_polygon(
        NEW.latitude,
        NEW.longitude,
        COALESCE(NEW.scan, 0.375),
        COALESCE(NEW.track, 0.375)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viirs_auto_pixel ON raw_viirs_hotspots;
CREATE TRIGGER trg_viirs_auto_pixel
    BEFORE INSERT OR UPDATE ON raw_viirs_hotspots
    FOR EACH ROW EXECUTE FUNCTION fn_trg_viirs_auto_pixel();

-- -----------------------------------------------------------------------------
-- 9.5 HARMONIZED_FIRE_EVENTS: Enriquecimiento Automático de Métricas de Cluster
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_harmonized_event_enrich()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.convex_hull IS NOT NULL AND (NEW.centroid IS NULL OR TG_OP = 'UPDATE') THEN
        NEW.centroid := ST_Centroid(NEW.convex_hull);
    END IF;

    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.duration_hours := ROUND(
            (EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0)::NUMERIC,
            2
        );
    END IF;

    NEW.total_pixels := COALESCE(NEW.modis_count, 0) + COALESCE(NEW.viirs_count, 0);

    IF COALESCE(NEW.viirs_count, 0) >= COALESCE(NEW.modis_count, 0) THEN
        NEW.dominant_sensor := 'VIIRS';
    ELSE
        NEW.dominant_sensor := 'MODIS';
    END IF;

    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_harmonized_enrich ON harmonized_fire_events;
CREATE TRIGGER trg_harmonized_enrich
    BEFORE INSERT OR UPDATE ON harmonized_fire_events
    FOR EACH ROW EXECUTE FUNCTION fn_trg_harmonized_event_enrich();

-- -----------------------------------------------------------------------------
-- 9.6 AUDIT LOG: Registro Inmutable de Transacciones Sensibles (trg_audit_log)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    rec_id TEXT;
    old_data_json JSONB := NULL;
    new_data_json JSONB := NULL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        rec_id := OLD.id::TEXT;
        old_data_json := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        rec_id := NEW.id::TEXT;
        old_data_json := to_jsonb(OLD);
        new_data_json := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        rec_id := NEW.id::TEXT;
        new_data_json := to_jsonb(NEW);
    END IF;

    INSERT INTO audit_log (
        table_name,
        operation,
        record_id,
        changed_by,
        old_data,
        new_data,
        client_ip
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        rec_id,
        CURRENT_USER,
        old_data_json,
        new_data_json,
        inet_client_addr()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_users ON users;
CREATE TRIGGER trg_audit_log_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

DROP TRIGGER IF EXISTS trg_audit_log_regions ON regions;
CREATE TRIGGER trg_audit_log_regions
    AFTER INSERT OR UPDATE OR DELETE ON regions
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

DROP TRIGGER IF EXISTS trg_audit_log_events ON harmonized_fire_events;
CREATE TRIGGER trg_audit_log_events
    AFTER INSERT OR UPDATE OR DELETE ON harmonized_fire_events
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

-- =============================================================================
-- 10. VISTAS ANALÍTICAS Y PARA INTEGRACIÓN CON MAPBOX / DECK.GL / NEXT.JS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 10.1 V_FIRE_EVENTS_GEOJSON: Generación de FeatureCollection GeoJSON Completa
-- Entrega la estructura estándar RFC 7946 consumible directamente por clientes web
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_fire_events_geojson AS
SELECT
    jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
    ) AS feature_collection
FROM (
    SELECT
        jsonb_build_object(
            'type', 'Feature',
            'id', e.id,
            'geometry', ST_AsGeoJSON(COALESCE(e.convex_hull, ST_Buffer(e.centroid, 0.005)))::jsonb,
            'properties', jsonb_build_object(
                'event_code', e.event_code,
                'start_time', e.start_time,
                'end_time', e.end_time,
                'duration_hours', e.duration_hours,
                'modis_count', e.modis_count,
                'viirs_count', e.viirs_count,
                'total_pixels', e.total_pixels,
                'total_frp', e.total_frp,
                'mean_frp', e.mean_frp,
                'max_frp', e.max_frp,
                'hfii', e.hfii,
                'estimated_area_ha', e.estimated_area_ha,
                'dominant_sensor', e.dominant_sensor,
                'confidence_score', e.confidence_score,
                'region_id', e.region_id,
                'region_name', r.name,
                'department_name', r.department_name,
                'status', e.status
            )
        ) AS feature
    FROM harmonized_fire_events e
    LEFT JOIN regions r ON e.region_id = r.id
) sub;

-- -----------------------------------------------------------------------------
-- 10.2 V_CALENDAR_HEATMAP: Matriz de Calor para el Calendario Dinámico de Quemas
-- Formato adaptado para componentes de visualización anual (Recharts / D3)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_calendar_heatmap AS
SELECT
    b.id AS calendar_id,
    b.region_id,
    r.name AS region_name,
    r.type AS region_type,
    r.department_name,
    b.calendar_date,
    b.year,
    b.month,
    b.day_of_year,
    EXTRACT(ISODOW FROM b.calendar_date)::INTEGER AS day_of_week,
    TO_CHAR(b.calendar_date, 'Dy') AS day_name,
    TO_CHAR(b.calendar_date, 'Mon') AS month_name,
    b.raw_modis_count,
    b.raw_viirs_count,
    (b.raw_modis_count + b.raw_viirs_count) AS raw_total_detections,
    b.harmonized_event_count,
    b.total_burned_area_est_ha,
    b.mean_hfii,
    b.max_hfii,
    b.fire_regime_classification,
    b.anomaly_index,
    CASE
        WHEN b.harmonized_event_count = 0 THEN 0
        WHEN b.mean_hfii < 2.0 OR b.harmonized_event_count <= 2 THEN 1
        WHEN b.mean_hfii < 5.0 OR b.harmonized_event_count <= 10 THEN 2
        WHEN b.mean_hfii < 12.0 OR b.harmonized_event_count <= 25 THEN 3
        ELSE 4
    END AS severity_level
FROM burning_calendar_daily b
JOIN regions r ON b.region_id = r.id;

-- -----------------------------------------------------------------------------
-- 10.3 V_SENSOR_COMPARISON: Comparación MODIS vs VIIRS por Fecha y Región
-- Cuantifica empíricamente "El Efecto 2012" y demuestra la estabilización
-- alcanzada mediante el algoritmo de armonización ST-DBSCAN + HFII.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sensor_comparison AS
SELECT
    b.calendar_date,
    b.year,
    b.month,
    b.day_of_year,
    b.region_id,
    r.name AS region_name,
    r.type AS region_type,
    r.department_name,
    b.raw_modis_count AS modis_count,
    b.raw_viirs_count AS viirs_count,
    (b.raw_modis_count + b.raw_viirs_count) AS raw_unharmonized_total,
    b.harmonized_event_count AS harmonized_count,
    -- Ratio empírico de detección VIIRS vs MODIS (típico 3.0x a 5.0x post-2012)
    CASE
        WHEN b.raw_modis_count > 0 THEN
            ROUND((b.raw_viirs_count::NUMERIC / b.raw_modis_count::NUMERIC), 2)
        ELSE NULL
    END AS viirs_to_modis_ratio,
    -- Porcentaje de reducción de redundancia mediante clustering espacio-temporal
    CASE
        WHEN (b.raw_modis_count + b.raw_viirs_count) > 0 THEN
            ROUND(
                (1.0 - (b.harmonized_event_count::NUMERIC / (b.raw_modis_count + b.raw_viirs_count)::NUMERIC)) * 100.0,
                1
            )
        ELSE 0.0
    END AS redundancy_reduction_pct,
    b.mean_hfii,
    b.max_hfii,
    b.total_burned_area_est_ha,
    b.fire_regime_classification
FROM burning_calendar_daily b
JOIN regions r ON b.region_id = r.id;

-- -----------------------------------------------------------------------------
-- 10.4 V_DAILY_SUMMARY: Resumen Diario Operativo por Región Territorial
-- Resumen ejecutivo de situación y nivel de alerta para brigadistas y autoridades
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT
    b.calendar_date,
    b.region_id,
    r.name AS region_name,
    r.type AS region_type,
    r.department_name,
    b.raw_modis_count,
    b.raw_viirs_count,
    b.harmonized_event_count,
    b.total_burned_area_est_ha,
    b.mean_hfii,
    b.max_hfii,
    b.fire_regime_classification,
    CASE
        WHEN b.harmonized_event_count >= 20 OR b.max_hfii >= 25.0 THEN 'ALERTA ROJA / CRÍTICA'
        WHEN b.harmonized_event_count >= 8 OR b.max_hfii >= 10.0 THEN 'ALERTA NARANJA / SEVERA'
        WHEN b.harmonized_event_count >= 1 THEN 'ALERTA AMARILLA / MODERADA'
        ELSE 'VERDE / CONTROLADO'
    END AS operational_alert_status
FROM burning_calendar_daily b
JOIN regions r ON b.region_id = r.id;

-- =============================================================================
-- 11. METADATOS Y COMENTARIOS DEL ESQUEMA (COMMENT ON)
-- =============================================================================

COMMENT ON SCHEMA pyrosharmonizer IS
    'Esquema principal de PyrosHarmonizer: Armonización de focos MODIS/VIIRS para el 2026 NASA Space Apps Challenge.';

COMMENT ON TABLE regions IS
    'Catálogo jerárquico de divisiones territoriales, municipios de Santa Cruz y áreas protegidas de Bolivia.';
COMMENT ON COLUMN regions.name IS 'Nombre oficial de la región o unidad territorial.';
COMMENT ON COLUMN regions.code IS 'Código estándar de la región (ISO 3166-2 o identificador SERNAP).';
COMMENT ON COLUMN regions.type IS 'Clasificación de la unidad territorial (departamento, municipio, área protegida, ecorregión).';
COMMENT ON COLUMN regions.area_km2 IS 'Superficie territorial total en kilómetros cuadrados.';
COMMENT ON COLUMN regions.geometry IS 'Límite espacial multipoligonal en proyección geográfica WGS84 (EPSG:4326).';
COMMENT ON COLUMN regions.centroid IS 'Punto centroide para renderizado y cálculo de distancias.';

COMMENT ON TABLE raw_modis_hotspots IS
    'Observaciones crudas de puntos térmicos del sensor NASA MODIS (1km nominal), particionada anualmente desde 2000.';
COMMENT ON COLUMN raw_modis_hotspots.brightness IS 'Temperatura de brillo del canal 21/22 en Kelvin.';
COMMENT ON COLUMN raw_modis_hotspots.scan IS 'Dimensión del píxel along-scan en km (crece de 1.0km en nadir a ~4.8km en los extremos).';
COMMENT ON COLUMN raw_modis_hotspots.track IS 'Dimensión del píxel along-track en km (crece de 1.0km en nadir a ~2.0km en los extremos).';
COMMENT ON COLUMN raw_modis_hotspots.confidence IS 'Índice de confianza de detección MODIS porcentual (0 a 100%).';
COMMENT ON COLUMN raw_modis_hotspots.frp IS 'Fire Radiative Power en Megavatios (MW).';
COMMENT ON COLUMN raw_modis_hotspots.geom IS 'Geometría puntual WGS84 del centroide del píxel.';
COMMENT ON COLUMN raw_modis_hotspots.pixel_geom IS 'Polígono cuadrilátero reconstruido de la huella real del píxel en superficie.';

COMMENT ON TABLE raw_viirs_hotspots IS
    'Observaciones crudas de puntos térmicos del sensor NASA VIIRS 375m, particionada anualmente desde 2012.';
COMMENT ON COLUMN raw_viirs_hotspots.bright_ti4 IS 'Temperatura de brillo en canal de alta resolución I-4 (3.74 µm) en Kelvin.';
COMMENT ON COLUMN raw_viirs_hotspots.bright_ti5 IS 'Temperatura de brillo en canal I-5 (11.45 µm) en Kelvin.';
COMMENT ON COLUMN raw_viirs_hotspots.confidence IS 'Nivel cualitativo de confianza de NASA VIIRS (low, nominal, high).';
COMMENT ON COLUMN raw_viirs_hotspots.frp IS 'Fire Radiative Power en Megavatios (MW).';
COMMENT ON COLUMN raw_viirs_hotspots.pixel_geom IS 'Polígono reconstruido de la huella real del píxel VIIRS (375m).';

COMMENT ON TABLE harmonized_fire_events IS
    'Eventos unificados de fuego generados mediante agrupamiento espacio-temporal ST-DBSCAN y calibración energética.';
COMMENT ON COLUMN harmonized_fire_events.event_code IS 'Código identificador único para seguimiento del incendio.';
COMMENT ON COLUMN harmonized_fire_events.hfii IS 'Harmonized Fire Intensity Index: Medida estándar de intensidad energética.';
COMMENT ON COLUMN harmonized_fire_events.convex_hull IS 'Polígono envolvente unificado del frente de fuego en EPSG:4326.';
COMMENT ON COLUMN harmonized_fire_events.estimated_area_ha IS 'Superficie estimada afectada en hectáreas.';

COMMENT ON TABLE event_source_hotspots IS
    'Tabla relacional junction que documenta qué focos MODIS/VIIRS componen cada cluster armonizado.';

COMMENT ON TABLE h3_daily_cells IS
    'Agregaciones diarias por celda hexagonal Uber H3 optimizadas para visualización en Deck.gl.';

COMMENT ON TABLE burning_calendar_daily IS
    'Matriz diaria del calendario de fuegos por región para análisis de regímenes de quema históricos.';

COMMENT ON TABLE ingestion_logs IS
    'Registro de auditoría técnica del pipeline ETL de ingesta continua de NASA FIRMS.';

COMMENT ON TABLE users IS
    'Usuarios registrados en el sistema para control de acceso basado en roles (RBAC).';

COMMENT ON TABLE api_keys IS
    'Tokens de autenticación con permisos granulares para clientes API y frontend.';

COMMENT ON TABLE audit_log IS
    'Registro inmutable de auditoría para trazabilidad de cambios en tablas sensibles.';

-- =============================================================================
-- 12. DATOS SEMILLA (INITIAL SEED DATA)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 12.1 DEPARTAMENTOS DE BOLIVIA (9 Departamentos con geometrías y centroides)
-- -----------------------------------------------------------------------------
INSERT INTO regions (id, name, code, type, parent_id, department_name, area_km2, geometry, centroid, properties)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        'BO-S',
        'department',
        NULL,
        'Santa Cruz',
        370621.00,
        ST_Multi(ST_GeomFromText('POLYGON((-64.5 -13.5, -57.5 -13.5, -57.5 -20.5, -64.5 -20.5, -64.5 -13.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.95, -17.00), 4326),
        '{"capital": "Santa Cruz de la Sierra", "biome": "Chiquitanía, Gran Chaco, Amazonía", "chiquitania_fire_risk": "critical"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000002'::uuid,
        'Beni',
        'BO-B',
        'department',
        NULL,
        'Beni',
        213564.00,
        ST_Multi(ST_GeomFromText('POLYGON((-67.5 -10.8, -62.0 -10.8, -62.0 -16.0, -67.5 -16.0, -67.5 -10.8))', 4326)),
        ST_SetSRID(ST_MakePoint(-65.00, -14.00), 4326),
        '{"capital": "Trinidad", "biome": "Llanos de Moxos, Sabanas Inundables, Amazonía"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000003'::uuid,
        'Pando',
        'BO-N',
        'department',
        NULL,
        'Pando',
        63827.00,
        ST_Multi(ST_GeomFromText('POLYGON((-69.5 -9.5, -65.5 -9.5, -65.5 -12.5, -69.5 -12.5, -69.5 -9.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-67.50, -11.00), 4326),
        '{"capital": "Cobija", "biome": "Amazonía Húmeda Tropical"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000004'::uuid,
        'La Paz',
        'BO-L',
        'department',
        NULL,
        'La Paz',
        133985.00,
        ST_Multi(ST_GeomFromText('POLYGON((-69.6 -11.8, -66.5 -11.8, -66.5 -18.0, -69.6 -18.0, -69.6 -11.8))', 4326)),
        ST_SetSRID(ST_MakePoint(-68.12, -15.50), 4326),
        '{"capital": "Nuestra Señora de La Paz", "biome": "Andino, Yungas, Amazonía Norte"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000005'::uuid,
        'Cochabamba',
        'BO-C',
        'department',
        NULL,
        'Cochabamba',
        55631.00,
        ST_Multi(ST_GeomFromText('POLYGON((-67.0 -15.5, -64.2 -15.5, -64.2 -18.5, -67.0 -18.5, -67.0 -15.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-66.15, -17.38), 4326),
        '{"capital": "Cochabamba", "biome": "Valles Mesotérmicos, Yungas"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000006'::uuid,
        'Chuquisaca',
        'BO-H',
        'department',
        NULL,
        'Chuquisaca',
        51524.00,
        ST_Multi(ST_GeomFromText('POLYGON((-65.5 -18.4, -62.2 -18.4, -62.2 -21.5, -65.5 -21.5, -65.5 -18.4))', 4326)),
        ST_SetSRID(ST_MakePoint(-64.25, -20.00), 4326),
        '{"capital": "Sucre", "biome": "Valles, Chaco Seco"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000007'::uuid,
        'Tarija',
        'BO-T',
        'department',
        NULL,
        'Tarija',
        37623.00,
        ST_Multi(ST_GeomFromText('POLYGON((-65.3 -21.0, -62.2 -21.0, -62.2 -22.9, -65.3 -22.9, -65.3 -21.0))', 4326)),
        ST_SetSRID(ST_MakePoint(-63.75, -21.80), 4326),
        '{"capital": "Tarija", "biome": "Valles, Gran Chaco Boreal"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000008'::uuid,
        'Oruro',
        'BO-O',
        'department',
        NULL,
        'Oruro',
        53588.00,
        ST_Multi(ST_GeomFromText('POLYGON((-69.0 -17.5, -66.5 -17.5, -66.5 -19.9, -69.0 -19.9, -69.0 -17.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-67.80, -18.75), 4326),
        '{"capital": "Oruro", "biome": "Altiplano Andino"}'::jsonb
    ),
    (
        'a1000000-0000-0000-0000-000000000009'::uuid,
        'Potosí',
        'BO-P',
        'department',
        NULL,
        'Potosí',
        118218.00,
        ST_Multi(ST_GeomFromText('POLYGON((-68.8 -18.8, -65.0 -18.8, -65.0 -22.9, -68.8 -22.9, -68.8 -18.8))', 4326)),
        ST_SetSRID(ST_MakePoint(-66.75, -20.50), 4326),
        '{"capital": "Potosí", "biome": "Altiplano Sur, Cordillera Andina"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12.2 MUNICIPIOS CLAVE DE SANTA CRUZ (Epicentro del Caso de Estudio Chiquitanía)
-- -----------------------------------------------------------------------------
INSERT INTO regions (id, name, code, type, parent_id, department_name, area_km2, geometry, centroid, properties)
VALUES
    (
        'b2000000-0000-0000-0000-000000000001'::uuid,
        'San Ignacio de Velasco',
        'BO-S-SIV',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        47657.00,
        ST_Multi(ST_GeomFromText('POLYGON((-62.0 -15.0, -60.0 -15.0, -60.0 -17.5, -62.0 -17.5, -62.0 -15.0))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.96, -16.37), 4326),
        '{"province": "José Miguel de Velasco", "fire_risk": "critical", "chiquitania_corridor": true}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000002'::uuid,
        'Roboré',
        'BO-S-ROB',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        7002.00,
        ST_Multi(ST_GeomFromText('POLYGON((-60.5 -17.8, -59.0 -17.8, -59.0 -18.8, -60.5 -18.8, -60.5 -17.8))', 4326)),
        ST_SetSRID(ST_MakePoint(-59.76, -18.33), 4326),
        '{"province": "Chiquitos", "biome": "Bosque Seco Chiquitano", "valle_tucabaca": true}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000003'::uuid,
        'San Matías',
        'BO-S-SMT',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        27564.00,
        ST_Multi(ST_GeomFromText('POLYGON((-59.5 -15.5, -57.7 -15.5, -57.7 -17.5, -59.5 -17.5, -59.5 -15.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-58.40, -16.36), 4326),
        '{"province": "Ángel Sandoval", "biome": "Pantanal Boliviano, Chiquitanía", "border_brazil": true}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000004'::uuid,
        'Charagua',
        'BO-S-CHA',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        74424.00,
        ST_Multi(ST_GeomFromText('POLYGON((-64.0 -18.8, -61.5 -18.8, -61.5 -20.6, -64.0 -20.6, -64.0 -18.8))', 4326)),
        ST_SetSRID(ST_MakePoint(-62.88, -19.79), 4326),
        '{"autonomia": "Charagua Iyambae", "province": "Cordillera", "biome": "Gran Chaco Americano"}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000005'::uuid,
        'Concepción',
        'BO-S-CON',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        28987.00,
        ST_Multi(ST_GeomFromText('POLYGON((-63.0 -15.0, -61.2 -15.0, -61.2 -17.0, -63.0 -17.0, -63.0 -15.0))', 4326)),
        ST_SetSRID(ST_MakePoint(-62.03, -16.13), 4326),
        '{"province": "Ñuflo de Chávez", "heritage": "Misiones Jesuíticas de Chiquitos"}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000006'::uuid,
        'San José de Chiquitos',
        'BO-S-SJC',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        19884.00,
        ST_Multi(ST_GeomFromText('POLYGON((-61.8 -17.0, -60.0 -17.0, -60.0 -18.5, -61.8 -18.5, -61.8 -17.0))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.75, -17.84), 4326),
        '{"province": "Chiquitos", "biome": "Chiquitanía Centro"}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000007'::uuid,
        'Puerto Suárez',
        'BO-S-PSU',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        12841.00,
        ST_Multi(ST_GeomFromText('POLYGON((-58.5 -18.5, -57.4 -18.5, -57.4 -19.5, -58.5 -19.5, -58.5 -18.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-57.80, -18.96), 4326),
        '{"province": "Germán Busch", "biome": "Pantanal"}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000008'::uuid,
        'San Rafael',
        'BO-S-SRA',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        9824.00,
        ST_Multi(ST_GeomFromText('POLYGON((-61.2 -16.5, -60.1 -16.5, -60.1 -17.3, -61.2 -17.3, -61.2 -16.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.67, -16.78), 4326),
        '{"province": "José Miguel de Velasco", "chiquitania_fire_risk": "high"}'::jsonb
    ),
    (
        'b2000000-0000-0000-0000-000000000009'::uuid,
        'San Miguel de Velasco',
        'BO-S-SMV',
        'municipality',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        9109.00,
        ST_Multi(ST_GeomFromText('POLYGON((-61.5 -16.3, -60.5 -16.3, -60.5 -17.1, -61.5 -17.1, -61.5 -16.3))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.97, -16.70), 4326),
        '{"province": "José Miguel de Velasco", "chiquitania_fire_risk": "high"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12.3 ÁREAS PROTEGIDAS NACIONALES Y MUNICIPALES (Parques Nacionales y ANMIs)
-- -----------------------------------------------------------------------------
INSERT INTO regions (id, name, code, type, parent_id, department_name, area_km2, geometry, centroid, properties)
VALUES
    (
        'c3000000-0000-0000-0000-000000000001'::uuid,
        'Parque Nacional Noel Kempff Mercado',
        'PA-PN-NKM',
        'protected_area',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        15234.00,
        ST_Multi(ST_GeomFromText('POLYGON((-61.5 -13.5, -60.2 -13.5, -60.2 -15.1, -61.5 -15.1, -61.5 -13.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.85, -14.25), 4326),
        '{"category": "Parque Nacional", "unesco": true, "ramsar": false, "biome": "Transición Amazónica-Chiquitana"}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000002'::uuid,
        'Parque Nacional y ANMI Kaa-Iya del Gran Chaco',
        'PA-PN-KAA',
        'protected_area',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        34411.00,
        ST_Multi(ST_GeomFromText('POLYGON((-62.8 -18.2, -60.5 -18.2, -60.5 -20.2, -62.8 -20.2, -62.8 -18.2))', 4326)),
        ST_SetSRID(ST_MakePoint(-61.80, -19.05), 4326),
        '{"category": "Parque Nacional y ANMI", "size": "Mayor parque de Bolivia", "biome": "Gran Chaco Americano"}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000003'::uuid,
        'Parque Nacional y ANMI Otuquis',
        'PA-PN-OTU',
        'protected_area',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        10059.00,
        ST_Multi(ST_GeomFromText('POLYGON((-59.0 -19.2, -57.7 -19.2, -57.7 -20.5, -59.0 -20.5, -59.0 -19.2))', 4326)),
        ST_SetSRID(ST_MakePoint(-58.35, -19.95), 4326),
        '{"category": "Parque Nacional y ANMI", "ramsar": true, "biome": "Pantanal Boliviano"}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000004'::uuid,
        'Área Natural de Manejo Integrado San Matías',
        'PA-ANMI-SMT',
        'protected_area',
        'a1000000-0000-0000-0000-000000000001'::uuid,
        'Santa Cruz',
        29185.00,
        ST_Multi(ST_GeomFromText('POLYGON((-59.4 -16.2, -58.0 -16.2, -58.0 -18.3, -59.4 -18.3, -59.4 -16.2))', 4326)),
        ST_SetSRID(ST_MakePoint(-58.75, -17.20), 4326),
        '{"category": "ANMI", "biome": "Chiquitanía y Pantanal", "vulnerable_ecosystem": true}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000005'::uuid,
        'Reserva Municipal de Vida Silvestre Valle de Tucabaca',
        'PA-RM-TUC',
        'protected_area',
        'b2000000-0000-0000-0000-000000000002'::uuid,
        'Santa Cruz',
        2623.00,
        ST_Multi(ST_GeomFromText('POLYGON((-60.2 -18.2, -59.6 -18.2, -59.6 -18.7, -60.2 -18.7, -60.2 -18.2))', 4326)),
        ST_SetSRID(ST_MakePoint(-59.95, -18.45), 4326),
        '{"category": "Reserva Municipal de Vida Silvestre", "municipality": "Roboré", "water_source": true}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000006'::uuid,
        'Área de Conservación e Importancia Ecológica Ñembi Guasu',
        'PA-AC-NGU',
        'protected_area',
        'b2000000-0000-0000-0000-000000000004'::uuid,
        'Santa Cruz',
        12075.00,
        ST_Multi(ST_GeomFromText('POLYGON((-61.2 -19.0, -59.8 -19.0, -59.8 -20.2, -61.2 -20.2, -61.2 -19.0))', 4326)),
        ST_SetSRID(ST_MakePoint(-60.50, -19.65), 4326),
        '{"category": "Área de Conservación e Importancia Ecológica Indígena", "autonomia": "Charagua Iyambae"}'::jsonb
    ),
    (
        'c3000000-0000-0000-0000-000000000007'::uuid,
        'Reserva de la Biosfera y Estación Biológica del Beni',
        'PA-RB-EBB',
        'protected_area',
        'a1000000-0000-0000-0000-000000000002'::uuid,
        'Beni',
        1350.00,
        ST_Multi(ST_GeomFromText('POLYGON((-67.0 -14.5, -66.0 -14.5, -66.0 -15.2, -67.0 -15.2, -67.0 -14.5))', 4326)),
        ST_SetSRID(ST_MakePoint(-66.45, -14.85), 4326),
        '{"category": "Reserva de la Biosfera", "unesco": true, "biome": "Llanos de Moxos"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12.4 USUARIOS INICIALES (RBAC) Y CREDENCIALES
-- Contraseña por defecto para desarrollo: 'NASA_SpaceApps_2026!'
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, full_name, role, is_active, hashed_password)
VALUES
    (
        'd4000000-0000-0000-0000-000000000001'::uuid,
        'admin@pyrosharmonizer.space',
        'Administrador Maestro PyrosHarmonizer',
        'admin',
        true,
        crypt('NASA_SpaceApps_2026!', gen_salt('bf', 10))
    ),
    (
        'd4000000-0000-0000-0000-000000000002'::uuid,
        'analyst.chiquitania@pyrosharmonizer.space',
        'Analista Geoespacial Chiquitanía',
        'analyst',
        true,
        crypt('NASA_SpaceApps_2026!', gen_salt('bf', 10))
    ),
    (
        'd4000000-0000-0000-0000-000000000003'::uuid,
        'ingestion.service@pyrosharmonizer.space',
        'Servicio ETL NASA FIRMS Ingestion',
        'ingestion_service',
        true,
        crypt('FIRMS_Ingestion_Token_2026$', gen_salt('bf', 10))
    )
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12.5 CLAVES DE API INICIALES (API KEYS)
-- -----------------------------------------------------------------------------
INSERT INTO api_keys (id, user_id, key_hash, name, permissions, expires_at, is_active)
VALUES
    (
        'e5000000-0000-0000-0000-000000000001'::uuid,
        'd4000000-0000-0000-0000-000000000001'::uuid,
        encode(digest('pyros_live_master_nasa_2026_santa_cruz', 'sha256'), 'hex'),
        'Produccion Master Frontend Next.js API Key',
        '["read:hotspots", "read:events", "read:calendar", "read:regions", "write:events"]'::jsonb,
        '2027-12-31 23:59:59+00'::timestamptz,
        true
    ),
    (
        'e5000000-0000-0000-0000-000000000002'::uuid,
        'd4000000-0000-0000-0000-000000000003'::uuid,
        encode(digest('pyros_etl_pipeline_firms_automation_key', 'sha256'), 'hex'),
        'Pipeline Ingesta ETL FIRMS Automation',
        '["read:hotspots", "write:hotspots", "write:logs", "write:events"]'::jsonb,
        '2027-12-31 23:59:59+00'::timestamptz,
        true
    )
ON CONFLICT (key_hash) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12.6 REGISTRO SEMILLA DE AUDITORÍA INICIAL
-- -----------------------------------------------------------------------------
INSERT INTO audit_log (table_name, operation, record_id, changed_by, old_data, new_data)
VALUES (
    'schema_initialization',
    'INIT',
    'pyrosharmonizer_v1.0.0',
    'system_initializer',
    NULL,
    jsonb_build_object(
        'event', '2026 NASA International Space Apps Challenge',
        'challenge', '#8 Harmonization of MODIS and VIIRS Hot Spots',
        'location', 'UCB Santa Cruz de la Sierra, Bolivia',
        'status', 'Schema created successfully',
        'timestamp', clock_timestamp()
    )
);

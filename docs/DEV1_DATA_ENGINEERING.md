# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 1: Data Engineering & PostGIS Specialist

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Data Engineer & Spatial Database Specialist (Ingesta NASA FIRMS, Limpieza, Esquema PostGIS y Modelado Relacional)  
**Stack Principal:** Python 3.12, PostgreSQL 16 + PostGIS 3.4, SQLAlchemy 2.0 / GeoAlchemy2, GeoPandas, Psycopg2, HTTPX  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el dueño absoluto del flujo y almacenamiento de datos:
1. Diseñar, particionar e indexar la base de datos geoespacial **PostgreSQL 16 + PostGIS 3.4**.
2. Construir los pipelines de ingesta masiva (ETL) para procesar los registros históricos de NASA FIRMS (MODIS desde 2000 y VIIRS desde 2012) para Bolivia / Santa Cruz.
3. Conectar la API REST de NASA FIRMS en tiempo casi real (**NRT**) para sincronizar los focos de calor de las últimas 24h, 48h y 7 días.
4. Aplicar los filtros de calidad previos: exclusión de detecciones espurias y separación de anomalías térmicas estáticas recurrentes (quema de pozos de gas y volcanes).
5. Proveer a **Dev 2** los datasets limpios y listos para el algoritmo, y a **Dev 3** una base de datos de alta velocidad con índices GiST para sus consultas.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Instalar dependencias de ingeniería de datos:**
   ```bash
   cd c:\NASASPACE2026\PyrosHarmonizers1
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install psycopg2-binary sqlalchemy geoalchemy2 geopandas shapely httpx python-dotenv pydantic pytest
   ```
2. **Levantar PostgreSQL/PostGIS local con Docker:**
   ```bash
   docker run --name pyros-postgis -e POSTGRES_USER=pyros_user -e POSTGRES_PASSWORD=pyros_password -e POSTGRES_DB=pyrosharmonizer_db -p 5432:5432 -d postgis/postgis:16-3.4
   ```
3. **Ejecutar el esquema maestro inicial:**
   ```bash
   psql -h localhost -U pyros_user -d pyrosharmonizer_db -f docs/pyrosharmonizer-schema.sql
   ```
4. **Obtener MAP_KEY de NASA FIRMS:**
   - Registrarse gratis en: [https://firms.modaps.eosdis.nasa.gov/api/](https://firms.modaps.eosdis.nasa.gov/api/)
   - Guardar en `backend/.env`: `NASA_FIRMS_MAP_KEY=tu_token_aqui`

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #1.1: [Task][P0] Implementación del Esquema PostGIS, Particionamiento e Índices
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 1 (H 01–04)
* **Rama Git:** `feature/data-postgis-schema`
* **Dependencias:** Ninguna
* **Descripción:** Implementar el esquema relacional espacial basado en `docs/DATA_MODEL.md` y `docs/pyrosharmonizer-schema.sql`.
  - Crear tablas maestras: `raw_modis_hotspots`, `raw_viirs_hotspots`, `harmonized_fire_events`, `regions`, `burning_calendar_daily`, `ingestion_logs`.
  - Implementar particionamiento declarativo por rango de año en las tablas crudas:
    - `raw_modis_hotspots`: 2000 a 2026.
    - `raw_viirs_hotspots`: 2012 a 2026.
  - Crear índices espaciales GiST en columnas `geom` y `pixel_geom`, e índices BRIN en `acq_date` para acelerar consultas temporales.
* **Criterios de Aceptación:**
  - [ ] Esquema DDL ejecutado sin advertencias en PostgreSQL 16 + PostGIS 3.4.
  - [ ] Índices GiST creados: `idx_modis_geom`, `idx_viirs_geom`, `idx_harmonized_polygon`.
  - [ ] Tablas particionadas operativas.
  - [ ] Seed de datos de regiones cargado (departamento de Santa Cruz y municipios de la Chiquitanía: San Ignacio, Roboré, San Matías, Charagua, Concepción).
* **Archivos a crear/modificar:**
  - `backend/app/db/session.py`
  - `backend/app/models/modis.py`
  - `backend/app/models/viirs.py`
  - `backend/app/models/region.py`

---

### 📌 Ticket #1.2: [Feature][P0] Pipeline ETL de Ingesta Masiva de Archivos CSV NASA FIRMS
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 1 (H 04–08)
* **Rama Git:** `feature/data-csv-ingestion`
* **Dependencias:** Ticket #1.1
* **Descripción:** Desarrollar el pipeline que parsea, valida y carga masivamente los archivos descargados desde el portal de archivo de FIRMS ([FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/)) para el territorio de Bolivia:
  - **MODIS C6.1:** 2000–2026.
  - **VIIRS 375m:** Suomi-NPP (2012–2026), NOAA-20 (2018–2026), NOAA-21 (2023–2026).
* **Criterios de Aceptación:**
  - [ ] Script de carga por lotes (`bulk_insert` / `copy_from`) con soporte para archivos CSV de gran tamaño.
  - [ ] Normalización automática de fecha/hora: combinación de `acq_date` (YYYY-MM-DD) y `acq_time` (HHMM) en timestamp UTC.
  - [ ] Creación de geometrías PostGIS `Point` (`SRID=4326`) a partir de `longitude` y `latitude`.
  - [ ] Registro en `ingestion_logs` con tiempo transcurrido, total de filas leídas y rechazadas.
* **Archivos a crear/modificar:**
  - `backend/app/services/ingestion/firms_csv.py`
  - `backend/app/services/ingestion/normalizer.py`
  - `backend/scripts/load_firms_archive.py`

---

### 📌 Ticket #1.3: [Feature][P1] Conector de Datos en Tiempo Casi Real (NRT) via API NASA FIRMS
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 2 (H 08–11)
* **Rama Git:** `feature/data-firms-api-nrt`
* **Dependencias:** Ticket #1.2
* **Descripción:** Implementar el cliente asíncrono para consumir la API REST oficial de NASA FIRMS utilizando el `MAP_KEY`:
  - Consultar focos activos de las últimas 24h, 48h o 7 días para el Bounding Box de Bolivia/Chiquitanía (`min_lon=-64.5, min_lat=-20.5, max_lon=-57.5, max_lat=-13.5`).
* **Criterios de Aceptación:**
  - [ ] Cliente HTTP asíncrono con `httpx` que descarga y parsea el flujo en tiempo real de MODIS y VIIRS.
  - [ ] Prevención de duplicados mediante clave compuesta (`latitude, longitude, acq_date, acq_time, satellite`).
  - [ ] Función invocable vía cron o endpoint backend para sincronización periódica.
* **Archivos a crear/modificar:**
  - `backend/app/services/ingestion/firms_api.py`

---

### 📌 Ticket #1.4: [Feature][P0] Módulo de Limpieza de Datos y Detección de Anomalías Estáticas
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 2 (H 11–14)
* **Rama Git:** `feature/data-quality-cleaning`
* **Dependencias:** Ticket #1.2
* **Descripción:** 
  - Limpieza inicial de detecciones espurias antes de pasar los datos al algoritmo de Dev 2:
    - Filtrar registros MODIS con `confidence < 30`.
    - Filtrar registros VIIRS con `confidence == "low"`.
    - Detectar anomalías térmicas estáticas: identificar coordenadas que presentan anomalías térmicas recurrentes durante más de 300 días al año (pozos de venteo de gas petrolero en el Chaco o zonas volcánicas) y marcarlas con flag `is_static_anomaly = True` para no sesgar las estadísticas de incendios forestales.
* **Criterios de Aceptación:**
  - [ ] Función `apply_quality_filters(df)` que elimina ruido térmico.
  - [ ] Query espacial o función en Python que etiqueta anomalías estáticas recurrentes.
  - [ ] Tests en `tests/test_data_cleaning.py`.
* **Archivos a crear/modificar:**
  - `backend/app/services/ingestion/quality_cleaning.py`
  - `tests/test_data_cleaning.py`

---

## 🤝 4. Interacción con los Otros Desarrolladores

* **Con DEV 2 (Algoritmos):**
  - Dev 2 necesita los DataFrames limpios con columnas: `latitude`, `longitude`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `frp`, `daynight`.
  - Provee a Dev 2 un script de extracción rápido `scripts/get_training_sample.py` para que trabaje sin fricción sobre datos reales de Santa Cruz (2019–2024).
* **Con DEV 3 (API & DevOps):**
  - Dev 3 expondrá los endpoints de consulta y orquestará Docker.
  - Entrégale la sesión de base de datos (`backend/app/db/session.py`) y las consultas SQL base optimizadas con índices espaciales.

# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 1: Lead Backend & Data Engineer

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Lead Backend & Data Engineer (Arquitectura de Datos, Ingesta NASA FIRMS y Core API)  
**Stack Principal:** Python 3.12, FastAPI, PostgreSQL 16 + PostGIS 3.4, SQLAlchemy 2.0, GeoPandas, Pydantic v2, Docker  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el responsable de los cimientos del sistema:
1. Configurar y mantener la base de datos espacial PostgreSQL/PostGIS.
2. Ingestar, limpiar y estructurar los datasets históricos y en tiempo real de NASA FIRMS (MODIS Collection 6.1 y VIIRS 375m).
3. Construir la API RESTful de alto rendimiento en FastAPI que consumirán Dev 3 y Dev 4.
4. Integrar el motor de armonización que desarrolle Dev 2 dentro del flujo transaccional.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Clonar repositorio y crear entorno virtual:**
   ```bash
   cd c:\NASASPACE2026\PyrosHarmonizers1
   python -m venv venv
   # En Windows:
   .\venv\Scripts\Activate.ps1
   pip install --upgrade pip
   pip install fastapi uvicorn[standard] psycopg2-binary sqlalchemy geoalchemy2 geopandas shapely pydantic pydantic-settings httpx python-dotenv pytest
   pip freeze > backend/requirements.txt
   ```
2. **Levantar PostgreSQL/PostGIS local con Docker:**
   ```bash
   docker run --name pyros-postgis -e POSTGRES_USER=pyros_user -e POSTGRES_PASSWORD=pyros_password -e POSTGRES_DB=pyrosharmonizer_db -p 5432:5432 -d postgis/postgis:16-3.4
   ```
3. **Ejecutar el esquema SQL inicial:**
   ```bash
   # Ejecutar el script ya creado en el proyecto:
   psql -h localhost -U pyros_user -d pyrosharmonizer_db -f docs/pyrosharmonizer-schema.sql
   ```
4. **Obtener credenciales NASA FIRMS:**
   - Solicitar `MAP_KEY` gratuito al instante en: [https://firms.modaps.eosdis.nasa.gov/api/](https://firms.modaps.eosdis.nasa.gov/api/)
   - Guardarlo en `backend/.env` como `NASA_FIRMS_MAP_KEY=tu_clave_aqui`.

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #1.1: Setup de Base de Datos PostGIS y Modelos ORM
* **Prioridad:** `P0-critical` | **Estimación:** 2h | **Fase:** Fase 1 (H 02–04)
* **Rama Git:** `feature/backend-db-setup`
* **Descripción:** Implementar la conexión de SQLAlchemy / GeoAlchemy2 con PostgreSQL y mapear los modelos declarativos de datos basados en `docs/DATA_MODEL.md` y `docs/pyrosharmonizer-schema.sql`.
* **Criterios de Aceptación:**
  - [ ] Conexión a base de datos configurada en `backend/app/db/session.py`.
  - [ ] Modelos ORM creados para `raw_modis_hotspots`, `raw_viirs_hotspots`, `harmonized_fire_events`, `regions`, `burning_calendar_daily`.
  - [ ] Campos de geometría (`geom`, `pixel_geom`) correctamente tipados con GeoAlchemy2 (`Geometry('POINT', 4326)` y `Geometry('POLYGON', 4326)`).
  - [ ] Test unitario de inserción y lectura espacial exitoso.
* **Archivos a crear/modificar:**
  - `backend/app/core/config.py`
  - `backend/app/db/session.py`
  - `backend/app/models/modis.py`
  - `backend/app/models/viirs.py`
  - `backend/app/models/harmonized.py`
  - `backend/app/models/region.py`

---

### 📌 Ticket #1.2: Pipeline ETL de Ingesta CSV NASA FIRMS (MODIS + VIIRS)
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 1 (H 04–08)
* **Rama Git:** `feature/firms-csv-ingestion`
* **Dependencias:** Ticket #1.1
* **Descripción:** Desarrollar scripts de carga masiva de los datasets descargados desde FIRMS Archive para Bolivia / Santa Cruz (2000-2026).
* **Criterios de Aceptación:**
  - [ ] Parser que procese archivos CSV crudos de MODIS (1km) y VIIRS (375m SNPP, NOAA-20, NOAA-21).
  - [ ] Conversión de coordenadas `latitude` y `longitude` a geometrías PostGIS `SRID=4326`.
  - [ ] Normalización de fechas combinando `acq_date` (YYYY-MM-DD) y `acq_time` (HHMM UTC) en timestamp UTC.
  - [ ] Inserción por lotes (`bulk_insert` o `copy_from`) capaz de cargar más de 100,000 registros en menos de 30 segundos.
  - [ ] Registro de auditoría en la tabla `ingestion_logs`.
* **Archivos a crear/modificar:**
  - `backend/app/services/ingestion/firms_csv.py`
  - `backend/app/services/ingestion/normalizer.py`
  - `backend/scripts/load_initial_data.py`

---

### 📌 Ticket #1.3: Conector API REST NASA FIRMS en Tiempo Casi Real (NRT)
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 2 (H 08–12)
* **Rama Git:** `feature/firms-nrt-client`
* **Dependencias:** Ticket #1.2
* **Descripción:** Implementar el cliente asíncrono para consultar datos en vivo (últimas 24h, 48h y 7 días) mediante la API REST de NASA FIRMS.
* **Criterios de Aceptación:**
  - [ ] Cliente HTTP asíncrono usando `httpx` que consuma el endpoint oficial de FIRMS:
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{bbox}/{day_range}`
  - [ ] Manejo de rate limiting y reintentos ante caídas de conexión.
  - [ ] Endpoint `POST /api/v1/ingest/firms` para sincronización manual o mediante cron job.
* **Archivos a crear/modificar:**
  - `backend/app/services/ingestion/firms_api.py`
  - `backend/app/api/ingest.py`

---

### 📌 Ticket #1.4: Endpoints REST para Consulta de Hotspots y Comparación
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 2 (H 12–16)
* **Rama Git:** `feature/hotspot-api-endpoints`
* **Dependencias:** Ticket #1.1, Ticket #1.2
* **Descripción:** Implementar los endpoints REST definidos en `docs/API_CONTRACTS.md` para consultar focos crudos con filtros espaciales y temporales.
* **Criterios de Aceptación:**
  - [ ] `GET /api/v1/hotspots/modis`: Filtros `bbox`, `date_start`, `date_end`, `confidence_min`, `daynight`, paginación (`limit`, `offset`).
  - [ ] `GET /api/v1/hotspots/viirs`: Mismos filtros + `bright_ti4_min`.
  - [ ] `GET /api/v1/hotspots/compare`: Devuelve agregación mensual/anual de conteos y FRP crudo (clave para evidenciar el "Efecto 2012").
  - [ ] Respuesta en formato GeoJSON FeatureCollection cuando se solicite con header `Accept: application/geo+json`.
* **Archivos a crear/modificar:**
  - `backend/app/api/hotspots.py`
  - `backend/app/schemas/hotspot.py`
  - `backend/app/schemas/common.py`

---

### 📌 Ticket #1.5: Integración del Motor de Armonización y Endpoints Finales
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 4 (H 24–28)
* **Rama Git:** `feature/backend-harmonization-api`
* **Dependencias:** Tickets de Dev 2 (#2.1, #2.2, #2.3)
* **Descripción:** Integrar el algoritmo de Dev 2 en un servicio backend que almacene los eventos armonizados y provea los endpoints para el frontend.
* **Criterios de Aceptación:**
  - [ ] `GET /api/v1/harmonized/events`: Consulta de polígonos de fuego armonizados con filtros por `hfii_score` y rango de fechas.
  - [ ] `GET /api/v1/calendar/heatmap` y `GET /api/v1/calendar/timeline`: Consultas agregadas para alimentar el componente de Dev 4.
  - [ ] Optimización con vistas materializadas o índices espaciales compuestos para tiempos de respuesta $< 500\text{ ms}$.
* **Archivos a crear/modificar:**
  - `backend/app/api/harmonized.py`
  - `backend/app/api/calendar.py`
  - `backend/app/services/harmonization/pipeline.py`

---

## 🤝 4. Interacción con el Resto del Equipo

* **Con DEV 2 (Algoritmos):**
  - Dev 2 te entregará funciones Python puras (`quality_filter.py`, `stdbscan.py`, `frp_calibration.py`).
  - Tú proveerás las conexiones a PostGIS y el script de ejecución en lote para que Dev 2 pruebe sus algoritmos sobre datos reales.
* **Con DEV 3 (Frontend Mapas):**
  - Dev 3 consumirá `GET /api/v1/hotspots/modis`, `GET /api/v1/hotspots/viirs` y `GET /api/v1/harmonized/events`.
  - Mantén estricta fidelidad con los esquemas JSON definidos en `docs/API_CONTRACTS.md`. Habilita CORS en FastAPI (`allow_origins=["*"]`).
* **Con DEV 4 (Viz & DevOps):**
  - Dev 4 consumirá `GET /api/v1/calendar/heatmap` y necesitará tu `Dockerfile` para empaquetar el backend en Docker Compose y Railway.

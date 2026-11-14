# PyrosHarmonizer — Documento de Contratos de API REST (v1.0.0)

**NASA International Space Apps Challenge 2026**  
**Sede:** Santa Cruz de la Sierra, Bolivia — Universidad Católica Boliviana "San Pablo" (UCB)  
**Reto Global #8:** Harmonization of MODIS and VIIRS Hot Spots  
**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Fecha de Edición:** 14-15 de Noviembre de 2026  
**Clasificación:** Especificación Técnica de Arquitectura e Interfaz de Software  

---

## 1. Visión General y Contexto Arquitectónico

### 1.1 El Reto y la Solución
Desde el año 2000, los sensores **MODIS** (satélites Terra y Aqua) han registrado anomalías térmicas globales a una resolución de píxel nominal de $1\text{ km} \times 1\text{ km}$. En 2012, la constelación entró en una nueva era con **VIIRS** (a bordo de Suomi-NPP, NOAA-20 y NOAA-21) con bandas I de $375\text{ m}$, detectando entre **3 y 5 veces más focos de calor** sobre el mismo frente de fuego y capturando incendios de baja intensidad o cobertura de copa que MODIS omitía.

Esta discontinuidad tecnológica genera el fenómeno conocido como **"El Efecto 2012"**: un salto cuantitativo artificial en las series de tiempo ecológicas que distorsiona las políticas públicas de manejo de fuego, la asignación de recursos y la comprensión científica del régimen de quemas, especialmente evidente en biomas de alta vulnerabilidad como la **Chiquitanía boliviana** (Santa Cruz, Bolivia).

**PyrosHarmonizer** resuelve esta brecha histórica implementando un pipeline analítico que:
1. Agrupa detecciones redundantes mediante **ST-DBSCAN** espacio-temporal ($500\text{ m} - 1000\text{ m}$, ventana de $3 - 4\text{ h}$).
2. Reconstruye el polígono de envolvente convexa (**Convex Hull**) a partir de las huellas elípticas reales del sensor ($scan \times track$).
3. Calibra la Potencia Radiativa del Fuego (**FRP**, *Fire Radiative Power*) hacia un índice unificado normalizado: **HFII** (*Harmonized Fire Intensity Index*, MW eq.).
4. Agrega los eventos en celdas hexagonales multi-resolución **Uber H3** (resoluciones 7 y 8) y alimenta un **Calendario de Actividad de Quemas** dinámico con detección de anomalías ($Z\text{-score}$).

```
+---------------------------------------------------------------------------------------------------+
|                                 ARQUITECTURA DE DATOS PYROSHARMONIZER                             |
+---------------------------------------------------------------------------------------------------+
|  [NASA FIRMS API / CSV]                                                                           |
|       |                                                                                           |
|       +---> Ingesta (MODIS C6.1 Terra/Aqua + VIIRS 375m SNPP/NOAA-20/NOAA-21)                     |
|                   |                                                                               |
|                   v                                                                               |
|       [PostgreSQL 16 + PostGIS 3.4] <---> ST_DBSCAN / ST_ClusterDBSCAN / Spatial Index            |
|                   |                                                                               |
|                   v                                                                               |
|       [FastAPI 0.111 / Python 3.12]                                                               |
|         ├── ST-DBSCAN Clustering Engine                                                           |
|         ├── ConvexHull Geometrical Fusion                                                         |
|         ├── FRP -> HFII Energy Calibrator                                                         |
|         └── Uber H3 Hexagonal Aggregator                                                          |
|                   |                                                                               |
|                   v                                                                               |
|       [API REST v1 (Endpoints Documentados)]                                                      |
|         ├── Mapbox GL JS / Deck.gl (Capas vectoriales, H3 Hexagons, Polígonos de Fuego)           |
|         ├── Recharts / Plotly (Heatmaps de Calendario, Timelines multi-anuales)                   |
|         └── Next.js 14 Dashboard (Vercel + Railway Deployment)                                    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Convenciones Transversales y Estándares de Datos

### 2.1 Ambientes y URLs Base
- **Desarrollo Local:** `http://localhost:8000/api/v1`
- **Staging (Railway):** `https://api-staging.pyrosharmonizer.spaceapps.org/api/v1`
- **Producción (Railway Cloud):** `https://api.pyrosharmonizer.spaceapps.org/api/v1`

### 2.2 Cabeceras HTTP (Headers)
| Cabecera | Requerida | Tipo | Descripción |
| :--- | :---: | :--- | :--- |
| `Authorization` | Condicional | `String` | Formato `Bearer <jwt_token>` o `ApiKey <firms_map_key>` (requerido para endpoints de ingesta). |
| `Content-Type` | Sí (en POST) | `String` | Habitualmente `application/json; charset=utf-8`. |
| `Accept` | Opcional | `String` | `application/json`, `application/geo+json`, `text/csv`, `application/pdf`. Por defecto `application/json`. |
| `X-Request-ID` | Opcional | `UUID` | Identificador de correlación para observabilidad distribuida y rastreo de logs. |
| `X-RateLimit-Limit` | Saliente | `Integer` | Límite máximo de solicitudes por ventana (ej. 120 req/min). |
| `X-RateLimit-Remaining` | Saliente | `Integer` | Solicitudes restantes en la ventana activa. |

### 2.3 Formato Bounding Box (BBox)
Los filtros espaciales rectangulares se definen en el sistema de coordenadas de referencia **EPSG:4326 (WGS84)** mediante una cadena separada por comas:
$$\text{bbox} = \text{minLng},\text{minLat},\text{maxLng},\text{maxLat}$$
- `minLng`: Longitud oeste mínima ($-180.0 \le x \le 180.0$).
- `minLat`: Latitud sur mínima ($-90.0 \le y \le 90.0$).
- `maxLng`: Longitud este máxima ($x \ge \text{minLng}$).
- `maxLat`: Latitud norte máxima ($y \ge \text{minLat}$).
*Ejemplo Chiquitanía (Bolivia):* `-63.5,-19.5,-57.5,-14.0`

### 2.4 Esquema de Paginación Universal (`PaginatedResponse<T>`)
Todos los endpoints que devuelven colecciones tabulares o de listado no geográfico implementan paginación por desplazamiento (`offset`) y límite (`limit`):

```json
{
  "total": 4582,
  "limit": 50,
  "offset": 0,
  "has_more": true,
  "data": []
}
```

### 2.5 Esquema GeoJSON Estándar (`FeatureCollection`)
Los endpoints geoespaciales siguen de forma estricta la especificación **RFC 7946** con CRS predeterminado `urn:ogc:def:crs:OGC:1.3:CRS84` (WGS84 lon, lat):

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated_at": "2026-11-14T15:30:00Z",
    "count": 1,
    "crs": "EPSG:4326",
    "bounds": [-60.75, -16.40, -60.10, -15.85]
  },
  "features": [
    {
      "type": "Feature",
      "id": "EVT-20260904-CHQ-0042",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-60.75, -16.40],
            [-60.50, -16.42],
            [-60.10, -16.15],
            [-60.25, -15.85],
            [-60.75, -16.40]
          ]
        ]
      },
      "properties": {
        "event_id": "EVT-20260904-CHQ-0042",
        "start_time": "2026-09-04T13:45:00Z",
        "end_time": "2026-09-04T17:15:00Z",
        "hfii_mean": 82.4,
        "hfii_max": 245.1,
        "total_frp_mw": 1420.5,
        "hotspot_count": 38,
        "modis_count": 8,
        "viirs_count": 30
      }
    }
  ]
}
```

### 2.6 Esquema de Error Estándar (`ErrorResponse`)
Respuestas uniformes ante fallos de cliente o servidor:

```json
{
  "status_code": 422,
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Parámetro espacial 'bbox' inválido. minLng debe ser menor que maxLng.",
  "details": {
    "field": "bbox",
    "value_received": "-57.5,-19.5,-63.5,-14.0",
    "expected_format": "minLng,minLat,maxLng,maxLat"
  },
  "timestamp": "2026-11-14T15:31:02Z",
  "path": "/api/v1/hotspots/modis"
}
```

---

## 3. Catálogo Completo de Endpoints REST

```
+----------------------------------------------------------------------------------------------------+
| ÍNDICE DE ENDPOINTS                                                                                |
+----+---------------------------------------+--------+----------------------------------------------+
| #  | Ruta                                  | Método | Descripción Resumida                         |
+----+---------------------------------------+--------+----------------------------------------------+
| 01 | /api/v1/health                        | GET    | Health check del sistema y PostGIS           |
| 02 | /api/v1/meta/sensors                  | GET    | Especificaciones de sensores satelitales     |
| 03 | /api/v1/meta/data-coverage            | GET    | Rango de fechas cubierto por satélite        |
| 04 | /api/v1/ingest/firms                  | POST   | Dispara proceso asíncrono de ingesta FIRMS   |
| 05 | /api/v1/ingest/status                 | GET    | Listado de jobs de ingesta                   |
| 06 | /api/v1/ingest/status/{job_id}        | GET    | Estado en tiempo real de un job de ingesta   |
| 07 | /api/v1/hotspots/modis                | GET    | Consulta de focos crudos MODIS C6.1          |
| 08 | /api/v1/hotspots/viirs                | GET    | Consulta de focos crudos VIIRS 375m          |
| 09 | /api/v1/hotspots/compare              | GET    | Comparación y ratio MODIS vs VIIRS           |
| 10 | /api/v1/harmonized/events             | GET    | Eventos unificados (ST-DBSCAN + ConvexHull)  |
| 11 | /api/v1/harmonized/events/{event_id}  | GET    | Detalle geométrico y hotspots miembros       |
| 12 | /api/v1/harmonized/h3                 | GET    | Densidad de quemas en grilla hexagonal H3    |
| 13 | /api/v1/harmonized/statistics         | GET    | Métricas globales de calibración y sesgo     |
| 14 | /api/v1/calendar/heatmap              | GET    | Matriz de calor (mes/semana vs año)          |
| 15 | /api/v1/calendar/timeline             | GET    | Serie temporal multi-anual armonizada        |
| 16 | /api/v1/calendar/anomalies            | GET    | Detección de picos atípicos (Z-score)        |
| 17 | /api/v1/calendar/seasons              | GET    | Fechas de inicio/pico/cierre de quemas       |
| 18 | /api/v1/regions                       | GET    | Catálogo territorial (departamento/municipio)|
| 19 | /api/v1/regions/{region_id}           | GET    | Geometría de límite político-administrativo  |
| 20 | /api/v1/regions/{region_id}/stats     | GET    | Perfil histórico de incendios de una región  |
| 21 | /api/v1/export/geojson                | GET    | Descarga de polígonos armonizados en GeoJSON |
| 22 | /api/v1/export/csv                    | GET    | Descarga de eventos unificados en CSV plano  |
| 23 | /api/v1/export/pdf                    | POST   | Compilación de reporte ejecutivo en PDF      |
+----+---------------------------------------+--------+----------------------------------------------+
```

---

### GRUPO 1: Salud y Metadatos del Sistema

#### 1.1 `GET /api/v1/health`
Verifica la disponibilidad del servidor de aplicaciones FastAPI, conectividad activa con PostgreSQL 16 y extensión espacial PostGIS 3.4 habilitada.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/health`
- **Parámetros:** Ninguno.
- **Códigos de Estado:**
  - `200 OK`: Sistema en estado operativo óptimo.
  - `503 Service Unavailable`: Base de datos inaccesible o falla crítica interna.

##### Ejemplo Request
```http
GET /api/v1/health HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: application/json
```

##### Ejemplo Response (200 OK)
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "uptime_seconds": 184320,
  "timestamp": "2026-11-14T15:35:00Z",
  "components": {
    "api_engine": {
      "status": "up",
      "framework": "FastAPI 0.111.0",
      "python_version": "3.12.3"
    },
    "database": {
      "status": "connected",
      "engine": "PostgreSQL 16.2",
      "postgis_version": "3.4.1",
      "pool_available_connections": 18,
      "pool_max_connections": 20
    },
    "spatial_engine": {
      "h3_version": "4.1.2",
      "gdal_version": "3.8.4",
      "geos_version": "3.12.1"
    }
  }
}
```

---

#### 1.2 `GET /api/v1/meta/sensors`
Retorna el catálogo técnico de sensores satelitales soportados por el motor de armonización, con resoluciones espaciales, bandas espectrales, ciclos orbitales y factores de calibración teórica.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/meta/sensors`
- **Parámetros de Query:** Ninguno.
- **Códigos de Estado:**
  - `200 OK`: Catálogo recuperado con éxito.

##### Ejemplo Request
```http
GET /api/v1/meta/sensors HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: application/json
```

##### Ejemplo Response (200 OK)
```json
{
  "count": 5,
  "sensors": [
    {
      "sensor_family": "MODIS",
      "satellite": "Terra",
      "agency": "NASA",
      "instrument": "MODIS",
      "launch_year": 1999,
      "active": true,
      "orbit": "Heliosincrónica descendente (10:30 AM local)",
      "spatial_resolution_nadir_m": 1000,
      "thermal_channels": ["Canal 21 (3.99 µm)", "Canal 22 (3.99 µm)", "Canal 31 (11.03 µm)"],
      "firms_product_id": "MODIS_C6_1",
      "frp_uncertainty_percent": 15.0
    },
    {
      "sensor_family": "MODIS",
      "satellite": "Aqua",
      "agency": "NASA",
      "instrument": "MODIS",
      "launch_year": 2002,
      "active": true,
      "orbit": "Heliosincrónica ascendente (01:30 PM local)",
      "spatial_resolution_nadir_m": 1000,
      "thermal_channels": ["Canal 21", "Canal 22", "Canal 31"],
      "firms_product_id": "MODIS_C6_1",
      "frp_uncertainty_percent": 15.0
    },
    {
      "sensor_family": "VIIRS",
      "satellite": "Suomi-NPP",
      "agency": "NASA / NOAA",
      "instrument": "VIIRS",
      "launch_year": 2011,
      "active": true,
      "orbit": "Heliosincrónica ascendente (01:30 PM local)",
      "spatial_resolution_nadir_m": 375,
      "thermal_channels": ["Banda I4 (3.74 µm)", "Banda I5 (11.45 µm)", "Banda M13 (4.05 µm)"],
      "firms_product_id": "VIIRS_SNPP_NRT_375m",
      "frp_uncertainty_percent": 8.5
    },
    {
      "sensor_family": "VIIRS",
      "satellite": "NOAA-20 (JPSS-1)",
      "agency": "NOAA / NASA",
      "instrument": "VIIRS",
      "launch_year": 2017,
      "active": true,
      "orbit": "Heliosincrónica ascendente (01:30 PM local, 50 min separación SNPP)",
      "spatial_resolution_nadir_m": 375,
      "thermal_channels": ["Banda I4", "Banda I5", "Banda M13"],
      "firms_product_id": "VIIRS_NOAA20_NRT_375m",
      "frp_uncertainty_percent": 8.0
    },
    {
      "sensor_family": "VIIRS",
      "satellite": "NOAA-21 (JPSS-2)",
      "agency": "NOAA / NASA",
      "instrument": "VIIRS",
      "launch_year": 2022,
      "active": true,
      "orbit": "Heliosincrónica ascendente (01:30 PM local)",
      "spatial_resolution_nadir_m": 375,
      "thermal_channels": ["Banda I4", "Banda I5", "Banda M13"],
      "firms_product_id": "VIIRS_NOAA21_NRT_375m",
      "frp_uncertainty_percent": 8.0
    }
  ]
}
```

---

#### 1.3 `GET /api/v1/meta/data-coverage`
Especifica los rangos cronológicos efectivos de datos disponibles e indexados en el almacén de datos de PyrosHarmonizer.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/meta/data-coverage`
- **Códigos de Estado:**
  - `200 OK`: Coberturas devueltas.

##### Ejemplo Request
```http
GET /api/v1/meta/data-coverage HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "database_range": {
    "absolute_start_date": "2000-11-01",
    "absolute_end_date": "2026-11-13",
    "total_records_ingested": 18459203
  },
  "coverage_by_sensor": [
    {
      "sensor": "MODIS_TERRA",
      "start_date": "2000-11-01",
      "end_date": "2026-11-13",
      "total_hotspots": 5120440,
      "granularity": "Daily/Sub-daily"
    },
    {
      "sensor": "MODIS_AQUA",
      "start_date": "2002-07-04",
      "end_date": "2026-11-13",
      "total_hotspots": 4890120,
      "granularity": "Daily/Sub-daily"
    },
    {
      "sensor": "VIIRS_SNPP",
      "start_date": "2012-01-20",
      "end_date": "2026-11-13",
      "total_hotspots": 5940023,
      "granularity": "Daily/Sub-daily"
    },
    {
      "sensor": "VIIRS_NOAA20",
      "start_date": "2018-01-01",
      "end_date": "2026-11-13",
      "total_hotspots": 2180500,
      "granularity": "Daily/Sub-daily"
    },
    {
      "sensor": "VIIRS_NOAA21",
      "start_date": "2023-03-01",
      "end_date": "2026-11-13",
      "total_hotspots": 328120,
      "granularity": "Daily/Sub-daily"
    }
  ],
  "discontinuity_milestone": {
    "event_name": "Efecto 2012 / Transición VIIRS",
    "date": "2012-01-20",
    "description": "Fecha a partir de la cual convergen observaciones de MODIS y VIIRS, requiriendo el algoritmo de armonización PyrosHarmonizer."
  }
}
```

---

### GRUPO 2: Ingesta y Procesamiento de Datos FIRMS

#### 2.1 `POST /api/v1/ingest/firms`
Dispara una tarea en segundo plano (Background Task / Worker) para extraer registros de NASA LANCE/FIRMS (vía API o archivos de catálogo global), normalizar los campos, reconstruir huellas espaciales e insertarlos en PostGIS con indexación GiST.

- **Método HTTP:** `POST`
- **Ruta:** `/api/v1/ingest/firms`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body Schema (JSON):**
  - `sensor` (`String`, Requerido): `MODIS_NRT`, `MODIS_SP`, `VIIRS_SNPP_NRT`, `VIIRS_SNPP_SP`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT` o `ALL`.
  - `date_range` (`Object`, Requerido):
    - `start_date` (`String` ISO Date `YYYY-MM-DD`, Requerido).
    - `end_date` (`String` ISO Date `YYYY-MM-DD`, Requerido).
  - `region` (`Object`, Opcional):
    - `country_code` (`String`, ej. `BOL`).
    - `bbox` (`String`, ej. `-63.5,-19.5,-57.5,-14.0`).
  - `api_key` (`String`, Opcional): MAP_KEY provista por NASA FIRMS (si se omite, se usa la variable de entorno del backend).
  - `auto_harmonize` (`Boolean`, Opcional, default `true`): Dispara inmediatamente el pipeline ST-DBSCAN tras completar la descarga.
- **Códigos de Estado:**
  - `202 Accepted`: Solicitud validada y job de ingesta encolado.
  - `400 Bad Request`: Parámetros de rango de fechas o bbox con inconsistencias.
  - `401 Unauthorized`: Token de autorización faltante o inválido.

##### Ejemplo Request
```http
POST /api/v1/ingest/firms HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "sensor": "ALL",
  "date_range": {
    "start_date": "2026-08-01",
    "end_date": "2026-09-30"
  },
  "region": {
    "country_code": "BOL",
    "bbox": "-63.5,-19.5,-57.5,-14.0"
  },
  "api_key": "c7a8b9f01234567890abcdef12345678",
  "auto_harmonize": true
}
```

##### Ejemplo Response (202 Accepted)
```json
{
  "job_id": "job_ingest_20261114_9821a",
  "status": "QUEUED",
  "message": "Tarea de ingesta encolada exitosamente para la región Santa Cruz/Chiquitanía.",
  "sensor": "ALL",
  "date_range": {
    "start_date": "2026-08-01",
    "end_date": "2026-09-30"
  },
  "created_at": "2026-11-14T15:38:10Z",
  "estimated_duration_sec": 45,
  "status_endpoint": "/api/v1/ingest/status/job_ingest_20261114_9821a"
}
```

---

#### 2.2 `GET /api/v1/ingest/status`
Lista el historial y estado actual de todos los procesos de ingesta recientes.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/ingest/status`
- **Parámetros de Query:**
  - `status` (`String`, Opcional): `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`.
  - `limit` (`Integer`, Opcional, default `20`, max `100`).
  - `offset` (`Integer`, Opcional, default `0`).
- **Códigos de Estado:**
  - `200 OK`: Lista de jobs obtenida.

##### Ejemplo Response (200 OK)
```json
{
  "total": 3,
  "limit": 20,
  "offset": 0,
  "data": [
    {
      "job_id": "job_ingest_20261114_9821a",
      "status": "RUNNING",
      "progress_percent": 68.5,
      "sensor": "ALL",
      "records_processed": 14200,
      "created_at": "2026-11-14T15:38:10Z",
      "completed_at": null,
      "error_message": null
    },
    {
      "job_id": "job_ingest_20261113_1102b",
      "status": "COMPLETED",
      "progress_percent": 100.0,
      "sensor": "VIIRS_SNPP_NRT",
      "records_processed": 84120,
      "created_at": "2026-11-13T10:00:00Z",
      "completed_at": "2026-11-13T10:02:14Z",
      "error_message": null
    }
  ]
}
```

---

#### 2.3 `GET /api/v1/ingest/status/{job_id}`
Consulta detallada del progreso de un trabajo de ingesta específico, incluyendo conteo discriminado de registros por sensor e incidencias de validación.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/ingest/status/{job_id}`
- **Parámetros de Path:**
  - `job_id` (`String`, Requerido): Identificador único del trabajo.
- **Códigos de Estado:**
  - `200 OK`: Detalle del job.
  - `404 Not Found`: El `job_id` especificado no existe.

##### Ejemplo Response (200 OK)
```json
{
  "job_id": "job_ingest_20261114_9821a",
  "status": "COMPLETED",
  "progress_percent": 100.0,
  "created_at": "2026-11-14T15:38:10Z",
  "started_at": "2026-11-14T15:38:12Z",
  "completed_at": "2026-11-14T15:39:04Z",
  "execution_time_seconds": 52.3,
  "parameters": {
    "sensor": "ALL",
    "start_date": "2026-08-01",
    "end_date": "2026-09-30",
    "region_bbox": "-63.5,-19.5,-57.5,-14.0",
    "auto_harmonize": true
  },
  "metrics": {
    "total_records_received": 24530,
    "inserted_modis": 4210,
    "inserted_viirs_snpp": 12890,
    "inserted_viirs_noaa20": 6320,
    "inserted_viirs_noaa21": 1110,
    "filtered_low_confidence": 310,
    "duplicates_ignored": 0,
    "harmonized_events_created": 3412
  },
  "errors": []
}
```

---

### GRUPO 3: Hotspots Crudos (Pre-Armonización)

#### 3.1 `GET /api/v1/hotspots/modis`
Consulta registros satelitales crudos del sensor MODIS C6.1 (Terra/Aqua) almacenados en PostGIS, aplicando filtros espaciales, temporales y de calidad radiométrica.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/hotspots/modis`
- **Parámetros de Query:**
  - `bbox` (`String`, Requerido): `minLng,minLat,maxLng,maxLat` en EPSG:4326.
  - `date_start` (`String` Date, Requerido): Fecha inicio (`YYYY-MM-DD`).
  - `date_end` (`String` Date, Requerido): Fecha fin (`YYYY-MM-DD`).
  - `confidence_min` (`Integer`, Opcional, default `30`, min `0`, max `100`): Porcentaje de confianza del algoritmo MODIS.
  - `daynight` (`String`, Opcional): `D` (Día), `N` (Noche), o ambos si se omite.
  - `satellite` (`String`, Opcional): `Terra`, `Aqua`.
  - `limit` (`Integer`, Opcional, default `100`, max `2000`).
  - `offset` (`Integer`, Opcional, default `0`).
- **Códigos de Estado:**
  - `200 OK`: Datos devueltos exitosamente.
  - `400 Bad Request`: Formato de fecha o bbox inválido.

##### Ejemplo Request
```http
GET /api/v1/hotspots/modis?bbox=-61.5,-17.0,-59.5,-15.0&date_start=2026-08-15&date_end=2026-08-16&confidence_min=50&satellite=Aqua&limit=2 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: application/json
```

##### Ejemplo Response (200 OK)
```json
{
  "total": 312,
  "limit": 2,
  "offset": 0,
  "has_more": true,
  "sensor_type": "MODIS_C6_1",
  "data": [
    {
      "id": 8410291,
      "latitude": -16.2415,
      "longitude": -60.4121,
      "brightness": 348.6,
      "scan": 1.2,
      "track": 1.1,
      "acq_date": "2026-08-15",
      "acq_time": "1745",
      "satellite": "Aqua",
      "instrument": "MODIS",
      "confidence": 85,
      "version": "6.1NRT",
      "bright_t31": 298.2,
      "frp": 62.4,
      "daynight": "D",
      "footprint_geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-60.418, -16.236],
            [-60.406, -16.236],
            [-60.406, -16.247],
            [-60.418, -16.247],
            [-60.418, -16.236]
          ]
        ]
      }
    },
    {
      "id": 8410292,
      "latitude": -16.2520,
      "longitude": -60.4050,
      "brightness": 332.1,
      "scan": 1.2,
      "track": 1.1,
      "acq_date": "2026-08-15",
      "acq_time": "1745",
      "satellite": "Aqua",
      "instrument": "MODIS",
      "confidence": 72,
      "version": "6.1NRT",
      "bright_t31": 296.5,
      "frp": 38.1,
      "daynight": "D",
      "footprint_geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-60.411, -16.246],
            [-60.399, -16.246],
            [-60.399, -16.257],
            [-60.411, -16.257],
            [-60.411, -16.246]
          ]
        ]
      }
    }
  ]
}
```

---

#### 3.2 `GET /api/v1/hotspots/viirs`
Consulta registros satelitales crudos de la constelación VIIRS de 375 metros (Suomi-NPP, NOAA-20, NOAA-21), incorporando filtrado específico de canales de temperatura de brillo I4 e I5.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/hotspots/viirs`
- **Parámetros de Query:**
  - `bbox` (`String`, Requerido): `minLng,minLat,maxLng,maxLat`.
  - `date_start` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `date_end` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `confidence` (`String`, Opcional): `low`, `nominal`, `high`.
  - `satellite` (`String`, Opcional): `SNPP`, `NOAA20`, `NOAA21`.
  - `bright_ti4_min` (`Float`, Opcional, Kelvin): Temperatura mínima canal I4 (ej. `325.0`).
  - `bright_ti4_max` (`Float`, Opcional, Kelvin): Temperatura máxima canal I4 (ej. `367.0` - punto de saturación).
  - `daynight` (`String`, Opcional): `D`, `N`.
  - `limit` (`Integer`, Opcional, default `100`, max `2000`).
  - `offset` (`Integer`, Opcional, default `0`).
- **Códigos de Estado:**
  - `200 OK`: Registros devueltos.

##### Ejemplo Request
```http
GET /api/v1/hotspots/viirs?bbox=-61.5,-17.0,-59.5,-15.0&date_start=2026-08-15&date_end=2026-08-16&satellite=SNPP&bright_ti4_min=330.0&limit=1 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "total": 1284,
  "limit": 1,
  "offset": 0,
  "has_more": true,
  "sensor_type": "VIIRS_375M",
  "data": [
    {
      "id": 19283711,
      "latitude": -16.2431,
      "longitude": -60.4110,
      "bright_ti4": 358.4,
      "bright_ti5": 299.1,
      "scan": 0.41,
      "track": 0.38,
      "acq_date": "2026-08-15",
      "acq_time": "1730",
      "satellite": "SNPP",
      "instrument": "VIIRS",
      "confidence": "high",
      "version": "2.0NRT",
      "frp": 24.3,
      "daynight": "D",
      "footprint_geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-60.413, -16.241],
            [-60.409, -16.241],
            [-60.409, -16.245],
            [-60.413, -16.245],
            [-60.413, -16.241]
          ]
        ]
      }
    }
  ]
}
```

---

#### 3.3 `GET /api/v1/hotspots/compare`
Ejecuta un diagnóstico comparativo directo lado a lado entre detecciones MODIS y VIIRS sobre el mismo dominio espacio-temporal, cuantificando la discrepancia de conteo y el ratio de sobredetección.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/hotspots/compare`
- **Parámetros de Query:**
  - `bbox` (`String`, Opcional): `minLng,minLat,maxLng,maxLat`.
  - `region_id` (`String`, Opcional): Ej. `BOL-SCZ-CHIQUITOS`.
  - `date_start` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `date_end` (`String` Date, Requerido): `YYYY-MM-DD`.
- **Códigos de Estado:**
  - `200 OK`: Resumen comparativo generado.
  - `400 Bad Request`: Se debe indicar al menos `bbox` o `region_id`.

##### Ejemplo Request
```http
GET /api/v1/hotspots/compare?region_id=BOL-SCZ-ROBORE&date_start=2026-08-01&date_end=2026-08-31 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ-ROBORE",
  "region_name": "Roboré, Santa Cruz, Bolivia",
  "period": {
    "start_date": "2026-08-01",
    "end_date": "2026-08-31"
  },
  "raw_counts": {
    "modis_total": 420,
    "viirs_total": 1890,
    "viirs_to_modis_ratio": 4.5,
    "interpretation": "VIIRS detecta 4.5 veces más puntos crudos que MODIS, evidenciando el salto artificial de 2012."
  },
  "energy_comparison": {
    "modis_total_frp_mw": 31200.5,
    "viirs_total_frp_mw": 48120.2,
    "frp_raw_discrepancy_percent": 54.2
  },
  "daily_comparison": [
    {
      "date": "2026-08-15",
      "modis_count": 28,
      "viirs_count": 132,
      "daily_ratio": 4.71,
      "modis_frp_mw": 2100.0,
      "viirs_frp_mw": 3310.5
    },
    {
      "date": "2026-08-16",
      "modis_count": 45,
      "viirs_count": 195,
      "daily_ratio": 4.33,
      "modis_frp_mw": 3450.0,
      "viirs_frp_mw": 5120.0
    }
  ],
  "harmonization_recommendation": {
    "algorithm": "ST-DBSCAN",
    "spatial_epsilon_m": 800,
    "temporal_window_hours": 3.5,
    "estimated_harmonized_events": 78
  }
}
```

---

### GRUPO 4: Eventos Armonizados (ST-DBSCAN + HFII + H3)

#### 4.1 `GET /api/v1/harmonized/events`
Obtiene los incendios poligonales resultantes del agrupamiento espacio-temporal (ST-DBSCAN) y fusión geométrica de huellas reales. Cada evento unifica los puntos crudos redundantes de MODIS y VIIRS, normalizando el índice energético **HFII**.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/harmonized/events`
- **Parámetros de Query:**
  - `bbox` (`String`, Opcional): `minLng,minLat,maxLng,maxLat`.
  - `region_id` (`String`, Opcional): Código de región.
  - `date_start` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `date_end` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `hfii_min` (`Float`, Opcional): Intensidad de fuego mínima calibrada (MW eq.).
  - `hfii_max` (`Float`, Opcional): Intensidad de fuego máxima calibrada.
  - `limit` (`Integer`, Opcional, default `50`, max `500`).
  - `offset` (`Integer`, Opcional, default `0`).
- **Códigos de Estado:**
  - `200 OK`: Colección de eventos devuelta.

##### Ejemplo Request
```http
GET /api/v1/harmonized/events?bbox=-61.0,-17.0,-60.0,-16.0&date_start=2026-09-01&date_end=2026-09-05&hfii_min=50.0&limit=1 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: application/json
```

##### Ejemplo Response (200 OK)
```json
{
  "total": 48,
  "limit": 1,
  "offset": 0,
  "has_more": true,
  "data": [
    {
      "event_id": "EVT-20260902-BOL-0189",
      "cluster_label": 142,
      "region_id": "BOL-SCZ-SANIGNACIO",
      "region_name": "San Ignacio de Velasco",
      "centroid": {
        "latitude": -16.3210,
        "longitude": -60.4892
      },
      "temporal_extent": {
        "first_detection": "2026-09-02T13:30:00Z",
        "last_detection": "2026-09-02T17:45:00Z",
        "duration_hours": 4.25
      },
      "geometry_summary": {
        "type": "Polygon",
        "estimated_area_hectares": 348.5,
        "perimeter_km": 8.7
      },
      "energy_metrics": {
        "hfii_mean": 94.6,
        "hfii_max": 280.2,
        "hfii_total": 3594.8,
        "unit": "MW_equivalent"
      },
      "hotspots_composition": {
        "total_hotspots": 38,
        "modis_count": 6,
        "viirs_count": 32,
        "redundancy_compression_ratio": 0.026
      },
      "fire_regime_classification": "High_Intensity_Forest_Fire"
    }
  ]
}
```

---

#### 4.2 `GET /api/v1/harmonized/events/{event_id}`
Recupera el detalle completo de un evento armonizado, incluyendo la geometría precisa del polígono envolvente (**Convex Hull**) y el listado de todos los puntos crudos de MODIS y VIIRS que conformaron dicho clúster.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/harmonized/events/{event_id}`
- **Parámetros de Path:**
  - `event_id` (`String`, Requerido): Identificador del evento (ej. `EVT-20260902-BOL-0189`).
- **Códigos de Estado:**
  - `200 OK`: Detalle de evento con polígono y miembros.
  - `404 Not Found`: Evento no encontrado.

##### Ejemplo Request
```http
GET /api/v1/harmonized/events/EVT-20260902-BOL-0189 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "event_id": "EVT-20260902-BOL-0189",
  "status": "CONSOLIDATED",
  "bounding_box": [-60.521, -16.345, -60.460, -16.295],
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-60.5210, -16.3200],
        [-60.5050, -16.3450],
        [-60.4700, -16.3350],
        [-60.4600, -16.3050],
        [-60.4850, -16.2950],
        [-60.5210, -16.3200]
      ]
    ]
  },
  "properties": {
    "area_ha": 348.5,
    "hfii_mean": 94.6,
    "hfii_max": 280.2,
    "total_raw_frp_mw": 2980.4,
    "st_dbscan_params": {
      "spatial_eps_meters": 750,
      "temporal_eps_minutes": 210,
      "min_pts": 2
    }
  },
  "member_hotspots": [
    {
      "sensor": "MODIS",
      "satellite": "Aqua",
      "source_id": 8410291,
      "latitude": -16.3215,
      "longitude": -60.4890,
      "acq_datetime": "2026-09-02T17:45:00Z",
      "confidence": 85,
      "frp": 88.4,
      "scan": 1.1,
      "track": 1.0
    },
    {
      "sensor": "VIIRS",
      "satellite": "SNPP",
      "source_id": 19283711,
      "latitude": -16.3220,
      "longitude": -60.4905,
      "acq_datetime": "2026-09-02T17:30:00Z",
      "confidence": "high",
      "frp": 25.1,
      "scan": 0.40,
      "track": 0.38
    }
  ]
}
```

---

#### 4.3 `GET /api/v1/harmonized/h3`
Genera una agregación espacial basada en el sistema hexagonal discreto **Uber H3** (resolución 7 nominal ~5.16 km² o resolución 8 ~0.73 km²). Permite renderizado de alta performance en Deck.gl y Mapbox GL JS sin sobrecargar el DOM.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/harmonized/h3`
- **Parámetros de Query:**
  - `resolution` (`Integer`, Requerido, valores permitidos: `7`, `8`): Nivel de resolución jerárquica H3.
  - `date` (`String` Date, Opcional): Fecha única `YYYY-MM-DD`.
  - `date_start` (`String` Date, Opcional): Inicio de rango `YYYY-MM-DD`.
  - `date_end` (`String` Date, Opcional): Fin de rango `YYYY-MM-DD`.
  - `region_id` (`String`, Opcional): Región administrativa.
  - `bbox` (`String`, Opcional): `minLng,minLat,maxLng,maxLat`.
- **Códigos de Estado:**
  - `200 OK`: Lista de celdas H3 agregadas.
  - `400 Bad Request`: Resolución no admitida (distinta de 7 u 8).

##### Ejemplo Request
```http
GET /api/v1/harmonized/h3?resolution=7&date=2026-09-02&region_id=BOL-SCZ-SANIGNACIO HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "resolution": 7,
  "date_applied": "2026-09-02",
  "cell_count": 2,
  "hexagons": [
    {
      "h3_index": "8782a5105ffffff",
      "center": {
        "lat": -16.3195,
        "lng": -60.4851
      },
      "event_count": 3,
      "raw_hotspots_count": 42,
      "hfii_sum": 412.5,
      "hfii_mean": 98.2,
      "severity_level": "CRITICAL"
    },
    {
      "h3_index": "8782a5104ffffff",
      "center": {
        "lat": -16.3402,
        "lng": -60.4510
      },
      "event_count": 1,
      "raw_hotspots_count": 12,
      "hfii_sum": 88.0,
      "hfii_mean": 88.0,
      "severity_level": "MODERATE"
    }
  ]
}
```

---

#### 4.4 `GET /api/v1/harmonized/statistics`
Retorna métricas cuantitativas globales del proceso de armonización, evidenciando la mitigación efectiva del sesgo 2012 mediante factores de compresión y concordancia multianual.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/harmonized/statistics`
- **Parámetros de Query:**
  - `region_id` (`String`, Opcional): Región a filtrar.
  - `year` (`Integer`, Opcional): Año específico (ej. `2024`).
- **Códigos de Estado:**
  - `200 OK`: Resumen estadístico obtenido.

##### Ejemplo Request
```http
GET /api/v1/harmonized/statistics?year=2024 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "scope": {
    "year": 2024,
    "region": "GLOBAL_BOLIVIA"
  },
  "raw_totals": {
    "modis_hotspots": 74520,
    "viirs_hotspots": 312890,
    "total_unharmonized_points": 387410
  },
  "harmonized_results": {
    "total_harmonized_events": 68910,
    "compression_factor_viirs": 4.54,
    "bias_reduction_percentage": 78.4,
    "total_burned_area_estimated_ha": 4821000.0,
    "mean_hfii": 76.3
  },
  "sensor_contribution_in_events": {
    "viirs_and_modis_overlapping": 61.2,
    "viirs_exclusive_small_fires": 35.8,
    "modis_exclusive": 3.0
  }
}
```

---

### GRUPO 5: Calendario de Quemas y Análisis Temporal

#### 5.1 `GET /api/v1/calendar/heatmap`
Proporciona la estructura de matriz de datos lista para graficar en componentes de mapas de calor tipo GitHub / Recharts, con celdas organizadas por período (mes o semana epidemiológica/ecológica) versus año.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/calendar/heatmap`
- **Parámetros de Query:**
  - `region_id` (`String`, Requerido): Identificador regional (ej. `BOL-SCZ`).
  - `year_start` (`Integer`, Opcional, default `2000`, min `2000`, max `2026`).
  - `year_end` (`Integer`, Opcional, default `2026`).
  - `aggregation` (`String`, Opcional, default `monthly`, valores: `monthly`, `weekly`).
  - `metric` (`String`, Opcional, default `events`, valores: `events`, `hfii_sum`, `area_ha`).
- **Códigos de Estado:**
  - `200 OK`: Matriz generada.

##### Ejemplo Request
```http
GET /api/v1/calendar/heatmap?region_id=BOL-SCZ&year_start=2024&year_end=2026&aggregation=monthly&metric=events HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ",
  "aggregation": "monthly",
  "metric": "events",
  "matrix": [
    {
      "year": 2024,
      "values": {
        "jan": 120, "feb": 95, "mar": 140, "apr": 310, "may": 650,
        "jun": 1820, "jul": 4910, "aug": 18240, "sep": 29840,
        "oct": 14200, "nov": 3100, "dec": 450
      },
      "annual_total": 73875
    },
    {
      "year": 2025,
      "values": {
        "jan": 110, "feb": 85, "mar": 130, "apr": 290, "may": 580,
        "jun": 1640, "jul": 4200, "aug": 15400, "sep": 24100,
        "oct": 11300, "nov": 2800, "dec": 380
      },
      "annual_total": 61015
    },
    {
      "year": 2026,
      "values": {
        "jan": 98, "feb": 90, "mar": 115, "apr": 270, "may": 510,
        "jun": 1450, "jul": 3890, "aug": 14200, "sep": 22100,
        "oct": 9800, "nov": 1950, "dec": null
      },
      "annual_total": 54473
    }
  ],
  "scale_legend": {
    "min": 85,
    "max": 29840,
    "q25": 380,
    "q50": 1450,
    "q75": 11300
  }
}
```

---

#### 5.2 `GET /api/v1/calendar/timeline`
Entrega una serie de tiempo continua y uniforme multi-anual, permitiendo la comparación directa entre la curva pre-armonizada discontinua y la curva post-armonizada continua.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/calendar/timeline`
- **Parámetros de Query:**
  - `region_id` (`String`, Requerido): Región.
  - `aggregation` (`String`, Opcional, default `monthly`, valores: `daily`, `weekly`, `monthly`).
  - `date_start` (`String` Date, Opcional, default `2000-01-01`).
  - `date_end` (`String` Date, Opcional, default `2026-11-14`).
- **Códigos de Estado:**
  - `200 OK`: Serie temporal construida.

##### Ejemplo Request
```http
GET /api/v1/calendar/timeline?region_id=BOL-SCZ-CHIQUITOS&aggregation=monthly&date_start=2011-01-01&date_end=2013-12-31 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ-CHIQUITOS",
  "aggregation": "monthly",
  "data_points": [
    {
      "period": "2011-09",
      "raw_modis_count": 1450,
      "raw_viirs_count": 0,
      "unharmonized_total": 1450,
      "harmonized_events_count": 1390,
      "harmonized_hfii_sum": 98450.0
    },
    {
      "period": "2012-09",
      "raw_modis_count": 1520,
      "raw_viirs_count": 5890,
      "unharmonized_total": 7410,
      "harmonized_events_count": 1480,
      "harmonized_hfii_sum": 104200.0,
      "note": "El total sin armonizar salta a 7,410 por efecto VIIRS. PyrosHarmonizer unifica a 1,480 eventos reales."
    },
    {
      "period": "2013-09",
      "raw_modis_count": 1390,
      "raw_viirs_count": 5210,
      "unharmonized_total": 6600,
      "harmonized_events_count": 1350,
      "harmonized_hfii_sum": 95100.0
    }
  ]
}
```

---

#### 5.3 `GET /api/v1/calendar/anomalies`
Identifica anomalías estadísticas en la actividad de quemas utilizando la desviación tipificada ($Z$-score) calculada sobre la línea de base histórica climatológica (2000-2025).

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/calendar/anomalies`
- **Parámetros de Query:**
  - `region_id` (`String`, Requerido): Código de región.
  - `threshold_zscore` (`Float`, Opcional, default `2.0`, min `1.0`, max `5.0`): Umbral de severidad de la anomalía.
  - `year` (`Integer`, Opcional): Año a evaluar (si se omite, evalúa el año corriente).
- **Códigos de Estado:**
  - `200 OK`: Lista de anomalías detectadas.

##### Ejemplo Request
```http
GET /api/v1/calendar/anomalies?region_id=BOL-SCZ-SANIGNACIO&threshold_zscore=2.5&year=2026 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ-SANIGNACIO",
  "evaluated_year": 2026,
  "threshold_zscore_applied": 2.5,
  "anomalies_detected_count": 1,
  "anomalies": [
    {
      "period": "2026-08 (Semana 34)",
      "observed_harmonized_events": 4820,
      "historical_mean": 1920.4,
      "historical_std_dev": 810.2,
      "z_score": 3.58,
      "severity": "EXTREME_ANOMALY",
      "probable_drivers": [
        "Sequía prolongada (Índice Keetch-Byram > 650)",
        "Vientos cálidos de dirección norte (> 45 km/h)",
        "Adelanto de actividad de desmonte agrícola"
      ]
    }
  ]
}
```

---

#### 5.4 `GET /api/v1/calendar/seasons`
Calcula los límites temporales (fecha de inicio, semana pico de máxima intensidad y fecha de extinción/cierre) de la temporada anual de incendios sobre una región.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/calendar/seasons`
- **Parámetros de Query:**
  - `region_id` (`String`, Requerido): Región administrativa.
  - `year` (`Integer`, Opcional): Año específico (si se omite devuelve los últimos 5 años).
- **Códigos de Estado:**
  - `200 OK`: Resumen estacional calculado.

##### Ejemplo Request
```http
GET /api/v1/calendar/seasons?region_id=BOL-SCZ&year=2024 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ",
  "year": 2024,
  "season_definition": {
    "start_trigger": "Primer incremento sostenido sobre el percentil 75 histórico",
    "end_trigger": "Descenso sostenido por debajo del percentil 25 tras inicio de lluvias"
  },
  "season_metrics": {
    "season_start_date": "2024-06-18",
    "season_end_date": "2024-11-08",
    "total_duration_days": 143,
    "peak_week": "2024-W37 (09 al 15 de Septiembre)",
    "peak_events_recorded": 9840,
    "total_season_burned_area_ha": 3950000.0,
    "status": "CLOSED"
  }
}
```

---

### GRUPO 6: Regiones y Geografía

#### 6.1 `GET /api/v1/regions`
Lista la división territorial disponible en el sistema (departamentos de Bolivia, municipios de Santa Cruz, reservas ecológicas y territorios indígenas de la Chiquitanía).

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/regions`
- **Parámetros de Query:**
  - `level` (`String`, Opcional): `department`, `municipality`, `protected_area`, `indigenous_territory`.
  - `parent_id` (`String`, Opcional): Ej. `BOL-SCZ`.
  - `search` (`String`, Opcional): Filtro de texto por nombre.
- **Códigos de Estado:**
  - `200 OK`: Lista de regiones devuelta.

##### Ejemplo Request
```http
GET /api/v1/regions?level=municipality&parent_id=BOL-SCZ HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "total": 3,
  "data": [
    {
      "region_id": "BOL-SCZ-SANIGNACIO",
      "name": "San Ignacio de Velasco",
      "level": "municipality",
      "parent_id": "BOL-SCZ",
      "area_km2": 49050.2,
      "biome": "Bosque Seco Chiquitano",
      "bbox": [-62.10, -17.50, -59.30, -14.10]
    },
    {
      "region_id": "BOL-SCZ-ROBORE",
      "name": "Roboré",
      "level": "municipality",
      "parent_id": "BOL-SCZ",
      "area_km2": 6852.1,
      "biome": "Serranías Chiquitanas / Chaco",
      "bbox": [-60.50, -18.70, -58.90, -17.70]
    },
    {
      "region_id": "BOL-SCZ-CONCEPCION",
      "name": "Concepción",
      "level": "municipality",
      "parent_id": "BOL-SCZ",
      "area_km2": 28941.5,
      "biome": "Transición Chiquitanía / Amazonía",
      "bbox": [-62.80, -16.80, -60.80, -14.50]
    }
  ]
}
```

---

#### 6.2 `GET /api/v1/regions/{region_id}`
Obtiene el detalle y la geometría oficial GeoJSON de los límites político-administrativos o del polígono del área protegida consultada.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/regions/{region_id}`
- **Parámetros de Path:**
  - `region_id` (`String`, Requerido): Ej. `BOL-SCZ-ROBORE`.
- **Códigos de Estado:**
  - `200 OK`: Región y geometría GeoJSON encontradas.
  - `404 Not Found`: Región inexistente.

##### Ejemplo Request
```http
GET /api/v1/regions/BOL-SCZ-ROBORE HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ-ROBORE",
  "name": "Roboré",
  "department": "Santa Cruz",
  "country": "Bolivia",
  "level": "municipality",
  "area_hectares": 685210.0,
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-60.500, -17.700],
        [-58.900, -17.700],
        [-58.900, -18.700],
        [-60.500, -18.700],
        [-60.500, -17.700]
      ]
    ]
  },
  "protected_areas_included": [
    "Reserva Municipal de Vida Silvestre Valle de Tucabaca"
  ]
}
```

---

#### 6.3 `GET /api/v1/regions/{region_id}/stats`
Genera un perfil consolidado del régimen de incendios para una región geográfica específica, sintetizando promedios históricos de 25 años, años críticos y nivel de riesgo actual.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/regions/{region_id}/stats`
- **Parámetros de Path:**
  - `region_id` (`String`, Requerido): Ej. `BOL-SCZ-CHIQUITOS`.
- **Códigos de Estado:**
  - `200 OK`: Resumen estadístico regional.

##### Ejemplo Request
```http
GET /api/v1/regions/BOL-SCZ-CHIQUITOS/stats HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
```

##### Ejemplo Response (200 OK)
```json
{
  "region_id": "BOL-SCZ-CHIQUITOS",
  "region_name": "Provincia Chiquitos, Santa Cruz",
  "historical_baseline_years": "2000-2025",
  "annual_averages": {
    "harmonized_fire_events_mean": 2840,
    "burned_area_mean_hectares": 142000.0,
    "hfii_mean": 71.8
  },
  "historical_worst_years": [
    {
      "rank": 1,
      "year": 2019,
      "burned_area_ha": 485000.0,
      "events_count": 8920,
      "note": "Incendio catastrófico en la Chiquitanía."
    },
    {
      "rank": 2,
      "year": 2024,
      "burned_area_ha": 462000.0,
      "events_count": 8410,
      "note": "Temporada seca extrema y vientos intensos."
    }
  ],
  "current_year_status": {
    "year": 2026,
    "events_ytd": 2150,
    "burned_area_ytd_ha": 98400.0,
    "relative_risk": "HIGH"
  }
}
```

---

### GRUPO 7: Exportación y Reportes Ejecutivos

#### 7.1 `GET /api/v1/export/geojson`
Descarga directa de los eventos armonizados con sus polígonos envolventes en formato vectorial GeoJSON estándar (RFC 7946), listo para ser consumido en QGIS, ArcGIS o Mapbox Studio.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/export/geojson`
- **Headers:** `Accept: application/geo+json`
- **Parámetros de Query:**
  - `bbox` (`String`, Opcional): `minLng,minLat,maxLng,maxLat`.
  - `region_id` (`String`, Opcional): Ej. `BOL-SCZ-SANIGNACIO`.
  - `date_start` (`String` Date, Requerido): `YYYY-MM-DD`.
  - `date_end` (`String` Date, Requerido): `YYYY-MM-DD`.
- **Códigos de Estado:**
  - `200 OK`: Archivo GeoJSON transmitido.
  - `400 Bad Request`: Faltan fechas obligatorias.

##### Ejemplo Request
```http
GET /api/v1/export/geojson?region_id=BOL-SCZ-ROBORE&date_start=2026-09-01&date_end=2026-09-02 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: application/geo+json
```

##### Ejemplo Response (200 OK)
```json
{
  "type": "FeatureCollection",
  "name": "PyrosHarmonizer_Events_BOL-SCZ-ROBORE",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "id": "EVT-20260901-ROB-001",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-59.840, -18.210],
            [-59.810, -18.235],
            [-59.790, -18.200],
            [-59.820, -18.180],
            [-59.840, -18.210]
          ]
        ]
      },
      "properties": {
        "event_id": "EVT-20260901-ROB-001",
        "date": "2026-09-01",
        "duration_hrs": 3.8,
        "hfii_mean": 89.2,
        "area_ha": 184.2,
        "hotspots_fused": 19,
        "modis_pts": 3,
        "viirs_pts": 16
      }
    }
  ]
}
```

---

#### 7.2 `GET /api/v1/export/csv`
Descarga de eventos armonizados o de hotspots crudos en formato tabular CSV plano (valores delimitados por comas, codificación UTF-8 con BOM), compatible con hojas de cálculo y scripts de análisis en R/Pandas.

- **Método HTTP:** `GET`
- **Ruta:** `/api/v1/export/csv`
- **Headers:** `Accept: text/csv`
- **Parámetros de Query:**
  - `data_type` (`String`, Opcional, default `harmonized`, valores: `harmonized`, `raw_modis`, `raw_viirs`).
  - `region_id` (`String`, Opcional).
  - `date_start` (`String` Date, Requerido).
  - `date_end` (`String` Date, Requerido).
- **Códigos de Estado:**
  - `200 OK`: Archivo de texto plano CSV.

##### Ejemplo Request
```http
GET /api/v1/export/csv?data_type=harmonized&region_id=BOL-SCZ-ROBORE&date_start=2026-09-01&date_end=2026-09-02 HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Accept: text/csv
```

##### Ejemplo Response (200 OK — text/csv)
```csv
event_id,region_id,date,first_detection,last_detection,duration_hours,centroid_lat,centroid_lon,area_hectares,hfii_mean,hfii_max,raw_frp_mw,total_hotspots,modis_count,viirs_count
EVT-20260901-ROB-001,BOL-SCZ-ROBORE,2026-09-01,2026-09-01T13:45:00Z,2026-09-01T17:33:00Z,3.80,-18.2062,-59.8150,184.20,89.20,214.50,1120.40,19,3,16
EVT-20260901-ROB-002,BOL-SCZ-ROBORE,2026-09-01,2026-09-01T14:10:00Z,2026-09-01T17:45:00Z,3.58,-18.3412,-59.9015,92.10,64.30,132.00,540.10,8,1,7
```

---

#### 7.3 `POST /api/v1/export/pdf`
Genera un informe técnico-ejecutivo en formato PDF de alta resolución, compilando resúmenes estadísticos, mapas vectoriales embebidos, curvas de comparación 2012 e índices de anomalías para tomadores de decisión y brigadas de respuesta.

- **Método HTTP:** `POST`
- **Ruta:** `/api/v1/export/pdf`
- **Headers:** `Content-Type: application/json`, `Accept: application/pdf`
- **Body Schema (JSON):**
  - `region_id` (`String`, Requerido): Ej. `BOL-SCZ-CHIQUITOS`.
  - `date_range` (`Object`, Requerido):
    - `start_date` (`String` Date `YYYY-MM-DD`).
    - `end_date` (`String` Date `YYYY-MM-DD`).
  - `language` (`String`, Opcional, default `es`, valores: `es`, `en`).
  - `include_maps` (`Boolean`, Opcional, default `true`): Incorpora capturas de mapas de eventos y celdas H3.
  - `title` (`String`, Opcional): Título personalizado en la portada del informe.
- **Códigos de Estado:**
  - `200 OK`: Flujo binario del archivo PDF (`application/pdf`).
  - `422 Unprocessable Entity`: Error de validación en parámetros solicitados.

##### Ejemplo Request
```http
POST /api/v1/export/pdf HTTP/1.1
Host: api.pyrosharmonizer.spaceapps.org
Content-Type: application/json
Accept: application/pdf

{
  "region_id": "BOL-SCZ-CHIQUITOS",
  "date_range": {
    "start_date": "2026-08-01",
    "end_date": "2026-09-30"
  },
  "language": "es",
  "include_maps": true,
  "title": "Informe Técnico de Incendios Chiquitanía 2026 — PyrosHarmonizer"
}
```

##### Ejemplo Response (200 OK — application/pdf)
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="PyrosHarmonizer_Report_BOL-SCZ-CHIQUITOS_2026.pdf"
Content-Length: 2489120

%PDF-1.5
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
... [Flujo de bytes binarios del PDF compilado] ...
%%EOF
```

---

## 4. Fundamentación Matemática y Algorítmica

Los endpoints descritos interactúan de manera directa con los modelos cuantitativos implementados en el núcleo (`backend/app/harmonizer.py`):

### 4.1 ST-DBSCAN (Clustering Espacio-Temporal)
Para dos observaciones satelitales $p_i = (\mathbf{x}_i, t_i)$ y $p_j = (\mathbf{x}_j, t_j)$, la condición de pertenencia al mismo frente activo de fuego se satisface si y solo si:

$$d_{\text{spatial}}(\mathbf{x}_i, \mathbf{x}_j) \le \varepsilon_{\text{space}} \quad \land \quad |t_i - t_j| \le \varepsilon_{\text{time}}$$

Donde:
- $\varepsilon_{\text{space}} \in [500\text{ m}, 1000\text{ m}]$: Distancia geodésica ortodrómica sobre el elipsoide WGS84 (`ST_DWithin`).
- $\varepsilon_{\text{time}} \in [3\text{ h}, 4\text{ h}]$: Ventana temporal adaptada a la diferencia de paso entre la órbita matutina (Terra) y las órbitas vespertinas (Aqua, SNPP, NOAA-20, NOAA-21).

### 4.2 Fusión Poligonal y Huella Satelital
En lugar de considerar un punto euclidiano adimensional, cada detección se modela como una elipse definida por los parámetros de barrido:
$$\text{Semieje Mayor} = \frac{scan}{2}, \quad \text{Semieje Menor} = \frac{track}{2}$$
El polígono unificado del evento corresponde a la envolvente convexa del conjunto de huellas del clúster:
$$\mathcal{P}_{\text{event}} = \text{ConvexHull}\left(\bigcup_{i \in \text{Cluster}} \text{Footprint}(p_i)\right)$$

### 4.3 Calibración de FRP a HFII (Harmonized Fire Intensity Index)
Para solucionar la diferencia de sensibilidad entre la banda M13/I4 de VIIRS y el canal 21/22 de MODIS, el índice unificado se calcula como:

$$\text{HFII} = \alpha_{\text{sensor}} \cdot \left(\text{FRP}_{\text{obs}}\right)^{\beta} \cdot \left(\frac{A_{\text{pixel, nadir}}}{A_{\text{pixel, scan}}}\right)$$

Donde $\alpha$ y $\beta$ son coeficientes calibrados empíricamente para biomas tropicales secos (Chiquitanía/Cerrado), equilibrando la energía de fuegos sub-píxel de VIIRS con el estándar histórico de MODIS.

---

## 5. Matriz de Códigos de Error y Diagnóstico

| Código Error | HTTP Status | Causa Común | Solución Recomendada |
| :--- | :---: | :--- | :--- |
| `INVALID_BBOX` | `400` | Coordenadas fuera de rango o `minLng >= maxLng`. | Verificar orden `minLng,minLat,maxLng,maxLat` en EPSG:4326. |
| `DATE_RANGE_EXCEEDED` | `400` | Rango mayor a 365 días en consultas de alta resolución. | Acotar ventana temporal o usar endpoint de agregación mensual. |
| `UNAUTHORIZED` | `401` | Falta header `Authorization` en endpoints de ingesta. | Generar y enviar Bearer Token válido. |
| `RESOURCE_NOT_FOUND` | `404` | `job_id`, `event_id` o `region_id` inexistente en BD. | Consultar endpoints de listado previos para obtener IDs válidos. |
| `H3_RESOLUTION_INVALID`| `422` | Resolución H3 solicitada distinta de 7 u 8. | Utilizar exclusivamente `resolution=7` o `resolution=8`. |
| `FIRMS_UPSTREAM_TIMEOUT`| `502` | API de NASA LANCE no responde o excede tiempo límite. | Reintentar en 60 segundos; PyrosHarmonizer implementa circuit breaker. |
| `DATABASE_CONN_FAIL` | `503` | Error de conexión al pool de PostgreSQL/PostGIS. | Revisar logs del contenedor PostgreSQL y parámetros `DATABASE_URL`. |

---

## 6. Prácticas de Integración en el Frontend

### 6.1 Consumo en Mapbox GL / Deck.gl
Para visualizaciones en el cliente React / Next.js 14, se recomienda:
1. Para visualización regional amplia, consumir `/api/v1/harmonized/h3?resolution=7` para renderizar polígonos hexagonales extruidos con Deck.gl `H3HexagonLayer` coloreados según `hfii_mean`.
2. Para zoom local (< nivel 10), cambiar dinámicamente a `/api/v1/harmonized/events` para mostrar los polígonos reales de envolvente convexa (`GeoJsonLayer`).

### 6.2 Integración con Gráficos Recharts / Plotly
1. Consumir `/api/v1/calendar/heatmap` para alimentar matrices visuales de año vs mes.
2. Superponer en `/api/v1/calendar/timeline` la serie `unharmonized_total` (con el salto artificial de 2012) contra `harmonized_events_count` (línea suavizada y calibrada) para ilustrar visualmente en el pitch de 7 slides la solución al Reto #8.

---
*PyrosHarmonizers Team — 2026 NASA International Space Apps Challenge*  
*Documento mantenido por Lead Backend & Data Engineering Lead*

# PyrosHarmonizer — Índice de Contexto y Mapa del Proyecto

> **Master Context Index & Documentation Map**  
> **Evento:** 2026 NASA International Space Apps Challenge — Sede Santa Cruz de la Sierra, Bolivia (Universidad Católica Boliviana "San Pablo", 14-15 de Noviembre de 2026)  
> **Reto:** #8 — *Harmonization of MODIS and VIIRS Hot Spots* (Nivel Intermedio/Avanzado — 606 equipos globales compitiendo)  
> **Proyecto:** PyrosHarmonizer — *Unified Fire Regimes & Burning Activity Calendar*  
> **Versión de Documentación:** 1.0.0-alpha  
> **Estado:** Documento Maestro y Guía de Navegación  

---

## 1. Resumen del Proyecto

**PyrosHarmonizer** es una plataforma geoespacial integral y motor analítico de alto rendimiento diseñado para resolver el **"Efecto 2012"** en las series temporales de incendios forestales de la NASA, originado por la discrepancia sistemática entre los sensores **MODIS** (1 km de resolución espacial, operativo desde el año 2000 a bordo de los satélites Terra y Aqua) y **VIIRS** (375 m de resolución en bandas de imagen $I$, activo desde finales de 2011 con Suomi-NPP, NOAA-20 y NOAA-21). Esta diferencia instrumental produce que VIIRS reporte históricamente entre **3 y 5 veces más detecciones térmicas** que MODIS para un mismo evento de fuego, introduciendo un falso incremento estadístico en las series de más de 24 años y entregando valores de Potencia Radiativa del Fuego (**FRP**) que no son directamente homologables. Tomando como caso de estudio emblemático el ecosistema crítico del bosque seco tropical de **la Chiquitanía** (Santa Cruz, Bolivia), PyrosHarmonizer implementa un pipeline algorítmico robusto sustentado en agrupamiento espacio-temporal (**ST-DBSCAN** a 500–1000 m y ventanas de 3–4 h), reconstrucción y fusión poligonal de la huella real del píxel ($scan \times track$) mediante envolventes convexas (**ConvexHull**), calibración energética hacia el Índice Armonizado de Intensidad de Fuego (**HFII**) e indexación multiescala en celdas hexagonales **Uber H3**. La solución se materializa como una suite full-stack basada en PostgreSQL 16/PostGIS 3.4, Python 3.12 con FastAPI, y React 18 / Next.js 14 con Mapbox GL JS, Deck.gl y Recharts, proporcionando un **Calendario de Actividad de Quemas**, detección de anomalías históricas y exportación estandarizada para investigadores, guardaparques y tomadores de decisión.

---

## 2. Mapa de Documentación

Este índice consolida los catorce (14) documentos de arquitectura, diseño, especificación técnica y directrices del repositorio. Cada documento aborda una dimensión particular del ciclo de vida del software y la ingeniería de datos:

| Archivo | Descripción | Contenido Clave | Estado |
| :--- | :--- | :--- | :---: |
| [`docs/PRD.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/PRD.md) | **Documento de Requisitos del Producto** | Visión del producto, casos de uso, personas de usuario (Guardaparques, Analistas GIS, Investigadores), requisitos funcionales (FR-01 a FR-12), no funcionales (NFR) y métricas de éxito (KPIs de hackathon). | *Planificado* |
| [`docs/TECHNICAL_ARCHITECTURE.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/TECHNICAL_ARCHITECTURE.md) | **Arquitectura Técnica del Sistema** | Diagramas C4 (Contexto, Contenedores, Componentes), flujo de datos de extremo a extremo, capas de ingesta, procesamiento, persistencia y visualización, topología de despliegue cloud. | *Planificado* |
| [`docs/DATA_MODEL.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DATA_MODEL.md) | **Modelo de Datos Lógico y Físico** | Diccionario de datos, tipos de geometrías espaciales PostGIS (`geometry(Point, 4326)`, `geometry(Polygon, 4326)`), esquemas de tablas crudas y agregadas, diagramas Entidad-Relación (ERD). | *Planificado* |
| [`docs/DESIGN.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DESIGN.md) | **Diseño del Sistema y Algoritmos** | Formulación matemática y pseudocódigo de ST-DBSCAN, algoritmo de huella $scan \times track$, fusión geométrica ConvexHull, ecuación de calibración FRP $\to$ HFII y particionado H3. | *Planificado* |
| [`docs/API_CONTRACTS.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/API_CONTRACTS.md) | **Contratos de API REST** | Especificación detallada de endpoints (`/hotspots`, `/harmonized`, `/calendar`, `/regions`, `/export`), parámetros de consulta (`bbox`, `date_range`, `sensor`), esquemas de respuesta y errores HTTP. | *Planificado* |
| [`docs/IMPLEMENTATION_PLAN.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/IMPLEMENTATION_PLAN.md) | **Plan de Implementación 48 Horas** | Cronograma de ejecución por bloques horarios (Fases 0 a 5), asignación por roles del equipo, matriz de riesgos técnicos y entregables mínimos viables (MVP) para evaluación. | *Planificado* |
| [`docs/PERSISTENCE_DESIGN.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/PERSISTENCE_DESIGN.md) | **Diseño de Persistencia y Base de Datos** | Estrategia en PostgreSQL 16 + PostGIS 3.4, índices GiST espaciales, BRIN temporales, b-tree compuestos, particionamiento declarativo por rango temporal y optimizaciones de consultas espaciales. | *Planificado* |
| [`docs/ACCEPTANCE_SCENARIOS.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/ACCEPTANCE_SCENARIOS.md) | **Escenarios de Aceptación (BDD)** | Criterios de aceptación formalizados bajo sintaxis Gherkin (`Given / When / Then`) para filtrado de calidad, clustering ST-DBSCAN, consistencia temporal del calendario y exportación. | *Planificado* |
| [`docs/TEST_STRATEGY.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/TEST_STRATEGY.md) | **Estrategia y Pirámide de Testing** | Plan de pruebas con pytest, pruebas unitarias matemáticas, pruebas de integración con base de datos espacial en memoria/contenedor, cobertura de código objetivo ($\ge 85\%$) y validación sintética. | *Planificado* |
| [`docs/ISSUE_CREATION_GUIDE.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/ISSUE_CREATION_GUIDE.md) | **Guía de Creación de Issues y Backlog** | Plantillas estandarizadas de GitHub Issues (Bug, Feature, Chore, Research), taxonomía de etiquetas (`backend`, `frontend`, `geospatial`, `p0/p1`), flujo de Git branching y pull requests. | *Planificado* |
| [`docs/RBAC_IMPLEMENTATION_PLAN.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/RBAC_IMPLEMENTATION_PLAN.md) | **Plan de Control de Acceso (RBAC)** | Definición de niveles de privilegios (Público/Viewer, Investigador/Analista, Operador de Ingesta, Administrador), autenticación con JWT (tokens Bearer) y middleware en FastAPI. | *Planificado* |
| [`docs/pyrosharmonizer-schema.sql`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/pyrosharmonizer-schema.sql) | **Esquema SQL de Base de Datos** | Script DDL ejecutable completo: extensiones (`postgis`, `postgis_raster`), tablas maestras, vistas materializadas, funciones PL/pgSQL, triggers y particiones temporales. | *Planificado* |
| [`docs/openapi.yml`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/openapi.yml) | **Especificación OpenAPI 3.0** | Archivo formal de especificación OpenAPI / Swagger 3.0 consumible por generadores de código cliente y herramientas de prueba interactiva. | *Completado* |
| [`docs/prompt-pyrosharmonizer.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/prompt-pyrosharmonizer.md) | **Prompt de Referencia del Proyecto** | Contexto condensado de alta fidelidad para agentes de Inteligencia Artificial y nuevos desarrolladores, resumiendo el dominio, fórmulas, stack y convenciones clave. | *Completado* |
| [`docs/DEV1_DATA_ENGINEERING.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DEV1_DATA_ENGINEERING.md) | **Manual de Trabajo: Dev 1** | Ingesta masiva NASA FIRMS (MODIS/VIIRS), esquema particionado PostGIS 16, índices GiST, API NRT y limpieza de datos. | *Completado* |
| [`docs/DEV2_HARMONIZATION_ALGORITHMS.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DEV2_HARMONIZATION_ALGORITHMS.md) | **Manual de Trabajo: Dev 2** | Motor de armonización: geometría $scan \times track$, ST-DBSCAN, ConvexHull, calibración HFII, grillas Uber H3 y caso Chiquitanía. | *Completado* |
| [`docs/DEV3_API_EXPORTS_DEVOPS.md`](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DEV3_API_EXPORTS_DEVOPS.md) | **Manual de Trabajo: Dev 3** | FastAPI REST endpoints, servicios de exportación (GeoJSON, CSV, PDF ejecutivo), Docker Compose, despliegue en Railway y soporte al Frontend externo. | *Completado* |

---

## 3. Estructura Planificada del Código

La estructura de carpetas y módulos del proyecto responde a un diseño limpio, desacoplado y orientado al dominio geoespacial:

```text
PyrosHarmonizers1/
├── docs/                          # Documentación completa del proyecto
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # Entry point FastAPI
│   │   ├── config.py              # Settings (Pydantic BaseSettings)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # API router principal
│   │   │   ├── hotspots.py        # Endpoints hotspots MODIS/VIIRS
│   │   │   ├── harmonized.py      # Endpoints eventos armonizados
│   │   │   ├── calendar.py        # Endpoints calendario de quemas
│   │   │   ├── regions.py         # Endpoints regiones/geografía
│   │   │   ├── export.py          # Endpoints exportación
│   │   │   ├── ingest.py          # Endpoints ingesta
│   │   │   └── health.py          # Health check
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── modis.py           # SQLAlchemy model raw_modis_hotspots
│   │   │   ├── viirs.py           # SQLAlchemy model raw_viirs_hotspots
│   │   │   ├── harmonized.py      # Model harmonized_fire_events
│   │   │   ├── h3_cell.py         # Model h3_daily_cells
│   │   │   ├── calendar.py        # Model burning_calendar_daily
│   │   │   └── region.py          # Model regions
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── firms_csv.py   # Parser CSV FIRMS
│   │   │   │   ├── firms_api.py   # Cliente API REST FIRMS
│   │   │   │   └── normalizer.py  # Normalización de datos
│   │   │   ├── harmonization/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── quality_filter.py  # Filtro de calidad
│   │   │   │   ├── stdbscan.py        # Clustering ST-DBSCAN
│   │   │   │   ├── polygon_fusion.py  # Fusión poligonal ConvexHull
│   │   │   │   ├── frp_calibration.py # Calibración FRP → HFII
│   │   │   │   └── pixel_geometry.py  # Geometría real scan×track
│   │   │   ├── h3_grid/
│   │   │   │   ├── __init__.py
│   │   │   │   └── indexer.py     # Indexación H3 hexagonal
│   │   │   ├── calendar/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── builder.py     # Constructor del calendario
│   │   │   │   └── anomaly.py     # Detección de anomalías
│   │   │   └── export/
│   │   │       ├── __init__.py
│   │   │       ├── geojson.py     # Exportador GeoJSON
│   │   │       ├── csv_export.py  # Exportador CSV
│   │   │       └── pdf_report.py  # Generador PDF
│   │   └── schemas/
│   │       ├── __init__.py
│   │       ├── hotspot.py         # Pydantic schemas hotspots
│   │       ├── harmonized.py      # Schemas eventos armonizados
│   │       ├── calendar.py        # Schemas calendario
│   │       └── common.py          # PaginatedResponse, BBox, ErrorResponse
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py            # Fixtures pytest
│   │   ├── test_quality_filter.py
│   │   ├── test_stdbscan_clustering.py
│   │   ├── test_frp_calibration.py
│   │   ├── test_pixel_geometry.py
│   │   ├── test_h3_indexing.py
│   │   ├── test_data_normalization.py
│   │   ├── test_ingestion_pipeline.py
│   │   ├── test_spatial_queries.py
│   │   └── test_api_endpoints.py
│   ├── alembic/
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js app router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Landing/Dashboard
│   │   │   ├── map/page.tsx       # Página del mapa
│   │   │   ├── calendar/page.tsx  # Página del calendario
│   │   │   └── export/page.tsx    # Página de exportación
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── FireMap.tsx        # Componente mapa principal
│   │   │   │   ├── LayerToggle.tsx    # Control de capas
│   │   │   │   ├── HotspotPopup.tsx   # Popup de detalle
│   │   │   │   └── H3Layer.tsx        # Capa hexagonal H3
│   │   │   ├── Calendar/
│   │   │   │   ├── BurningCalendar.tsx  # Heatmap calendario
│   │   │   │   ├── Timeline.tsx         # Timeline multi-anual
│   │   │   │   └── AnomalyAlert.tsx     # Alertas de anomalía
│   │   │   ├── Charts/
│   │   │   │   ├── FRPChart.tsx        # Gráfico FRP comparativo
│   │   │   │   └── SensorComparison.tsx # Comparación sensores
│   │   │   ├── Export/
│   │   │   │   └── ExportPanel.tsx     # Panel de exportación
│   │   │   └── Layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── hooks/
│   │   │   ├── useHotspots.ts     # Hook de datos hotspots
│   │   │   ├── useHarmonized.ts   # Hook eventos armonizados
│   │   │   ├── useCalendar.ts     # Hook calendario
│   │   │   └── useRegions.ts      # Hook regiones
│   │   ├── services/
│   │   │   ├── api.ts             # Cliente API base (axios/fetch)
│   │   │   └── firms.ts           # Cliente específico FIRMS
│   │   ├── utils/
│   │   │   ├── geo.ts             # Utilidades geoespaciales
│   │   │   ├── format.ts          # Formateo de datos
│   │   │   └── constants.ts       # Constantes del proyecto
│   │   └── types/
│   │       ├── hotspot.ts         # TypeScript interfaces
│   │       ├── harmonized.ts
│   │       └── calendar.ts
│   ├── public/
│   │   └── assets/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml             # PostgreSQL + PostGIS + Backend + Frontend
├── .env.example                   # Variables de entorno
├── .gitignore
├── LICENSE                        # MIT
└── README.md                      # Documentación principal
```

---

## 4. Dependencias Externas Clave

A continuación se resumen las dependencias de infraestructura, procesamiento numérico-geoespacial, servidor backend y cliente frontend que componen el ecosistema técnico:

| Dependencia | Tipo | Versión | URL Oficial / Repositorio | Propósito en el Proyecto |
| :--- | :--- | :---: | :--- | :--- |
| **PostgreSQL** | Base de Datos | `16.x` | [postgresql.org](https://www.postgresql.org/) | RDBMS relacional para almacenamiento de hotspots, metadatos y eventos. |
| **PostGIS** | Extensión Espacial | `3.4.x` | [postgis.net](https://postgis.net/) | Indexación espacial GiST, funciones geodésicas y clustering espacial nativo. |
| **Python** | Runtime Backend | `3.12.x` | [python.org](https://www.python.org/) | Entorno de ejecución principal de microservicios y algoritmos. |
| **FastAPI** | Framework Web | `^0.115.0` | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) | API REST asíncrona de alta velocidad con documentación automática OpenAPI. |
| **Uvicorn** | Servidor ASGI | `^0.32.0` | [uvicorn.org](https://www.uvicorn.org/) | Servidor ASGI ultrarrápido basado en `uvloop` y `httptools`. |
| **SQLAlchemy** | ORM SQL | `^2.0.36` | [sqlalchemy.org](https://www.sqlalchemy.org/) | Mapeador objeto-relacional para interacción declarativa con la base de datos. |
| **GeoAlchemy2** | ORM Geoespacial | `^0.15.2` | [geoalchemy-2.readthedocs.io](https://geoalchemy-2.readthedocs.io/) | Integración de tipos geométricos y geográficos PostGIS con SQLAlchemy. |
| **Pydantic** | Validación de Datos | `^2.9.2` | [docs.pydantic.dev](https://docs.pydantic.dev/) | Validación rigurosa de tipos, esquemas de entrada/salida y variables de entorno. |
| **scikit-learn** | Machine Learning | `^1.5.2` | [scikit-learn.org](https://scikit-learn.org/) | Implementación optimizada de algoritmos de densidad (DBSCAN / ST-DBSCAN). |
| **Shapely** | Manipulación Geométrica | `^2.0.6` | [shapely.readthedocs.io](https://shapely.readthedocs.io/) | Construcción de envolventes convexas (`ConvexHull`), buffers e intersecciones. |
| **Pyproj** | Cartografía y Proyecciones | `^3.7.0` | [pyproj4.github.io/pyproj](https://pyproj4.github.io/pyproj/) | Transformaciones geodésicas precisas entre sistemas de coordenadas (EPSG:4326 a UTM). |
| **h3-py** | Indexación Hexagonal | `^4.1.2` | [uber.github.io/h3-py](https://uber.github.io/h3-py/) | Enlace Python para el sistema de celdas hexagonales discretas Uber H3. |
| **Pandas** | Análisis de Datos | `^2.2.3` | [pandas.pydata.org](https://pandas.pydata.org/) | Manipulación tabular eficiente de series temporales y archivos CSV de FIRMS. |
| **NumPy** | Computación Científica | `^2.1.3` | [numpy.org](https://numpy.org/) | Operaciones matemáticas vectorizadas para matrices de scan/track y calibración FRP. |
| **HTTPX** | Cliente HTTP | `^0.27.2` | [www.python-httpx.org](https://www.python-httpx.org/) | Cliente HTTP asíncrono para consumir la API REST de NASA FIRMS con `MAP_KEY`. |
| **ReportLab** | Motor de Documentos | `^4.2.5` | [reportlab.com](https://www.reportlab.com/) | Generación programática de informes ejecutivos de anomalías de incendios en formato PDF. |
| **pytest** | Marco de Pruebas | `^8.3.3` | [pytest.org](https://pytest.org/) | Framework de pruebas unitarias, parametrizadas y de regresión algorítmica. |
| **Node.js** | Runtime Frontend | `^20.x` LTS | [nodejs.org](https://nodejs.org/) | Entorno de ejecución para compilación y empaquetado del frontend. |
| **React** | Biblioteca de UI | `18.3.x` | [react.dev](https://react.dev/) | Librería declarativa para interfaces reactivas de usuario. |
| **Next.js** | Framework Fullstack | `14.2.x` | [nextjs.org](https://nextjs.org/) | Framework React con Server Components, enrutamiento App Router y optimización estática. |
| **Mapbox GL JS** | Mapas Vectoriales | `^3.8.0` | [mapbox.com/mapbox-gl-js](https://docs.mapbox.com/mapbox-gl-js/) | Motor de renderizado cartográfico 2D/3D con soporte de WebGL y capas de teselas. |
| **Deck.gl** | Visualización Masiva | `^9.0.35` | [deck.gl](https://deck.gl/) | Framework de visualización acelerada por GPU para millones de puntos y hexágonos H3. |
| **h3-js** | Hexágonos en Cliente | `^4.1.0` | [uber.github.io/h3-js](https://uber.github.io/h3-js/) | Biblioteca JavaScript para manipulación y visualización de índices H3 en el navegador. |
| **Recharts** | Gráficos Declarativos | `^2.13.3` | [recharts.org](https://recharts.org/) | Componentes de visualización para series anuales, histogramas y comparaciones de FRP. |
| **Tailwind CSS** | Estilos Utilitarios | `^3.4.15` | [tailwindcss.com](https://tailwindcss.com/) | Sistema de diseño modular y responsivo de clases utilitarias para la interfaz. |
| **Lucide React** | Iconografía | `^0.460.0` | [lucide.dev](https://lucide.dev/) | Catálogo de iconos vectoriales optimizados para React. |
| **Axios** | Cliente HTTP Cliente | `^1.7.7` | [axios-http.com](https://axios-http.com/) | Peticiones HTTP en frontend con interceptores de autenticación y manejo de errores. |
| **Docker Compose** | Orquestación Local | `^2.29.x` | [docs.docker.com/compose](https://docs.docker.com/compose/) | Orquestación declarativa de contenedores para base de datos espacial, API y UI. |

---

## 5. Fuentes de Datos

PyrosHarmonizer integra productos de datos satelitales abiertos provistos por la NASA a través de su sistema FIRMS (*Fire Information for Resource Management System*) y plataformas afines:

| Fuente / Servicio | Proveedor / Instrumento | Cobertura Temporal | Formatos | Latencia / Tipo | URL Oficial |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FIRMS Archive Download** | MODIS Collection 6.1 (Terra / Aqua, 1 km) | Noviembre 2000 – Presente | CSV, SHP, GeoJSON | Archivo Histórico Completo | [firms.modaps.eosdis.nasa.gov/download](https://firms.modaps.eosdis.nasa.gov/download/) |
| **FIRMS Archive Download** | VIIRS 375m (Suomi-NPP, NOAA-20, NOAA-21) | Enero 2012 – Presente | CSV, SHP, GeoJSON | Archivo Histórico Completo | [firms.modaps.eosdis.nasa.gov/download](https://firms.modaps.eosdis.nasa.gov/download/) |
| **FIRMS NRT (Near Real-Time)** | MODIS C6.1 + VIIRS 375m NRT | Últimos 7 días continuos | CSV, GeoJSON, KML | 1 a 3 horas post-adquisición | [firms.modaps.eosdis.nasa.gov/active_fire](https://firms.modaps.eosdis.nasa.gov/active_fire/) |
| **FIRMS REST API** | MODIS & VIIRS (Area, Country, Availability) | Dinámica (1–10 días por llamada) | CSV, JSON | API programática con `MAP_KEY` | [firms.modaps.eosdis.nasa.gov/api](https://firms.modaps.eosdis.nasa.gov/api/) |
| **Google Earth Engine (GEE)** | `FIRMS: Fire Information for Resource Management System` | 2000-11-01 – Presente | Raster/Vector (ImageCollection) | Cloud Computing / Scripting | [developers.google.com/earth-engine/datasets/catalog/FIRMS](https://developers.google.com/earth-engine/datasets/catalog/FIRMS) |

### Estructura de Atributos del Dataset Crudo de FIRMS

Los archivos CSV de FIRMS contienen catorce (14) columnas fundamentales procesadas por el módulo de ingesta:

```text
latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,frp,daynight,type,version
```

- `latitude` / `longitude`: Coordenadas geográficas en WGS84 (EPSG:4326) que representan el centroide del píxel térmico.
- `brightness` / `bright_ti4`: Temperatura de brillo en Kelvin (K) en la banda de 4 µm (MODIS banda 21/22; VIIRS banda $I_4$).
- `bright_t31` / `bright_ti5`: Temperatura de brillo en Kelvin (K) en la banda de 11 µm utilizada para pruebas de contraste térmico.
- `scan` / `track`: Tamaño geométrico del píxel en kilómetros en las direcciones de barrido transversal (*scan*) y avance orbital (*track*). En MODIS varía de $1.0 \times 1.0\text{ km}$ en nadir hasta $4.8 \times 2.0\text{ km}$ en bordes; en VIIRS varía de $0.375 \times 0.375\text{ km}$ hasta aprox. $0.8 \times 0.8\text{ km}$.
- `acq_date`: Fecha de adquisición satelital (formato `YYYY-MM-DD`).
- `acq_time`: Hora UTC de adquisición (formato `HHMM`, ej. `1745`).
- `satellite`: Identificador del satélite (`Terra`, `Aqua`, `Suomi-NPP`, `NOAA-20`, `NOAA-21`).
- `instrument`: Nombre del sensor (`MODIS` o `VIIRS`).
- `confidence`: Nivel de confianza de la detección. En MODIS es un valor porcentual ($0$ a $100\%$). En VIIRS se clasifica en tres categorías categóricas: `low`, `nominal`, `high`.
- `frp`: *Fire Radiative Power* (Potencia Radiativa del Fuego) expresada en megavatios (MW), estimación de la energía térmica radiada por la combustión.
- `daynight`: Indicador de condición de iluminación en el momento de sobrevuelo (`D` = Día, `N` = Noche).
- `version`: Versión del algoritmo de procesamiento científico (ej. `6.1NRT`, `2.0NRT`, `C6.1`).

---

## 6. Referencia Rápida del Glosario

A continuación se describen más de veinte conceptos clave indispensables para comprender la armonización satelital y el modelado de regímenes de fuego:

| # | Término | Definición Técnica y Contexto en PyrosHarmonizer |
| :-: | :--- | :--- |
| **1** | **MODIS** | *Moderate Resolution Imaging Spectroradiometer*. Sensor multiespectral de la NASA a bordo de Terra (1999) y Aqua (2002) con 36 bandas espectrales y resolución espacial de 1 km para detección de incendios. |
| **2** | **VIIRS** | *Visible Infrared Imaging Radiometer Suite*. Sensor radiométrico avanzado a bordo de Suomi-NPP (2011), NOAA-20 (2017) y NOAA-21 (2022) con canales de imagen $I$ a 375 m y canales moderados $M$ a 750 m. |
| **3** | **Hotspot (Punto de Calor)** | Detección satelital de una anomalía térmica en superficie identificada a través de un contraste de temperatura infrarroja respecto a su entorno circundante. |
| **4** | **FRP (Fire Radiative Power)** | Tasa instantánea de emisión de energía térmica radiante del fuego medida en Megavatios (MW). Es directamente proporcional a la tasa de biomasa consumida por unidad de tiempo. |
| **5** | **HFII (Harmonized Fire Intensity Index)** | Métrica sintética adimensional normalizada introducida por PyrosHarmonizer para calibrar la disparidad de FRP entre MODIS y VIIRS, permitiendo comparaciones justas y continuas. |
| **6** | **ST-DBSCAN** | *Spatial-Temporal Density-Based Spatial Clustering of Applications with Noise*. Extensión espacio-temporal del algoritmo DBSCAN que agrupa detecciones cercanas en distancia física ($\le \varepsilon_s$) y tiempo ($\le \varepsilon_t$). |
| **7** | **Uber H3** | Sistema de indexación espacial discreto basado en teselaciones de hexágonos jerárquicos globales. Empleado en PyrosHarmonizer para agregaciones espaciales uniformes y multiescalares. |
| **8** | **Scan / Track** | Ejes cartesianos de la huella orbital: *Scan* mide el ancho transversal perpendicular a la trayectoria del satélite; *Track* mide el largo paralelo al avance orbital de la nave. |
| **9** | **Efecto Bowtie (Bowtie Distortion)** | Deformación y solapamiento geométrico de los píxeles a medida que el sensor escanea hacia los extremos exteriores del barrido angular, ensanchando artificialmente la huella en superficie. |
| **10** | **Convex Hull (Envolvente Convexa)** | El polígono convexo de área mínima que encierra un conjunto finito de puntos en el plano bidimensional. Base para reconstruir el área unificada del frente de fuego en PyrosHarmonizer. |
| **11** | **Efecto 2012** | Salto abrupto y artificial observado en series de tiempo históricas de detección de incendios en 2012 debido a la entrada en servicio de VIIRS (mayor resolución y sensibilidad) frente a MODIS. |
| **12** | **Chiquitanía** | Región biogeográfica de bosque seco tropical transicional en el este de Santa Cruz, Bolivia; seleccionada como caso de estudio por su alta recurrencia de incendios catastróficos y riqueza ecológica. |
| **13** | **Calendario de Actividad de Quemas** | Matriz cronológica multidimensional que mapea el inicio, pico, duración, variabilidad estacional y declive anual de la quema de vegetación en un territorio determinado. |
| **14** | **FIRMS** | *Fire Information for Resource Management System*. Sistema de la NASA que distribuye datos satelitales casi en tiempo real (NRT) y archivos históricos de focos de calor a nivel global. |
| **15** | **NRT (Near Real-Time)** | Modo de procesamiento y entrega de datos satelitales disponible en un lapso de 1 a 3 horas posteriores al pase orbital del satélite, crucial para alerta temprana. |
| **16** | **Brightness Temperature** | Temperatura equivalente de cuerpo negro (expresada en Kelvin) que produciría la radiancia medida por el detector en una longitud de onda infrarroja específica. |
| **17** | **Confidence (Nivel de Confianza)** | Probabilidad estimada por los algoritmos satelitales de que la firma térmica detectada corresponda a un incendio real de vegetación y no a un falso positivo o ruido instrumental. |
| **18** | **PostGIS** | Extensión de base de datos espacial que añade soporte para objetos geográficos, índices espaciales R-Tree/GiST y cientos de funciones de análisis geodésico a PostgreSQL. |
| **19** | **GeoJSON** | Formato abierto de estándar geoespacial basado en JSON para la representación de geometrías vectoriales simples (`Point`, `Polygon`, `MultiPolygon`) junto con sus atributos temáticos. |
| **20** | **Bounding Box (BBox)** | Rectángulo envolvente definido por las coordenadas mínimas y máximas de latitud y longitud (`min_lon, min_lat, max_lon, max_lat`) utilizado para indexar y filtrar consultas espaciales. |
| **21** | **Day/Night Flag** | Atributo categórico del foco que discrimina si la observación fue diurna o nocturna, relevante debido a que la radiación solar afecta las propiedades de reflectancia y detección. |
| **22** | **Deck.gl** | Biblioteca de visualización de datos de código abierto construida sobre WebGL para renderizar capas geoespaciales masivas (millones de puntos o mallas H3) fluidamente en el navegador. |
| **23** | **Regímenes de Fuego (Fire Regimes)** | Patrón característico de recurrencia, estacionalidad, severidad, tipo e intensidad de los incendios que moldean la dinámica estructural de un ecosistema a lo largo de décadas. |
| **24** | **Anomalía Espacio-Temporal** | Desviación estadística significativa (evaluada mediante $Z\text{-score} \ge 2.0$ o rango intercuartílico IQR) respecto al patrón histórico de quemas de una semana/mes en una celda espacial. |

---

## 7. Enlaces Útiles y Recursos Oficiales

### NASA & Teledetección
- **NASA FIRMS Portal:** [https://firms.modaps.eosdis.nasa.gov/](https://firms.modaps.eosdis.nasa.gov/)
- **NASA LANCE (Land, Atmosphere Near real-time Capability for EOS):** [https://earthdata.nasa.gov/earth-observation-data/near-real-time](https://earthdata.nasa.gov/earth-observation-data/near-real-time)
- **NASA Earthdata Search:** [https://search.earthdata.nasa.gov/](https://search.earthdata.nasa.gov/)
- **Documentación de Producto MODIS Fire C6.1:** [https://modis-fire.umd.edu/](https://modis-fire.umd.edu/)
- **Guía de Usuario VIIRS 375m Active Fire:** [https://viirsfire.geog.umd.edu/](https://viirsfire.geog.umd.edu/)

### Tecnologías de Persistencia y Geoespacial
- **PostgreSQL 16 Manual:** [https://www.postgresql.org/docs/16/index.html](https://www.postgresql.org/docs/16/index.html)
- **PostGIS 3.4 Official Documentation:** [https://postgis.net/docs/](https://postgis.net/docs/)
- **Uber H3 Spatial Index Documentation:** [https://h3geo.org/docs/](https://h3geo.org/docs/)
- **Shapely 2.0 User Manual:** [https://shapely.readthedocs.io/en/stable/](https://shapely.readthedocs.io/en/stable/)
- **GeoPandas Documentation:** [https://geopandas.org/en/stable/](https://geopandas.org/en/stable/)

### Frameworks Backend & Servidor
- **FastAPI Documentation:** [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
- **Pydantic v2 Documentation:** [https://docs.pydantic.dev/latest/](https://docs.pydantic.dev/latest/)
- **SQLAlchemy 2.0 Unified Tutorial:** [https://docs.sqlalchemy.org/en/20/tutorial/](https://docs.sqlalchemy.org/en/20/tutorial/)
- **GeoAlchemy2 Documentation:** [https://geoalchemy-2.readthedocs.io/](https://geoalchemy-2.readthedocs.io/)

### Visualización y Frontend
- **Next.js 14 Documentation:** [https://nextjs.org/docs](https://nextjs.org/docs)
- **Mapbox GL JS API Reference:** [https://docs.mapbox.com/mapbox-gl-js/api/](https://docs.mapbox.com/mapbox-gl-js/api/)
- **Deck.gl Framework Guide:** [https://deck.gl/docs](https://deck.gl/docs)
- **Recharts Library:** [https://recharts.org/en-US/api](https://recharts.org/en-US/api)
- **Tailwind CSS Documentation:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)

### Hackathon & Reto
- **2026 NASA International Space Apps Challenge:** [https://www.spaceappschallenge.org/](https://www.spaceappschallenge.org/)
- **Reto #8: Harmonization of MODIS and VIIRS Hot Spots:** [https://www.spaceappschallenge.org/challenges/](https://www.spaceappschallenge.org/challenges/)

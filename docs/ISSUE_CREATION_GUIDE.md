# Guía de Creación y Gestión de Issues en GitHub — PyrosHarmonizer

Guía operativa para la estandarización, categorización, estimación y seguimiento del trabajo del equipo durante el **2026 NASA International Space Apps Challenge** (Sede Santa Cruz de la Sierra — Universidad Católica Boliviana "San Pablo").

---

## 1. Contexto del Proyecto Maestro

- **Evento:** 2026 NASA International Space Apps Challenge, UCB Santa Cruz de la Sierra, Bolivia (14-15 Noviembre 2026).
- **Reto Oficial:** Reto #8 — *Harmonization of MODIS and VIIRS Hot Spots* (Nivel Intermedio/Avanzado, 606 equipos globales en competencia).
- **Nombre de la Solución:** **PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar**.
- **Problema Central:** Discrepancia dimensional y radiométrica entre sensores:
  - **MODIS:** Resolución de $1\text{ km}$, activo desde 1999/2000 (Terra) y 2002 (Aqua).
  - **VIIRS:** Resolución espacial de $375\text{ m}$ (bandas I) y $750\text{ m}$ (bandas M), activo desde 2011/2012 (Suomi-NPP), 2018 (NOAA-20 / JPSS-1) y NOAA-21.
  - **El Efecto 2012:** VIIRS reporta entre 3 y 5 veces más detecciones térmicas sobre el mismo evento de quema respecto a MODIS. Una agregación temporal ingenua induce un salto artificial abrupto en las series históricas a partir de 2012, distorsionando el régimen de fuegos y haciendo incomparables los valores de FRP (*Fire Radiative Power*).
- **Caso de Estudio Crítico:** *"El Efecto 2012 en la Chiquitanía"* — Departamento de Santa Cruz, Bolivia (Bosque Seco Chiquitano y transiciones amazónicas).
- **Stack Tecnológico:**
  - **Base de Datos & Espacial:** PostgreSQL 16 + PostGIS 3.4 (`ST_ClusterDBSCAN`, `ST_ConvexHull`, `ST_DWithin`, indexación espacial GiST).
  - **Backend & Computación Geoespacial:** Python 3.12, FastAPI, GeoPandas, Shapely, Scikit-learn, H3-py (Uber H3 hex resolution 6-8).
  - **Frontend & Visualización:** React 18 / Next.js 14 (App Router), Tailwind CSS, Mapbox GL JS, Deck.gl, Recharts, Plotly.js.
  - **Despliegue & DevOps:** Docker, Docker Compose, Railway (Backend + DB PostGIS), Vercel (Frontend Next.js).
- **Entregables Mandatorios del Hackathon:**
  1. Aplicación web en vivo plenamente funcional y desplegada (Vercel + Railway).
  2. Repositorio público de GitHub con historial limpio y documentación exhaustiva.
  3. Video demostrativo de 30 segundos.
  4. Pitch deck de 7 diapositivas (presentación ante el jurado de la NASA).
  5. `README.md` técnico con metodología de armonización y manual de reproducción.
- **Estructura del Equipo (4-6 Integrantes):**
  - **Lead Backend / Data Engineer:** Modelado relacional PostGIS, pipelines de ingesta NASA FIRMS, cálculo ST-DBSCAN y endpoints FastAPI.
  - **Lead Frontend / UX Designer:** Interfaz Next.js, renderizado de mapas Deck.gl/Mapbox, componente de Calendario de Quemas y gráficos de series temporales.
  - **Geospatial Analyst / Science Specialist:** Validación científica, calibración FRP $\to$ HFII (*Harmonized Fire Intensity Index*), análisis de error en Chiquitanía y métricas de clustering.
  - **DevOps / Integration Lead:** Docker Compose, CI/CD, configuración de despliegue en Railway/Vercel, monitorización y gestión de GitHub Projects.

---

## 2. Tipos de Issue y Templates Markdown

Cada tarea o requerimiento en el repositorio debe inicializarse bajo una de las siguientes 6 tipologías.

### 2.1. 🚀 Feature (Nueva Funcionalidad)
Se utiliza para módulos nuevos, componentes de UI, endpoints de API o algoritmos de armonización.

```markdown
### 🚀 [Feature]: <Título descriptivo de la funcionalidad>

#### Descripción
[Descripción clara y concisa del objetivo de la funcionalidad y su aporte a la solución PyrosHarmonizer]

#### Justificación / Valor Científico o de Usuario
[¿Por qué es necesaria esta funcionalidad? Ej: Permite al usuario comparar visualmente las huellas de MODIS vs VIIRS antes de la fusión]

#### Criterios de Aceptación
- [ ] Implementación de la lógica / componente conforme a especificaciones.
- [ ] Pruebas unitarias o de validación ejecutadas con éxito.
- [ ] Integración documentada en la API o componentes de UI.
- [ ] No genera regresiones en el pipeline de armonización.

#### Contexto Técnico
- **Componente**: `backend` | `frontend` | `algorithm` | `api`
- **Fase**: `phase-1` | `phase-2` | `phase-3`
- **Dependencias**: Bloqueado por #<ID> | Bloquea a #<ID>

#### Notas de Implementación
- **Archivos a modificar/crear**: `backend/app/...` o `frontend/src/...`
- **Librerías / Tecnologías clave**: [Ej: Mapbox GL JS, H3-py, Shapely]
- **Consideraciones de rendimiento**: [Ej: Manejo de más de 50,000 puntos sin latencia en el cliente]
```

---

### 2.2. 🐛 Bug (Error / Defecto)
Se utiliza ante comportamientos inesperados, fallos de cálculo matemático/espacial o caídas en la UI/API.

```markdown
### 🐛 [Bug]: <Descripción concreta del fallo detectado>

#### Comportamiento Observado
[Explicación precisa de qué está fallando actualmente]

#### Comportamiento Esperado
[Cómo debería operar el sistema de acuerdo a las especificaciones teóricas de PyrosHarmonizer]

#### Pasos para Reproducir
1. Ejecutar `...`
2. Enviar petición POST a `/api/v1/harmonize` con payload `...`
3. Observar la respuesta HTTP o la consola del navegador.

#### Criterios de Aceptación para el Fix
- [ ] Causa raíz identificada y subsanada.
- [ ] Test de regresión añadido en `tests/`.
- [ ] Verificación en entorno local y staging.

#### Contexto Técnico
- **Entorno**: Docker Local | Railway Staging | Vercel Preview
- **Logs / Capturas de pantalla**:
```text
[Pegar stack trace o log de error aquí]
```
```

---

### 2.3. 📋 Task (Tarea Técnica / Configuración)
Se utiliza para tareas de infraestructura, configuración de repositorios, tooling, Docker y DevOps.

```markdown
### 📋 [Task]: <Título de la tarea de configuración/soporte>

#### Descripción
[Detalle de la tarea técnica o de infraestructura requerida para habilitar el desarrollo]

#### Criterios de Aceptación
- [ ] Tarea completada y validada en los entornos de desarrollo.
- [ ] Variables de entorno o configuraciones añadidas al archivo `.env.example`.
- [ ] Guía o pasos registrados en la documentación interna.

#### Contexto Técnico
- **Componente**: `devops` | `database` | `backend`
- **Herramientas**: Docker Compose, PostgreSQL 16, GitHub Actions, Railway CLI
```

---

### 2.4. 📊 Data (Ingesta, Limpieza y Gestión de Datos Geoespaciales)
Se utiliza para la adquisición de datasets NASA FIRMS, scripts de parseo, geoprocesamiento y cargas en PostGIS.

```markdown
### 📊 [Data]: <Fuente y cobertura espacial/temporal del dataset>

#### Descripción del Dataset
- **Fuente Oficial**: NASA FIRMS Archive (LANCE / Earthdata)
- **Sensor**: MODIS (Collection 6.1) / VIIRS 375m (VNP14IMGTDL_NRT / VNP14IMGT / NOAA-20 / NOAA-21)
- **Área Geográfica (Bounding Box)**: Bolivia / Chiquitanía `[-69.6, -22.9, -57.4, -9.6]`
- **Rango Temporal**: [Ej: 2000-01-01 a 2026-10-31]

#### Columnas y Estructura Esperada
`latitude`, `longitude`, `brightness`/`bright_ti4`, `bright_ti5`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence`, `frp`, `daynight`, `version`

#### Criterios de Aceptación
- [ ] Datos descargados y almacenados en `/data/raw/` o bucket de almacenamiento.
- [ ] Script de validación de esquema ejecutado sin errores de casteo.
- [ ] Ingesta ejecutada en PostgreSQL con geometrías PostGIS válidas (`SRID=4326`).
- [ ] Índices espaciales GiST creados sobre la columna `geom`.
```

---

### 2.5. 🧪 Test (Pruebas y Validación Científica)
Se utiliza para tests unitarios, pruebas de carga y contraste con literatura científica de incendios.

```markdown
### 🧪 [Test]: <Módulo o validación científica a evaluar>

#### Objetivo de la Prueba
[Describir si es un test unitario de software o una prueba de contraste estadístico para el algoritmo]

#### Casos de Prueba
- [ ] **Caso 1: Coincidencia temporal estricta**: Detecciones separadas por $< 180\text{ min}$ y $< 800\text{ m}$ deben fusionarse en un único cluster.
- [ ] **Caso 2: Detecciones aisladas**: Puntos únicos deben conservar su geometría de píxel original ($scan \times track$).
- [ ] **Caso 3: Calibración FRP**: Probar monotonía y estabilidad del índice HFII ante valores atípicos de FRP ($> 2000\text{ MW}$).

#### Criterios de Aceptación
- [ ] Cobertura de código $> 80\%$ en el módulo bajo prueba.
- [ ] Pruebas automatizadas configuradas en `pytest`.
```

---

### 2.6. 📖 Docs (Documentación, Pitch y Entregables)
Se utiliza para documentación de arquitectura, guías de usuario, slides de pitch y video final.

```markdown
### 📖 [Docs]: <Documento o material a redactar/actualizar>

#### Propósito
[Explicar el destino del documento: README público, manual metodológico, guión del video o diapositivas del pitch]

#### Contenido Mandatorio
- [ ] Contexto del reto de la NASA Space Apps 2026.
- [ ] Formulación matemática del algoritmo ST-DBSCAN y HFII.
- [ ] Diagramas de arquitectura y flujo de datos.
- [ ] Instrucciones reproducibles paso a paso para el jurado evaluador.

#### Entregable Final
- [ ] Archivo Markdown / PDF / Slide Deck exportado y revisado por el equipo.
```

---

## 3. Taxonomía y Sistema de Labels

Para garantizar la visibilidad visual en GitHub Projects y Kanban, se aplicará el siguiente esquema de etiquetas unificado:

### 3.1. Prioridad (`priority`)
Determina la urgencia de resolución en el marco de las 48 horas del hackathon.

| Label | Color Hex | Descripción y Regla de Uso |
| :--- | :--- | :--- |
| `P0-critical` | `#d73a4a` | **Bloqueante Absoluto.** Sin esto no hay demo ni entregable funcional. Requiere atención inmediata. |
| `P1-high` | `#e99695` | **Alta Prioridad.** Funcionalidad central para la evaluación del jurado de la NASA (core de armonización). |
| `P2-medium` | `#fbca04` | **Media Prioridad.** Mejoras analíticas, optimizaciones de consultas o refinamientos de UI. |
| `P3-low` | `#0e8a16` | **Baja Prioridad.** Pulido visual secundario o features opcionales ("nice-to-have"). |

### 3.2. Componente de Arquitectura (`component`)
Identifica el subsistema de la solución afectado por el issue.

| Label | Color Hex | Componente Afectado |
| :--- | :--- | :--- |
| `backend` | `#1d76db` | Servicios Python 3.12, FastAPI, endpoints REST y middlewares. |
| `frontend` | `#5319e7` | Aplicación Next.js 14, componentes React, Tailwind CSS y estado. |
| `database` | `#0075ca` | PostgreSQL 16, extensión PostGIS 3.4, tablas, funciones SQL e índices. |
| `algorithm` | `#d876e3` | Algoritmos ST-DBSCAN, ConvexHull, H3, transformaciones geométricas y HFII. |
| `devops` | `#006b75` | Docker, Docker Compose, Railway, Vercel, variables `.env` y CI/CD. |
| `docs` | `#c5def5` | Documentación técnica, guías, pitch deck, video y entregables NASA. |

### 3.3. Dominio Funcional (`feature`)
Agrupa las tareas por módulo de negocio o científico.

| Label | Color Hex | Módulo de Negocio / Científico |
| :--- | :--- | :--- |
| `ingestion` | `#bfdadc` | Descarga, parseo y carga masiva de datos NASA FIRMS (CSV / API). |
| `harmonization` | `#b60205` | Motor de unificación espacio-temporal MODIS + VIIRS y calibración FRP. |
| `calendar` | `#fef2c0` | Componente de matriz/heatmap de temporadas y regímenes de quema. |
| `map` | `#0052cc` | Visualización geoespacial con Mapbox GL JS, Deck.gl y capas vectoriales. |
| `h3-grid` | `#e99695` | Agregación hexagonal Uber H3 multinivel para optimización web. |
| `api` | `#5319e7` | Contratos de interfaz, esquemas Pydantic y serialización GeoJSON. |
| `export` | `#c2e0c6` | Descarga de datos armonizados en formatos GeoJSON, CSV y GeoTIFF. |

### 3.4. Estado del Flujo de Trabajo (`status`)
Monitorea la progresión en el tablero Kanban.

| Label | Color Hex | Significado en el Sprint |
| :--- | :--- | :--- |
| `ready` | `#a2eeef` | Especificado por completo con criterios de aceptación; listo para tomar. |
| `in-progress` | `#fad8c7` | En desarrollo activo por un miembro del equipo. |
| `review` | `#fbca04` | Pull Request abierto, pendiente de code review y verificación funcional. |
| `done` | `#0e8a16` | Aceptado, fusionado en rama principal y verificado. |
| `blocked` | `#b60205` | Detenido por una dependencia técnica o falta de datos. |

### 3.5. Fases del Hackathon (`phase`)
Segmenta el desarrollo a lo largo de las fases de ejecución del proyecto.

| Label | Color Hex | Hito Temporal del Proyecto |
| :--- | :--- | :--- |
| `phase-0` | `#ededed` | **Setup & Foundation:** Entorno, Docker, datasets base y scaffolding inicial. |
| `phase-1` | `#d4c5f9` | **Data Pipeline:** Ingesta y almacenamiento espacial en PostGIS. |
| `phase-2` | `#c5def5` | **Harmonization Engine:** ST-DBSCAN, ConvexHull y calibración HFII. |
| `phase-3` | `#bfdadc` | **UI & Analytics:** Mapa interactivo, Calendario de Quemas y Timeline. |
| `phase-4` | `#fef2c0` | **Integration & Case Study:** Análisis en Chiquitanía y validación científica. |
| `phase-5` | `#d73a4a` | **Demo, Pitch & Submission:** Despliegue final, pitch 7 slides y video 30s. |

---

## 4. Template de Issue Estándar (Copiable)

Para crear un nuevo issue manualmente en GitHub, utilizar la siguiente plantilla Markdown:

```markdown
## Descripción
[Descripción clara y concisa del issue]

## Criterios de Aceptación
- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

## Contexto Técnico
- **Componente**: [backend/frontend/database/algorithm/devops/docs]
- **Documentación relacionada**: [link a docs/ o referencia bibliográfica]
- **Dependencias**: [issues que deben completarse antes, ej: #1, #4]

## Notas de Implementación
[Pistas técnicas, archivos a modificar, APIs a usar, comandos de prueba]

## Estimación
- **Complejidad**: [S / M / L / XL]
- **Horas estimadas**: [1-2h / 2-4h / 4-8h / 8h+]
- **Fase**: [phase-0 / phase-1 / phase-2 / phase-3 / phase-4 / phase-5]
```

---

## 5. Template de Sprint Backlog para Hackathon

Matriz de gestión rápida recomendada para coordinar los sprints durante el evento:

| ID | Título del Issue | Tipo | Prioridad | Fase | Responsable (Rol) | Estimación | Dependencias | Estado |
| :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| `#1` | Docker Compose PostGIS 3.4 | `Task` | `P0` | `Phase 0` | DevOps Lead | 1-2h | Ninguna | `ready` |
| `#2` | Scaffolding FastAPI | `Task` | `P0` | `Phase 0` | Backend Lead | 1-2h | Ninguna | `ready` |
| `#3` | Scaffolding Next.js | `Task` | `P0` | `Phase 0` | Frontend Lead | 1-2h | Ninguna | `ready` |
| `#4` | MAP_KEY NASA FIRMS | `Task` | `P0` | `Phase 0` | Geospatial Analyst | 1h | Ninguna | `ready` |
| `#5` | Datasets MODIS 2000-2026 | `Data` | `P0` | `Phase 0` | Geospatial Analyst | 2-4h | `#4` | `ready` |
| `#6` | Datasets VIIRS 2012-2026 | `Data` | `P0` | `Phase 0` | Geospatial Analyst | 2-4h | `#4` | `ready` |
| `#7` | Schema SQL PostGIS | `Task` | `P0` | `Phase 1` | Backend Lead | 1-2h | `#1` | `ready` |
| `#8` | Ingesta CSV MODIS | `Feature` | `P0` | `Phase 1` | Backend Lead | 2-4h | `#5`, `#7` | `ready` |
| `#9` | Ingesta CSV VIIRS | `Feature` | `P0` | `Phase 1` | Backend Lead | 2-4h | `#6`, `#7` | `ready` |
| `#10`| Filtro de Calidad | `Feature` | `P1` | `Phase 2` | Geospatial Analyst | 2-4h | `#8`, `#9` | `ready` |
| `#11`| ST-DBSCAN Clustering | `Feature` | `P0` | `Phase 2` | Backend Lead | 4-8h | `#10` | `ready` |
| `#12`| Fusión ConvexHull | `Feature` | `P0` | `Phase 2` | Backend Lead | 2-4h | `#11` | `ready` |
| `#13`| Calibración FRP $\to$ HFII | `Feature` | `P0` | `Phase 2` | Geospatial Analyst | 2-4h | `#12` | `ready` |
| `#14`| Indexación H3 Hexagonal | `Feature` | `P1` | `Phase 2` | Backend Lead | 2-4h | `#12` | `ready` |
| `#15`| Geometría de Píxel Real | `Feature` | `P1` | `Phase 2` | Geospatial Analyst | 2-4h | `#10` | `ready` |
| `#16`| Mapa Mapbox GL JS | `Feature` | `P0` | `Phase 3` | Frontend Lead | 4-8h | `#3` | `ready` |
| `#17`| Toggle de Capas Sensores | `Feature` | `P0` | `Phase 3` | Frontend Lead | 2-4h | `#16` | `ready` |
| `#18`| Calendario Heatmap | `Feature` | `P0` | `Phase 3` | Frontend Lead | 4-8h | `#3` | `ready` |
| `#19`| Timeline Multi-anual | `Feature` | `P1` | `Phase 3` | Frontend Lead | 2-4h | `#18` | `ready` |
| `#20`| Endpoints API REST | `Feature` | `P1` | `Phase 1-3`| Backend Lead | 4-8h | `#11`, `#14` | `ready` |

---

## 6. Issues Pre-definidos del Sprint 1 (20 Issues Detallados)

A continuación se desglosan los 20 issues estructurados y listos para migrar a GitHub:

---

### Issue #1: [Task][P0] Configurar Docker Compose con PostgreSQL 16 + PostGIS 3.4 — Phase 0

#### Descripción
Configurar el entorno de base de datos relacional y espacial mediante Docker Compose, garantizando compatibilidad con las extensiones `postgis`, `postgis_raster` y funciones analíticas de clustering espacial (`ST_ClusterDBSCAN`).

#### Criterios de Aceptación
- [ ] Archivo `docker-compose.yml` funcional en la raíz del proyecto.
- [ ] Contenedor basado en imagen oficial `postgis/postgis:16-3.4`.
- [ ] Volumen persistente montado en `./data/postgres_data`.
- [ ] Variables de entorno parametrizadas vía `.env` (`POSTGRES_DB=pyrosharmonizer`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT=5432`).
- [ ] Script de inicialización que active automáticamente la extensión `CREATE EXTENSION IF NOT EXISTS postgis;`.
- [ ] Verificación de conexión exitosa mediante cliente SQL (DBeaver/pgAdmin o psql).

#### Contexto Técnico
- **Componente**: `database`, `devops`
- **Documentación relacionada**: [docs/DATABASE_ARCHITECTURE.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DATABASE_ARCHITECTURE.md)
- **Dependencias**: Ninguna

#### Notas de Implementación
- Crear carpeta `docker/` con script `init-db.sh`.
- Exponer puerto `5432:5432`.
- Validar comando `docker compose up -d` y probar con `psql -h localhost -U postgres -d pyrosharmonizer -c "SELECT PostGIS_Version();"`.

#### Estimación
- **Complejidad**: S
- **Horas estimadas**: 1-2h
- **Fase**: `phase-0`
- **Responsable**: DevOps / Integration Lead

---

### Issue #2: [Task][P0] Scaffolding proyecto FastAPI backend — Phase 0

#### Descripción
Inicializar la estructura del proyecto backend en Python 3.12 utilizando el framework FastAPI, configurando la inyección de dependencias para la base de datos, CORS, middlewares y gestión de dependencias con `requirements.txt` / `poetry`.

#### Criterios de Aceptación
- [ ] Estructura modular creada: `backend/app/{api, core, models, schemas, services, db}`.
- [ ] Servidor Uvicorn iniciando sin errores en `http://localhost:8000`.
- [ ] Documentación OpenAPI interactiva disponible en `/docs` y `/redoc`.
- [ ] Configuración CORS habilitada para permitir peticiones desde `http://localhost:3000` (Next.js).
- [ ] Endpoint de salud `GET /api/v1/health` retornando estado de servicio y conexión a PostgreSQL.

#### Contexto Técnico
- **Componente**: `backend`
- **Documentación relacionada**: [README.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/README.md)
- **Dependencias**: #1

#### Notas de Implementación
- Librerías principales: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `asyncpg` / `psycopg2-binary`, `sqlalchemy>=2.0`.
- Configurar `backend/app/core/config.py` leyendo `.env`.

#### Estimación
- **Complejidad**: S
- **Horas estimadas**: 1-2h
- **Fase**: `phase-0`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #3: [Task][P0] Scaffolding proyecto Next.js frontend — Phase 0

#### Descripción
Inicializar la aplicación frontend utilizando Next.js 14 (App Router), TypeScript y Tailwind CSS, dejando listos los layouts base, soporte para mapa a pantalla completa y paneles analíticos.

#### Criterios de Aceptación
- [ ] Proyecto creado en directorio `frontend/` con Next.js 14 y App Router.
- [ ] Tailwind CSS configurado con paleta de colores del proyecto (tonos oscuros para visualización cartográfica, acentos en naranja/fuego para FRP).
- [ ] Layout base con Header (selector de rango de fechas, botones de exportación) y Sidebar plegable para métricas del Calendario de Quemas.
- [ ] Soporte para variables de entorno en `.env.local` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`).
- [ ] Compilación limpia con `npm run build` sin errores de tipado TypeScript.

#### Contexto Técnico
- **Componente**: `frontend`
- **Documentación relacionada**: [README.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/README.md)
- **Dependencias**: Ninguna

#### Notas de Implementación
- Instalar dependencias base: `lucide-react`, `clsx`, `tailwind-merge`.
- Probar ejecución en `http://localhost:3000`.

#### Estimación
- **Complejidad**: S
- **Horas estimadas**: 1-2h
- **Fase**: `phase-0`
- **Responsable**: Lead Frontend / UX

---

### Issue #4: [Task][P0] Obtener MAP_KEY de NASA FIRMS API — Phase 0

#### Descripción
Gestionar y registrar la clave de acceso de desarrollador (MAP_KEY) del servicio NASA FIRMS (Fire Information for Resource Management System) para permitir la consulta directa y programática a las APIs REST de detección de incendios activos.

#### Criterios de Aceptación
- [ ] Cuenta institucional/personal registrada en NASA Earthdata y solicitud enviada a FIRMS API.
- [ ] `MAP_KEY` válida obtenida y resguardada de forma segura.
- [ ] Variable agregada en los archivos `.env.example` y `.env` del backend (`NASA_FIRMS_MAP_KEY=...`).
- [ ] Verificación de prueba ejecutando una consulta cURL al endpoint de prueba de FIRMS para el área de Bolivia.

#### Contexto Técnico
- **Componente**: `devops`, `backend`
- **Documentación relacionada**: NASA FIRMS API Documentation (`https://firms.modaps.eosdis.nasa.gov/api/`)
- **Dependencias**: Ninguna

#### Notas de Implementación
- Endpoint de verificación: `https://firms.modaps.eosdis.nasa.gov/api/country/csv/[MAP_KEY]/VIIRS_SNPP_NRT/BOL/1`

#### Estimación
- **Complejidad**: S
- **Horas estimadas**: 1h
- **Fase**: `phase-0`
- **Responsable**: Geospatial Analyst / DevOps Lead

---

### Issue #5: [Data][P0] Descargar datasets MODIS Bolivia 2000-2026 desde FIRMS Archive — Phase 0

#### Descripción
Descargar los registros históricos completos de anomalías térmicas captadas por los sensores MODIS (satélites Terra y Aqua, Colección 6.1) para el territorio de Bolivia desde el año 2000 hasta el presente a través de la herramienta de descarga histórica (FIRMS Archive Download).

#### Criterios de Aceptación
- [ ] Archivos CSV descargados con cobertura geográfica completa de Bolivia (`Bounding Box: -69.64, -22.91, -57.45, -9.67`).
- [ ] Validación de columnas presentes: `latitude`, `longitude`, `brightness`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence`, `version`, `bright_t31`, `frp`, `daynight`.
- [ ] Verificación de integridad: archivos no corruptos, tamaño consistente y ordenados por fecha.
- [ ] Dataset organizado en directorio local protegido `data/raw/modis/`.

#### Contexto Técnico
- **Componente**: `backend`, `database`
- **Documentación relacionada**: NASA FIRMS MODIS Collection 6.1 User Guide
- **Dependencias**: #4

#### Notas de Implementación
- Crear script auxiliar `scripts/download_modis_archive.py` o documentar los links de descarga directa de NASA Earthdata.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-0`
- **Responsable**: Geospatial Analyst

---

### Issue #6: [Data][P0] Descargar datasets VIIRS Bolivia 2012-2026 desde FIRMS Archive — Phase 0

#### Descripción
Adquirir los datos históricos de alta resolución espacial ($375\text{ m}$) de los sensores VIIRS a bordo de los satélites Suomi-NPP (desde 2012), NOAA-20 (desde 2018) y NOAA-21 para el territorio boliviano, con énfasis en el área de la Chiquitanía.

#### Criterios de Aceptación
- [ ] Descarga completa de los productos VNP14IMGTDL (NRT/Archive) y NOAA-20/21.
- [ ] Validación de columnas específicas de VIIRS 375m: `latitude`, `longitude`, `bright_ti4`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence` (`low`, `nominal`, `high`), `version`, `bright_ti5`, `frp`, `daynight`.
- [ ] Almacenamiento organizado en `data/raw/viirs/`.
- [ ] Reporte preliminar de cantidad de registros para evaluar volumen de almacenamiento en PostgreSQL.

#### Contexto Técnico
- **Componente**: `backend`, `database`
- **Documentación relacionada**: VIIRS 375 m Active Fire Product User Guide
- **Dependencias**: #4

#### Notas de Implementación
- Se debe prestar especial atención a la columna `bright_ti4` (temperatura de brillo banda I4 en Kelvin) y `frp` (MW).

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-0`
- **Responsable**: Geospatial Analyst

---

### Issue #7: [Task][P0] Crear schema PostgreSQL/PostGIS (ejecutar pyrosharmonizer-schema.sql) — Phase 1

#### Descripción
Diseñar y ejecutar el DDL relacional y geoespacial en PostgreSQL 16 + PostGIS 3.4 para albergar los puntos crudos de MODIS, VIIRS, las geometrías armonizadas y las tablas agregadas por celda H3.

#### Criterios de Aceptación
- [ ] Archivo `sql/pyrosharmonizer-schema.sql` creado y versionado.
- [ ] Tabla `raw_hotspots` con particionamiento o discriminación por sensor (`sensor_type`: 'MODIS' o 'VIIRS'), campos de tiempo (`acq_timestamp` TIMESTAMPTZ), FRP, confianza y columna geométrica `geom geometry(Point, 4326)`.
- [ ] Tabla `harmonized_fire_events` para los clusters poligonales unificados (`geom geometry(Polygon, 4326)` o `MultiPolygon`), `event_start`, `event_end`, `aggregated_hfii`, `source_count_modis`, `source_count_viirs`.
- [ ] Tabla `h3_fire_aggregations` para estadísticas por celda H3 y fecha.
- [ ] Creación de índices espaciales GiST: `CREATE INDEX idx_raw_hotspots_geom ON raw_hotspots USING GIST (geom);`.
- [ ] Creación de índices temporales B-Tree: `CREATE INDEX idx_raw_hotspots_time ON raw_hotspots (acq_timestamp);`.

#### Contexto Técnico
- **Componente**: `database`
- **Documentación relacionada**: [docs/DATABASE_ARCHITECTURE.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DATABASE_ARCHITECTURE.md)
- **Dependencias**: #1

#### Notas de Implementación
- Ejecutar mediante script de migración en Python o mediante comando `psql -f sql/pyrosharmonizer-schema.sql`.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 1-2h
- **Fase**: `phase-1`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #8: [Feature][P0] Implementar ingesta CSV MODIS (parser + insert PostGIS) — Phase 1

#### Descripción
Desarrollar un pipeline en Python para leer, validar y cargar eficientemente los archivos masivos CSV de MODIS hacia la tabla `raw_hotspots` en PostGIS, transformando fecha y hora a timestamp unificado y generando geometrías `Point(lon, lat)`.

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/ingestion/modis_parser.py` implementado.
- [ ] Conversión precisa de `acq_date` (YYYY-MM-DD) y `acq_time` (HHMM en formato string/entero UTC) a objeto `datetime` con zona horaria UTC.
- [ ] Manejo de transacciones por lotes (`batch_size=5000` o copy con `psycopg2.extras.execute_values` o `COPY FROM`).
- [ ] Mapeo correcto de confianza numérica (0-100%) a escala normalizada.
- [ ] Registro de log con número de filas procesadas, tiempo de inserción y detección de filas con coordenadas inválidas.

#### Contexto Técnico
- **Componente**: `backend`, `database`
- **Documentación relacionada**: Documentación de PostGIS `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`
- **Dependencias**: #5, #7

#### Notas de Implementación
- Evitar inserciones individuales fila por fila (alto coste en millones de registros). Utilizar `asyncpg.copy_records_to_table` o `pgcopy`.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-1`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #9: [Feature][P0] Implementar ingesta CSV VIIRS (parser + insert PostGIS) — Phase 1

#### Descripción
Desarrollar el componente de ingesta para los datasets de VIIRS (375m), adecuando el parser a las particularidades de sus columnas (`bright_ti4`, `bright_ti5`, confianza categórica: 'l'/'low', 'n'/'nominal', 'h'/'high').

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/ingestion/viirs_parser.py` operativo.
- [ ] Mapeo de la confianza de texto a un valor numérico/cualitativo estándar en base de datos.
- [ ] Transformación de coordenadas a puntos PostGIS con SRID 4326.
- [ ] Soporte para ingesta incremental o lectura por carpetas anuales.
- [ ] Verificación en base de datos de que los puntos de Suomi-NPP y NOAA-20 se encuentren etiquetados adecuadamente con su satélite e instrumento correspondiente.

#### Contexto Técnico
- **Componente**: `backend`, `database`
- **Documentación relacionada**: [docs/DATA_INGESTION.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/DATA_INGESTION.md)
- **Dependencias**: #6, #7

#### Notas de Implementación
- Reutilizar la clase base abstracta `BaseHotspotParser` para evitar duplicación de código con el parser de MODIS.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-1`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #10: [Feature][P1] Implementar filtro de calidad (confidence + anomalías estáticas) — Phase 2

#### Descripción
Crear el pipeline de limpieza y filtrado de datos para eliminar ruido que comprometa la veracidad de los regímenes de quema: descartar detecciones de baja confianza y filtrar puntos generados por fuentes térmicas industriales o geológicas estáticas.

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/quality_filter.py` implementado.
- [ ] Regla de confianza: Descartar MODIS con `confidence < 30%` y VIIRS con `confidence == 'low'` (o valor configurado en perfil estricto).
- [ ] Filtro de anomalías térmicas fijas: Detección y exclusión de puntos que persisten en las mismas coordenadas exactas durante todo el año (plantas gasíferas/petroleras en el Chaco boliviano, quemadores industriales o chimeneas).
- [ ] Capacidad de activar/desactivar el filtro vía parámetros en la API.

#### Contexto Técnico
- **Componente**: `algorithm`, `backend`
- **Documentación relacionada**: Literatura NASA FIRMS sobre falsos positivos industriales
- **Dependencias**: #8, #9

#### Notas de Implementación
- Implementar consulta SQL con agregación espacial o máscara de exclusión con un radio buffer de $500\text{ m}$ alrededor de fuentes conocidas.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-2`
- **Responsable**: Geospatial Analyst / Backend Lead

---

### Issue #11: [Feature][P0] Implementar algoritmo ST-DBSCAN clustering — Phase 2

#### Descripción
Implementar el núcleo analítico de armonización: Agrupamiento Espacio-Temporal basado en Densidad (ST-DBSCAN) para asociar detecciones concurrentes de MODIS y VIIRS correspondientes al mismo frente de fuego físico.

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/harmonization/st_dbscan.py` implementado con algoritmos vectorizados (Scikit-Learn o función PostGIS personalizada).
- [ ] Umbral espacial ($\epsilon_s$): Configurable entre $500\text{ m}$ y $1000\text{ m}$.
- [ ] Umbral temporal ($\epsilon_t$): Configurable entre 3 y 4 horas ($180 - 240\text{ minutos}$).
- [ ] Asignación de un `cluster_id` único a todos los puntos que pertenecen al mismo episodio de fuego.
- [ ] Tratamiento adecuado de puntos aislados (ruido/detecciones individuales de un solo sensor).

#### Contexto Técnico
- **Componente**: `algorithm`, `backend`
- **Documentación relacionada**: Publicaciones científicas sobre Spatio-Temporal DBSCAN para incendios forestales
- **Dependencias**: #10

#### Notas de Implementación
- En PostGIS se puede evaluar `ST_ClusterDBSCAN` proyectando a UTM (ej. EPSG:32720 para Santa Cruz) usando una métrica combinada espacio-tiempo o procesar particiones temporales en memoria con Python KD-Tree / BallTree espacial.

#### Estimación
- **Complejidad**: L
- **Horas estimadas**: 4-8h
- **Fase**: `phase-2`
- **Responsable**: Lead Backend / Geospatial Analyst

---

### Issue #12: [Feature][P0] Implementar fusión poligonal ConvexHull — Phase 2

#### Descripción
Para cada grupo de detecciones identificado por el algoritmo ST-DBSCAN, calcular la geometría unificada del incendio mediante el cierre convexo (*Convex Hull*) o envolvente espacial cóncava, evitando duplicidades de área quemada.

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/harmonization/polygon_fusion.py` funcional.
- [ ] Para clusters con $\ge 3$ puntos no colineales: generar polígono con `ST_ConvexHull` (o Shapely `convex_hull`).
- [ ] Para clusters con 1 o 2 puntos: generar un buffer representativo basado en la resolución nominal de los sensores intervinientes ($375\text{ m}$ para VIIRS, $1000\text{ m}$ para MODIS).
- [ ] Cálculo del área total quemada en hectáreas ($ha$) y kilómetros cuadrados ($km^2$).
- [ ] Almacenamiento del polígono resultante en la tabla `harmonized_fire_events`.

#### Contexto Técnico
- **Componente**: `algorithm`, `database`
- **Documentación relacionada**: Métodos de estimación de perímetro de incendios forestales
- **Dependencias**: #11

#### Notas de Implementación
- Aplicar proyección a coordenadas planas (EPSG:32720 / WGS 84 UTM Zona 20S) antes de calcular áreas para evitar distorsiones de latitud/longitud.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-2`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #13: [Feature][P0] Implementar calibración FRP → HFII — Phase 2

#### Descripción
Desarrollar la función de normalización y calibración energética que homogenice la potencia radiativa del fuego (FRP en MegaWatts) entre MODIS y VIIRS, calculando el **Harmonized Fire Intensity Index (HFII)** para eliminar el sesgo derivado del cambio de sensor en 2012.

#### Criterios de Aceptación
- [ ] Módulo matemático `backend/app/services/harmonization/hfii_calibrator.py`.
- [ ] Formulación de regresión/normalización empírica entre las mediciones simultáneas de MODIS y VIIRS en la zona de estudio.
- [ ] Cálculo del HFII ponderado para cada evento armonizado a partir del FRP acumulado y la densidad de píxeles:
  $$\text{HFII} = f(\text{FRP}_{\text{VIIRS}}, \text{FRP}_{\text{MODIS}}, \text{Área}, \Delta t)$$
- [ ] Normalización del índice en una escala continua interpretable (ej: 0 - 100 o escala de severidad categórica: Bajo, Moderado, Alto, Extremo).
- [ ] Validación de la serie temporal: la curva de HFII histórico no debe presentar el salto artificial en el año 2012.

#### Contexto Técnico
- **Componente**: `algorithm`
- **Documentación relacionada**: Metodología de calibración radiométrica inter-satelital NASA
- **Dependencias**: #12

#### Notas de Implementación
- Realizar pruebas estadísticas con SciPy para contrastar la distribución de FRP antes y después de 2012.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-2`
- **Responsable**: Geospatial Analyst / Science Specialist

---

### Issue #14: [Feature][P1] Implementar indexación H3 hexagonal — Phase 2

#### Descripción
Integrar la librería de indexación geoespacial jerárquica Uber H3 para indexar tanto los puntos de calor individuales como los polígonos armonizados en resoluciones hexagonales optimizadas para visualizaciones masivas y agregación analítica.

#### Criterios de Aceptación
- [ ] Integración de `h3-py` en el pipeline de procesamiento.
- [ ] Mapeo de coordenadas geográficas a identificadores de celda H3 en resolución 6 ($\sim 36\text{ km}^2$) para análisis regional y resolución 8 ($\sim 0.7\text{ km}^2$) para vista local.
- [ ] Generación de agregaciones precalculadas en la tabla `h3_fire_aggregations`: número de focos, suma de FRP y promedio de HFII por hexágono y por semana/mes.
- [ ] Endpoint de API que sirva datos hexagonales en formato GeoJSON o formato optimizado para Deck.gl `H3HexagonLayer`.

#### Contexto Técnico
- **Componente**: `algorithm`, `backend`
- **Documentación relacionada**: Documentación oficial de Uber H3 Spatial Index
- **Dependencias**: #12

#### Notas de Implementación
- El uso de celdas H3 permitirá renderizar cientos de miles de detecciones en el cliente web sin colapsar la memoria GPU/WebGL del navegador.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-2`
- **Responsable**: Lead Backend / Data Engineer

---

### Issue #15: [Feature][P1] Implementar geometría real de píxel (scan × track) — Phase 2

#### Descripción
Reconstruir el polígono de cobertura real del píxel sensor en el terreno utilizando los parámetros `scan` y `track` reportados por FIRMS, sustituyendo la representación de puntos ficticios por el elipsoide o cuadrilátero real proyectado en superficie.

#### Criterios de Aceptación
- [ ] Módulo `backend/app/services/geometry/pixel_footprint.py`.
- [ ] Cálculo de la deformación del píxel fuera del nadir: a medida que el ángulo de escaneo crece hacia los extremos del barrido del satélite, el píxel MODIS crece de $1\times 1\text{ km}$ hasta $\approx 4.8\times 2.0\text{ km}$, mientras que VIIRS mantiene mayor contención gracias al esquema de agregación de píxeles en bandas I.
- [ ] Generación de geometrías de polígono orientadas para cada detección individual.
- [ ] Demostración visual en el mapa de cómo la superposición de píxeles reales explica el aparente "aumento" de incendios.

#### Contexto Técnico
- **Componente**: `algorithm`, `backend`
- **Documentación relacionada**: Wolfe et al., *MODIS Geolocation*, y Schroeder et al., *VIIRS Active Fire Algorithms*
- **Dependencias**: #10

#### Notas de Implementación
- Función matemática de elipse/rectángulo rotado a partir de la trayectoria orbital del satélite (`track`) y dirección de escaneo (`scan`).

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-2`
- **Responsable**: Geospatial Analyst

---

### Issue #16: [Feature][P0] Componente mapa interactivo (Mapbox GL JS) — Phase 3

#### Descripción
Construir el componente principal del mapa interactivo en Next.js utilizando Mapbox GL JS / Deck.gl, optimizado para renderizar datos geoespaciales densos sobre el territorio de Bolivia y la región de la Chiquitanía.

#### Criterios de Aceptación
- [ ] Componente `frontend/src/components/map/FireMap.tsx` creado.
- [ ] Vista centrada inicialmente en Santa Cruz de la Sierra / Chiquitanía (`center: [-60.7, -16.5]`, `zoom: 6.5`).
- [ ] Estilo de mapa base oscuro (*Dark mode*) para maximizar el contraste de los puntos de calor y áreas quemadas.
- [ ] Controles de navegación: zoom, brújula, escala métrica y botón de pantalla completa.
- [ ] Tooltip interactivo al hacer hover/click sobre un foco o polígono mostrando: Sensor, Satélite, Fecha/Hora UTC, FRP original, HFII armonizado y Confianza.

#### Contexto Técnico
- **Componente**: `frontend`, `map`
- **Documentación relacionada**: Mapbox GL JS API References & Deck.gl React Integrations
- **Dependencias**: #3

#### Notas de Implementación
- Asegurar carga dinámica con `dynamic(() => import('./FireMap'), { ssr: false })` para evitar errores de servidor en Next.js por acceso al objeto `window`.

#### Estimación
- **Complejidad**: L
- **Horas estimadas**: 4-8h
- **Fase**: `phase-3`
- **Responsable**: Lead Frontend / UX

---

### Issue #17: [Feature][P0] Toggle de capas MODIS/VIIRS/Armonizado — Phase 3

#### Descripción
Implementar el selector y control de capas en la interfaz de usuario para permitir la visualización independiente y comparativa de los tres estados de datos: sólo MODIS (histórico 1km), sólo VIIRS (alta resolución 375m) y la capa unificada de PyrosHarmonizer.

#### Criterios de Aceptación
- [ ] Componente `frontend/src/components/map/LayerControl.tsx`.
- [ ] Switch o checkboxes con códigos de color distintivos:
  - Capa MODIS: Marcadores/círculos en color amarillo/ámbar.
  - Capa VIIRS: Marcadores en color rojo brillante.
  - Capa Armonizada PyrosHarmonizer: Polígonos con degradado térmico según HFII y contorno cian/neón.
- [ ] Modo de comparación "Split Screen" (cortina interactiva antes/después) o activación/desactivación instantánea sin recarga de página.
- [ ] Indicador numérico en tiempo real del total de puntos activos visibles en cada capa.

#### Contexto Técnico
- **Componente**: `frontend`, `map`
- **Documentación relacionada**: Guías de diseño cartográfico de Mapbox
- **Dependencias**: #16

#### Notas de Implementación
- Manejar visibilidad mediante `map.setLayoutProperty(layerId, 'visibility', 'visible' | 'none')` o estados en Deck.gl.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-3`
- **Responsable**: Lead Frontend / UX

---

### Issue #18: [Feature][P0] Componente Calendario de Quemas (heatmap) — Phase 3

#### Descripción
Diseñar y desarrollar el componente visual del **Calendario de Actividad de Quemas**, que represente en una matriz anual tipo heatmap (estilo contribuciones de GitHub o matriz mes $\times$ día) la intensidad acumulada de incendios para identificar el ciclo fenológico del fuego en la Chiquitanía.

#### Criterios de Aceptación
- [ ] Componente `frontend/src/components/analytics/BurningCalendar.tsx`.
- [ ] Eje X: Meses del año (Enero a Diciembre) o Semanas epidemiológicas/ambientales (1 a 52).
- [ ] Eje Y: Años históricos desde el 2000 hasta el 2026.
- [ ] Colorimetría: Escala de calor continua basada en HFII armonizado (baja actividad en verde oscuro/gris, picos críticos en naranja y magenta).
- [ ] Demostración clara del "Efecto 2012": sin armonizar se ve un salto brusco en 2012; con el toggle armonizado activado, la serie se normaliza coherentemente.
- [ ] Selección interactiva: al hacer click en una celda o mes, el mapa sincroniza su vista temporal a ese período.

#### Contexto Técnico
- **Componente**: `frontend`, `calendar`
- **Documentación relacionada**: [docs/BURNING_CALENDAR_METHODOLOGY.md](file:///c:/NASASPACE2026/PyrosHarmonizers1/docs/BURNING_CALENDAR_METHODOLOGY.md)
- **Dependencias**: #3

#### Notas de Implementación
- Emplear librerías como Recharts, Nivo Heatmap o celdas SVG/Canvas personalizadas en Tailwind CSS.

#### Estimación
- **Complejidad**: L
- **Horas estimadas**: 4-8h
- **Fase**: `phase-3`
- **Responsable**: Lead Frontend / UX

---

### Issue #19: [Feature][P1] Componente Timeline multi-anual — Phase 3

#### Descripción
Construir una barra de tiempo interactiva (*Timeline Slider*) en la parte inferior de la pantalla que permita reproducir dinámicamente la evolución de los incendios a lo largo de los años o pausar en los años más catastróficos registrados en Bolivia (2010, 2019, 2020, 2024, 2026).

#### Criterios de Aceptación
- [ ] Componente `frontend/src/components/map/TimelineSlider.tsx`.
- [ ] Rango seleccionable desde el año 2000 hasta 2026.
- [ ] Botones de reproducción: Play, Pause, Paso Adelante (+1 año / +1 mes), Paso Atrás.
- [ ] Marcadores destacados en el eje temporal para los años históricos críticos de incendios en la Chiquitanía.
- [ ] Transición fluida de datos en el mapa sin parpadeos visuales al avanzar la línea temporal.

#### Contexto Técnico
- **Componente**: `frontend`, `map`
- **Documentación relacionada**: Patrones de control temporal en dashboards geoespaciales
- **Dependencias**: #16, #18

#### Notas de Implementación
- Implementar debounce o animación vía `requestAnimationFrame` para controlar las solicitudes al backend.

#### Estimación
- **Complejidad**: M
- **Horas estimadas**: 2-4h
- **Fase**: `phase-3`
- **Responsable**: Lead Frontend / UX

---

### Issue #20: [Feature][P1] Endpoints API REST (hotspots, harmonized, calendar) — Phase 1-3

#### Descripción
Definir, documentar e implementar los endpoints de la API REST en FastAPI para alimentar el mapa, las capas filtradas, los hexágonos H3 y las estadísticas del Calendario de Quemas.

#### Criterios de Aceptación
- [ ] Endpoint `GET /api/v1/hotspots`: Retorna focos crudos filtrados por `start_date`, `end_date`, `sensor` y `bbox`. Formato GeoJSON FeatureCollection.
- [ ] Endpoint `GET /api/v1/harmonized/events`: Retorna los polígonos de incendios unificados con atributos HFII y métricas de fusión.
- [ ] Endpoint `GET /api/v1/calendar/summary`: Retorna el conteo y la energía mensual/anual agregada para el componente Calendario de Quemas.
- [ ] Endpoint `GET /api/v1/grid/h3`: Retorna agregaciones hexagonales H3 con conteos de severidad.
- [ ] Paginación y límite de registros para prevenir sobrecarga de memoria (`limit`, `offset`).
- [ ] Validación estricta de parámetros mediante modelos Pydantic.

#### Contexto Técnico
- **Componente**: `backend`, `api`
- **Documentación relacionada**: Especificación OpenAPI 3.0 generada en `/docs`
- **Dependencias**: #11, #14

#### Notas de Implementación
- Utilizar serialización rápida con `orjson` o generadores directos de GeoJSON desde PostGIS (`ST_AsGeoJSON`).

#### Estimación
- **Complejidad**: L
- **Horas estimadas**: 4-8h
- **Fase**: `phase-1-3`
- **Responsable**: Lead Backend / Data Engineer

---

## 7. Convención de Commits Git y Flujo de Trabajo

Para mantener un historial de control de versiones trazable, profesional y alineado con los criterios de evaluación del jurado de la NASA, se aplicará de forma estricta la especificación **Conventional Commits 1.0.0**.

### 7.1. Estructura Obligatoria del Mensaje
```text
<tipo>(<ámbito>): <descripción concisa en modo imperativo>

[cuerpo opcional detallando el porqué del cambio]

[referencia a issues, ej: Closes #12, Refs #15]
```

### 7.2. Tipos Permitidos (`type`)
- `feat`: Nuevas funcionalidades para el usuario o API.
- `fix`: Corrección de errores y bugs en código o consultas.
- `docs`: Modificaciones o adiciones en la documentación (`.md`, diagramas, guías).
- `test`: Añadido o corrección de pruebas unitarias, de integración o científicas.
- `refactor`: Cambios de código que ni añaden funcionalidad ni corrigen un error.
- `chore`: Tareas de mantenimiento, dependencias, scripts de build o Docker.
- `data`: Scripts específicos de ingesta, preprocesamiento o migración de datos.

### 7.3. Ámbitos Principales (`scope`)
`ingestion`, `stdbscan`, `frp`, `hfii`, `h3`, `api`, `map`, `calendar`, `timeline`, `schema`, `docker`, `deploy`, `readme`.

### 7.4. Ejemplos de Commits Válidos

```bash
# Ingesta de datos
git commit -m "feat(ingestion): add MODIS CSV parser with chunked PostGIS batch loading"

# Corrección de umbral en clustering
git commit -m "fix(stdbscan): correct distance threshold from 2000m to 800m for spatial epsilon"

# Documentación de despliegue
git commit -m "docs(readme): add deployment instructions for Railway and Vercel"

# Validación y testing científico
git commit -m "test(frp): add HFII calibration tests and verify 2012 jump smoothing"

# Refactorización de controladores
git commit -m "refactor(api): restructure router modules into v1 endpoints structure"

# Actualización de infraestructura
git commit -m "chore(docker): update PostGIS version to 16-3.4 and optimize shared buffers"

# Vinculación y cierre de issues
git commit -m "feat(polygon): implement convex hull fusion algorithm for ST-DBSCAN clusters

Closes #12"
```

### 7.5. Estrategia de Ramas (*Branching Strategy*)
Durante el hackathon no se trabajará directamente sobre la rama `main`:
1. `main`: Rama de producción. Solo código estable desplegado en Vercel y Railway.
2. `develop`: Rama de integración continua.
3. Ramas de trabajo nombradas según el tipo y número de issue:
   - `feat/issue-11-stdbscan-clustering`
   - `feat/issue-18-calendar-heatmap`
   - `fix/issue-10-quality-filter`
   - `data/issue-5-modis-archive`
4. **Pull Requests (PR):**
   - Cada PR debe vincular su issue correspondiente en la descripción (`Closes #ID`).
   - Requiere revisión o aprobación de al menos otro integrante del equipo.
   - Debe pasar las validaciones mínimas antes de hacer merge a `develop`.

---

## 8. Definition of Done (DoD) para el Hackathon

Un issue se considerará formalmente cerrado (`done`) únicamente cuando cumpla los siguientes criterios:
1. **Código Operativo:** La solución funciona localmente sin lanzar excepciones.
2. **Criterios Cumplidos:** Todos los checkboxes de los Criterios de Aceptación del issue han sido marcados.
3. **Commit Normalizado:** El commit o conjunto de commits sigue la convención `type(scope): description`.
4. **PR Fusionado:** El Pull Request fue revisado e integrado en `develop` o `main`.
5. **Impacto en el Entregable:** La funcionalidad se encuentra reflejada o lista para ser demostrada en la presentación del pitch o el video de 30 segundos.

---
*PyrosHarmonizer — 2026 NASA International Space Apps Challenge — Santa Cruz de la Sierra, Bolivia.*

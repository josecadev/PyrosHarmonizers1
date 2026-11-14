# Prompt de Referencia — PyrosHarmonizer (Context Injection)

> **Uso:** Inyección de contexto maestro para asistentes IA, LLMs y nuevos miembros del equipo de PyrosHarmonizer.

---

### 1. Identificación y Metadatos
- **Nombre:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar
- **Evento:** 2026 NASA International Space Apps Challenge | Sede: Universidad Católica Boliviana (UCB), Santa Cruz de la Sierra, Bolivia | Fecha: 14-15 Noviembre 2026
- **Reto Oficial:** Reto #8 — *Harmonization of MODIS and VIIRS Hot Spots* (Nivel Intermedio/Avanzado | 606 equipos globales registrados | Nicho de baja saturación y alto impacto científico).

### 2. Problema Científico ("El Efecto 2012")
Los datos satelitales de incendios activos presentan una discontinuidad crítica por diferencias instrumentales: **MODIS** (satélites Terra 1999 y Aqua 2002) ofrece serie histórica continua desde 2000 con resolución nominal de 1 km (creciendo en los extremos de barrido hasta 2.0 km × 4.8 km por distorsión cenital) y 4 pasadas diarias. **VIIRS** (Suomi-NPP 2011, NOAA-20 2018, NOAA-21) opera desde 2012 con bandas de resolución I a 375 m (y bandas M a 750 m), capturando entre 3× y 5× más focos térmicos sobre el mismo incendio gracias a su mayor sensibilidad a fuegos de baja intensidad. La agregación directa o suma cruda MODIS + VIIRS genera un **salto artificial en las series históricas a partir de 2012**. Asimismo, la potencia radiativa del fuego (**FRP** en MW) no es directamente comparable entre un macro-píxel de 1 km² y micro-píxeles de 375 m. Adicionalmente, el cese de datos de Suomi-NPP exige una transición consistente hacia NOAA-20 y NOAA-21.

### 3. Solución Técnica y Metodológica
- **Filtro de Calidad Inicial:** Descarte de detecciones espurias; exclusión de MODIS con `confidence < 30%` y VIIRS con flag `'low'`, además del filtrado de anomalías térmicas industriales y volcánicas estáticas.
- **Geometría Real de Píxel:** Reconstrucción de la huella elipsoidal real a partir de los parámetros de barrido satelital (`scan` × `track` en km), evitando tratar las detecciones como puntos centroides adimensionales.
- **Clustering Espacio-Temporal (ST-DBSCAN):** Agrupamiento de detecciones concurrentes de MODIS y VIIRS dentro de un radio espacial $\varepsilon \in [500, 1000]\text{ m}$ y una ventana temporal orbital $\Delta t \le 3\text{ a }4\text{ h}$.
- **Fusión Poligonal:** Generación del perímetro envolvente (*ConvexHull*) para cada clúster, consolidando un único evento físico de fuego.
- **Calibración Energética (FRP $\to$ HFII):** Normalización de la energía radiativa hacia el Índice Armonizado de Intensidad de Fuego (*HFII*): $\text{FRP}_{harmonized} = \alpha \times \sum \text{FRP}_{VIIRS} + \beta$, calibrado a la línea base histórica de MODIS.
- **Ponderación Día/Noche y Ángulo Cenital:** Corrección diferencial por la mayor sensibilidad nocturna de VIIRS y ajuste por área real proyectada ($A = \text{scan} \times \text{track}$).
- **Indexación Hexagonal Uber H3:** Agregación multiescala en resoluciones H3 res 7 (~5.16 km²) y res 8 (~0.73 km²), calculando densidad de $\text{FRP}/\text{km}^2$ para neutralizar el sobre-conteo por resolución espacial.

### 4. Stack Tecnológico
- **Base de Datos Espacial:** PostgreSQL 16 + PostGIS 3.4 (índices GiST, funciones `ST_ClusterDBSCAN`, `ST_ConvexHull`, `ST_DWithin`).
- **Backend / Data Pipeline:** Python 3.12, FastAPI, GeoPandas, Shapely, Scikit-Learn, Uber H3-py, Psycopg3 / SQLAlchemy 2.0.
- **Frontend / Visualización:** React 18, Next.js 14 (App Router), Mapbox GL JS, Deck.gl (capas H3HexagonLayer, GeoJsonLayer), Tailwind CSS, Recharts / Plotly.
- **DevOps y Despliegue:** Docker, Docker Compose, Railway (Backend + PostGIS), Vercel (Frontend Next.js), GitHub Actions CI/CD.

### 5. Datos NASA FIRMS (Fuentes y Estructura)
- **Portales y Descargas:**
  - Archivo Histórico: `https://firms.modaps.eosdis.nasa.gov/download/`
  - NRT (Near Real-Time 24h / 48h / 7d): `https://firms.modaps.eosdis.nasa.gov/active_fire/`
  - API REST FIRMS: `https://firms.modaps.eosdis.nasa.gov/api/`
  - Catálogo Google Earth Engine: `ee.ImageCollection("FIRMS")`
- **Esquema de Columnas CSV:** `latitude`, `longitude`, `brightness` / `bright_ti4`, `bright_ti5`, `scan`, `track`, `acq_date`, `acq_time`, `satellite`, `instrument`, `confidence`, `frp`, `daynight`, `version`.
- **Satélites e Instrumentos:** MODIS (Terra/Aqua, 1 km, C6.1); VIIRS (Suomi-NPP, NOAA-20, NOAA-21; 375 m bandas I1-I5, 750 m bandas M).

### 6. Caso de Estudio: "El Efecto 2012 en la Chiquitanía"
- **Área Geográfica:** Chiquitanía, Departamento de Santa Cruz, Bolivia (bosque seco chiquitano, alta vulnerabilidad a incendios forestales anuales).
- **Demostración Analítica:** La serie cruda suma un 300% a 500% de detecciones a partir de 2012 creando la falsa ilusión de un colapso ecológico abrupto; el motor PyrosHarmonizer unifica los eventos, corrige el sesgo instrumental y revela la tendencia climática y de quemas real.

### 7. Organización del Equipo y Roles (4-6 integrantes)
- **Lead Backend / Data Engineer:** Pipeline de ingesta FIRMS, algoritmos ST-DBSCAN, calibración HFII y endpoints FastAPI.
- **Lead Frontend / UX:** Interfaz Next.js, mapas interactivos Deck.gl/Mapbox, panel de series temporales y calendario matricial.
- **Geospatial Analyst / Science Lead:** Validación de parámetros biofísicos ($\varepsilon, \Delta t, \alpha, \beta$), análisis Chiquitanía y calibración cruzada de sensores.
- **DevOps / Integration Lead:** Contenerización Docker, pipelines CI/CD, despliegues en Railway/Vercel y aseguramiento de entregables.

### 8. Entregables Oficiales del Hackathon
1. **Aplicación Web Desplegada y Funcional:** Enlaces públicos en Vercel (Frontend) y Railway (Backend/DB).
2. **Repositorio Público GitHub:** Código limpio, commits semánticos y licencias abiertas (MIT / Apache 2.0).
3. **Video Demostrativo de 30 Segundos:** Enlace a YouTube/Vimeo con recorrido conciso destacando la comparativa 2012.
4. **Pitch Deck (Máximo 7 Diapositivas):** Problema, solución técnica, base científica/algorítmica, caso Chiquitanía, impacto y hoja de ruta.
5. **README.md Estructurado:** Guía integral de arquitectura, ejecución local y sustentación teórica.

### 9. Estructura del Proyecto y Documentación
- **Índice Central:** `docs/CONTEXT_INDEX.md`
- **Documentación Disponible:** `PRD.md`, `TECHNICAL_ARCHITECTURE.md`, `DATA_MODEL.md`, `DESIGN.md`, `API_CONTRACTS.md`, `IMPLEMENTATION_PLAN.md`, `PERSISTENCE_DESIGN.md`, `ACCEPTANCE_SCENARIOS.md`, `TEST_STRATEGY.md`, `ISSUE_CREATION_GUIDE.md`, `RBAC_IMPLEMENTATION_PLAN.md`.
- **Esquemas y Contratos:** `pyrosharmonizer-schema.sql`, `openapi.yml`.

### 10. Glosario Rápido
- **MODIS:** *Moderate Resolution Imaging Spectroradiometer* (Terra/Aqua, 1 km).
- **VIIRS:** *Visible Infrared Imaging Radiometer Suite* (Suomi-NPP, NOAA-20/21, 375 m).
- **FRP:** *Fire Radiative Power* (Potencia radiativa instantánea del fuego emitida en MW).
- **HFII:** *Harmonized Fire Intensity Index* (Métrica energética normalizada y comparable inter-sensores).
- **FIRMS / LANCE:** *Fire Information for Resource Management System* / *Land, Atmosphere Near real-time Capability for EOS*.
- **ST-DBSCAN:** *Spatial-Temporal Density-Based Spatial Clustering of Applications with Noise*.
- **H3:** Sistema de indexación espacial discreta hexagonal jerárquica de Uber.
- **PostGIS / GiST / EPSG:4326:** Extensión espacial para PostgreSQL, índice *Generalized Search Tree* y sistema de coordenadas WGS84.
- **ConvexHull:** Polígono envolvente convexo mínimo de un conjunto de geometrías.
- **NRT:** *Near Real-Time* (Detecciones satelitales disponibles entre 1 y 3 horas tras la pasada orbital).

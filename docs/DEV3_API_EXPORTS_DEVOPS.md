# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 3: Backend API, Export Services & DevOps

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** API Architect, Export Services & DevOps Lead (FastAPI REST Endpoints, Generación de Reportes, Despliegue Cloud y Soporte Frontend Externo)  
**Stack Principal:** Python 3.12, FastAPI, Pydantic v2, Docker, Docker Compose, Railway, ReportLab / WeasyPrint (Generación PDF), Pytest, Uvicorn  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el puente que conecta los datos y algoritmos con el mundo exterior y con el desarrollador del Frontend:
1. Construir la **API RESTful de alto rendimiento con FastAPI** conforme a la especificación de `docs/API_CONTRACTS.md` y `docs/openapi.yml`.
2. Integrar los algoritmos de **Dev 2** y las consultas espaciales de **Dev 1** en endpoints rápidos con serialización GeoJSON.
3. Desarrollar el módulo de **exportación de datos** (GeoJSON, CSV y un **Reporte Ejecutivo PDF** descargable con métricas clave de la Chiquitanía para autoridades y bomberos).
4. Configurar la infraestructura contenerizada (**Docker Compose**) y liderar el **despliegue continuo en la nube (Railway)** con URLs públicas HTTPS.
5. Ser el punto de contacto técnico para el **desarrollador externo del Frontend**, habilitando CORS, documentación interactiva Swagger (`/docs`) y datos de prueba.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Instalar dependencias de API, testing y generación de documentos:**
   ```bash
   cd c:\NASASPACE2026\PyrosHarmonizers1
   .\venv\Scripts\Activate.ps1
   pip install fastapi uvicorn[standard] pydantic pydantic-settings reportlab fpdf2 pytest httpx
   ```
2. **Probar servidor local FastAPI:**
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   # Abrir en el navegador: http://localhost:8000/docs
   ```
3. **Configurar cuenta y proyecto en Railway:**
   - Crear proyecto en [Railway.app](https://railway.app/).
   - Aprovisionar plugin de PostgreSQL + PostGIS o vincular el Dockerfile del backend.

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #3.1: [Task][P0] Dockerización Completa y Despliegue en Producción (Railway)
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 1 (H 01–04)
* **Rama Git:** `feature/api-devops-deployment`
* **Dependencias:** Ninguna (Fase 0/1)
* **Descripción:** Asegurar que el entorno sea 100% reproducible y desplegar la API en producción desde las primeras horas del hackathon.
  - Crear `docker-compose.yml` en la raíz del proyecto para orquestar `postgis` y `backend`.
  - Crear `backend/Dockerfile` multi-stage optimizado para Python 3.12 y Uvicorn.
  - Conectar el repositorio de GitHub con Railway para despliegue automático tras cada push a `main`.
* **Criterios de Aceptación:**
  - [ ] `docker compose up --build` levanta todo el backend localmente sin errores.
  - [ ] URL pública de producción en Railway funcionando con HTTPS (ejemplo: `https://pyrosharmonizer-api.up.railway.app/docs`).
  - [ ] Configuración CORS abierta (`allow_origins=["*"]`) para que el frontend externo pueda consumir la API desde Vercel o localhost sin bloqueos.
  - [ ] Pipeline de CI en `.github/workflows/ci.yml` ejecutando linters y tests unitarios.
* **Archivos a crear/modificar:**
  - `docker-compose.yml`
  - `backend/Dockerfile`
  - `backend/app/main.py`
  - `.github/workflows/ci.yml`

---

### 📌 Ticket #3.2: [Feature][P0] Implementación de Endpoints REST de Hotspots y Comparación
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 2 (H 04–08)
* **Rama Git:** `feature/api-hotspot-endpoints`
* **Dependencias:** Ticket #1.1 de Dev 1
* **Descripción:** Crear los endpoints de consulta de focos crudos según `docs/API_CONTRACTS.md`:
  - `GET /api/v1/hotspots/modis`: Filtros `bbox`, `date_start`, `date_end`, `confidence_min`, `daynight`, paginación (`limit`, `offset`).
  - `GET /api/v1/hotspots/viirs`: Mismos filtros + `bright_ti4_min`.
  - `GET /api/v1/hotspots/compare`: Retorna el resumen comparativo (conteo y FRP de MODIS vs VIIRS por mes/año).
* **Criterios de Aceptación:**
  - [ ] Validación de esquemas y tipos con Pydantic v2.
  - [ ] Soporte para retornar GeoJSON FeatureCollection cuando el cliente lo solicite.
  - [ ] Tiempos de respuesta menores a 500 ms con consultas optimizadas con Bounding Box.
  - [ ] Endpoint `/health` con estado de la conexión a la base de datos y versión.
* **Archivos a crear/modificar:**
  - `backend/app/api/hotspots.py`
  - `backend/app/schemas/hotspot.py`
  - `backend/app/schemas/common.py`

---

### 📌 Ticket #3.3: [Feature][P0] Endpoints de Eventos Armonizados, Calendario y Grillas H3
* **Prioridad:** `P0-critical` | **Estimación:** 5h | **Fase:** Fase 3 (H 08–13)
* **Rama Git:** `feature/api-harmonized-endpoints`
* **Dependencias:** Tickets de Dev 2 (#2.2, #2.3, #2.4)
* **Descripción:** Conectar el motor de Dev 2 para exponer los datos armonizados que consumirá el frontend:
  - `GET /api/v1/harmonized/events`: Devuelve los polígonos de incendios unificados generados con ST-DBSCAN y calibrados con HFII.
  - `GET /api/v1/harmonized/h3`: Devuelve los hexágonos H3 con presencia binaria y densidad de FRP/km².
  - `GET /api/v1/calendar/heatmap`: Devuelve la matriz (Meses vs Años 2000–2026) con niveles de alerta y anomalías ($Z\text{-score} > 2$).
  - `GET /api/v1/calendar/timeline`: Series de tiempo para graficar MODIS vs VIIRS vs PyrosHarmonizer.
* **Criterios de Aceptación:**
  - [ ] Endpoints implementados con documentación clara en Swagger UI (`/docs`).
  - [ ] Formato GeoJSON válido para consumo directo en Mapbox GL o Leaflet del frontend.
  - [ ] Agregaciones de calendario instantáneas mediante consultas SQL o caché en memoria.
* **Archivos a crear/modificar:**
  - `backend/app/api/harmonized.py`
  - `backend/app/api/calendar.py`
  - `backend/app/schemas/harmonized.py`

---

### 📌 Ticket #3.4: [Feature][P0] Servicio de Exportación de Datos (GeoJSON, CSV y Reporte PDF)
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 4 (H 24–28)
* **Rama Git:** `feature/export-services`
* **Dependencias:** Ticket #3.3
* **Descripción:** Implementar los servicios de exportación de inteligencia territorial para brigadas de bomberos y gobernaciones:
  - `GET /api/v1/export/geojson`: Descarga directa del archivo `.geojson` con los polígonos armonizados del filtro actual (compatible con QGIS y ArcGIS).
  - `GET /api/v1/export/csv`: Descarga de archivo `.csv` tabulado con fechas, coordenadas, área en hectáreas y score HFII.
  - `POST /api/v1/export/pdf`: Generador en el backend de un **Reporte Ejecutivo Oficial** en formato PDF de 1 a 2 páginas:
    - Encabezado: "NASA Space Apps Challenge 2026 — PyrosHarmonizer Executive Report".
    - Resumen del área: Municipio/Región evaluada (Chiquitanía).
    - Métricas: Total de eventos armonizados, hectáreas afectadas, mes pico histórico y alerta actual.
    - Gráfico embebido de la serie temporal comparativa (evidenciando el aplanamiento del salto de 2012).
* **Criterios de Aceptación:**
  - [ ] Generación de PDF en menos de 2 segundos mediante `ReportLab` o `FPDF2`.
  - [ ] Headers HTTP correctos para descarga de archivos (`Content-Disposition: attachment; filename=...`).
  - [ ] Archivos GeoJSON validados en [geojson.io](https://geojson.io).
* **Archivos a crear/modificar:**
  - `backend/app/api/export.py`
  - `backend/app/services/export/pdf_generator.py`
  - `backend/app/services/export/csv_exporter.py`

---

### 📌 Ticket #3.5: [Integration][P0] Suite de Pruebas Automatizadas y Soporte al Frontend Externo
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 5 (H 36–39)
* **Rama Git:** `feature/testing-frontend-support`
* **Dependencias:** Todo el backend integrado
* **Descripción:** Garantizar la estabilidad del sistema antes de la presentación final:
  - Desarrollar suite de tests de integración con `pytest` y `TestClient` de FastAPI.
  - Probar la concurrencia y velocidad de respuesta de las consultas espaciales con más de 100,000 registros.
  - Proporcionar al desarrollador del Frontend un archivo de prueba Postman / Insomnia o script de ejemplo en JavaScript para consumir la API.
* **Criterios de Aceptación:**
  - [ ] Cobertura de tests $> 75\%$ sobre los endpoints principales en `tests/test_api_endpoints.py`.
  - [ ] Endpoint `/docs` documentado con ejemplos claros de request y response JSON.
  - [ ] Verificación de que el Frontend externo consume la API de Railway en vivo sin errores de CORS o tipos.
* **Archivos a crear/modificar:**
  - `backend/tests/test_api_endpoints.py`
  - `backend/tests/conftest.py`

---

## 🤝 4. Interacción con los Otros Desarrolladores y Frontend Externo

* **Con DEV 1 (Data Engineer):**
  - Dev 1 te entrega los modelos de base de datos y las sesiones de PostGIS. Tú expones sus queries a través de FastAPI.
* **Con DEV 2 (Algoritmos):**
  - Dev 2 te entrega los módulos Python del motor (`stdbscan.py`, `frp_calibration.py`, `evaluate_chiquitania.py`). Tú los encapsulas en endpoints y en el generador del reporte PDF.
* **Con el Desarrollador Externo del FRONTEND:**
  - Eres su contacto técnico principal: compártele la URL pública de Swagger (`https://tu-api.railway.app/docs`).
  - Asegúrate de habilitar CORS y mantener estricta consistencia con `docs/API_CONTRACTS.md`.

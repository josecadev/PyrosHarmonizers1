# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 4: Frontend Data Viz, Integración & DevOps

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Frontend Data Viz, Integración & DevOps Lead (Calendario de Quemas, Gráficos Analíticos, Exportación y Despliegue Cloud)  
**Stack Principal:** React 18 / Next.js 14, Recharts, Plotly.js / D3-scale, Docker, Docker Compose, Railway, Vercel, GitHub Actions  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el responsable de que el proyecto funcione en la nube, se comunique entre capas y entregue la inteligencia temporal clave:
1. Asegurar la infraestructura contenerizada local con **Docker Compose** y desplegar el sistema en producción (**Railway** para Backend/DB y **Vercel** para Frontend).
2. Construir el **Burning Activity Calendar (Calendario de Actividad de Quemas)**: una matriz interactiva tipo mapa de calor (meses vs. años 2000–2026) que revele la estacionalidad de incendios y chaqueos en Santa Cruz.
3. Crear los gráficos analíticos de series temporales multi-anuales que demuestren científicamente el "Efecto 2012".
4. Desarrollar el módulo de exportación de datos en formatos estándar (**GeoJSON**, **CSV** y **Reporte Ejecutivo PDF**).
5. Liderar la producción de los entregables del hackathon: video de 30s y pitch deck de 7 slides.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Configurar Docker Compose en la raíz del proyecto (`docker-compose.yml`):**
   ```yaml
   version: '3.8'
   services:
     postgis:
       image: postgis/postgis:16-3.4
       container_name: pyros_postgis
       environment:
         POSTGRES_USER: pyros_user
         POSTGRES_PASSWORD: pyros_password
         POSTGRES_DB: pyrosharmonizer_db
       ports:
         - "5432:5432"
       volumes:
         - pgdata:/var/lib/postgresql/data

     backend:
       build: ./backend
       container_name: pyros_backend
       ports:
         - "8000:8000"
       environment:
         DATABASE_URL: postgresql://pyros_user:pyros_password@postgis:5432/pyrosharmonizer_db
       depends_on:
         - postgis

   volumes:
     pgdata:
   ```
2. **Instalar librerías de visualización en el frontend:**
   ```bash
   cd frontend
   npm install recharts d3-scale date-fns jspdf html2canvas @react-pdf/renderer
   ```
3. **Configurar cuentas de despliegue:**
   - Crear proyecto en [Railway.app](https://railway.app/) para alojar PostgreSQL y FastAPI.
   - Conectar el repositorio de GitHub a [Vercel.com](https://vercel.com/) para el despliegue continuo de Next.js.

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #4.1: [Task][P0] Dockerización y Despliegue Continuo (Railway + Vercel)
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 1 (H 01–04)
* **Rama Git:** `feature/devops-docker-deploy`
* **Dependencias:** Ninguna (Fase 0/1)
* **Descripción:** Asegurar que cualquier miembro del equipo pueda levantar todo el sistema con un solo comando `docker compose up --build` y configurar los entornos de despliegue en la nube desde el primer día.
* **Criterios de Aceptación:**
  - [ ] `docker-compose.yml` funcional con healthcheck en PostgreSQL.
  - [ ] `backend/Dockerfile` optimizado con Python 3.12 slim y Uvicorn.
  - [ ] Despliegue de staging en Railway funcionando con base de datos PostGIS accesible.
  - [ ] Despliegue de frontend en Vercel con URL pública HTTPS lista para compartir.
  - [ ] GitHub Actions configurado en `.github/workflows/ci.yml` para correr linters y pruebas.
* **Archivos a crear/modificar:**
  - `docker-compose.yml`
  - `backend/Dockerfile`
  - `.github/workflows/ci.yml`
  - `.env.example`

---

### 📌 Ticket #4.2: [Feature][P0] Componente "Calendario de Actividad de Quemas" (Burning Activity Calendar)
* **Prioridad:** `P0-critical` | **Estimación:** 5h | **Fase:** Fase 2 (H 04–09)
* **Rama Git:** `feature/burning-activity-calendar`
* **Dependencias:** Ticket #3.1
* **Descripción:** Diseñar y construir el tablero visual del reto: una matriz interactiva (Meses vs. Años desde 2000 hasta 2026):
  - Cada celda representa un mes o semana y su color varía según la intensidad del fuego (promedio de HFII o hectáreas quemadas).
  - Permite visualizar con total claridad el ciclo anual de quemas en Bolivia (pico crítico en agosto-octubre) a lo largo de 25 años continuos.
  - Resaltar celdas con anomalías climáticas históricas ($Z\text{-score} > 2$, como los mega-incendios de 2019 y 2024 en la Chiquitanía).
* **Criterios de Aceptación:**
  - [ ] Matriz interactiva estilizada con Tailwind y CSS Grid / SVG.
  - [ ] Tooltip detallado al pasar el ratón: Año, Mes, Eventos Armonizados, FRP acumulado, Categoría de Alerta.
  - [ ] Interacción con el mapa: al hacer click en un año/mes específico, actualiza el filtro global del mapa de Dev 3.
  - [ ] Selector por ecorregión o municipio (Bosque Chiquitano, Pantanal, Amazonía).
* **Archivos a crear/modificar:**
  - `frontend/src/components/Calendar/BurningCalendar.tsx`
  - `frontend/src/components/Calendar/AnomalyAlert.tsx`
  - `frontend/src/app/calendar/page.tsx`

---

### 📌 Ticket #4.3: [Feature][P0] Gráficos de Series Temporales: Evidencia del "Efecto 2012"
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 3 (H 09–13)
* **Rama Git:** `feature/timeline-charts`
* **Dependencias:** Ticket #4.2
* **Descripción:** Construir los gráficos analíticos con Recharts que acompañan al calendario:
  - **Gráfico Comparativo Multi-Anual:**
    - Curva A (Azul): MODIS crudo (2000–2026).
    - Curva B (Verde): VIIRS crudo (2012–2026).
    - Curva C (Rojo punteado): Suma cruda no armonizada (muestra el salto artificial y el sobreconteo).
    - Curva D (Naranja sólido): PyrosHarmonizer HFII (curva estandarizada y continua).
  - Marcador vertical en 2012 explicando la transición de satélites.
* **Criterios de Aceptación:**
  - [ ] Gráfico responsivo con leyendas interactivas y zoom temporal.
  - [ ] Métricas resumen en tarjetas tipo KPI: "% de duplicados eliminados", "Correlación inter-sensor", "Hectáreas reales armonizadas".
* **Archivos a crear/modificar:**
  - `frontend/src/components/Charts/FRPChart.tsx`
  - `frontend/src/components/Charts/SensorComparison.tsx`
  - `frontend/src/components/Charts/KPICards.tsx`

---

### 📌 Ticket #4.4: [Feature][P1] Módulo de Exportación Geoespacial y Reportes PDF
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 4 (H 24–27)
* **Rama Git:** `feature/export-module`
* **Dependencias:** Ticket #1.4
* **Descripción:** Construir el panel de exportación para que guardaparques, bomberos y científicos descarguen la información armonizada:
  - **Exportar GeoJSON:** Polígonos de eventos armonizados listos para abrir en QGIS o ArcGIS.
  - **Exportar CSV:** Tabla normalizada con fechas, municipios, HFII y área afectada.
  - **Generar Reporte PDF Ejecutivo:** Un documento resumen de 1 página con el mapa del área, gráfico del régimen de fuegos y tabla de anomalías detectadas.
* **Criterios de Aceptación:**
  - [ ] Descargas instantáneas en el cliente sin bloquear la interfaz.
  - [ ] PDF con diseño profesional, membrete de NASA Space Apps 2026 y métricas clave de la Chiquitanía.
* **Archivos a crear/modificar:**
  - `frontend/src/components/Export/ExportPanel.tsx`
  - `frontend/src/utils/pdfGenerator.ts`

---

### 📌 Ticket #4.5: [Pitch][P0] Coordinación de Entregables: Pitch Deck (7 slides) y Video (30s)
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 5 (H 36–42)
* **Rama Git:** `docs/pitch`
* **Dependencias:** Todo el sistema integrado
* **Descripción:** Asegurar que los entregables oficiales cumplan estrictamente las reglas del reto:
  1. **Pitch Deck (Máximo 7 diapositivas):**
     - Slide 1: Portada (PyrosHarmonizer, Reto 8, UCB Santa Cruz).
     - Slide 2: El Problema (Discrepancia MODIS vs VIIRS y el Efecto 2012).
     - Slide 3: Caso Local (Impacto en la Chiquitanía y Amazonía boliviana).
     - Slide 4: La Solución Técnica (ST-DBSCAN + Calibración HFII + H3).
     - Slide 5: Demostración del Software (Split-Screen y Calendario de Quemas).
     - Slide 6: Arquitectura y Uso de Recursos NASA (FIRMS LANCE).
     - Slide 7: Impacto, Conclusión y Equipo.
  2. **Video de 30 Segundos:**
     - Grabación fluida de la pantalla mostrando la vista Split-Screen, el mapa interactivo y el Calendario de Quemas. Subtítulos claros en inglés/español.
  3. **Envío oficial en `spaceappschallenge.org`:**
     - Enlace a Vercel en vivo, enlace a GitHub público y formulario completado.
* **Criterios de Aceptación:**
  - [ ] PDF del Pitch Deck finalizado en `docs/pitch_deck_pyrosharmonizer.pdf`.
  - [ ] Video de 30s exportado en formato MP4 1080p.
  - [ ] Formulario de entrega de NASA Space Apps verificado y enviado antes del cierre.
* **Archivos a crear/modificar:**
  - `docs/PITCH_DECK_OUTLINE.md`
  - `README.md` (sección de créditos y links de demo)

---

## 🤝 4. Interacción con el Resto del Equipo

* **Con DEV 1 (Backend):**
  - Define las variables de entorno para producción en Railway (`DATABASE_URL`, `CORS_ORIGINS`).
  - Solicita el endpoint `/api/v1/calendar/heatmap` para conectar la matriz visual con datos reales.
* **Con DEV 2 (Algoritmos):**
  - Pídele las estadísticas y coeficientes de calibración para colocarlos en los textos explicativos y en las diapositivas del pitch.
* **Con DEV 3 (Frontend Mapas):**
  - Integra tu componente `BurningCalendar` en la barra inferior o en la pestaña `/calendar` de la aplicación de Dev 3.
  - Haz que el click en el calendario comunique el estado de filtro al mapa de Dev 3.

# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 3: Lead Frontend & Map Specialist

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Lead Frontend & Map Specialist (Arquitectura Web, Visualización Cartográfica por GPU y UI/UX)  
**Stack Principal:** React 18, Next.js 14 (App Router), TypeScript, Tailwind CSS, Mapbox GL JS, Deck.gl, Lucide React  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el responsable de la cara visual y la experiencia cartográfica de PyrosHarmonizer:
1. Diseñar y construir una interfaz web moderna, oscura (*Dark Sci-Fi / NASA Theme*), fluida y responsiva.
2. Integrar **Mapbox GL JS** con **Deck.gl** para renderizar por GPU decenas de miles de puntos y polígonos sin congelar el navegador.
3. Crear el panel interactivo de control de capas para alternar entre MODIS crudo, VIIRS crudo, eventos armonizados y grillas hexagonales H3.
4. Desarrollar la **vista de pantalla dividida (Split-Screen / Swipe Map)**, que será el gancho visual principal durante el pitch.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Crear e inicializar el proyecto Next.js en la carpeta `frontend/`:**
   ```bash
   cd c:\NASASPACE2026\PyrosHarmonizers1
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   ```
2. **Instalar dependencias cartográficas y de componentes:**
   ```bash
   cd frontend
   npm install mapbox-gl @deck.gl/core @deck.gl/layers @deck.gl/geo-layers @deck.gl/mapbox
   npm install lucide-react clsx tailwind-merge axios
   npm install --save-dev @types/mapbox-gl
   ```
3. **Configurar token de Mapbox:**
   - Crear archivo `frontend/.env.local`:
     ```env
     NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6InlvdXItdG9rZW4ifQ...
     NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
     ```
   - *(Tip: Si no tienes token de Mapbox, puedes usar estilos libres de CartoDB o OpenStreetMap via MapLibre GL).*

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #3.1: [Task][P0] Scaffolding de Next.js, Tailwind y Layout Principal
* **Prioridad:** `P0-critical` | **Estimación:** 2h | **Fase:** Fase 1 (H 02–04)
* **Rama Git:** `feature/frontend-shell-layout`
* **Dependencias:** Ninguna
* **Descripción:** Construir el esqueleto de la aplicación web:
  - Header con logotipo de PyrosHarmonizer, badge oficial "NASA Space Apps Challenge 2026" y selector de región (Bolivia / Santa Cruz / Chiquitanía).
  - Contenedor principal de pantalla completa (100vh) para el mapa interactivo.
  - Sidebar lateral colapsable para controles de filtros, leyendas y métricas rápidas.
* **Criterios de Aceptación:**
  - [ ] Interfaz estilizada en paleta oscura (`bg-slate-950`, acentos en naranja/rojo fuego `#f97316`, `#ef4444`).
  - [ ] Navegación entre vistas: `/map` (Visor Cartográfico), `/calendar` (Calendario de Quemas) y `/compare` (Split-Screen).
  - [ ] Componente Header y Sidebar completamente responsivos.
* **Archivos a crear/modificar:**
  - `frontend/src/app/layout.tsx`
  - `frontend/src/app/page.tsx`
  - `frontend/src/components/Layout/Header.tsx`
  - `frontend/src/components/Layout/Sidebar.tsx`

---

### 📌 Ticket #3.2: [Feature][P0] Motor Cartográfico Mapbox GL JS + Deck.gl (Aceleración GPU)
* **Prioridad:** `P0-critical` | **Estimación:** 5h | **Fase:** Fase 2 (H 04–09)
* **Rama Git:** `feature/map-engine-deckgl`
* **Dependencias:** Ticket #3.1
* **Descripción:** Implementar el visor de mapas con aceleración por WebGL utilizando Deck.gl integrado en Mapbox GL JS.
  - El mapa debe centrarse en el departamento de Santa Cruz, Bolivia (`center: [-60.7, -16.8]`, zoom inicial 6.5).
  - Renderizar capas de puntos de alta densidad con `ScatterplotLayer` y huellas poligonales con `GeoJsonLayer`.
* **Criterios de Aceptación:**
  - [ ] Capacidad de renderizar más de 30,000 puntos térmicos a 60 FPS sin retraso de interacción.
  - [ ] Escala de color por intensidad térmica (FRP / HFII): de amarillo ($< 20\text{ MW}$) a naranja ($20-100\text{ MW}$) y rojo intenso ($> 100\text{ MW}$).
  - [ ] Popup interactivo al hacer click o hover sobre cualquier foco o polígono mostrando:
    - Sensor (`MODIS Terra/Aqua` vs `VIIRS SNPP/NOAA20`).
    - Fecha y Hora UTC.
    - Energía FRP vs Índice Armonizado HFII.
    - Confianza de la detección.
* **Archivos a crear/modificar:**
  - `frontend/src/components/Map/FireMap.tsx`
  - `frontend/src/components/Map/HotspotPopup.tsx`
  - `frontend/src/components/Map/deckgl-layers.ts`

---

### 📌 Ticket #3.3: [Feature][P0] Panel de Control de Capas y Filtros Temporales
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 3 (H 09–13)
* **Rama Git:** `feature/layer-toggle-controls`
* **Dependencias:** Ticket #3.2
* **Descripción:** Crear el panel flotante de conmutación de capas para comparar los datos satelitales:
  1. **Capa 1:** Detecciones Crudas MODIS (puntos de 1 km).
  2. **Capa 2:** Detecciones Crudas VIIRS (puntos de 375 m).
  3. **Capa 3 (PyrosHarmonizer):** Polígonos Armonizados (fusión espacio-temporal).
  4. **Capa 4:** Grillas Hexagonales H3 (densidad de fuego por hexágono).
* **Criterios de Aceptación:**
  - [ ] Switches o checkboxes que activan y desactivan capas instantáneamente.
  - [ ] Barra deslizante temporal (*Time Slider*) para animar o filtrar por día/mes/año.
  - [ ] Selector Día / Noche para filtrar detecciones con reflejo solar vs pasadas nocturnas de alta sensibilidad.
* **Archivos a crear/modificar:**
  - `frontend/src/components/Map/LayerToggle.tsx`
  - `frontend/src/components/Map/TimeSlider.tsx`
  - `frontend/src/hooks/useHotspots.ts`

---

### 📌 Ticket #3.4: [Feature][P0] Vista Split-Screen / Swipe Map ("El Efecto 2012")
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 4 (H 24–28)
* **Rama Git:** `feature/split-screen-comparison`
* **Dependencias:** Ticket #3.3
* **Descripción:** Crear el componente visual más impactante para la presentación del equipo:
  - Una vista de mapa con cortina deslizante central (*swipe slider*):
    - **Lado Izquierdo (Datos Crudos):** Muestra el desorden y sobre-conteo de juntar MODIS y VIIRS sin armonizar (múltiples puntos superpuestos sobre un mismo incendio).
    - **Lado Derecho (PyrosHarmonizer):** Muestra los polígonos limpios, deduplicados y con energía HFII calibrada.
  - Marcadores numéricos en pantalla: "Puntos crudos: 3,450" vs "Eventos reales: 720".
* **Criterios de Aceptación:**
  - [ ] Controlador deslizante interactivo sincronizado en zoom y paneo.
  - [ ] Banner superior que explica claramente el "Efecto 2012 en la Chiquitanía".
  - [ ] Botón de captura o modo pantalla completa listo para el video demostrativo de 30 segundos.
* **Archivos a crear/modificar:**
  - `frontend/src/components/Map/SplitScreenMap.tsx`
  - `frontend/src/app/compare/page.tsx`

---

## 🤝 4. Interacción con el Resto del Equipo

* **Con DEV 1 (Backend):**
  - Conéctate a sus endpoints `GET /api/v1/hotspots/modis`, `/viirs` y `/harmonized/events`.
  - Mientras Dev 1 termina la base de datos, utiliza datos simulados en formato GeoJSON (`frontend/src/data/mock-hotspots.json`) para avanzar sin bloqueos.
* **Con DEV 2 (Algoritmos):**
  - Valida con Dev 2 cómo se estructuran las propiedades de los polígonos de `ConvexHull` y las celdas H3 para colorearlas adecuadamente.
* **Con DEV 4 (Data Viz & DevOps):**
  - Dev 4 te proveerá el componente del Calendario de Quemas para incrustarlo en la aplicación. Asegúrate de sincronizar la paleta de colores y temas Tailwind.

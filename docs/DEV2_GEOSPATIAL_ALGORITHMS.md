# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 2: Geospatial & Algorithm Specialist

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Geospatial & Algorithm Specialist (Modelado Científico, ST-DBSCAN, Calibración HFII y Grillas H3)  
**Stack Principal:** Python 3.12, GeoPandas, Shapely, Scikit-Learn, PySAL, Uber H3 (`h3-py`), NumPy, SciPy  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el cerebro científico y algorítmico de PyrosHarmonizer:
1. Eliminar la discrepancia dimensional entre el píxel de MODIS ($1\text{ km} \times 1\text{ km}$) y el píxel de VIIRS ($375\text{ m} \times 375\text{ m}$).
2. Implementar el algoritmo de agrupamiento espacio-temporal adaptativo (**ST-DBSCAN**) y la fusión poligonal (*ConvexHull*).
3. Construir la fórmula de calibración de potencia radiativa del fuego (**FRP**) que genera el **Índice Armonizado de Intensidad de Fuego (HFII)**.
4. Implementar la alternativa de teselación jerárquica con **Uber H3** (resolución 7 y 8).
5. Documentar el rigor matemático para el pitch ante los jueces de la NASA.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Instalar dependencias científicas en tu entorno virtual:**
   ```bash
   pip install geopandas shapely scikit-learn h3 numpy scipy matplotlib pytest
   ```
2. **Validar instalación de H3 y librerías espaciales:**
   ```python
   # Script rápido de prueba: test_env.py
   import h3
   from shapely.geometry import Point, Polygon
   from sklearn.cluster import DBSCAN

   print("H3 Version:", h3.__version__)
   idx = h3.latlng_to_cell(-17.8, -63.2, 7)
   print("Test H3 Index:", idx)
   ```
3. **Descargar / Solicitar a Dev 1 muestra de datos CSV:**
   - Ubicación: `backend/data/sample_modis.csv` y `backend/data/sample_viirs.csv` (Área de Santa Cruz / Chiquitanía).

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #2.1: [Feature][P0] Filtro de Calidad y Reconstrucción Geométrica Real ($scan \times track$)
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 1 (H 02–05)
* **Rama Git:** `feature/pixel-geometry-quality`
* **Dependencias:** Ninguna (puede desarrollarse con CSV local)
* **Descripción:** 
  - Un error común en hackathons es modelar focos de calor como puntos adimensionales.
  - Diseñar la función matemática que toma las columnas `scan` y `track` de cada detección satelital para proyectar el polígono real del píxel:
    - En el nadir, MODIS mide $1.0\text{ km} \times 1.0\text{ km}$, pero en los extremos de la franja orbital (*edge-of-swath*) se deforma hasta casi $2.0\text{ km} \times 4.8\text{ km}$.
    - VIIRS mantiene una huella mucho más uniforme de $375\text{ m} \times 375\text{ m}$.
  - Implementar filtro de calidad: descartar `confidence < 30` en MODIS y `"low"` en VIIRS. Descartar anomalías estáticas (pozos de gas/volcanes).
* **Criterios de Aceptación:**
  - [ ] Función `calculate_pixel_polygon(lat, lon, scan, track, satellite_azimuth=0)` que retorna un `Polygon` de Shapely.
  - [ ] Cálculo del área real del píxel: $Area = scan \times track\text{ [km}^2\text{]}$.
  - [ ] Filtro de calidad que elimina falsos positivos y ruido térmico.
  - [ ] Tests en `tests/test_pixel_geometry.py` verificando dimensiones en nadir vs borde.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/quality_filter.py`
  - `backend/app/services/harmonization/pixel_geometry.py`
  - `tests/test_pixel_geometry.py`

---

### 📌 Ticket #2.2: [Feature][P0] Algoritmo de Agrupamiento Espacio-Temporal ST-DBSCAN
* **Prioridad:** `P0-critical` | **Estimación:** 5h | **Fase:** Fase 2 (H 05–10)
* **Rama Git:** `feature/st-dbscan-clustering`
* **Dependencias:** Ticket #2.1
* **Descripción:** Implementar el algoritmo ST-DBSCAN que agrupa detecciones de MODIS y VIIRS que corresponden al mismo frente de fuego.
  - **Parámetro espacial ($eps_s$):** $500\text{ m} - 1000\text{ m}$ (equivalente al radio del píxel MODIS).
  - **Parámetro temporal ($eps_t$):** $\Delta t \le 3\text{ a }4\text{ horas}$ (ventana de desfase orbital entre Aqua/Terra y SNPP/NOAA).
  - **Fusión Poligonal:** Para cada cluster formado, generar la huella envolvente unificada mediante `ConvexHull` o unión de polígonos de píxeles.
* **Criterios de Aceptación:**
  - [ ] Clase `SpatiotemporalDBSCAN` capaz de procesar DataFrames con coordenadas y timestamps.
  - [ ] Agrupamiento exitoso: 1 píxel de MODIS + 4 píxeles de VIIRS en la misma zona se consolidan en 1 solo evento armonizado.
  - [ ] Soporte para eventos de un solo sensor: MODIS pre-2012 o VIIRS solo (fuego pequeño no detectado por MODIS).
  - [ ] Exportación del cluster como polígono GeoJSON unificado con centroide y área total en hectáreas.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/stdbscan.py`
  - `backend/app/services/harmonization/polygon_fusion.py`
  - `tests/test_stdbscan_clustering.py`

---

### 📌 Ticket #2.3: [Feature][P0] Modelo de Calibración Energética FRP $\rightarrow$ HFII
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 2 (H 10–14)
* **Rama Git:** `feature/frp-calibration-hfii`
* **Dependencias:** Ticket #2.2
* **Descripción:** 
  - La suma directa de FRP de múltiples píxeles de VIIRS sobreestima la energía respecto a la serie histórica de MODIS.
  - Desarrollar la función de regresión y calibración para generar el **Harmonized Fire Intensity Index (HFII)**:
    $$HFII = w_{daynight} \times \left( \alpha \sum FRP_{VIIRS} + \beta FRP_{MODIS} \right) \times \frac{Area_{ref}}{Area_{real}}$$
  - Ajustar ponderación día/noche: en pasadas nocturnas VIIRS tiene sensibilidad extrema.
* **Criterios de Aceptación:**
  - [ ] Ecuación calibrada con coeficientes documentados y justificados.
  - [ ] La serie temporal de HFII (2000-2026) elimina el salto artificial abrupto de 2012 en Chiquitanía.
  - [ ] Tests unitarios en `tests/test_frp_calibration.py`.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/frp_calibration.py`
  - `tests/test_frp_calibration.py`

---

### 📌 Ticket #2.4: [Feature][P1] Motor de Teselación Hexagonal Uber H3
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 3 (H 14–18)
* **Rama Git:** `feature/uber-h3-gridding`
* **Dependencias:** Ticket #2.1
* **Descripción:** Implementar la Alternativa 2 del documento maestro: discretización del espacio en hexágonos Uber H3:
  - **Resolución 7:** $5.16\text{ km}^2$ (visión regional/departamental).
  - **Resolución 8:** $0.73\text{ km}^2$ (resolución equiparable a MODIS).
  - Medir fuego como: "Presencia binaria de celda activa" y "Densidad de energía FRP/km²".
* **Criterios de Aceptación:**
  - [ ] Función que asigna `h3_index` a cualquier latitud/longitud en microsegundos.
  - [ ] Agregador diario por celda H3 que neutraliza el conteo múltiple de puntos.
  - [ ] Salida formateada con coordenadas del polígono hexagonal para renderizado directo en Deck.gl.
* **Archivos a crear/modificar:**
  - `backend/app/services/h3_grid/indexer.py`
  - `tests/test_h3_indexing.py`

---

### 📌 Ticket #2.5: [Data/Science][P1] Validación del Caso de Estudio: "El Efecto 2012 en la Chiquitanía"
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 4 (H 24–27)
* **Rama Git:** `feature/chiquitania-validation`
* **Dependencias:** Ticket #2.2, Ticket #2.3
* **Descripción:** Ejecutar el pipeline sobre datos reales de Santa Cruz (municipios de San Ignacio de Velasco, Roboré, San Matías y Charagua) entre 2010 y 2026. Generar las métricas de validación: reducción de duplicados, correlación pre y post 2012.
* **Criterios de Aceptación:**
  - [ ] Jupyter Notebook o script reproducible `scripts/validate_chiquitania.py`.
  - [ ] Gráfica comparativa de series de tiempo que demuestre el aplanamiento del salto de 2012.
  - [ ] Tabla de métricas lista para ser incluida en la presentación y pitch deck.
* **Archivos a crear/modificar:**
  - `backend/notebooks/chiquitania_case_study.ipynb`
  - `backend/scripts/validate_chiquitania.py`

---

## 🤝 4. Interacción con el Resto del Equipo

* **Con DEV 1 (Backend & DB):**
  - Empaqueta tu lógica en módulos limpios dentro de `backend/app/services/harmonization/`.
  - Dev 1 integrará tus funciones en las rutas de FastAPI. Asegúrate de que tus funciones acepten tanto DataFrames de Pandas como objetos GeoJSON / listas de diccionarios.
* **Con DEV 3 (Frontend Mapas):**
  - Explícale la estructura del polígono armonizado y los índices H3 para que configure las capas en Deck.gl.
* **Con DEV 4 (Data Viz & Pitch):**
  - Pásale las métricas del caso Chiquitanía para que arme las gráficas del pitch y el timeline comparativo.

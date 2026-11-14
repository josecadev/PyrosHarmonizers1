# 🧑‍💻 Manual de Trabajo y Asignación de Tickets — DEV 2: Core Harmonization Engine & Geospatial Science

**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Evento:** 2026 NASA International Space Apps Challenge — Sede UCB Santa Cruz  
**Reto:** #8 — Harmonization of MODIS and VIIRS Hot Spots  
**Rol:** Geospatial & Algorithm Specialist (Modelado Científico, ST-DBSCAN, Fusión Poligonal, Calibración HFII y Grillas H3)  
**Stack Principal:** Python 3.12, GeoPandas, Shapely, Scikit-Learn, PySAL, Uber H3 (`h3-py`), NumPy, SciPy  

---

## 🎯 1. Misión y Responsabilidades Principales

Eres el responsable de resolver el desafío científico central de la NASA:
1. Eliminar la incompatibilidad entre el píxel de MODIS ($1\text{ km}$) y el de VIIRS ($375\text{ m}$).
2. Proyectar la huella poligonal real del píxel a partir de sus parámetros orbitales $scan \times track$.
3. Implementar el algoritmo de agrupamiento espacio-temporal (**ST-DBSCAN**) y la fusión poligonal (*ConvexHull*) para unificar detecciones duplicadas sobre un mismo incendio.
4. Construir la fórmula de calibración de potencia radiativa (**FRP**) que genera el **Índice Armonizado de Intensidad de Fuego (HFII)**.
5. Implementar la alternativa de discretización por grillas hexagonales **Uber H3** (resolución 7 y 8).
6. Generar las métricas de validación científica del caso de estudio: *"El Efecto 2012 en la Chiquitanía"*.

---

## 🛠️ 2. Guía de Configuración Rápida (Hora 00 – 02)

1. **Instalar entorno científico:**
   ```bash
   cd c:\NASASPACE2026\PyrosHarmonizers1
   .\venv\Scripts\Activate.ps1
   pip install geopandas shapely scikit-learn h3 numpy scipy matplotlib pytest
   ```
2. **Validar funcionamiento de H3 y librerías geométricas:**
   ```python
   import h3
   from shapely.geometry import Point, Polygon
   from sklearn.cluster import DBSCAN

   print("H3 Version:", h3.__version__)
   idx = h3.latlng_to_cell(-17.8, -63.2, 7)
   print("Hexágono H3 en Santa Cruz:", idx)
   ```
3. **Solicitar a Dev 1:**
   - La muestra de datos CSV limpia (`backend/data/sample_chiquitania_2019_2024.csv`).

---

## 🎫 3. Backlog de Tickets y Tareas Detalladas

### 📌 Ticket #2.1: [Feature][P0] Reconstrucción Geométrica Real del Píxel ($scan \times track$)
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 1 (H 02–05)
* **Rama Git:** `feature/pixel-geometry-reconstruction`
* **Dependencias:** Ninguna (puede desarrollarse con CSV local)
* **Descripción:** 
  - La mayoría de los proyectos tratan los focos de calor como simples puntos, lo cual es físicamente incorrecto.
  - Implementar la función matemática que toma las columnas `scan` y `track` para construir el polígono rectangular real del píxel:
    - **MODIS:** Píxel nadir de $1.0\text{ km} \times 1.0\text{ km}$, deformándose en bordes de barrido hasta $2.0\text{ km} \times 4.8\text{ km}$.
    - **VIIRS:** Píxel nadir de $375\text{ m} \times 375\text{ m}$, manteniendo dimensiones mucho más constantes.
  - Calcular el área real de cada detección: $Area_{km^2} = scan \times track$.
* **Criterios de Aceptación:**
  - [ ] Función `create_pixel_footprint(lat, lon, scan, track)` que devuelve un `Polygon` de Shapely en EPSG:4326.
  - [ ] Corrección por ángulo cenital para evitar sesgos en el cálculo de densidad energética.
  - [ ] Tests en `tests/test_pixel_geometry.py` comparando áreas en nadir vs bordes.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/pixel_geometry.py`
  - `tests/test_pixel_geometry.py`

---

### 📌 Ticket #2.2: [Feature][P0] Motor de Agrupamiento Espacio-Temporal ST-DBSCAN
* **Prioridad:** `P0-critical` | **Estimación:** 5h | **Fase:** Fase 2 (H 05–10)
* **Rama Git:** `feature/st-dbscan-clustering`
* **Dependencias:** Ticket #2.1
* **Descripción:** Desarrollar el algoritmo de clustering espacio-temporal que empareja observaciones de MODIS y VIIRS sobre el mismo frente de fuego:
  - **Distancia espacial ($eps_s$):** $500\text{ m} - 1000\text{ m}$ (radio equivalente al píxel MODIS).
  - **Ventana temporal ($eps_t$):** $\Delta t \le 3\text{ a }4\text{ horas}$ (desfase de paso orbital entre satélites Terra/Aqua y Suomi-NPP/NOAA).
  - **Fusión Poligonal:** Para cada cluster formado, generar la huella envolvente del incendio mediante `ConvexHull` o unión de geometrías de píxel.
* **Criterios de Aceptación:**
  - [ ] Módulo `ST_DBSCAN` optimizado capaz de procesar 50,000 registros en $< 10\text{ segundos}$.
  - [ ] Casos de fusión soportados:
    1. Cluster mixto (1 MODIS + $N$ VIIRS) $\to$ 1 evento armonizado unificado.
    2. Detección aislada MODIS (pre-2012) $\to$ Conserva huella de 1 km.
    3. Detección aislada VIIRS (fuego incipiente o quema pequeña) $\to$ Conserva huella de 375 m.
  - [ ] Generación de atributos consolidados: centroide, fecha/hora de inicio, fecha/hora de fin, conteo de puntos y polígono envolvente.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/stdbscan.py`
  - `backend/app/services/harmonization/polygon_fusion.py`
  - `tests/test_stdbscan_clustering.py`

---

### 📌 Ticket #2.3: [Feature][P0] Calibración Radiométrica FRP $\rightarrow$ Índice Armonizado (HFII)
* **Prioridad:** `P0-critical` | **Estimación:** 4h | **Fase:** Fase 2 (H 10–14)
* **Rama Git:** `feature/frp-calibration-hfii`
* **Dependencias:** Ticket #2.2
* **Descripción:** 
  - Al detectar 3 a 5 píxeles de VIIRS sobre el mismo incendio que MODIS ve como 1 píxel, la suma bruta de FRP de VIIRS dispara artificialmente la energía total emitida.
  - Formular y calibrar el **Harmonized Fire Intensity Index (HFII)**:
    $$HFII = w_{daynight} \times \left( \alpha \sum FRP_{VIIRS} + \beta FRP_{MODIS} \right) \times \left(\frac{Area_{ref}}{Area_{real}}\right)$$
  - Ponderación día/noche: en pasadas nocturnas VIIRS no sufre reflejo solar y detecta fuegos de menor energía; ajustar el factor $w_{daynight}$ adecuadamente.
* **Criterios de Aceptación:**
  - [ ] Coeficientes $\alpha$ y $\beta$ determinados mediante regresión lineal/robusta contra la línea base de MODIS.
  - [ ] Cálculo de HFII continuo y comparable para el período 2000–2026.
  - [ ] Tests en `tests/test_frp_calibration.py`.
* **Archivos a crear/modificar:**
  - `backend/app/services/harmonization/frp_calibration.py`
  - `tests/test_frp_calibration.py`

---

### 📌 Ticket #2.4: [Feature][P1] Discretización y Mapeo en Grillas Hexagonales Uber H3
* **Prioridad:** `P1-high` | **Estimación:** 3h | **Fase:** Fase 3 (H 14–17)
* **Rama Git:** `feature/uber-h3-gridding`
* **Dependencias:** Ticket #2.1
* **Descripción:** Implementar la alternativa de hexágonos Uber H3:
  - **Nivel H3 Resolución 7:** Área aproximada de $5.16\text{ km}^2$.
  - **Nivel H3 Resolución 8:** Área aproximada de $0.73\text{ km}^2$ (equivalente al píxel de MODIS).
  - Asignar el índice alfanumérico H3 a cada foco de calor.
  - Calcular para cada día y celda: **presencia binaria de fuego** (Activa / Inactiva) y **densidad ponderada de FRP por $\text{km}^2$**.
* **Criterios de Aceptación:**
  - [ ] Módulo `H3GridProcessor` que genera agregaciones espaciales instantáneas.
  - [ ] Eliminación automática del sobreconteo de VIIRS al medir "celdas activas" en lugar de "cantidad de puntos".
  - [ ] Salida formateada con coordenadas del polígono hexagonal lista para serializarse en GeoJSON.
* **Archivos a crear/modificar:**
  - `backend/app/services/h3_grid/indexer.py`
  - `tests/test_h3_indexing.py`

---

### 📌 Ticket #2.5: [Science][P0] Estudio Cuantitativo: "El Efecto 2012 en la Chiquitanía"
* **Prioridad:** `P0-critical` | **Estimación:** 3h | **Fase:** Fase 4 (H 24–27)
* **Rama Git:** `feature/chiquitania-validation`
* **Dependencias:** Tickets #2.2, #2.3
* **Descripción:** Ejecutar el pipeline completo sobre el departamento de Santa Cruz (específicamente Chiquitanía: San Ignacio de Velasco, Roboré, Concepción, San Matías) comparando 2000–2026:
  - Cuantificar la sobrestimación de datos crudos vs datos armonizados.
  - Demostrar cómo PyrosHarmonizer aplana el salto de 2012 y recupera la tendencia climática real.
* **Criterios de Aceptación:**
  - [ ] Script analítico ejecutable `scripts/evaluate_chiquitania.py`.
  - [ ] Gráfico comparativo generado: "Datos Crudos (Salto Artificial 2012)" vs "PyrosHarmonizer (Serie Armonizada)".
  - [ ] Resumen de métricas científicas para que Dev 3 lo integre en el reporte PDF y en el pitch ante el jurado.
* **Archivos a crear/modificar:**
  - `backend/scripts/evaluate_chiquitania.py`
  - `backend/data/chiquitania_metrics.json`

---

## 🤝 4. Interacción con los Otros Desarrolladores

* **Con DEV 1 (Data Engineer):**
  - Solicita a Dev 1 los datos limpios en DataFrames de GeoPandas o tablas PostGIS.
  - Entrégale a Dev 1 los esquemas de salida de los eventos armonizados (`harmonized_fire_events`) para que queden guardados en la base de datos.
* **Con DEV 3 (API & DevOps):**
  - Dev 3 empaquetará tus funciones (`stdbscan.py`, `frp_calibration.py`, `indexer.py`) dentro de los endpoints de FastAPI y los servicios de exportación.
  - Provee a Dev 3 funciones con firmas claras y tipado estricto (Pydantic / Type Hints).

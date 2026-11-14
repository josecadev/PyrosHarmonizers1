# 🧪 Estrategia de Testing Integral — PyrosHarmonizer
**NASA International Space Apps Challenge 2026 — Sede Santa Cruz de la Sierra, Bolivia**  
**Reto #8:** Harmonization of MODIS and VIIRS Hot Spots  
**Proyecto:** PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar  
**Documento:** Plan y Estrategia de Aseguramiento de Calidad (QA) y Testing  
**Versión:** 1.0.0 (Release de Competencia de 48 Horas)  

---

## 1. 🎯 Filosofía de Testing (Enfoque Hackathon de 48h)

En un entorno de competencia de desarrollo intensivo de 48 horas como el NASA Space Apps Challenge, los enfoques tradicionales de testing exhaustivo (TDD estricto o 100% de cobertura en todos los componentes) conllevan el riesgo de ralentizar la entrega de valor. Sin embargo, en el reto de **Armonización de Focos Térmicos MODIS y VIIRS**, un fallo en el pipeline matemático o geoespacial destruye la validez científica del proyecto y descalifica la solución frente al jurado evaluador.

Nuestra filosofía de testing se rige por tres principios pragmáticos:

1. **"Test what breaks the science" (Probar lo que invalida la ciencia):**  
   La prioridad absoluta de testing automatizado está en el **núcleo de armonización**: eliminación de falsos positivos, clustering espacio-temporal (ST-DBSCAN), deformación de píxel ($scan \times track$), cálculo del Índice Armonizado de Intensidad de Fuego (HFII) y parseo temporal UTC. Un error aquí genera "el efecto 2012" inverso o clusters fantasmas.
2. **"Automate what saves pitch & demo time" (Automatizar lo que salva la demo en vivo):**  
   Los tests de integración aseguran que la ingesta de los datasets de FIRMS (CSV y API) y los endpoints críticos de FastAPI devuelvan estructuras GeoJSON y métricas analíticas válidas sin colapsar por excepciones `500 Internal Server Error`.
3. **"Verify visually what the user clicks" (Verificación visual rápida en UI):**  
   Para la interfaz (Next.js 14, Mapbox GL / Deck.gl, Recharts), se priorizan smoke tests manuales y validación visual rápida sobre tests E2E pesados, garantizando fluidez en los 30 segundos del video oficial y durante la ronda de preguntas técnicas del pitch.

### Matriz de Riesgo y Priorización de Pruebas

| Componente | Nivel de Riesgo | Criticidad | Estrategia de Prueba |
| :--- | :---: | :---: | :--- |
| **Algoritmo ST-DBSCAN** | Crítico | Alta | Tests unitarios automatizados con escenarios sintéticos controlados. |
| **Calibración FRP → HFII** | Crítico | Alta | Tests de invariancia matemática y regresión con datasets reales. |
| **Normalización FIRMS** | Alto | Alta | Tests unitarios de parsing de strings, fechas y zonas horarias. |
| **Consultas PostGIS (Spatial)** | Alto | Media-Alta | Tests de integración contra contenedor de PostgreSQL/PostGIS. |
| **Endpoints REST API** | Medio | Media | Tests de contrato HTTP con `httpx` y `FastAPI TestClient`. |
| **Renderizado Deck.gl / UI** | Bajo | Media | Smoke tests exploratorios manuales mediante checklist guiada. |

---

## 2. 🔺 Pirámide de Tests Adaptada

Para maximizar el retorno de inversión de tiempo durante el hackathon, adoptamos una pirámide invertida/enfocada en backend analítico:

```text
                 / \
                /   \
               / E2E \           <- ~5% (Smoke tests manuales / Playwright opcional)
              /------- \
             /          \
            / Integración\        <- ~25% (PostGIS, Endpoints API, Ingesta CSV)
           /--------------\
          /                \
         /     Unitarios    \     <- ~70% (Filtros, ST-DBSCAN, FRP/HFII, H3, Fechas)
        /--------------------\
```

1. **Tests Unitarios (~70% de la suite automatizada):**
   - Ejecución ultra-rápida en memoria (< 3 segundos con `pytest`).
   - Sin dependencias externas de red o base de datos.
   - Validan lógica matemática pura: distancias esféricas/haversine, ventanas temporales euclidianas, correcciones de área de píxel, indexación hexagonal Uber H3 y umbrales de confianza.

2. **Tests de Integración (~25% de la suite):**
   - Requieren el servicio de PostgreSQL 16 + PostGIS 3.4 (local o Docker).
   - Validan la interoperabilidad entre Pandas/GeoPandas, SQLAlchemy/SQLModel y funciones nativas de PostGIS (`ST_ClusterDBSCAN`, `ST_DWithin`, `ST_ConvexHull`).
   - Verifican los contratos JSON de los endpoints de FastAPI (`/api/v1/hotspots/harmonized`, `/api/v1/calendar/summary`).

3. **Tests End-to-End & Smoke Tests (~5%):**
   - Validación funcional del flujo completo: Carga de dataset de la Chiquitanía 2019 → Visualización en mapa Deck.gl → Cambio dinámico de resolución H3 → Renderizado del Calendario de Actividad de Quemas → Exportación GeoJSON.

---

## 3. 📋 Plan Detallado de Tests Unitarios

Todos los tests unitarios residen en el directorio `backend/tests/unit/` y se ejecutan con `pytest`.

```text
backend/tests/unit/
├── conftest.py
├── test_quality_filter.py
├── test_stdbscan_clustering.py
├── test_frp_calibration.py
├── test_pixel_geometry.py
├── test_h3_indexing.py
└── test_data_normalization.py
```

### 3.1. `test_quality_filter.py`
Valida el descarte de ruido térmico, reflexiones solares y quemas industriales estáticas antes de que entren al pipeline de agrupamiento.

- **`test_filter_modis_low_confidence`**: Verifica que detecciones MODIS con `confidence < 30` sean eliminadas rigurosamente.
- **`test_filter_viirs_low_confidence`**: Verifica que detecciones VIIRS con flag `confidence == 'low'` sean descartadas.
- **`test_keep_high_confidence`**: Asegura que detecciones válidas (MODIS `confidence >= 30` y VIIRS `'nominal'` o `'high'`) se conserven en el flujo.
- **`test_detect_static_anomaly`**: Comprueba el filtrado por máscara de anomalías estáticas (flares de gas en plantas de hidrocarburos en Santa Cruz/Camiri y volcanes activos).

#### Snippet de Código:
```python
# backend/tests/unit/test_quality_filter.py
import pytest
import pandas as pd
from app.services.quality_filter import filter_hotspots, is_static_anomaly

@pytest.fixture
def sample_raw_hotspots_df():
    return pd.DataFrame([
        # Caso 1: MODIS baja confianza -> debe filtrarse
        {"id": 1, "sensor": "MODIS", "confidence": 20, "latitude": -16.5, "longitude": -60.8, "frp": 12.0},
        # Caso 2: MODIS confianza nominal -> debe mantenerse
        {"id": 2, "sensor": "MODIS", "confidence": 65, "latitude": -16.6, "longitude": -60.7, "frp": 45.0},
        # Caso 3: VIIRS baja confianza -> debe filtrarse
        {"id": 3, "sensor": "VIIRS", "confidence": "low", "latitude": -16.7, "longitude": -60.6, "frp": 3.2},
        # Caso 4: VIIRS alta confianza -> debe mantenerse
        {"id": 4, "sensor": "VIIRS", "confidence": "high", "latitude": -16.8, "longitude": -60.5, "frp": 18.5},
        # Caso 5: Flare de gas conocido (Planta de Gas en Chaco/Santa Cruz) -> anomalía estática
        {"id": 5, "sensor": "VIIRS", "confidence": "high", "latitude": -19.995, "longitude": -63.528, "frp": 80.0}
    ])

def test_filter_modis_low_confidence(sample_raw_hotspots_df):
    filtered_df = filter_hotspots(sample_raw_hotspots_df)
    assert 1 not in filtered_df["id"].values
    assert 2 in filtered_df["id"].values

def test_filter_viirs_low_confidence(sample_raw_hotspots_df):
    filtered_df = filter_hotspots(sample_raw_hotspots_df)
    assert 3 not in filtered_df["id"].values
    assert 4 in filtered_df["id"].values

def test_keep_high_confidence(sample_raw_hotspots_df):
    filtered_df = filter_hotspots(sample_raw_hotspots_df)
    survivors = set(filtered_df["id"].values)
    assert 2 in survivors
    assert 4 in survivors

def test_detect_static_anomaly(sample_raw_hotspots_df):
    # Coordenadas exactas de un flare industrial conocido
    lat_flare, lon_flare = -19.995, -63.528
    assert is_static_anomaly(lat_flare, lon_flare) is True
    # Coordenadas en bosque de la Chiquitanía
    assert is_static_anomaly(-16.45, -60.82) is False
```

---

### 3.2. `test_stdbscan_clustering.py`
El corazón del reto #8: verificar que las observaciones coincidentes en el espacio ($\epsilon_{dist} \le 1000\text{ m}$) y en el tiempo ($\Delta t \le 3-4\text{ h}$) formen un único evento de fuego unificado.

- **`test_cluster_nearby_points`**: Puntos dentro de $\epsilon=1000\text{ m}$ y $\Delta t=3\text{ h}$ se asignan al mismo cluster.
- **`test_no_cluster_far_points`**: Puntos separados por $>1000\text{ m}$ permanecen en clusters separados o como ruido (-1).
- **`test_no_cluster_time_gap`**: Puntos con distancia espacial nula pero diferencia temporal $>4\text{ h}$ no se fusionan.
- **`test_single_sensor_cluster`**: Conglomerado válido de múltiples detecciones de un mismo sensor (ej. 4 píxeles contiguos de VIIRS).
- **`test_mixed_sensor_cluster`**: Fusión multi-sensor exitosa donde 1 píxel de MODIS absorbe a 3 píxeles de VIIRS en la misma pasada.

#### Snippet de Código:
```python
# backend/tests/unit/test_stdbscan_clustering.py
import pytest
from datetime import datetime, timezone, timedelta
from app.services.st_dbscan import ST_DBSCAN_Clustering, HotspotPoint

@pytest.fixture
def clusterer():
    # Parámetros oficiales del reto: eps_dist=1000m, eps_time_hours=3.5h, min_samples=1
    return ST_DBSCAN_Clustering(eps_spatial_meters=1000.0, eps_temporal_hours=3.5, min_samples=1)

def test_cluster_nearby_points(clusterer):
    base_time = datetime(2019, 8, 25, 14, 0, tzinfo=timezone.utc)
    # Dos puntos en la Chiquitanía a ~500 metros de distancia y 30 min de diferencia
    p1 = HotspotPoint(id="m1", lat=-16.3000, lon=-60.5000, time=base_time, sensor="MODIS")
    p2 = HotspotPoint(id="v1", lat=-16.3040, lon=-60.5000, time=base_time + timedelta(minutes=30), sensor="VIIRS")
    
    clusters = clusterer.fit_predict([p1, p2])
    assert len(clusters) == 1
    assert set(clusters[0].member_ids) == {"m1", "v1"}

def test_no_cluster_far_points(clusterer):
    base_time = datetime(2019, 8, 25, 14, 0, tzinfo=timezone.utc)
    # Dos puntos a 5 km de distancia (fuera de eps_spatial=1000m)
    p1 = HotspotPoint(id="p1", lat=-16.3000, lon=-60.5000, time=base_time, sensor="MODIS")
    p2 = HotspotPoint(id="p2", lat=-16.3450, lon=-60.5000, time=base_time, sensor="VIIRS")
    
    clusters = clusterer.fit_predict([p1, p2])
    assert len(clusters) == 2
    assert clusters[0].cluster_id != clusters[1].cluster_id

def test_no_cluster_time_gap(clusterer):
    base_time = datetime(2019, 8, 25, 14, 0, tzinfo=timezone.utc)
    # Mismas coordenadas exactas, pero 6 horas después (fuera de eps_temporal=3.5h)
    p1 = HotspotPoint(id="p1", lat=-16.3000, lon=-60.5000, time=base_time, sensor="MODIS")
    p2 = HotspotPoint(id="p2", lat=-16.3000, lon=-60.5000, time=base_time + timedelta(hours=6), sensor="MODIS")
    
    clusters = clusterer.fit_predict([p1, p2])
    assert len(clusters) == 2

def test_mixed_sensor_cluster(clusterer):
    base_time = datetime(2019, 8, 25, 17, 30, tzinfo=timezone.utc)
    # 1 detección MODIS (1km) y 3 detecciones VIIRS (375m) inscritas en el área de MODIS
    modis_pt = HotspotPoint(id="MOD_01", lat=-16.500, lon=-61.000, time=base_time, sensor="MODIS")
    viirs_1 = HotspotPoint(id="VII_01", lat=-16.501, lon=-61.001, time=base_time + timedelta(minutes=15), sensor="VIIRS")
    viirs_2 = HotspotPoint(id="VII_02", lat=-16.499, lon=-61.000, time=base_time + timedelta(minutes=15), sensor="VIIRS")
    viirs_3 = HotspotPoint(id="VII_03", lat=-16.500, lon=-61.002, time=base_time + timedelta(minutes=15), sensor="VIIRS")

    clusters = clusterer.fit_predict([modis_pt, viirs_1, viirs_2, viirs_3])
    assert len(clusters) == 1
    assert len(clusters[0].member_ids) == 4
    assert clusters[0].has_modis is True
    assert clusters[0].has_viirs is True
```

---

### 3.3. `test_frp_calibration.py`
Valida la conversión y normalización de la Potencia Radiativa del Fuego ($FRP$) al **Índice Armonizado de Intensidad de Fuego (HFII)**, corrigiendo la mayor sensibilidad de VIIRS para evitar duplicidad energética.

- **`test_hfii_dual_sensor`**: Verifica la combinación ponderada de FRP cuando ambos sensores detectan el mismo cluster.
- **`test_hfii_single_modis`**: Verifica la función de calibración base cuando solo existe observación MODIS.
- **`test_hfii_single_viirs`**: Verifica la corrección a la baja del FRP de VIIRS para equipararlo a la escala histórica de MODIS ($FRP_{cal} \approx 0.82 \times FRP_{VIIRS}$).
- **`test_daynight_weighting`**: Aplica factores de corrección por contraste de fondo térmico día/noche.
- **`test_pixel_area_correction`**: Ajusta el valor de FRP reportado según la huella real calculada por $scan \times track$.

#### Snippet de Código:
```python
# backend/tests/unit/test_frp_calibration.py
import pytest
from app.services.frp_calibration import calculate_hfii, correct_frp_pixel_area

def test_hfii_single_modis():
    # Un incendio registrado solo por MODIS con 50 MW
    hfii = calculate_hfii(modis_frp_sum=50.0, viirs_frp_sum=0.0, daynight='D')
    assert 48.0 <= hfii <= 52.0  # La escala MODIS es el baseline de referencia

def test_hfii_single_viirs():
    # VIIRS reporta alta sensibilidad; debe normalizarse para evitar el salto artificial
    raw_viirs_frp = 50.0
    hfii = calculate_hfii(modis_frp_sum=0.0, viirs_frp_sum=raw_viirs_frp, daynight='D')
    # HFII calibrado debe ser menor o igual al baseline comparable
    assert hfii < raw_viirs_frp
    assert round(hfii, 1) == 41.0  # Factor beta empírico ~0.82

def test_hfii_dual_sensor():
    # Co-detección simultánea: no deben sumarse linealmente (50 + 50 != 100)
    hfii = calculate_hfii(modis_frp_sum=50.0, viirs_frp_sum=50.0, daynight='D')
    assert hfii < 100.0
    # La fusión no lineal previene la sobreestimación del fuego
    assert 60.0 <= hfii <= 80.0

def test_daynight_weighting():
    # En la noche, menor radiación solar residual -> mayor confianza radiativa
    frp_day = calculate_hfii(modis_frp_sum=40.0, viirs_frp_sum=0.0, daynight='D')
    frp_night = calculate_hfii(modis_frp_sum=40.0, viirs_frp_sum=0.0, daynight='N')
    assert frp_night != frp_day

def test_pixel_area_correction():
    # En el borde del barrido (scan=2.0, track=4.8), el píxel cubre casi 10x más superficie
    frp_nadir = correct_frp_pixel_area(raw_frp=30.0, scan=1.0, track=1.0)
    frp_edge = correct_frp_pixel_area(raw_frp=30.0, scan=2.0, track=4.8)
    assert frp_edge < frp_nadir  # Densidad de flujo radiativo normalizada
```

---

### 3.4. `test_pixel_geometry.py`
Prueba la reconstrucción matemática del polígono de huella del píxel a partir de los atributos `scan` y `track`.

- **`test_nadir_pixel_modis`**: Píxel MODIS en nadir ($scan=1.0, track=1.0$) genera un polígono con área aproximada de $1.0\text{ km}^2$.
- **`test_edge_pixel_modis`**: Píxel MODIS en borde de franja ($scan=2.0, track=4.8$) genera un polígono alargado de $\sim 9.6\text{ km}^2$ (efecto pajarita / *bow-tie*).
- **`test_viirs_pixel`**: Píxel VIIRS 375m ($scan=0.375, track=0.375$) produce un polígono de $\sim 0.14\text{ km}^2$.

#### Snippet de Código:
```python
# backend/tests/unit/test_pixel_geometry.py
import pytest
from shapely.geometry import Polygon
from app.services.pixel_geometry import build_footprint_polygon, get_polygon_area_km2

def test_nadir_pixel_modis():
    poly = build_footprint_polygon(lat=-16.0, lon=-60.0, scan=1.0, track=1.0)
    assert isinstance(poly, Polygon)
    area = get_polygon_area_km2(poly)
    assert pytest.approx(area, rel=0.05) == 1.0

def test_edge_pixel_modis():
    poly = build_footprint_polygon(lat=-16.0, lon=-60.0, scan=2.0, track=4.8)
    area = get_polygon_area_km2(poly)
    assert pytest.approx(area, rel=0.10) == 9.6

def test_viirs_pixel():
    poly = build_footprint_polygon(lat=-16.0, lon=-60.0, scan=0.375, track=0.375)
    area = get_polygon_area_km2(poly)
    assert pytest.approx(area, rel=0.05) == 0.14
```

---

### 3.5. `test_h3_indexing.py`
Valida la discretización de coordenadas en la grilla hexagonal discreta Uber H3 para acelerar el análisis espacial multi-escala.

- **`test_latlon_to_h3_r7`**: Conversión determinista a Resolución 7 (radio medio $\sim 1.2\text{ km}$, área $\sim 5.16\text{ km}^2$).
- **`test_latlon_to_h3_r8`**: Conversión determinista a Resolución 8 (radio medio $\sim 461\text{ m}$, área $\sim 0.74\text{ km}^2$).
- **`test_h3_consistency`**: Puntos separados por menos de 100 metros en el centro del hexágono comparten obligatoriamente el mismo índice H3.

#### Snippet de Código:
```python
# backend/tests/unit/test_h3_indexing.py
import pytest
import h3
from app.services.h3_indexing import point_to_h3_index

def test_latlon_to_h3_r7():
    lat, lon = -16.2500, -60.4500
    h3_idx = point_to_h3_index(lat, lon, resolution=7)
    assert h3.is_valid_cell(h3_idx)
    assert h3.get_resolution(h3_idx) == 7

def test_latlon_to_h3_r8():
    lat, lon = -16.2500, -60.4500
    h3_idx = point_to_h3_index(lat, lon, resolution=8)
    assert h3.is_valid_cell(h3_idx)
    assert h3.get_resolution(h3_idx) == 8

def test_h3_consistency():
    # Dos puntos en San Ignacio de Velasco distantes por 50 metros
    h1 = point_to_h3_index(-16.3741, -60.9630, resolution=8)
    h2 = point_to_h3_index(-16.3743, -60.9632, resolution=8)
    assert h1 == h2
```

---

### 3.6. `test_data_normalization.py`
Garantiza la consistencia en el esquema de datos al procesar archivos CSV provenientes de NASA FIRMS (tanto MODIS C6.1 como VIIRS 375m).

- **`test_modis_csv_parsing`**: Comprueba el mapeo de columnas `brightness`, `scan`, `track`, `confidence` numérica, `satellite` (Terra/Aqua).
- **`test_viirs_csv_parsing`**: Comprueba el mapeo de columnas `bright_ti4`, `bright_ti5`, `confidence` categórica ('l', 'n', 'h'), `satellite` (SNPP, NOAA20, NOAA21).
- **`test_datetime_normalization`**: Convierte de forma unificada `acq_date` (formato `YYYY-MM-DD`) y `acq_time` (formato entero militar `HHMM` o `HMM`, ej. `935` o `1420`) a un objeto datetime estándar `TIMESTAMPTZ` en UTC.

#### Snippet de Código:
```python
# backend/tests/unit/test_data_normalization.py
import pytest
from datetime import datetime, timezone
from app.services.data_normalizer import parse_firms_record, normalize_firms_datetime

def test_modis_csv_parsing():
    raw_record = {
        "latitude": "-16.123",
        "longitude": "-60.456",
        "brightness": "320.5",
        "scan": "1.1",
        "track": "1.0",
        "acq_date": "2019-08-20",
        "acq_time": "1430",
        "satellite": "Aqua",
        "instrument": "MODIS",
        "confidence": "78",
        "version": "6.1NRT",
        "frp": "25.4",
        "daynight": "D"
    }
    parsed = parse_firms_record(raw_record, sensor_type="MODIS")
    assert parsed.sensor == "MODIS"
    assert parsed.confidence_score == 78.0
    assert parsed.frp == 25.4
    assert parsed.acq_datetime == datetime(2019, 8, 20, 14, 30, tzinfo=timezone.utc)

def test_viirs_csv_parsing():
    raw_record = {
        "latitude": "-16.789",
        "longitude": "-61.123",
        "bright_ti4": "345.2",
        "scan": "0.4",
        "track": "0.36",
        "acq_date": "2019-08-20",
        "acq_time": "0415",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "frp": "12.8",
        "daynight": "N"
    }
    parsed = parse_firms_record(raw_record, sensor_type="VIIRS")
    assert parsed.sensor == "VIIRS"
    assert parsed.confidence_level == "nominal"
    assert parsed.frp == 12.8
    assert parsed.acq_datetime == datetime(2019, 8, 20, 4, 15, tzinfo=timezone.utc)

def test_datetime_normalization():
    # Casos de hora con 3 dígitos (ej. 09:35 AM representado como 935)
    dt1 = normalize_firms_datetime("2019-09-01", "935")
    assert dt1 == datetime(2019, 9, 1, 9, 35, tzinfo=timezone.utc)

    # Casos de hora con 4 dígitos
    dt2 = normalize_firms_datetime("2019-09-01", "1805")
    assert dt2 == datetime(2019, 9, 1, 18, 5, tzinfo=timezone.utc)
```

---

## 4. 🔗 Plan de Tests de Integración

Los tests de integración verifican la persistencia, la exactitud geométrica en el motor espacial y el contrato de los servicios web.

```text
backend/tests/integration/
├── conftest.py
├── test_ingestion_pipeline.py
├── test_spatial_queries.py
├── test_api_endpoints.py
└── test_export.py
```

### 4.1. `test_ingestion_pipeline.py`
Ejecuta el ciclo de vida completo de los datos crudos:
1. Lectura de fixture CSV con 100 registros mixtos de FIRMS (MODIS + VIIRS).
2. Normalización y validación con Pydantic.
3. Filtrado de calidad (descarte de confianza baja y anomalías).
4. Inserción masiva en tabla temporal `raw_hotspots` en PostGIS.
5. Verificación de conteo y tipos de geometría `Point(4326)`.

### 4.2. `test_spatial_queries.py`
Valida la ejecución de queries en la base de datos real con extensión PostGIS activa:
- **`ST_DWithin`**: Cálculo de distancias en metros usando `geography` para evitar distorsiones proyectivas en Bolivia (`SRID=4326` con casting a `geography`).
- **`ST_ClusterDBSCAN`**: Agrupamiento espacial nativo en SQL de soporte.
- **`ST_ConvexHull`**: Creación del polígono envolvente mínimo que delimita el perímetro consolidado del incendio.

#### Snippet de Código:
```python
# backend/tests/integration/test_spatial_queries.py
import pytest
from sqlalchemy import text

def test_postgis_st_dwithin(db_session):
    # San José de Chiquitos: distancia entre dos puntos simulados
    query = text("""
        SELECT ST_DWithin(
            ST_SetSRID(ST_MakePoint(-60.7500, -17.8500), 4326)::geography,
            ST_SetSRID(ST_MakePoint(-60.7540, -17.8500), 4326)::geography,
            1000 -- metros
        ) AS is_within;
    """)
    result = db_session.execute(query).scalar()
    assert result is True

def test_postgis_convex_hull_generation(db_session):
    # Genera un polígono a partir de un multipoint de 4 detecciones
    query = text("""
        WITH points AS (
            SELECT ST_Collect(ARRAY[
                ST_SetSRID(ST_MakePoint(-60.10, -16.20), 4326),
                ST_SetSRID(ST_MakePoint(-60.11, -16.21), 4326),
                ST_SetSRID(ST_MakePoint(-60.09, -16.21), 4326),
                ST_SetSRID(ST_MakePoint(-60.10, -16.22), 4326)
            ]) as geom
        )
        SELECT ST_GeometryType(ST_ConvexHull(geom)) as geom_type,
               ST_Area(ST_ConvexHull(geom)::geography) / 1000000.0 as area_km2
        FROM points;
    """)
    row = db_session.execute(query).fetchone()
    assert row.geom_type == "ST_Polygon"
    assert row.area_km2 > 0.5
```

---

### 4.3. `test_api_endpoints.py`
Usa `fastapi.testclient.TestClient` o `httpx.AsyncClient` para verificar respuestas HTTP, headers y estructuras JSON:
- `GET /health` → Devuelve status 200 y conectividad de PostGIS.
- `GET /api/v1/hotspots/raw` → Parámetros de filtro (`bbox`, `date_start`, `date_end`, `satellite`).
- `GET /api/v1/hotspots/harmonized` → GeoJSON FeatureCollection con features armonizadas y atributos `hfii`, `sensor_composition`, `h3_index`.
- `GET /api/v1/calendar/summary` → Agrupación por día/mes del año con estadísticas de anomalía térmica y conteo pre y post 2012.

#### Snippet de Código:
```python
# backend/tests/integration/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["postgis_version"] is not None

def test_get_harmonized_hotspots_geojson():
    # Consulta la Chiquitanía para agosto de 2019
    params = {
        "min_lat": -18.0,
        "max_lat": -15.0,
        "min_lon": -62.0,
        "max_lon": -59.0,
        "start_date": "2019-08-01",
        "end_date": "2019-08-31"
    }
    response = client.get("/api/v1/hotspots/harmonized", params=params)
    assert response.status_code == 200
    geojson = response.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0
    
    first_feat = geojson["features"][0]
    assert "properties" in first_feat
    assert "hfii" in first_feat["properties"]
    assert "cluster_id" in first_feat["properties"]
    assert "h3_r7" in first_feat["properties"]
```

---

### 4.4. `test_export.py`
Valida los módulos de exportación para los tomadores de decisiones y analistas geoespaciales:
- **GeoJSON**: Cumple el estándar estricto RFC 7946 (ejes en orden `[longitud, latitud]`, polígonos cerrados).
- **CSV**: Contiene cabeceras completas (`cluster_id`, `hfii`, `latitude_centroid`, `longitude_centroid`, `sensors_detected`, `date_start`, `date_end`).

---

## 5. 🗄️ Estrategia de Datos de Test

Para garantizar resultados reproducibles y aislar las pruebas de caídas en servidores externos de la NASA, se implementa una estrategia tripartita de datos:

```text
backend/tests/fixtures/
├── synthetic/
│   ├── dual_sensor_colocated.json
│   ├── edge_of_scan_cases.json
│   └── temporal_gaps.json
└── real_sample/
    ├── chiquitania_2019_sample_modis.csv
    └── chiquitania_2019_sample_viirs.csv
```

### 5.1. Fixtures Sintéticos (Ground Truth Teórico)
Colecciones pequeñas y diseñadas ad-hoc donde el resultado matemático exacto es conocido a priori:
1. **Caso "Gemelos Espacio-Temporales":** 1 punto MODIS y 1 punto VIIRS con separación de 150m y 20 min. *Resultado esperado:* 1 único cluster con peso ponderado.
2. **Caso "Límite Crítico":** 2 puntos separados por 999m (deben agruparse) vs. 2 puntos separados por 1001m (no deben agruparse).
3. **Caso "Falso Efecto 2012":** Mismo incendio hipotético de 10 hectáreas procesado con solo MODIS (1 foco detectado) vs. con VIIRS (4 focos detectados). El algoritmo armonizado debe computar un área y energía equiparables en ambos casos.

### 5.2. Datos Reales de Muestra (Santa Cruz, Bolivia — Temporada 2019)
Un subconjunto real extraído de NASA FIRMS para los municipios de San Ignacio de Velasco, Roboré y Concepción durante los megaincendios de la Chiquitanía (agosto 2019):
- Archivo `chiquitania_2019_sample_modis.csv` (~500 registros verificados).
- Archivo `chiquitania_2019_sample_viirs.csv` (~2,100 registros verificados).
- Permite evaluar el factor de reducción real de duplicidad (la reducción esperada en el conteo de focos crudos consolidados oscila entre **40% y 65%** en zonas de alta densidad).

### 5.3. Casos Borde (Edge Cases)
- **Sensor Único:** Años 2000 a 2011 donde solo existe MODIS (el algoritmo debe operar en modo retro-compatible sin lanzar excepciones por ausencia de VIIRS).
- **Sobrevuelos Solapados:** Pasada casi instantánea de Suomi-NPP y NOAA-20 (ambos VIIRS) con diferencia de solo 50 minutos.
- **Píxeles en Extremo de Franja:** Píxeles MODIS deformados a casi $5 \times 2\text{ km}$ donde el centroide geográfico puede estar desplazado del foco activo real.
- **Valores Faltantes o Nulos:** Registros con `frp = -999` o `confidence` nula.

---

## 6. 📊 Objetivos de Cobertura de Código

Durante el hackathon no buscamos el 100% indiscriminado, sino una cobertura quirúrgica en las áreas de alto impacto:

| Módulo / Capa | Target de Cobertura | Mínimo Aceptable | Justificación |
| :--- | :---: | :---: | :--- |
| **`app/services/st_dbscan.py`** | **95%** | **90%** | Es la solución técnica al reto de la NASA. Cero tolerancia a fallos. |
| **`app/services/frp_calibration.py`**| **90%** | **85%** | La corrección de energía resuelve el salto artificial del 2012. |
| **`app/services/pixel_geometry.py`** | **85%** | **80%** | Asegura geometrías exactas para los polígonos de quemas. |
| **`app/services/data_normalizer.py`**| **90%** | **80%** | Previene caídas por fechas mal formateadas o CSVs atípicos. |
| **`app/api/endpoints/`** | **80%** | **70%** | Asegura que la API responda a la UI en la demo. |
| **`frontend/ (Componentes UI)`** | **N/A (Manual)**| **N/A** | Validación visual en vivo para no ralentizar el desarrollo rápido. |

---

## 7. 🚀 Pipeline de Integración Continua (CI/CD)

Configuración automatizada con **GitHub Actions** que corre en cada `push` o `pull_request` a la rama `main` o `develop`. Si un cambio rompe el algoritmo de armonización o los endpoints, el despliegue a Railway/Vercel se bloquea de inmediato.

```yaml
# .github/workflows/ci.yml
name: PyrosHarmonizer CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-quality-and-tests:
    name: Lint, Test & Coverage (Backend)
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: pyrosharmonizer_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout del repositorio
        uses: actions/checkout@v4

      - name: Configurar Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Instalar dependencias del Backend
        run: |
          python -m pip install --upgrade pip
          pip install ruff pytest pytest-cov httpx
          pip install -r backend/requirements.txt

      - name: Análisis estático de código (Ruff Lint & Format)
        run: |
          ruff check backend/
          ruff format --check backend/

      - name: Ejecutar Suite de Tests (Unitarios + Integración PostGIS)
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/pyrosharmonizer_test
        run: |
          pytest backend/tests/ \
            --cov=backend/app \
            --cov-report=term-missing \
            --cov-report=xml:coverage.xml \
            --cov-fail-under=75

  frontend-build-check:
    name: Build Check (Frontend Next.js)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del repositorio
        uses: actions/checkout@v4

      - name: Configurar Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
          cache-dependency-path: frontend/package.json

      - name: Instalar dependencias Frontend
        run: |
          cd frontend
          npm ci

      - name: Validar Build de Producción
        run: |
          cd frontend
          npm run build
```

---

## 8. ⚡ Testing de Rendimiento y Benchmarking

El volumen de datos satelitales en una temporada intensa de incendios en Bolivia puede superar los cientos de miles de registros. La API no puede demorar más de 500 ms en responder durante el pitch.

### 8.1. Estrategia de Optimización de Base de Datos
- **Índices Geoespaciales:** Creación de índices GiST sobre la columna geográfica `geom`:
  ```sql
  CREATE INDEX idx_raw_hotspots_geom ON raw_hotspots USING GIST (geom);
  CREATE INDEX idx_harmonized_hotspots_geom ON harmonized_clusters USING GIST (geom_convex_hull);
  ```
- **Índices Temporales BRIN:** Para optimizar las series de tiempo desde el año 2000:
  ```sql
  CREATE INDEX idx_raw_hotspots_datetime ON raw_hotspots USING BRIN (acq_datetime);
  ```
- **Índice Hexagonal H3:** B-Tree convencional sobre los identificadores `h3_r7` y `h3_r8` para agregaciones inmediatas en milisegundos.

### 8.2. Script de Benchmark Automatizado
Evaluamos el tiempo de respuesta y consumo de memoria con 100,000 registros sintetizados representativos de la Chiquitanía:

```python
# backend/tests/performance/test_benchmark_clustering.py
import pytest
import time
from app.services.st_dbscan import ST_DBSCAN_Clustering
from tests.fixtures.generator import generate_synthetic_hotspots

@pytest.mark.benchmark
def test_benchmark_st_dbscan_10k_points():
    """Valida que el clustering de 10,000 puntos tome menos de 1.5 segundos."""
    dataset = generate_synthetic_hotspots(count=10000, bbox=[-18, -62, -15, -59])
    clusterer = ST_DBSCAN_Clustering(eps_spatial_meters=1000.0, eps_temporal_hours=3.5)
    
    start_time = time.perf_counter()
    clusters = clusterer.fit_predict(dataset)
    elapsed = time.perf_counter() - start_time
    
    print(f"\n[BENCHMARK] Procesados {len(dataset)} puntos en {elapsed:.3f} s -> {len(clusters)} clusters")
    assert elapsed < 1.5, f"Rendimiento deficiente: tomó {elapsed:.2f} s (límite: 1.5 s)"
```

### 8.3. Umbrales de Rendimiento para la Demo

| Métrica / Endpoint | Volumen de Prueba | SLA Máximo Permitido |
| :--- | :---: | :---: |
| `GET /api/v1/hotspots/harmonized` | 20,000 puntos / 1 mes | < 350 ms |
| `GET /api/v1/calendar/summary` | Serie histórica 2000-2026 | < 200 ms |
| Agregación por Grilla Hexagonal H3 | 100,000 puntos | < 450 ms |
| Ingesta masiva de CSV FIRMS | Archivo de 50 MB (~250k filas) | < 12 segundos |

---

## 9. 📝 Checklist de Verificación Rápida para la Demo del Hackathon

Antes de grabar el video de 30 segundos y de presentar ante el jurado de la NASA Space Apps en la UCB Santa Cruz, el equipo debe ejecutar este checklist:

- [ ] **Tests Verdes:** Ejecutar `pytest backend/tests/unit` y confirmar que los 20+ tests pasen en 0 fallos.
- [ ] **Efecto 2012 Eliminado:** Verificar en el gráfico del Calendario de Quemas que el salto abrupto entre 2011 (solo MODIS) y 2012 (MODIS + VIIRS) aparezca corregido y suavizado mediante el índice HFII.
- [ ] **Mapa Interactivo:** Verificar en el frontend que el toggle "Ver Datos Crudos vs. Datos Armonizados" muestre la reducción clara de clusters redundantes sobre el Parque Nacional Noel Kempff Mercado o San Ignacio.
- [ ] **Exportación GeoJSON:** Descargar un archivo GeoJSON desde la app y verificar que abra correctamente en [geojson.io](https://geojson.io) o QGIS sin errores de topología.
- [ ] **API Documentada:** Confirmar que `http://localhost:8000/docs` (Swagger UI) cargue todos los endpoints con ejemplos funcionales para los jueces técnicos.
- [ ] **Cero Errores en Consola:** Verificar que la consola de desarrollador del navegador (F12) esté limpia de excepciones JavaScript o advertencias críticas de WebGL/Deck.gl.

# Documento de Requisitos del Producto (PRD)
# PyrosHarmonizer: Unified Fire Regimes & Burning Activity Calendar

---

## Metadatos del Documento

| Atributo | Detalle |
| :--- | :--- |
| **Proyecto** | PyrosHarmonizer |
| **Subtítulo** | Unified Fire Regimes & Burning Activity Calendar |
| **Evento** | 2026 NASA International Space Apps Challenge |
| **Sede** | Santa Cruz de la Sierra, Bolivia — Universidad Católica Boliviana "San Pablo" (UCB) |
| **Fecha de Publicación** | 14 de Noviembre de 2026 |
| **Reto Oficial** | Challenge #8 — Harmonization of MODIS and VIIRS Hot Spots (Nivel: Intermedio / Avanzado) |
| **Competencia Global** | 606 equipos internacionales compitiendo en el reto |
| **Versión del PRD** | 1.0.0 (Release de Competencia Oficial) |
| **Estado** | Aprobado para Implementación y Evaluación de Jurado |
| **Caso de Estudio** | "El Efecto 2012 en la Chiquitanía" (Santa Cruz, Bolivia: 2000 – 2026) |
| **Equipo** | PyrosHarmonizers (4 a 6 integrantes multidisciplinarios) |
| **Roles del Equipo** | Lead Backend/Data Engineer, Lead Frontend/UX, Geospatial Analyst, DevOps/Integration Lead |

---

## 1. Resumen Ejecutivo

### 1.1 Contexto y Oportunidad
Los regímenes de incendios forestales y las prácticas de quema controlada ("chaqueos") representan uno de los mayores desafíos ambientales, ecológicos y socioeconómicos en América del Sur, con epicentro crítico en el departamento de Santa Cruz, Bolivia. Durante más de dos décadas, los sensores satelitales de órbita polar de la NASA han sido el estándar de oro para el monitoreo global y regional de anomalías térmicas y fuegos activos a través del sistema **NASA FIRMS** (*Fire Information for Resource Management System*).

Sin embargo, la comunidad científica, los planificadores de conservación y las brigadas de emergencia se enfrentan a un obstáculo metodológico estructural: la ruptura en la homogeneidad temporal de las series de datos provocada por la transición y coexistencia entre el sensor histórico **MODIS** (a bordo de las plataformas satelitales Terra y Aqua, con resolución espacial de 1 km y registros desde el año 2000) y los sensores modernos **VIIRS** (a bordo de Suomi-NPP, NOAA-20 y NOAA-21, con resolución de 375 m en bandas de imágenes y datos desde 2012).

### 1.2 La Solución PyrosHarmonizer
**PyrosHarmonizer** es una plataforma analítica y geoespacial full-stack de código abierto diseñada para resolver la inconsistencia estadística y física entre MODIS y VIIRS. A través de un motor algorítmico sustentado en **clustering espacio-temporal ST-DBSCAN**, **reconstrucción geométrica del área de barrido satelital ($scan \times track$)**, **fusión poligonal mediante envolventes convexas (Convex Hull)** y una función de transferencia calibrada de Potencia Radiativa del Fuego (**FRP $\rightarrow$ HFII: Harmonized Fire Intensity Index**), la plataforma transforma millones de detecciones satelitales crudas y heterogéneas en una serie temporal continua, coherente y unificada de eventos de fuego desde el año 2000 hasta el presente (2026).

Adicionalmente, PyrosHarmonizer traduce estos datos complejos en el **Calendario de Actividad de Quemas (*Burning Activity Calendar*)**, una herramienta interactiva multianual que cuantifica anomalías estacionales mediante matrices de calor ($z\text{-score}$), grillas hexagonales espaciales **Uber H3** y un visualizador acelerado por GPU con vista comparativa dividida (*split-screen*), permitiendo a los tomadores de decisiones evaluar los verdaderos cambios en los regímenes de fuego sin el sesgo del reemplazo tecnológico de sensores.

### 1.3 Impacto Esperado
- **Científico y Climático:** Proporcionar a investigadores globales y regionales una serie histórica estandarizada de 26 años sin quiebres artificiales, facilitando estudios climáticos rigurosos sobre emisiones de carbono y dinámica de biomasa en ecosistemas neotropicales.
- **Operativo y Táctico:** Reducir la sobrecarga cognitiva en centros de despacho de bomberos forestales mediante la consolidación de cúmulos de píxeles redundantes de VIIRS en perímetros de fuego reales con estimación de severidad unificada.
- **Políticas Públicas y Gestión Territorial:** Ofrecer a gobernaciones y municipios una base empírica incuestionable para la regulación de calendarios de quema, auditoría ambiental de desmontes y declaratorias de emergencia por desastres naturales.

---

## 2. Planteamiento del Problema

### 2.1 La Fractura de 2012: Incompatibilidad entre Sensores MODIS y VIIRS
Desde el año 2000, los instrumentos MODIS han registrado puntos de calor activo utilizando sus bandas infrarrojas medias y térmicas con un tamaño de píxel nominal en el nadir de $1\text{ km} \times 1\text{ km}$ ($1\text{ km}^2$). En 2012, entró en operación el radiómetro VIIRS a bordo del satélite Suomi-NPP, incorporando bandas de imagen de resolución espacial fina de $375\text{ m} \times 375\text{ m}$ ($0.14\text{ km}^2$).

Esta diferencia física fundamental genera tres distorsiones estadísticas severas:
1. **Sobre-conteo de Puntos de Calor:** Un único frente de incendio forestal de tamaño moderado que MODIS detecta como $1$ solo píxel activo es detectado por VIIRS como entre $3$ y $7$ píxeles individuales (un promedio empírico regional de $3\times$ a $5\times$ más detecciones para la misma área quemada).
2. **El Salto Artificial de 2012:** Al generar gráficos cronológicos de ocurrencia de incendios concatenando sin armonizar los catálogos de FIRMS, las series temporales muestran un incremento vertical y abrupto a partir de enero de 2012. Esta anomalía es un artificio puramente instrumental y no un cambio ecológico real.
3. **Disparidad en la Detección de Focos de Baja Intensidad:** Gracias a su resolución de 375 m, VIIRS detecta fuegos pequeños, fuegos fríos de sotobosque y quemas agrícolas incipientes que quedan por debajo del umbral de detección radiométrica de MODIS dentro de un píxel de 1 km.

```
       MODIS (Nadir: 1000m x 1000m = 1,000,000 m²)
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                  1 solo punto MODIS                       │
│                   (FRP = 45 MW)                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
                             VS
       VIIRS 375m (Nadir: 375m x 375m = 140,625 m²)
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ VIIRS-1     │ VIIRS-2     │ VIIRS-3     │ VIIRS-4     │
│ (FRP=12 MW) │ (FRP=18 MW) │ (FRP=8 MW)  │ (FRP=14 MW) │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ VIIRS-5     │ VIIRS-6     │ VIIRS-7     │             │
│ (FRP=6 MW)  │ (FRP=9 MW)  │ (FRP=11 MW) │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
  -> 7 detecciones VIIRS para el mismo frente de fuego
```

### 2.2 Inconsistencias en el Fire Radiative Power (FRP)
El *Fire Radiative Power* (FRP, medido en Megavatios, MW) cuantifica la tasa instantánea de energía calorífica liberada por el fuego. Aunque teóricamente el FRP total emitido por un incendio debería ser invariante respecto al sensor, en la práctica:
- Los métodos de derivación empírica difieren (estimación basada en radiancia en canal de 4 µm de MODIS vs. enfoque bi-espectral y de bandas I/M de VIIRS).
- Los efectos de saturación en detectores provocan lecturas truncadas en incendios catastróficos.
- La suma directa de los valores de FRP de los múltiples píxeles de VIIRS no equivale linealmente al valor de FRP del píxel envolvente de MODIS debido a efectos de fondo (*background temperature*), transmitancia atmosférica y respuesta de la función de dispersión puntual (PSF).

### 2.3 Deformación Fuera del Nadir y Geometría Variable del Píxel (*Scan $\times$ Track*)
Los satélites de órbita heliosincrónica barren franjas (*swath*) de más de 2,300 km de ancho. A medida que el ángulo de observación ($\theta$) se aleja del nadir:
- **Efecto Bowtie en MODIS:** El tamaño efectivo del píxel se ensancha drásticamente, pasando de $1\text{ km} \times 1\text{ km}$ en el centro de la traza a aproximadamente $4.8\text{ km}$ en dirección del escaneo (*scan*) por $2.0\text{ km}$ en dirección de la órbita (*track*) en los bordes del barrido, multiplicando el área del píxel por casi $10\times$.
- **Agregación a bordo en VIIRS:** VIIRS aplica esquemas de agregación de detectores (3:1 cerca del nadir, 2:1 a ángulos intermedios, 1:1 en los bordes), limitando el crecimiento del píxel a un factor de solo $2\times$ ($375\text{ m} \times 375\text{ m}$ a $\approx 800\text{ m} \times 800\text{ m}$).
- **Consecuencia:** Tratar los focos de calor como puntos adimensionales (latitud/longitud única) introduce un error espacial masivo en los extremos del barrido. Es imperativo reconstruir el polígono real del píxel usando los atributos `scan` y `track`.

### 2.4 El Caso de Estudio: "El Efecto 2012 en la Chiquitanía" (Santa Cruz, Bolivia)
La Chiquitanía boliviana es una región de transición ecológica globalmente vital entre la selva amazónica y el bosque seco chaqueño. Durante los últimos 25 años, ha sufrido megaincendios recurrentes (notablemente en 2010, 2019, 2020, 2024 y 2026).
- Los analistas gubernamentales y medios de comunicación han comparado erróneamente los registros de MODIS de 2010 con los registros de VIIRS de 2019/2024, concluyendo falsamente que hubo un incremento de $400\%$ en la cantidad de fuegos, cuando gran parte del incremento correspondía a la mayor resolución de VIIRS.
- Esta distorsión ha debilitado la formulación de políticas públicas, imposibilitando distinguir entre la intensificación real del cambio climático y el mero recambio tecnológico satelital.

---

## 3. Usuarios Objetivo y Personas

Para garantizar que PyrosHarmonizer atienda las necesidades reales del ecosistema de gestión del fuego, se definen cuatro arquetipos de usuario detallados:

### 3.1 Persona 1: Investigadora en Cambio Climático
- **Nombre:** Dra. Elena Morales
- **Cargo:** Investigadora Titular en Dinámica de Ecosistemas y Modelado de Fuego
- **Institución:** CIAT / Universidad Autónoma Gabriel René Moreno (UAGRM)
- **Perfil Técnico:** Experta en Python, R, Jupyter Notebooks, QGIS y análisis estadístico multianual.
- **Objetivos:**
  - Analizar series temporales homogéneas de anomalías de fuego de 2000 a 2026 para correlacionarlas con eventos ENSO (El Niño / La Niña) y sequías meteorológicas.
  - Generar balances de emisiones de gases de efecto invernadero ($CO_2$, $CH_4$) sin sesgos de detección.
- **Puntos de Dolor:**
  - Pérdida de semanas limpiando y normalizando scripts para remover el salto artificial de 2012.
  - Incompatibilidad matemática al integrar tablas de FRP de MODIS y VIIRS en modelos de biomasa consumida.
- **Necesidades en PyrosHarmonizer:**
  - Acceso a un índice unificado de energía radiativa (**HFII**).
  - Exportación de series temporales en CSV/GeoJSON con métricas de incertidumbre y algoritmos transparentes y reproducibles.

### 3.2 Persona 2: Comandante de Brigada de Bomberos Forestales
- **Nombre:** Cap. Marcelo "Tigre" Roca
- **Cargo:** Comandante Operativo de Incendios Forestales
- **Institución:** Bomberos Voluntarios Quebracho / Dirección de Recursos Naturales (DIRENA)
- **Perfil Técnico:** Usuario pragmático en campo; utiliza tabletas reforzadas y teléfonos móviles con conexiones intermitentes; requiere mapas visuales directos y sin ambigüedades.
- **Objetivos:**
  - Determinar si múltiples detecciones corresponden a un solo frente de fuego continuo o a focos dispersos intencionales.
  - Conocer la dirección de avance y la intensidad calórica relativa para posicionar cuadrillas de ataque directo e indirecto.
- **Puntos de Dolor:**
  - El visualizador estándar de FIRMS muestra una "nube densa" de 50 puntos rojos sobre un mismo predio, saturando la pantalla y confundiendo a los despachadores sobre la verdadera escala del siniestro.
  - Incertidumbre sobre el tamaño real del perímetro activo durante la noche.
- **Necesidades en PyrosHarmonizer:**
  - Agrupamiento poligonal automático (Convex Hull) de fuegos en tiempo casi real (NRT).
  - Clasificación clara de intensidad de frente de fuego y exportación liviana para navegación táctica fuera de línea.

### 3.3 Persona 3: Directora de Gestión Territorial y Medio Ambiente
- **Nombre:** Lic. Patricia Arteaga
- **Cargo:** Directora Departamental de Ordenamiento Territorial y Medio Ambiente
- **Institución:** Gobierno Autónomo Departamental de Santa Cruz
- **Perfil Técnico:** Gestora institucional; requiere reportes ejecutivos consolidados, gráficos de tendencias macro, indicadores de cumplimiento normativo y cuadros de mando interactivos.
- **Objetivos:**
  - Determinar fechas exactas de inicio de la temporada de chaqueos ilegales por municipio para emitir resoluciones de pausa ambiental.
  - Justificar técnicamente declaratorias de desastre departamental ante el Viceministerio de Defensa Civil.
- **Puntos de Dolor:**
  - Los reportes basados en datos crudos de VIIRS son cuestionados por sectores productivos alegando que "los satélites nuevos exageran las quemas".
  - Falta de un calendario estandarizado que demuestre la recurrencia estacional histórica en áreas protegidas.
- **Necesidades en PyrosHarmonizer:**
  - **Calendario de Actividad de Quemas** con código semafórico de anomalías estacionales ($z\text{-score}$).
  - Generador automático de reportes ejecutivos en PDF de un solo clic por municipio y provincia.

### 3.4 Persona 4: Analista de Centro de Monitoreo Satelital
- **Nombre:** Ing. Diego Vargas
- **Cargo:** Especialista en Teledetección y Alerta Temprana
- **Institución:** Sistema de Información y Monitoreo de Bosques (SIMB) / SERNAP
- **Perfil Técnico:** Experto en PostGIS, GeoServer, APIs REST geoespaciales y visualizadores WebGIS avanzados.
- **Objetivos:**
  - Alimentar la base de datos geoespacial institucional con capas depuradas y de alta calidad técnica cada 3 horas.
  - Filtrar eficientemente falsas alarmas, pozos petroleros/gasoductos y reflexiones térmicas de suelo desnudo.
- **Puntos de Dolor:**
  - Ingesta manual y procesamiento lento de archivos CSV gigantescos descargados de NASA FIRMS.
  - Limitación de visualización en el navegador al renderizar más de 20,000 puntos vectoriales simultáneos.
- **Necesidades en PyrosHarmonizer:**
  - Pipeline automatizado de conexión con la API de FIRMS mediante `MAP_KEY`.
  - Capas agregadas en grillas hexagonales **Uber H3** servidas a través de API REST optimizada con paginación y renderizado en GPU vía Deck.gl.

---

## 4. Requisitos Funcionales (FR-001 a FR-026)

La siguiente matriz detalla exhaustivamente los requerimientos funcionales del sistema. Las prioridades se definen bajo el estándar MoSCoW (*Must Have, Should Have, Could Have, Won't Have* para esta versión).

| ID | Módulo | Requisito Funcional | Descripción Técnica Detallada | Entradas / Salidas | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-001** | Ingesta | Ingesta de Archivos Históricos MODIS | Carga por lotes de archivos CSV de NASA FIRMS Archive correspondientes a MODIS C6.1 (plataformas Terra y Aqua) desde el año 2000 al presente. | **In:** CSVs FIRMS MODIS<br>**Out:** Registros estructurados en PostgreSQL | **Must Have** |
| **FR-002** | Ingesta | Ingesta de Archivos Históricos VIIRS 375m | Carga por lotes de archivos CSV de VIIRS 375m provenientes de Suomi-NPP (2012+), NOAA-20 (2018+) y NOAA-21 (2023+). | **In:** CSVs FIRMS VIIRS<br>**Out:** Registros estructurados en PostgreSQL | **Must Have** |
| **FR-003** | Ingesta | Conexión API REST NASA FIRMS NRT | Sincronización programada y bajo demanda contra la API REST de NASA FIRMS utilizando autenticación mediante `MAP_KEY` para obtener detecciones de las últimas 24h, 48h y 7 días. | **In:** `MAP_KEY`, Bounding Box, Área<br>**Out:** JSON/GeoJSON procesado | **Must Have** |
| **FR-004** | Calidad | Filtrado Multicriterio de Confianza | Descarte automatizado de detecciones no confiables: en MODIS, registros con `confidence < 30%`; en VIIRS, registros con `confidence = 'low'`. Preservación de banderas para trazabilidad. | **In:** Tablas crudas de focos<br>**Out:** Tabla filtrada con flag de calidad | **Must Have** |
| **FR-005** | Calidad | Enmascaramiento de Anomalías Estáticas | Identificación y exclusión espacial de fuentes térmicas no asociadas a biomasa (quemas en mecheros de gas/petróleo, plantas industriales, actividad volcánica activa) mediante catálogo de máscaras estáticas. | **In:** Catálogo de máscaras térmicas fijas<br>**Out:** Puntos de quema vegetal depurados | **Must Have** |
| **FR-006** | Armonización | Clustering Espacio-Temporal ST-DBSCAN | Ejecución del algoritmo ST-DBSCAN para agrupar detecciones que coexisten en un radio espacial $\varepsilon_{\text{spatial}} \in [500\text{ m}, 1000\text{ m}]$ y una ventana temporal $\varepsilon_{\text{temporal}} \in [3\text{ h}, 4\text{ h}]$. | **In:** Puntos depurados (lat, lon, datetime)<br>**Out:** Identificador unificado de cluster `cluster_id` | **Must Have** |
| **FR-007** | Armonización | Fusión Poligonal de Eventos (Convex Hull) | Generación del perímetro envolvente de cada cluster mediante `ST_ConvexHull` en PostGIS. Para clusters de 1 solo punto, generación de un buffer poligonal basado en su huella de escaneo. | **In:** Puntos agrupados por `cluster_id`<br>**Out:** Geometría poligonal (`MULTIPOLYGON` EPSG:4326) | **Must Have** |
| **FR-008** | Armonización | Reconstrucción Geométrica Real ($scan \times track$) | Reconstrucción de la elipse/polígono del píxel real a partir de las columnas `scan` (ancho en km perpendicular a la órbita) y `track` (largo en km paralelo a la órbita) para modelar la deformación periférica. | **In:** `scan`, `track`, lat, lon, heading satelital<br>**Out:** Huella física orientada | **Must Have** |
| **FR-009** | Armonización | Calibración Energética FRP $\rightarrow$ HFII | Conversión del Fire Radiative Power (MW) al Índice Armonizado de Intensidad de Fuego (**HFII**) aplicando regresiones no lineales calibradas empíricamente entre pares coincidentes MODIS/VIIRS. | **In:** FRP crudo, sensor, geometría de píxel<br>**Out:** HFII normalizado (adimensional / MW-eq) | **Must Have** |
| **FR-010** | Armonización | Ponderación Temporal Diferenciada Día/Noche | Ajuste del cálculo de HFII y umbrales de agrupamiento considerando el atributo `daynight` ('D' vs 'N'), compensando la menor radiancia de fondo y mayor contraste térmico nocturno. | **In:** Atributo `daynight`, hora local de pase<br>**Out:** Factor de ponderación térmica diurna/nocturna | **Should Have** |
| **FR-011** | Armonización | Corrección por Ángulo Cenital y Área de Píxel | Normalización de la energía radiativa en función del ángulo cenital de observación y el crecimiento del área del píxel hacia los extremos del barrido (*off-nadir expansion factor*). | **In:** Coordenadas de barrido, ángulo cenital<br>**Out:** FRP calibrado por área real ($MW/\text{km}^2$) | **Should Have** |
| **FR-012** | Agregación | Indexación Hexagonal Uber H3 | Asignación espacial de cada evento armonizado a celdas hexagonales del sistema espacial jerárquico Uber H3 en Resoluciones 7 ($\approx 5.16\text{ km}^2$) y 8 ($\approx 0.74\text{ km}^2$). | **In:** Coordenadas centroidales / geometrías<br>**Out:** Índices H3 (`h3_index` hexadecimal) | **Must Have** |
| **FR-013** | Agregación | Métricas de Densidad HFII/km² por Celda H3 | Cálculo dinámico por celda hexagonal de la suma de HFII, conteo de eventos armonizados únicos, densidad de energía por $\text{km}^2$ y duración del evento en horas. | **In:** Eventos agrupados por celda H3 y fecha<br>**Out:** Capa de agregación estadística H3 | **Must Have** |
| **FR-014** | Calendario | Calendario de Actividad de Quemas (Matriz Anual) | Visualización tipo mapa de calor matricial (meses vs años, días del año vs años) que despliega la intensidad agregada de quemas, permitiendo identificar la evolución del régimen. | **In:** Series históricas H3 / Municipal<br>**Out:** Matriz interactiva de actividad anual | **Must Have** |
| **FR-015** | Calendario | Timeline Multianual Interactiva (2000-2026) | Componente interactivo de línea de tiempo con selector de rango de fechas, zoom temporal y reproducción cronológica animada de la progresión de incendios. | **In:** Rango temporal seleccionado<br>**Out:** Filtrado reactivo de capas cartográficas | **Must Have** |
| **FR-016** | Calendario | Detección de Anomalías Estadísticas ($z\text{-score}$)| Cálculo del $z\text{-score}$ para cada mes y celda frente a la media y desviación estándar histórica (2000-2025): $Z = (X - \mu) / \sigma$. Resaltado de valores $Z > +2$ (anomalía crítica). | **In:** Serie temporal histórica por celda<br>**Out:** Clasificación semafórica de anomalía | **Must Have** |
| **FR-017** | Visualización | Mapa Interactivo Multicapa con Toggles | Visualizador cartográfico que permite alternar independientemente capas: MODIS crudo, VIIRS crudo, Cúmulos Armonizados, Grillas H3 y límites administrativos. | **In:** Capas vectoriales y rasterizadas<br>**Out:** Mapa renderizado en Mapbox GL JS | **Must Have** |
| **FR-018** | Visualización | Renderizado GPU Acelerado con Deck.gl | Motor de renderizado en cliente basado en WebGL/WebGPU capaz de renderizar fluidamente más de 100,000 entidades simultáneas (puntos, polígonos y hexágonos H3) a 60 FPS. | **In:** GeoJSON / Binary Arrow de eventos<br>**Out:** Capas Deck.gl (`H3HexagonLayer`, `PolygonLayer`) | **Must Have** |
| **FR-019** | Visualización | Vista Comparativa Dividida (*Split-Screen*) | Modo de visualización con divisor deslizante (*swipe-divider*) sincronizado para comparar cara a cara los datos crudos discontinuos (izquierda) vs. datos armonizados Pyros (derecha). | **In:** Estados de mapa sincronizados<br>**Out:** Vista comparativa antes/después | **Must Have** |
| **FR-020** | Exportación | Exportación Vectorial GeoJSON / Shapefile | Descarga de eventos de fuego armonizados filtrados por fecha y zona en formatos estándar GeoJSON y ESRI Shapefile comprimido en ZIP. | **In:** Parámetros de consulta y filtros<br>**Out:** Archivo GeoJSON / Shapefile descargable | **Must Have** |
| **FR-021** | Exportación | Exportación Tabular CSV con Columnas HFII | Descarga de datos armonizados en formato CSV incluyendo metadatos de calibración, identificadores de cluster, número de fuentes fusionadas y valor final de HFII. | **In:** Rango de consulta seleccionado<br>**Out:** Archivo CSV plano estructurado | **Must Have** |
| **FR-022** | Reportabilidad | Generador de Reporte Ejecutivo en PDF | Generación en un clic de un informe sintético en PDF que incluye mapa estático, resumen de eventos, anomalías detectadas, métricas de HFII y comparativa histórica por municipio. | **In:** Filtro municipal y temporal<br>**Out:** Documento PDF descargable formateado | **Should Have** |
| **FR-023** | Interoperabilidad | API REST Completa con Paginación y Filtros | Endpoints HTTP RESTful bajo especificación OpenAPI/Swagger documentando operaciones de consulta, agregación H3, descarga y metadatos con paginación por cursor. | **In:** Peticiones HTTP GET estructuradas<br>**Out:** Respuestas JSON serializadas | **Must Have** |
| **FR-024** | Filtrado | Filtros Espaciales por Ecorregión y Municipio | Módulo de filtrado que permite acotar análisis a divisiones político-administrativas (municipios de Santa Cruz) y ecorregiones (Chiquitanía, Chaco, Amazonía, Pantanal). | **In:** Polígonos de límites oficiales<br>**Out:** Consulta espacial acotada (`ST_Intersects`) | **Must Have** |
| **FR-025** | Monitoreo | Monitoreo en Tiempo Casi Real (NRT) | Panel de comando operativo que despliega exclusivamente las alertas detectadas en las últimas 24h, 48h y 7 días, recalculando clusters a medida que arriban nuevos pases satelitales. | **In:** Ingesta programada FIRMS NRT<br>**Out:** Tablero de situación táctica actualizada | **Must Have** |
| **FR-026** | Calibración | Inspector de Cluster y Trazabilidad de Puntos | Modal o panel lateral interactivo al hacer clic en un evento armonizado que desglosa los puntos originales de MODIS y VIIRS que conformaron el polígono, con sus FRP individuales. | **In:** Evento click sobre geometría armonizada<br>**Out:** Desglose interactivo de fuentes originales | **Should Have** |

---

## 5. Fundamentación Matemática y Algorítmica

### 5.1 Algoritmo ST-DBSCAN de Armonización
El agrupamiento de detecciones se formula mediante una métrica de distancia espacio-temporal normalizada entre dos detecciones $p_1 = (lat_1, lon_1, t_1)$ y $p_2 = (lat_2, lon_2, t_2)$:

$$D_{ST}(p_1, p_2) = \sqrt{ \left( \frac{d_{geo}(p_1, p_2)}{\varepsilon_{spatial}} \right)^2 + \left( \frac{|t_1 - t_2|}{\varepsilon_{temporal}} \right)^2 }$$

Donde:
- $d_{geo}(p_1, p_2)$ es la distancia geodésica calculada sobre el elipsoide WGS84 (usando la fórmula de Vincenty o la distancia elipsoidal en PostGIS `ST_Distance`).
- $\varepsilon_{spatial}$ es el umbral de distancia física, configurado por defecto en $1000\text{ m}$ (para cubrir la huella del píxel nominal de MODIS) y configurable a $500\text{ m}$ para clusters densos de VIIRS.
- $\varepsilon_{temporal}$ es la ventana temporal máxima, configurada en $3.5\text{ horas}$ ($\approx 210\text{ minutos}$), que corresponde a la separación típica entre pases consecutivos de las órbitas de Terra, Aqua y Suomi-NPP / NOAA-20.
- Dos detecciones pertenecen al mismo vecindario si $D_{ST}(p_1, p_2) \le 1.0$.

### 5.2 Reconstrucción de la Huella Real del Píxel ($scan \times track$)
En lugar de tratar las detecciones como puntos centroidales sin dimensiones, cada píxel se proyecta espacialmente a partir de los parámetros `scan` ($s$) y `track` ($t$) reportados por FIRMS:

$$\text{Semieje mayor} = \frac{s}{2}, \quad \text{Semieje menor} = \frac{t}{2}$$

El área física aproximada de la huella elipsoidal es:

$$\text{Área}_{\text{pixel}} = \pi \cdot \left(\frac{s}{2}\right) \cdot \left(\frac{t}{2}\right)$$

Al agregarse en un cluster mediante `ST_ConvexHull` en PostGIS, la huella fusionada abarca la unión de las envolventes de los píxeles constituyentes, eliminando solapamientos y duplicaciones de área.

### 5.3 Función de Transferencia y Calibración: Índice Armonizado de Intensidad de Fuego (HFII)
Para subsanar la diferencia en la respuesta radiométrica de ambos sensores, se formula el **HFII**:

$$\text{HFII} = \sum_{i \in \text{Cluster}} \left[ \omega_{sensor}(i) \cdot \text{FRP}_i \cdot \psi(scan_i, track_i) \cdot \kappa_{daynight}(i) \right]$$

Donde:
- $\omega_{sensor}$: Factor de ponderación instrumental calibrado por regresión logística y de potencia entre sobrepasos simultáneos ($\omega_{\text{MODIS}} = 1.0$ como línea base de referencia histórica; $\omega_{\text{VIIRS}} \approx 0.68 - 0.75$ para compensar la mayor densidad de detección en fuegos medianos).
- $\psi(scan, track)$: Factor de corrección geométrica por deformación fuera del nadir: $\psi = \frac{1}{\sqrt{scan \times track}}$.
- $\kappa_{daynight}$: Coeficiente de ajuste por contraste térmico diurno/nocturno ($\kappa_{\text{day}} = 1.0$, $\kappa_{\text{night}} = 1.15$ para balancear la menor radiancia de fondo durante la noche).
- Para clusters compuestos por múltiples detecciones de VIIRS concurrentes con una detección de MODIS, el algoritmo aplica un filtro de promedio ponderado que evita la sumatoria inflada de energía, asegurando continuidad con los valores registrados entre 2000 y 2011.

### 5.4 Detección de Anomalías Históricas en el Calendario de Quemas ($z\text{-score}$)
Para cada unidad espacial (celda H3 o municipio $m$) y cada mes del año $k \in [1, 12]$:

$$Z_{m, k, y} = \frac{\text{HFII}_{m, k, y} - \mu_{m, k}}{\sigma_{m, k}}$$

Donde:
- $\text{HFII}_{m, k, y}$ es la energía acumulada en el mes $k$ del año $y$.
- $\mu_{m, k}$ es la media histórica mensual calculada sobre el período base homogeneizado 2000-2025.
- $\sigma_{m, k}$ es la desviación estándar histórica mensual para dicho mes.
- **Clasificación Semafórica del Calendario:**
  - $Z \le 0$: Actividad normal / por debajo de la media histórica (Verde).
  - $0 < Z \le 1$: Moderadamente sobre la media (Amarillo).
  - $1 < Z \le 2$: Anomalía alta / alerta temprana (Naranja).
  - $Z > 2$: Anomalía extrema / emergencia crítica (Rojo intenso).

---

## 6. Requisitos No Funcionales (NFR-001 a NFR-012)

| ID | Categoría | Requisito No Funcional | Métrica / Criterio de Aceptación |
| :--- | :--- | :--- | :--- |
| **NFR-001** | Rendimiento | Tiempo de Respuesta en Consultas Espaciales | El 95% de las peticiones a la API para datos agregados en celdas H3 dentro de un municipio y rango de 1 año deben responder en $\le 1.8\text{ segundos}$. |
| **NFR-002** | Rendimiento | Tasa de Cuadros en Visualización (FPS) | El renderizado interactivo en el cliente mediante Deck.gl debe sostener al menos $45\text{ FPS}$ (óptimo $60\text{ FPS}$) con hasta 100,000 puntos cargados en memoria gráfica. |
| **NFR-003** | Escalabilidad | Capacidad de Almacenamiento y Crecimiento | La base de datos PostgreSQL/PostGIS debe soportar un volumen histórico superior a $15\text{ millones}$ de registros individuales sin degradación de índices espaciales GiST. |
| **NFR-004** | Escalabilidad | Particionado de Datos Espacio-Temporales | Las tablas de detecciones deben estar particionadas por rangos anuales (`RANGE (acq_date)`), permitiendo búsquedas instantáneas mediante poda de particiones (*partition pruning*). |
| **NFR-005** | Disponibilidad | Disponibilidad y Tolerancia a Fallos | La infraestructura desplegada en Railway (Backend/DB) y Vercel (Frontend) debe mantener un SLA del $99.5\%$ durante el período de evaluación del hackathon. |
| **NFR-006** | Disponibilidad | Resiliencia ante Desconexión de NASA FIRMS | Si la API de NASA FIRMS no responde o experimenta cortes, el sistema debe utilizar caché en base de datos local y advertir al usuario mediante un banner no bloqueante. |
| **NFR-007** | Seguridad | Almacenamiento Seguro de Credenciales | La clave privada `MAP_KEY` de NASA FIRMS, las credenciales de PostgreSQL y el token de Mapbox deben almacenarse en variables de entorno seguras (`.env`), nunca en el cliente o repo. |
| **NFR-008** | Seguridad | Mitigación de Vulnerabilidades Web | Cumplimiento de OWASP Top 10: sanitización estricta de consultas SQL (uso de SQLAlchemy / consultas parametrizadas), protección CORS restringida y validación de esquemas con Pydantic. |
| **NFR-009** | Accesibilidad | Cumplimiento WCAG 2.1 Nivel AA | Interfaz diseñada bajo directrices de contraste de color accesibles, etiquetas ARIA en controles interactivos y navegación completa por teclado en formularios y filtros. |
| **NFR-010** | Accesibilidad | Paletas de Color Seguras para Daltonismo | Las visualizaciones de calor, gradientes de FRP y métricas HFII deben utilizar paletas científicas perceptualmente uniformes y aptas para daltónicos (*Viridis*, *Magma*, *Inferno*, *Cividis*). |
| **NFR-011** | Internacionalización | Soporte Bilingüe Completo (i18n) | Soporte de interfaz completamente internacionalizado en Español (idioma primario para Bolivia y Sudamérica) e Inglés (idioma requerido para evaluación global de NASA). |
| **NFR-012** | Portabilidad | Diseño Responsivo y Multi-Dispositivo | Interfaz adaptable a pantallas de escritorio ($1920\times1080$ o superior para centros de monitoreo), computadoras portátiles y tabletas táctiles ($1024\times768$) utilizadas en terreno. |

---

## 7. Historias de Usuario

A continuación se presentan 10 historias de usuario representativas que abarcan todo el espectro funcional de PyrosHarmonizer, detalladas con criterios de aceptación en formato *Given-When-Then* (Dado-Cuando-Entonces).

### US-01: Reconstrucción de Series Temporales Continuas
- **Como** investigadora de cambio climático,
- **Quiero** consultar la serie temporal de focos de calor agregada por año desde 2000 hasta 2026 en el municipio de San Ignacio de Velasco,
- **Para** evaluar tendencias reales de fuego a largo plazo sin que la gráfica presente el salto artificial generado por la incorporación de VIIRS en 2012.
- **Criterios de Aceptación:**
  - *Dado* que selecciono el municipio de San Ignacio de Velasco y el rango 2000-2026.
  - *Cuando* activo la opción "Serie Armonizada PyrosHarmonizer",
  - *Entonces* el sistema despliega una curva unificada donde el ratio de transición entre 2011 (MODIS) y 2012 (VIIRS armonizado) no excede un factor de cambio instrumental anómalo, mostrando una prueba estadística de continuidad homogénea.

### US-02: Priorización Operativa de Frentes de Fuego en NRT
- **Como** comandante de brigada de bomberos forestales,
- **Quiero** visualizar las detecciones satelitales de las últimas 24 horas agrupadas en perímetros poligonales con un valor de intensidad de fuego (HFII) clasificado,
- **Para** asignar recursos de combate y maquinaria pesada al frente de mayor liberación de energía calorífica sin confundirme por una maraña de puntos dispersos.
- **Criterios de Aceptación:**
  - *Dado* que abro el panel de Monitoreo NRT con filtro de 24 horas,
  - *Cuando* el sistema detecta 20 píxeles de VIIRS contiguos a un píxel de MODIS en un radio menor a 1 km,
  - *Entonces* el mapa muestra un único polígono delimitado con su nivel de riesgo semafórico, el valor HFII consolidado y el área aproximada en hectáreas.

### US-03: Zonificación de Riesgos y Regulación de Quemas
- **Como** directora de gestión territorial,
- **Quiero** consultar el Calendario de Actividad de Quemas en formato de matriz mensual histórica para las Áreas Protegidas de Santa Cruz,
- **Para** emitir una resolución administrativa fundamentada que prohíba las quemas agropecuarias a partir de la semana exacta en que históricamente inician las anomalías críticas.
- **Criterios de Aceptación:**
  - *Dado* que selecciono la capa del Parque Nacional Noel Kempff Mercado,
  - *Cuando* genero el Calendario de Actividad de Quemas,
  - *Entonces* la matriz despliega celdas coloreadas según el $z\text{-score}$ histórico mensual, destacando en rojo los meses donde la intensidad superó 2 desviaciones estándar sobre la media histórica.

### US-04: Comparativa Visual Cara a Cara (*Split-Screen*)
- **Como** analista de centro de monitoreo ambiental,
- **Quiero** utilizar una vista de pantalla dividida con control deslizante que compare los datos crudos de NASA FIRMS (MODIS + VIIRS superpuestos) contra los eventos armonizados de PyrosHarmonizer,
- **Para** demostrar visualmente a auditores y directores la efectividad de la reducción del sobre-conteo y la reconstrucción geométrica.
- **Criterios de Aceptación:**
  - *Dado* que me ubico en el incendio de Roboré de agosto de 2024,
  - *Cuando* activo la herramienta "Split-Screen",
  - *Entonces* el panel izquierdo muestra 150 puntos dispersos crudos de MODIS/VIIRS con etiquetas solapadas y el panel derecho muestra 8 clusters poligonales limpios con HFII normalizado, moviéndose ambos mapas con paneo y zoom 100% sincronizados.

### US-05: Filtrado de Falsas Alarmas e Instalaciones Industriales
- **Como** analista satelital de monitoreo de bosques,
- **Quiero** que el sistema excluya automáticamente las anomalías térmicas provenientes de los mecheros de quema de gas en pozos hidrocarburíferos de Camiri y refinerías,
- **Para** no alterar las estadísticas de quemas de cobertura vegetal ni disparar alertas falsas de incendios forestales.
- **Criterios de Aceptación:**
  - *Dado* que se procesa una ingesta diaria de FIRMS con anomalías ubicadas en coordenadas de instalaciones industriales registradas,
  - *Cuando* el pipeline aplica el filtro `FR-005`,
  - *Entonces* esas detecciones son marcadas con el tag `static_anomaly_masked` y excluidas del cálculo de HFII y del Calendario de Quemas.

### US-06: Consulta Espacial por Grilla Hexagonal H3
- **Como** especialista en SIG y planificación territorial,
- **Quiero** visualizar la densidad de incendios y la energía HFII acumulada agrupada en celdas hexagonales Uber H3 de resolución 7 y 8,
- **Para** realizar análisis espaciales multivariados estandarizados libres de las deformaciones geométricas de las grillas cuadradas cartesianas tradicionales.
- **Criterios de Aceptación:**
  - *Dado* que el usuario activa la capa de agregación H3,
  - *Cuando* hace zoom in a nivel departamental,
  - *Entonces* se visualizan hexágonos de resolución 7, y al aproximarse a nivel comunal/predial, el sistema conmuta automáticamente a resolución 8, mostrando en un tooltip la suma de HFII y número de eventos únicos.

### US-07: Inspección Detallada de Trazabilidad de un Cluster
- **Como** auditor científico de datos espaciales,
- **Quiero** hacer clic en un polígono de evento armonizado y ver una lista detallada de cada punto satelital original que lo conformó (con su satélite, instrumento, hora de adquisición, scan, track y FRP),
- **Para** verificar la precisión y transparencia del algoritmo de fusión ST-DBSCAN.
- **Criterios de Aceptación:**
  - *Dado* que hago clic sobre un polígono armonizado en el mapa,
  - *Cuando* se abre el modal "Trazabilidad de Detecciones",
  - *Entonces* el mapa resalta los puntos centroidales originales de MODIS (círculos azules) y VIIRS (círculos naranjas) contenidos en la envolvente, mostrando una tabla desglosada con todos los atributos originales del CSV de FIRMS.

### US-08: Descarga Vectorial para Integración en SIG Local
- **Como** técnico de SIG en la Dirección de Medio Ambiente municipal,
- **Quiero** descargar los datos armonizados de mi municipio en formato GeoJSON o Shapefile para un mes específico,
- **Para** abrirlos en QGIS y cruzarlos con la capa catastral de propiedades privadas y concesiones forestales.
- **Criterios de Aceptación:**
  - *Dado* que aplico un filtro para el municipio de Concepción durante septiembre de 2026,
  - *Cuando* presiono el botón "Exportar GeoJSON",
  - *Entonces* el sistema descarga en menos de 3 segundos un archivo `.geojson` válido conteniendo los atributos `cluster_id`, `hfii`, `area_ha`, `start_time`, `end_time` y `source_count`.

### US-09: Generación Automatizada de Reporte Ejecutivo en PDF
- **Como** director del Centro de Operaciones de Emergencia Departamental (COED),
- **Quiero** generar un informe consolidado en formato PDF de 2 páginas con gráficos, mapas y estadísticas del estado de situación de incendios en el departamento,
- **Para** presentarlo en la reunión de gabinete del gobernador cada mañana a las 07:00 AM.
- **Criterios de Aceptación:**
  - *Dado* que selecciono la opción "Generar Reporte Diario de Situación",
  - *Cuando* se ejecuta la compilación en backend,
  - *Entonces* se descarga un documento PDF estilizado con el logo institucional, tabla de municipios más afectados, métricas de HFII frente al promedio histórico y recomendaciones de alerta temprana.

### US-10: Consumo Automatizado de Datos Vía API REST
- **Como** desarrollador de software de una ONG de conservación,
- **Quiero** consumir endpoints REST seguros con soporte de paginación y parámetros geoespaciales (`bbox`, fechas, resolución H3),
- **Para** alimentar un bot de mensajería instantánea (Telegram/WhatsApp) que alerta automáticamente a comunidades indígenas sobre incendios cercanos.
- **Criterios de Aceptación:**
  - *Dado* que realizo una petición `GET /api/v1/harmonized/events?bbox=-62.5,-18.2,-60.1,-15.5&start_date=2026-11-01`,
  - *Cuando* la API procesa la consulta,
  - *Entonces* retorna una respuesta HTTP 200 con payload JSON paginado (`total_count`, `next_cursor`, `results`), documentado bajo estándar OpenAPI 3.0.

---

## 8. Arquitectura y Stack Tecnológico

La arquitectura de PyrosHarmonizer sigue un modelo desacoplado y reactivo de alto rendimiento:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FUENTES DE DATOS                               │
│       NASA FIRMS Archive (CSV)      &      NASA LANCE / FIRMS API (NRT)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ MAP_KEY / Ingesta batch
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND: MOTOR DE ARMONIZACIÓN                       │
│                        (Python 3.12 + FastAPI + PostGIS)                    │
│                                                                             │
│  [Pipeline ETL] ──> [Filtro Confianza] ──> [Máscara Anomalías Estáticas]   │
│                                                          │                  │
│  [Fusión Poligonal] <── [ST-DBSCAN Cluster] <────────────┘                  │
│          │                                                                  │
│          ├──> [Reconstrucción Geométrica Scan x Track]                      │
│          ├──> [Calibración FRP -> HFII]                                     │
│          └──> [Agregación Hexagonal Uber H3 (Res 7 y 8)]                   │
│                                                                             │
│  Base de Datos: PostgreSQL 16 + PostGIS 3.4 (Índices GiST, Particionada)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ GeoJSON / Arrow / REST API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND: VISUALIZADOR WEB                           │
│                     (Next.js 14 / React 18 + Tailwind CSS)                  │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │   Mapa Interactivo      │  │      Calendario de Quemas (Matriz)       │  │
│  │   Mapbox GL JS          │  │      Heatmap mensual/anual               │  │
│  │   Deck.gl (Acel. GPU)   │  │      Detección de anomalías (Z-Score)   │  │
│  │   Split-Screen Swipe    │  │      Recharts / Plotly                   │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Componentes Principales
1. **Base de Datos:** PostgreSQL 16 + PostGIS 3.4
   - Extensiones espaciales: `postgis`, `postgis_raster`.
   - Indexación espacial de alto rendimiento: Índices R-Tree / GiST (`CREATE INDEX idx_focos_geom ON focos USING GIST (geom);`).
   - Particionado declarativo por año sobre `acq_date` para optimizar consultas en series históricas de 2000 a 2026.
2. **Backend:** Python 3.12 con FastAPI
   - Procesamiento geoespacial: `GeoPandas`, `Shapely`, `PyProj`.
   - Agrupamiento y ciencia de datos: `Scikit-Learn` (DBSCAN), `NumPy`, `Pandas`.
   - Indexación espacial hexagonal: `h3-py` (Uber H3 binding nativo).
3. **Frontend:** React 18 / Next.js 14 con App Router y Tailwind CSS
   - Renderizado cartográfico: `Mapbox GL JS` (mapas base topográficos y satelitales) y `Deck.gl` (`H3HexagonLayer`, `GeoJsonLayer`, `PolygonLayer`).
   - Visualización analítica: `Recharts` y `Plotly.js` para matrices de calor y series cronológicas.
   - Componente Split-Screen: Integración optimizada de divisores interactivos mediante `mapbox-gl-compare`.
4. **Infraestructura y Despliegue:**
   - **Backend & Base de Datos:** Railway (contenedores Docker optimizados con compilación PostGIS nativa).
   - **Frontend:** Vercel (distribución perimetral global mediante Edge Network).
   - **Integración Continua:** GitHub Actions para pruebas automatizadas y análisis de calidad de código.

---

## 9. Métricas de Éxito y KPIs del Producto

Para validar la efectividad de la solución durante el hackathon y en su posterior adopción científica, se establecen los siguientes indicadores clave de rendimiento (KPIs):

| KPI | Métrica | Línea Base (Datos Crudos) | Meta PyrosHarmonizer | Método de Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **KPI-01** | Reducción del Sobre-conteo Artificial de VIIRS | Ratio de conteo VIIRS/MODIS entre $3.0$ y $5.2$ para el mismo frente de fuego. | Ratio Armonizado $R \in [0.95, 1.15]$ frente a frentes de incendio de referencia. | Comparación contra perímetros de cicatrices de área quemada validadas (Sentinel-2 / Landsat). |
| **KPI-02** | Continuidad Temporal de la Serie Histórica | Ruptura estructural estadísticamente significativa en 2012 ($p < 0.001$ en test de Chow / Pettitt). | Ausencia de quiebre estructural instrumental artificial ($p > 0.05$ en test de Chow). | Test econométrico de cambio estructural sobre la serie mensual 2000-2026. |
| **KPI-03** | Consistencia Energética de FRP / HFII | Dispersión $R^2 < 0.45$ entre la suma de FRP de VIIRS y el FRP del píxel coincidente de MODIS. | Coeficiente de determinación $R^2 \ge 0.82$ entre HFII agregado y mediciones radiométricas de control. | Regresión multivariada sobre 1,000 pares de sobrepasos cuasi-simultáneos ($\Delta t < 30\text{ min}$). |
| **KPI-04** | Latencia de Consulta Geoespacial | $> 8.5\text{ segundos}$ en consultas espaciales crudas sobre $1\text{ millón}$ de puntos. | $\le 1.8\text{ segundos}$ para consultas espaciales en ventanas de 1 año con agregación H3. | Pruebas de estrés y benchmarking con Apache JMeter / Locust. |
| **KPI-05** | Rendimiento Gráfico en Cliente | Caída a $< 10\text{ FPS}$ o congelamiento del navegador con $> 15,000$ puntos en Leaflet/OpenLayers. | $\ge 45\text{ FPS}$ estables con $100,000$ entidades procesadas concurrentemente vía Deck.gl. | Medición de framerate con Chrome DevTools Performance Profiler. |
| **KPI-06** | Precisión de Detección de Anomalías Estacionales | Falsas alarmas recurrentes en meses fríos por comparación de valores absolutos no normalizados. | Detección precisa de anomalías con $|Z| > 2$ validada contra reportes oficiales de emergencias de la Gobernación. | Matriz de confusión frente a las declaratorias oficiales de alerta roja de Santa Cruz. |

---

## 10. Fuera de Alcance (*Out of Scope*)

Para salvaguardar la viabilidad del proyecto dentro del rigor temporal del NASA Space Apps Challenge 2026, se definen explícitamente los límites del producto:

1. **Predicción Meteorológica de Propagación de Incendios en Tiempo Real:**
   - PyrosHarmonizer es un sistema de *armonización histórica, monitoreo NRT y caracterización de regímenes de fuego*, no un simulador físico de propagación de llamas impulsado por viento (ej. FARSITE o Prometheus).
2. **Atribución Jurídica o Forense de Culpabilidad:**
   - La plataforma no emite juicios legales sobre la titularidad predial de las quemas ni reemplaza las pericias judiciales de la Autoridad de Fiscalización y Control Social de Bosques y Tierra (ABT).
3. **Control y Telemetría de Drones / UAVs:**
   - No se incluye software de pilotaje o enlace de datos telemétricos con aeronaves no tripuladas en campo.
4. **Procesamiento de Radiancias Crudas de Nivel 1B Satelital:**
   - El sistema no procesa directamente archivos HDF/NetCDF de Level-1B (MOD02 / VNP02); consume los productos estándar de fuegos activos Level-2/Level-3 provistos por NASA FIRMS (MOD14 / MYD14 / VNP14IMG).
5. **Cálculo Certificado de Créditos de Carbono:**
   - Si bien el índice HFII provee una base robusta para la estimación de biomasa quemada, el software no constituye una plataforma certificada de contabilidad de bonos de carbono bajo metodologías Verra o Gold Standard.

---

## 11. Dependencias Externas y Requisitos de Integración

| Dependencia | Tipo | Propósito | Requisito / Clave de Acceso |
| :--- | :--- | :--- | :--- |
| **NASA FIRMS Archive** | Fuente de Datos | Descarga de catálogos históricos de puntos de calor (2000-2026) en formato CSV para MODIS y VIIRS. | Acceso público HTTP / Descarga batch por bounding box de Bolivia / Sudamérica. |
| **NASA LANCE / FIRMS REST API** | Servicio Externo | Obtención de alertas de focos de calor en tiempo casi real (NRT) de las últimas 24h, 48h y 7 días. | Requiere suscripción y clave de aplicación `MAP_KEY` válida emitida por NASA Earthdata. |
| **Mapbox GL** | Servicio Cartográfico | Suministro de teselas cartográficas (*vector tiles*) para mapa base en estilos satelital, oscuro y topográfico. | Requiere `NEXT_PUBLIC_MAPBOX_TOKEN` configurado en el entorno de Frontend. |
| **PostgreSQL / PostGIS** | Base de Datos | Motor relacional geoespacial con soporte de operaciones vectoriales, indexación espacial y agregaciones. | PostgreSQL 16 con extensión PostGIS 3.4 o superior habilitada. |
| **Uber H3 C-Library / h3-py** | Librería de Algoritmos | Indexación espacial basada en el sistema geodésico hexagonal de Uber para agregación multirresolución. | Módulos `h3` para Python y `h3-js` para componentes de frontend. |
| **Railway Cloud Platform** | Plataforma de Hosting | Alojamiento y despliegue continuo de base de datos PostgreSQL/PostGIS y microservicio FastAPI en contenedor Docker. | Cuenta de equipo Railway con créditos de cómputo para el hackathon. |
| **Vercel Edge Network** | Plataforma de Hosting | Compilación, optimización de assets y distribución perimetral de la aplicación Next.js 14. | Conexión con repositorio público de GitHub para despliegue automatizado. |

---

## 12. Estructura de Datos de NASA FIRMS

Para garantizar la integridad en la ingesta, se documenta el esquema de atributos de las fuentes satelitales primarias procesadas:

```text
Columnas CSV estándar de NASA FIRMS procesadas por PyrosHarmonizer:
├── latitude       : Latitud del píxel central de detección (Grados decimales, WGS84)
├── longitude      : Longitud del píxel central de detección (Grados decimales, WGS84)
├── brightness /   : Temperatura de brillo del píxel en canal térmico (Kelvin)
│   bright_ti4     : (brightness para MODIS canal 21/22 4µm; bright_ti4 para VIIRS banda I4 3.75µm)
├── bright_ti5     : Temperatura de brillo en canal de onda larga (Kelvin; VIIRS banda I5 11.45µm)
├── scan           : Dimensión espacial del píxel en dirección del escaneo transversal (km)
├── track          : Dimensión espacial del píxel en dirección de la trayectoria orbital (km)
├── acq_date       : Fecha de adquisición satelital (Formato YYYY-MM-DD)
├── acq_time       : Hora de adquisición UTC (Formato HHMM, ej. 1745 = 17:45 UTC)
├── satellite      : Satélite observador ('Terra', 'Aqua', 'Suomi-NPP', 'NOAA-20', 'NOAA-21')
├── instrument     : Sensor a bordo ('MODIS', 'VIIRS')
├── confidence     : Nivel de confianza de la detección
│                    MODIS: valor porcentual numérico (0% a 100%)
│                    VIIRS: categoría nominal ('low', 'nominal', 'high')
├── frp            : Fire Radiative Power (Megavatios, MW)
├── daynight       : Condición de iluminación solar en el momento del pase ('D' = Día, 'N' = Noche)
└── version        : Versión de procesamiento del algoritmo de NASA (ej. '6.1NRT', '2.0NRT')
```

---

## 13. Entregables del Hackathon (NASA Space Apps Challenge 2026)

Conforme a los lineamientos oficiales de la competencia, el equipo PyrosHarmonizers estructurará y presentará los siguientes entregables antes del cierre oficial:

1. **Aplicación Web Desplegada y Operativa:**
   - Frontend accesible en entorno de producción mediante Vercel: `https://pyrosharmonizer.vercel.app` (o subdominio asignado).
   - Backend API operativo con documentación interactiva en Railway: `https://api.pyrosharmonizer.railway.app/docs`.
2. **Repositorio Público de GitHub:**
   - Código fuente completo, limpio y documentado bajo Licencia MIT en: `https://github.com/PyrosHarmonizers/PyrosHarmonizer`.
   - Archivo `README.md` exhaustivo con guía de instalación, arquitectura, justificación científica y pasos de reproducción local.
3. **Video Demostrativo de 30 Segundos:**
   - Pieza audiovisual de alto impacto (formato MP4 / YouTube sin restricciones) sintetizando: el problema del "Efecto 2012", la solución de armonización algorítmica y el funcionamiento del Calendario de Quemas en la Chiquitanía.
4. **Presentación Ejecutiva (Pitch Deck de 7 Diapositivas):**
   - Diapositiva 1: Título del Proyecto, Desafío #8 y Presentación del Equipo PyrosHarmonizers.
   - Diapositiva 2: El Problema: El Salto Instrumental de 2012 y la Disparidad MODIS vs. VIIRS.
   - Diapositiva 3: La Solución: Pipeline ST-DBSCAN, Reconstrucción de Píxel y HFII.
   - Diapositiva 4: Caso de Estudio: La Chiquitanía (Demostración del Efecto 2012 corregido).
   - Diapositiva 5: Demostración del Producto: Mapa Split-Screen y Calendario de Quemas.
   - Diapositiva 6: Arquitectura Tecnológica y Validación de Métricas de Éxito.
   - Diapositiva 7: Impacto Futuro, Escalabilidad Global y Agradecimientos.

---

## 14. Glosario Técnico y Acrónimos

| Término / Acrónimo | Definición Técnica |
| :--- | :--- |
| **MODIS** | *Moderate Resolution Imaging Spectroradiometer*. Instrumento de teledetección a bordo de los satélites Terra (lanzado en 1999) y Aqua (lanzado en 2002) de la NASA. Posee 36 bandas espectrales y una resolución espacial de 1 km en sus canales de detección de fuego. |
| **VIIRS** | *Visible Infrared Imaging Radiometer Suite*. Sensor radiométrico a bordo de la constelación polar JPSS (Suomi-NPP desde 2011, NOAA-20 desde 2017, NOAA-21 desde 2022). Incorpora 5 bandas de imagen (I-bands) de 375 m de resolución espacial y 16 bandas moderadas (M-bands) de 750 m. |
| **FRP** | *Fire Radiative Power* (Potencia Radiativa del Fuego). Medida cuantitativa expresada en Megavatios (MW) de la tasa instantánea de energía liberada por combustión activa a través de radiación infrarroja media. |
| **HFII** | *Harmonized Fire Intensity Index* (Índice Armonizado de Intensidad de Fuego). Índice derivado creado por PyrosHarmonizer que calibra y homogeneiza los valores de FRP de MODIS y VIIRS compensando deformaciones de barrido, resolución y condiciones día/noche. |
| **FIRMS** | *Fire Information for Resource Management System*. Plataforma de la NASA (adscrita a EOSDIS) que distribuye globalmente datos de fuegos activos satelitales en tiempo casi real e históricos. |
| **LANCE** | *Land, Atmosphere Near real-time Capability for EOS*. Sistema de la NASA que procesa y distribuye datos satelitales en menos de 3 horas desde la observación orbital. |
| **NRT** | *Near Real-Time* (Tiempo Casi Real). Datos satelitales procesados y puestos a disposición pública con una latencia de entre 1 y 3 horas posteriores al pase orbital del satélite. |
| **ST-DBSCAN** | *Spatial-Temporal Density-Based Spatial Clustering of Applications with Noise*. Algoritmo de minería de datos espaciales que descubre agrupaciones de forma arbitraria considerando simultáneamente proximidad geográfica y proximidad temporal. |
| **Uber H3** | Sistema de indexación espacial jerárquica y hexagonal de código abierto desarrollado por Uber. Divide la superficie terrestre en celdas hexagonales regulares a 16 niveles de resolución. |
| **PostGIS** | Extensión espacial de código abierto para el motor relacional PostgreSQL que añade soporte para objetos geográficos, cálculos topológicos y operadores espaciales indexados. |
| **GiST** | *Generalized Search Tree*. Estructura de indexación en PostgreSQL utilizada por PostGIS para crear árboles R-Tree que aceleran dramáticamente las búsquedas y cruces espaciales bidimensionales (`ST_Intersects`, `ST_DWithin`). |
| **EPSG:4326** | Código numérico del sistema de coordenadas geográficas de referencia WGS84 (World Geodetic System 1984), expresado en latitud y longitud en grados decimales. |
| **Convex Hull** | Envoltura Convexa. En geometría computacional, el polígono convexo más pequeño que encierra completamente a un conjunto dado de puntos en el plano. |
| **Scan y Track** | Términos de geometría de barrido orbital. *Scan* es la dimensión del píxel a lo largo de la línea perpendicular a la trayectoria del satélite; *Track* es la dimensión a lo largo de la dirección de vuelo u órbita. |
| **Efecto Bowtie** | Deformación geométrica intrínseca de los sensores de escaneo panorámico por la cual los píxeles en los bordes del barrido crecen en área y se solapan entre barridos sucesivos debido a la curvatura terrestre y el ángulo de visión oblícuo. |
| **Nadir** | Punto de la superficie terrestre directamente perpendicular por debajo del sensor satelital ($\theta = 0^\circ$). Es el punto donde el píxel posee su menor distorsión y mayor resolución espacial nominal. |
| **Z-Score** | Puntuación estandarizada que indica a cuántas desviaciones estándar se encuentra una observación específica respecto a la media de una distribución histórica de referencia ($Z = (X - \mu)/\sigma$). |

---

*Documento técnico desarrollado conforme a los requerimientos del 2026 NASA International Space Apps Challenge. Santa Cruz de la Sierra, Bolivia.*

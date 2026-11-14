# PyrosHarmonizer: Unified Fire Regimes & Burning Activity Calendar

Proyecto desarrollado para el **2026 NASA International Space Apps Challenge** (Sede Santa Cruz de la Sierra - Universidad Católica Boliviana).

**Reto:** Harmonization of MODIS and VIIRS Hot Spots (Reto N.º 8).

---

## 📖 Descripción del Proyecto

**PyrosHarmonizer** es una aplicación web y motor analítico diseñado para armonizar los datos satelitales de incendios de la NASA (sensores **MODIS** y **VIIRS**).

El problema principal que resuelve es el **"Efecto 2012"**:
- **MODIS (1 km):** Cuenta con datos desde el año 2000, pero tiene menor resolución espacial.
- **VIIRS (375 m):** Opera desde 2012 con mucha mayor sensibilidad, lo que genera entre **3 y 5 veces más puntos de calor** sobre el mismo incendio.
- Al sumar ambos sensores sin armonizar, se genera un salto artificial en las estadísticas históricas a partir de 2012.

PyrosHarmonizer unifica estas detecciones utilizando agrupamiento espacio-temporal y calibración energética, generando un **Calendario de Actividad de Quemas** confiable para análisis histórico y respuesta a emergencias.

---

## ⚙️ ¿Cómo Funciona? (Alternativa 1)

El proyecto utiliza una arquitectura geoespacial basada en clustering y calibración estadística:

1. **Filtro de Calidad:**
   - Se descartan detecciones de baja confianza (MODIS < 30% y VIIRS 'low').
   - Se excluyen anomalías térmicas estáticas (volcanes, actividad industrial).

2. **Geometría de Huella Real ($scan \times track$):**
   - En lugar de tratar los focos como puntos simples, se reconstruye el polígono real del píxel con los datos de barrido del satélite.

3. **Clustering Espacio-Temporal (ST-DBSCAN):**
   - Agrupa detecciones de VIIRS (375 m) y MODIS (1,000 m) que ocurren en un radio de 500 a 1,000 metros y en una ventana de tiempo de 3 a 4 horas.
   - Fusiona los puntos en una huella unificada (polígono envolvente).

4. **Calibración de FRP (Fire Radiative Power):**
   - Calibra la energía emitida mediante el **Índice Armonizado de Intensidad de Fuego (HFII)**, equiparando la sensibilidad de VIIRS con la serie histórica de MODIS.

5. **Calendario de Actividad de Quemas:**
   - Genera una vista de matriz anual y series temporales para identificar temporadas críticas y anomalías históricas (ej. Chiquitanía y Amazonía).

---

## 🛠️ Tecnologías Utilizadas

- **Base de Datos:** PostgreSQL + PostGIS (consultas espaciales con `ST_ClusterDBSCAN`, `ST_DWithin`, `ST_ConvexHull`).
- **Backend:** Python con FastAPI, GeoPandas, Shapely y Scikit-Learn.
- **Frontend:** React / Next.js, Tailwind CSS, Mapbox GL / Deck.gl y Recharts.
- **Datos:** NASA LANCE / FIRMS (MODIS Collection 6.1 y VIIRS 375m).

---

## 📁 Estructura del Proyecto

```text
PyrosHarmonizers1/
├── backend/               # API en FastAPI y algoritmos de armonización
│   ├── app/
│   │   ├── main.py        # Endpoints principales
│   │   ├── harmonizer.py  # Algoritmo ST-DBSCAN y fusión poligonal
│   │   └── database.py    # Conexión con PostgreSQL / PostGIS
│   └── requirements.txt
├── frontend/              # Aplicación web (Next.js / React)
│   ├── src/
│   │   ├── components/    # Mapa interactivo y Calendario de Quemas
│   │   └── pages/
│   └── package.json
└── README.md
```

---

## 🚀 Instalación y Uso

### 1. Base de Datos (PostgreSQL + PostGIS)
Crea una base de datos con la extensión espacial habilitada:
```sql
CREATE DATABASE pyrosharmonizer;
\c pyrosharmonizer;
CREATE EXTENSION postgis;
```

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
La API estará disponible en `http://localhost:8000` (documentación en `/docs`).

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:3000`.

---

## 🛰️ Fuentes de Datos

- **NASA FIRMS:** [Fire Information for Resource Management System](https://firms.modaps.eosdis.nasa.gov/)
- **Productos:** MODIS C6.1 (Terra/Aqua) y VIIRS 375m (Suomi-NPP, NOAA-20, NOAA-21).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

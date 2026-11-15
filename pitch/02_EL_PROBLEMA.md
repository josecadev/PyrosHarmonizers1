# ⚠️ Documento 02: El Problema
# La Fractura de 2012 y el Espejismo Instrumental en la Observación de Incendios

---

## 💥 1. La Pregunta Incómoda que Desata el Problema

> **¿Realmente se triplicaron los incendios en el mundo a partir de 2012, o fue simplemente que nuestros ojos en el espacio cambiaron de lentes?**

Si cualquier científico, periodista o bombero descarga los datos crudos del sistema **NASA FIRMS** (*Fire Information for Resource Management System*) y grafica la cantidad de "puntos de calor" detectados por año desde el 2000 hasta hoy, verá esto:

```
Cantidad de Puntos de Calor Crudos (FIRMS)
 ^
 |                                                    [VIIRS 375m entra en órbita]
 |                                                                ▲
 |                                                                │  *   *       *
 |                                                                │ * * * * *   * *
 |                                                                │*     *   * *   *
 |                                                                │*
 |  *   *       *       *       *       *       *                 │
 | * * * *     * *     * *     * *     * *     * *                │
 |*     * *   *   *   *   *   *   *   *   *   *   * ──────────────┘
 +─────────────────────────────────────────────────────────────────────────────> Año
 2000           2004            2008            2012              2020    2026
 [──────────── ERA MODIS (1 km) ────────────] [─── ERA HÍBRIDA (MODIS + VIIRS) ───]
```

A partir de enero de 2012, la curva sufre un **quiebre estructural violento**. Un aumento aparente de más del **320% en detecciones**.  
**Este aumento NO es ecológico ni climático: es un artificio puramente tecnológico.**

---

## 🔬 2. Las 4 Causas Físicas e Instrumentales del Problema

### A. La Disparidad de Resolución Espacial ($1\text{ km}$ vs $375\text{ m}$)
* **MODIS (Terra & Aqua):** Tiene un píxel en el nadir de $1000\text{ m} \times 1000\text{ m}$ ($1,000,000\text{ m}^2 = 100\text{ ha}$).
* **VIIRS I-Band (Suomi-NPP, NOAA-20, NOAA-21):** Tiene un píxel en el nadir de $375\text{ m} \times 375\text{ m}$ ($140,625\text{ m}^2 \approx 14\text{ ha}$).

> **El Resultado Matemático:** En el espacio donde cabe **un solo píxel de MODIS**, caben hasta **7 píxeles de VIIRS**.  
> Por tanto, un mismo frente de fuego homogéneo genera **1 punto para MODIS** y entre **3 y 7 puntos para VIIRS**. Los sistemas de alerta que simplemente cuentan filas de datos reportan falsamente hasta 7 incendios distintos.

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                  1 solo píxel MODIS                       │
│                     (1,000 m²)                            │
│                                                           │
└───────────────────────────────────────────────────────────┘
                             VS
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ VIIRS #1    │ VIIRS #2    │ VIIRS #3    │ VIIRS #4    │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ VIIRS #5    │ VIIRS #6    │ VIIRS #7    │  (vacío)    │
└─────────────┴─────────────┴─────────────┴─────────────┘
  -> 7 registros en la base de datos para el mismo fuego
```

---

### B. La Deformación Fuera del Nadir: El "Efecto Mariposa" (*Bowtie Effect*)
Cuando los satélites barren la superficie terrestre alejándose de la vertical (nadir hacia los extremos del scan):
* **MODIS no compensa el crecimiento del píxel:** En los bordes de la franja orbital, el píxel de MODIS se estira elípticamente hasta alcanzar **$2.0\text{ km} \times 4.8\text{ km}$** ($9.6\text{ km}^2$, ¡casi 10 veces su tamaño nominal!).
* **VIIRS incorpora un esquema activo de agregación de detectores:** Mantiene el tamaño del píxel casi constante en toda la franja ($375\text{ m}$ en el centro y no más de $800\text{ m}$ en los bordes extremos).
* **Consecuencia:** Tratar las detecciones como puntos matemáticos idénticos en cualquier latitud y longitud introduce un sesgo espacial masivo en las orillas de la órbita.

---

### C. Umbral de Detección Radiométrica y Focos Incipientes
* El límite inferior de detección de **FRP** (*Fire Radiative Power*) en MODIS ronda los **$8\text{ a }10\text{ MW}$**. Fuegos fríos de pastizales o quemas agrícolas nocturnas pequeñas simplemente no lograban activar el algoritmo de anomalía térmica de MODIS.
* VIIRS, gracias a su canal térmico de $375\text{ m}$ y alta relación señal/ruido, detecta fuegos de apenas **$0.5\text{ a }1.0\text{ MW}$**.
* Esto significa que VIIRS no solo divide los incendios grandes en múltiples píxeles, sino que además "ve" miles de pequeñas quemas que MODIS ignoraba por completo en la década del 2000.

---

### D. La No-Aditividad del FRP (Energía Radiativa)
* Muchos ingenieros cometen el error de asumir que:
  $$\sum FRP_{VIIRS} = FRP_{MODIS}$$
  **Físicamente esto es FALSO.** 
* La energía radiativa medida por satélite depende de la transmitancia atmosférica, el efecto de fondo térmico (*background surface temperature*) y la función de dispersión del detector (PSF). Sumar directamente los píxeles de VIIRS genera picos energéticos artificiales irreales.

---

## 🌲 3. El Costo Ecológico y Operativo en la Vida Real (El Caso Chiquitanía)

En el departamento de Santa Cruz, Bolivia, y en el bosque seco chiquitano (declarado patrimonio natural en peligro):
1. **Falsas Conclusiones Históricas:**
   - La gran crisis de incendios del año **2010** en la Chiquitanía (documentada por bomberos locales como devastadora) aparece en las bases de datos crudas con **menos de la mitad de puntos de calor** que la crisis del **2019**, únicamente porque en 2010 solo existía MODIS y en 2019 operaba VIIRS a plena capacidad.
   - Esto llevó a legisladores y medios a creer erróneamente que la intensidad del fuego se multiplicó por 4, cuando el área quemada real creció en una proporción muy diferente.
2. **Saturación en el Despacho de Bomberos:**
   - Durante los meses secos (agosto a octubre), las pantallas de los Centros de Operaciones de Emergencia (COED) se llenan de miles de puntos rojos superpuestos.
   - Las cuadrillas no pueden distinguir si un enjambre de 80 puntos corresponde a 80 fuegos dispersos o a 3 frentes de avance continuo, desperdiciando combustible y horas de vuelo de brigadas voluntarias.

---

## 🚫 4. Por Qué las Soluciones "Ingenuas" Fracasan

| Enfoque Ingenuo | ¿Por Qué Falla Matemáticamente? |
| :--- | :--- |
| **"Dividir los puntos de VIIRS entre 3.5"** | Falla porque asume homogeneidad. Un incendio forestal masivo activa 15 píxeles de VIIRS, pero 15 quemas agrícolas aisladas también activan 15 píxeles de VIIRS. Dividir entre 3.5 borra quemas pequeñas reales o subestima mega-incendios. |
| **"Mallas cuadradas tradicionales (Lat/Lon)"** | Las cuadrículas rectangulares sufren de distorsión cartográfica fuera del ecuador y artefactos de borde (*edge-effects*): un fuego en el límite entre dos cuadrículas se cuenta doble. |
| **"Descartar MODIS y usar solo VIIRS"** | Destruye 12 años de historia climática de la humanidad (2000–2011), imposibilitando cualquier estudio serio sobre el impacto del calentamiento global en los regímenes de fuego. |

---

## 🏁 En Resumen: El Desafío
Se requiere un algoritmo que entienda la **física orbital**, que agrupe observaciones coincidentes en el **espacio y el tiempo**, y que calibre la **energía radiativa** para devolverle a la ciencia una serie histórica pura, continua y confiable.  
**Ese algoritmo es PyrosHarmonizer.**

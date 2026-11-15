# ⏱️ Documento 04: Guion de Pitch (3 Minutos Cronometrados)
# PyrosHarmonizer — Presentación Oficial ante el Jurado de la NASA

---

## 🎭 Estructura de la Presentación y Roles

| Bloque | Tiempo | Responsable Sugerido | Enfoque Principal |
| :--- | :--- | :--- | :--- |
| **Bloque 1** | `0:00 - 0:40` (40 seg) | Orador 1 (Lead / Narrador) | El Gancho Emocional y la Fractura de 2012 |
| **Bloque 2** | `0:40 - 1:25` (45 seg) | Orador 2 (Científico / Backend) | La Ciencia: ST-DBSCAN, Huella Real y HFII |
| **Bloque 3** | `1:25 - 2:20` (55 seg) | Orador 3 (Demo / Frontend) | Demostración en Vivo: Split-Screen y Boletín PDF |
| **Bloque 4** | `2:20 - 3:00` (40 seg) | Todos / Orador 1 | Impacto en la Chiquitanía, Validación y Cierre |

---

## 📜 Guion Palabra por Palabra

### 🔴 BLOQUE 1: El Gancho y el Problema (0:00 – 0:40)
*(Pantalla: Gráfico de datos crudos con el salto vertical en 2012)*

> **[Orador 1]:**  
> *"Estimado jurado: Miren esta gráfica. Si analizamos 26 años de puntos de calor de la NASA, parece que en el año 2012 los incendios del planeta se triplicaron de la noche a la mañana.  
>  
> ¿Fue una catástrofe climática repentina? **No. Fue una ilusión instrumental.**  
>  
> En 2012 entró en órbita el sensor VIIRS con píxeles de 375 metros, reemplazando gradualmente al histórico MODIS de 1 kilómetro. Donde MODIS veía un solo fuego, VIIRS ve hasta siete puntos individuales.  
>  
> Este sobreconteo del 320% ha sesgado los modelos de cambio climático y satura las pantallas de los bomberos en regiones críticas como la Chiquitanía y la Amazonía boliviana.  
>  
> Para resolver esta fractura de datos creamos **PyrosHarmonizer**."*

---

### 🟡 BLOQUE 2: La Ciencia y el Algoritmo (0:40 – 1:25)
*(Pantalla: Diagrama de las 4 etapas del pipeline y la fórmula de HFII)*

> **[Orador 2]:**  
> *"PyrosHarmonizer no es un simple filtro visual. Es un motor científico en cuatro capas:  
>  
> Primero, **reconstruimos la geometría real del satélite**: tomamos las variables $scan$ y $track$ para calcular la deformación óptica del píxel en lugar de tratarlo como un punto plano.  
>  
> Segundo, implementamos **ST-DBSCAN**, un algoritmo de clustering espacio-temporal que fusiona observaciones solapadas en un radio de mil metros y una ventana de tres horas y media, calculando el perímetro poligonal real del incendio.  
>  
> Tercero, formulamos el **Índice Armonizado de Intensidad de Fuego (HFII)**, calibrando la energía radiativa diurna y nocturna para devolver la continuidad energética entre 2000 y 2026.  
>  
> Y cuarto, proyectamos todo sobre **grillas hexagonales Uber H3**, eliminando los sesgos cartográficos y permitiendo comparaciones justas año tras año."*

---

### 🟢 BLOQUE 3: Demostración en Vivo (1:25 – 2:20)
*(Pantalla: Navegador interactivo en vivo con PyrosHarmonizer desplegado en Vercel)*

> **[Orador 3 - Manos en el teclado y ratón]:**  
> *"Veámoslo en tiempo real en nuestra plataforma desplegada en producción.  
>  
> `[Clic en: Ingresar como Jurado Evaluador]`  
> Con un solo clic, el jurado tiene acceso completo al dataset de prueba de la Chiquitanía.  
>  
> `[Mover slider en: Vista Comparativa Split-Screen]`  
> Observen el visor dividido: a la izquierda, los datos crudos con más de cuatrocientos mil puntos dispersos e inconexos. A la derecha, la serie armonizada por PyrosHarmonizer: frentes continuos de incendio con su verdadera severidad energética.  
>  
> `[Navegar a: Burning Activity Calendar]`  
> Aquí tenemos el Calendario de Actividad de Quemas. A través de matrices de $z$-score, el sistema identifica que la ventana crítica de peligro en Santa Cruz ocurre sin falta entre julio y octubre, permitiendo emitir vedas de quema predictivas.  
>  
> `[Clic en: Generar Boletín Oficial (PDF)]`  
> Y para el bombero o guardaparque en el terreno que no tiene internet: con un clic generamos este **Boletín Oficial A4 de Alta Fidelidad**, con gráficos vectoriales nítidos, directivas operativas de despacho y firma criptográfica con hash SHA-256."*

---

### 🔵 BLOQUE 4: Validación, Impacto y Cierre (2:20 – 3:00)
*(Pantalla: Tabla del Test de Chow y foto de brigadas de la Chiquitanía)*

> **[Orador 1]:**  
> *"¿Cómo sabemos que funciona científicamente? Sometimos la serie al **Test Econométrico de Chow**: los datos crudos tenían un quiebre estructural con $p < 0.001$, mientras que nuestra serie armonizada reduce el estadístico $F$ a 1.12, demostrando **continuidad estadística perfecta antes y después de 2012**.  
>  
> PyrosHarmonizer es 100% de código abierto, escalable a cualquier rincón del planeta monitoreado por NASA FIRMS, y está diseñado para salvar la Chiquitanía, la Amazonía y los bosques del mundo.  
>  
> Unificamos la mirada de los satélites para apagar el fuego en la Tierra.  
> **Muchas gracias, quedamos a disposición de sus preguntas.**"*

---

## 💡 Consejos de Escenario para el Equipo

1. **Contacto Visual y Postura:** No le lean a la diapositiva; miren a los ojos de los evaluadores.
2. **Ritmo y Respiración:** Practicar con cronómetro en mano. Si sobran 10 segundos, no apresurarse; una pausa segura al final transmite dominio técnico.
3. **Manejo de la Demo:** El Orador 3 no debe hablar al mismo tiempo que hace clics erráticos. Cada clic debe acompañar exactamente lo que el discurso anuncia ("Observen el Split-Screen... ahora miren el boletín PDF").
4. **Respaldo Offline:** Si el internet de la sala fallara durante la demo, no entrar en pánico: recuerden que el frontend tiene precargado el dataset local con `NFR-006 Offline Fallback`.


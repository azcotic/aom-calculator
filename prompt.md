PROMPT PARA CONSTRUIR: "CALCULADOR DE COMBATE" (Age of Mythology: The Boardgame, variante 2d6)

=== 1. QUÉ ES Y PARA QUIÉN ===
Una app web de una sola pantalla principal, pensada EXCLUSIVAMENTE para teléfono en vertical (360–430 px de ancho). El teléfono se queda apoyado sobre la mesa, junto al tablero, y solo se toca cuando dos jugadores se ponen de acuerdo en resolver un combate con la variante 2d6. No es un compañero de la partida completa: no gestiona ejércitos, recursos, edificios ni puntos de victoria. Hace UNA cosa: resolver duelos entre dos unidades de forma rápida, justa y transparente.

Principios de diseño:
- Neutral: ningún jugador debe sentir que el teléfono "es del otro". Diseño simétrico.
- Rápido: de "abrir la app" a "resultado" en menos de 20 segundos y menos de 8 toques.
- Legible a 60–80 cm de distancia, con luz de sala y el teléfono plano sobre la mesa.
- Sin fricción: sin registro, sin anuncios, sin conexión, sin pantallas de bienvenida.
- Transparente: siempre se puede ver POR QUÉ ganó alguien (desglose de la suma y regla aplicada).

=== 2. ENTREGABLE TÉCNICO ===
- UN solo archivo HTML autocontenido (HTML + CSS + JS inline), sin dependencias externas ni peticiones de red. Funciona sin conexión.
- Los datos (dos CSV que adjunto) se incrustan en el JS como objetos. No inventes ni "corrijas" ningún número.
- Sin frameworks pesados. JS moderno vanilla o una librería mínima incrustada.
- Guardar ajustes y combate en curso en localStorage dentro de try/catch; si falla, la app funciona igual sin persistencia.
- Pedir Screen Wake Lock (API) mientras la app esté visible, para que la pantalla no se apague. Si no está disponible, ignorar en silencio.
- Vibración háptica corta (navigator.vibrate) al tirar y al mostrar resultado, con opción de desactivarla.
- Respetar safe-area (env(safe-area-inset-*)), viewport-fit=cover, y bloquear el zoom por doble toque y el pull-to-refresh.
- Objetivos táctiles de mínimo 48x48 px, con separación de 8 px. Nada depende de hover.
- Cumplir prefers-reduced-motion (sin animación de dados, solo cambio de número).

=== 3. DATOS ===
Archivo unidades.csv: civ, unidad, tipo (mortal|mitico|heroe), habilidad, berserk_bonus.
Archivo enfrentamientos.csv: civ_a, unidad_a, civ_b, unidad_b, total_a, total_b, diff.
- Cada fila es un enfrentamiento ordenado. total_a es el total (fuerza + bono de ventaja) de la unidad A contra B, y total_b el de B contra A. Esos totales YA incluyen la ventaja entre unidades. NO incluyen muro/torre, berserk ni habilidades dinámicas.
- Civilizaciones en los CSV: Egipto, Griegos, Nordicos. En pantalla mostrar "Egipto", "Griegos", "Nórdicos".
- Los nombres de unidad se muestran en inglés, tal como aparecen en las cartas (Chariot Archer, Hoplite, Jarl...).
- Buscar el enfrentamiento por (civ_a, unidad_a, civ_b, unidad_b). Debe existir en ambas orientaciones y ser coherente (total_a de una fila = total_b de su espejo).
- Mismo-civilización contra sí misma NO existe en los datos: bloquear elegir la misma civilización en ambos lados y mostrar un aviso breve y amable.

=== 4. REGLAS DEL MOTOR (implementar exactamente) ===
Cada lado tira 2d6. Puntaje de un lado = suma de sus 2 dados + total de la tabla + modificadores activos.

Modificadores (todos con interruptor o contador visible por lado):
- Muro/Torre: +2 al defensor. Interruptor por lado.
- Berserk: +2. Solo aparece para Huskarl y Heroic Hero nórdico (berserk_bonus = 2). Al activarlo: el lado PIERDE todos los empates y PIERDE automáticamente si saca dobles.
- Lanzamiento del Cyclops: +3, solo si el Cyclops está detrás de un muro/torre (mostrar el interruptor solo para Cyclops y solo habilitado si Muro/Torre está activo).
- Hydra: +1 por cada unidad derrotada en esta batalla. Contador con - / + y aumento automático cuando la Hidra gana.
- Valkyrie: +2 por cada unidad eliminada en esta batalla. Igual: contador con - / + y aumento automático al ganar.
- Modificador manual libre por lado (paso de 1, de -3 a +3) para reglas de la mesa que la app no conozca.

Reglas de dobles y empates (la Medusa y el Berserker compensan la menor frecuencia de empates del 2d6):
1. Medusa (Griegos) peleando: gana todos los empates y gana automáticamente si SU tirada es dobles.
2. Berserk activo: pierde todos los empates y pierde automáticamente si SU tirada es dobles.
3. Orden de resolución: primero los efectos de dobles; si ambos efectos favorecen al MISMO lado (p. ej. Medusa saca dobles y el Berserker rival también), gana ese lado sin más cálculo. Si los efectos se contradicen (los dos lados tienen el mismo efecto y ambos sacan dobles: dos Medusas o dos Berserkers), se anulan y se compara el puntaje normalmente.
4. Si no hay efecto de dobles, gana el puntaje más alto.
5. Si hay empate de puntaje: gana la Medusa si participa; pierde el Berserker si participa; si aplican ambas cosas al mismo lado ganador, ese lado gana. Si nadie tiene regla de empate, es empate real.
6. Empate real: por defecto se REPITE la tirada solo entre esas dos unidades. Ajuste: "Empate = gana el defensor" (requiere marcar quién defiende; por defecto desactivado).
7. Mythical Hero griego ("Adds opponent's dice") y Norse Mythic Hero ("-1 enemy = holding area"): NO alteran la tirada. Usar el total de la tabla y mostrar una nota informativa con el texto de la habilidad. Dejar un punto de extensión claramente comentado (hook) para futuras reglas.
8. Habilidades que no afectan la tirada (Minotaur/Nidhogg "2 buildings if survive", Mummy, Phoenix, Wadjet, Priest, Pharaoh, Son of Osiris, Elephant, Dwarf "Gather +2", Greek Heroic Hero "Defeat hero, army retreat") se muestran solo como texto informativo en la tarjeta de la unidad.

Probabilidades exactas (pre-tirada, siempre visibles):
- Enumerar las 36 x 36 = 1296 combinaciones de dados con las reglas anteriores.
- Mostrar en una barra horizontal de 3 tramos: % gana A / % empate real / % gana B, con la etiqueta de cada uno.
- Debajo, en texto más grande y como cifra principal: "Efectivo (repitiendo empates): A xx % – B yy %", calculado como P(A) / (P(A)+P(B)).
- Las probabilidades se recalculan al instante al cambiar cualquier modificador.
- Casos de prueba que deben cumplirse: (a) dos unidades con totales iguales y sin habilidades: empate real = 146/1296 = 11,27 %; (b) Anubite (Egipto) vs Centaur (Griegos): totales 9 vs 5; (c) Son of Osiris (Egipto) vs Mythical Hero (Griegos): totales 8 vs 13; (d) Nidhogg (Nórdicos) vs Medusa (Griegos): totales 11 vs 5.

=== 5. FLUJO DE PANTALLAS ===
Toda la app vive en una sola vista vertical dividida en dos mitades espejo, más una franja central. La mitad SUPERIOR está girada 180° (para el jugador de enfrente), la INFERIOR está derecha (para el jugador que sostiene o queda cerca del teléfono). Ajuste "Vista de un solo lado" para desactivar el giro si el teléfono está en una esquina.

PASO 1 – Elegir civilizaciones
- Cada mitad muestra 3 fichas grandes: Egipto, Griegos, Nórdicos, con el color de la civilización y un símbolo simple (no logos de marcas). Un toque elige; la ficha elegida se resalta y la contraria queda deshabilitada en la otra mitad.
- Botón "Listo" por mitad. Cuando ambas estén listas, transición corta al Paso 2.

PASO 2 – Elegir unidad
- Cada mitad muestra una cuadrícula de 3 columnas con las unidades de su civilización, agrupadas bajo encabezados fijos: Mortales, Míticos, Héroes. Cada ficha lleva nombre, icono de tipo (● mortal, ◆ mítico, ★ héroe) y un puntito si tiene habilidad. Manifestar el tipo NUNCA solo por color: siempre por forma + color.
- Mantener pulsada una ficha 300 ms abre una tarjeta con la habilidad completa.
- Opción "Selección oculta": cada jugador elige y tapa su elección; al tocar "Revelar" en ambas mitades se muestran a la vez.
- Botón "Listo" por mitad. Con ambas listas, ir al Paso 3.

PASO 3 – Pantalla de combate (la principal)
Cada mitad muestra, de fuera hacia el centro:
 a) Encabezado con civilización, nombre de la unidad y su tipo (tarjeta con el color de la civilización).
 b) Total de tabla en cifra enorme (mínimo 72 px), con la palabra "TABLA" pequeña debajo.
 c) Fila de modificadores como "chips" tocables: Muro/Torre +2, Berserk +2, Lanzar +3, contadores de Hidra/Valkyrie, manual +/-. Los chips que no aplican a la unidad NO aparecen.
 d) Puntaje total previsto (tabla + modificadores) en cifra grande, y debajo los dos dados vacíos.
Franja central (entre ambas mitades):
 - La barra de probabilidades y la cifra "Efectivo".
 - Un botón enorme "TIRAR 2d6" (alto mínimo 88 px, ancho casi completo), pensado para el pulgar y alcanzable desde ambos lados (repetido, con el de la mitad superior girado).
 - Interruptor rápido "Dados del teléfono / Dados físicos".

Modo dados del teléfono: al pulsar TIRAR, ambos pares de dados se animan ~700 ms y se muestran los valores. Vibración corta. Opción de omitir animación.
Modo dados físicos: en vez de TIRAR, cada mitad muestra un teclado numérico grande (2–12 con dos toques o un selector 1–6 por dado) para meter los valores reales de sus dados. La app pide los dos dados por separado para poder detectar dobles.

Resultado:
- Banner grande en la franja central (duplicado y girado para el otro jugador): "GANA <UNIDAD> (<CIVILIZACIÓN>)" o "EMPATE – REPETIR".
- Debajo, una línea de desglose por lado: "9 (tabla) + 7 (dados) + 2 (muro) = 18".
- Debajo, la regla aplicada si hubo una: "Medusa gana el empate", "Berserk perdió por dobles", etc. Con un icono "?" que abre una explicación de una frase.
- Botones de acción tras el resultado, uno por lado, grandes y claros:
    · "Misma unidad otra vez" (para la unidad ganadora; incrementa Hidra/Valkyrie si corresponde)
    · "Cambiar unidad" (vuelve al Paso 2 solo para ese lado)
    · "Retirada" (marca a ese lado como retirado y cierra el combate)
- Botón secundario común "Fin del combate" que vuelve al Paso 1.
- Si es empate real, el botón principal pasa a "REPETIR TIRADA" y conserva unidades y modificadores.

PASO 4 – Historial (cajón inferior que se desliza hacia arriba)
- Lista de las tiradas de este combate: número, unidades, puntajes, ganador, regla aplicada. Sin exportar ni compartir. Botón "Limpiar".

Ajustes (hoja modal accesible desde un icono de engranaje pequeño en una esquina; la mitad superior y la inferior comparten los mismos ajustes):
- Empate: repetir / gana el defensor.
- Reglas de dobles de Medusa y Berserker: activadas (por defecto) / desactivadas (para experimentar).
- Modo de dados: teléfono / físicos.
- Vibración, sonido (desactivado por defecto), animación reducida.
- Vista de un solo lado.
- Selección oculta.
- Tema: oscuro (defecto) / claro / automático.

=== 6. DISEÑO VISUAL ===
- Tema oscuro por defecto: fondo casi negro cálido (#14110E), superficies #1E1A16, texto #F3EBDD. Reduce el brillo sobre la mesa y no compite con el tablero.
- Colores por civilización, tomados de las miniaturas de las tablas: Egipto arena/dorado #C9A24B, Griegos verde #4FAE5A, Nórdicos cian #3FB6D9. Usarlos como acentos (borde, encabezado, chip activo), no como fondo entero.
- Estados de resultado: ganador con borde grueso y una insignia; perdedor atenuado. Nunca depender solo del color: también texto e icono.
- Tipografía: una fuente serif de cifras robustas para los totales (con fallback a Georgia/serif del sistema; no cargar fuentes externas) y una sans del sistema para etiquetas. Tamaños mínimos: etiquetas 14 px, cuerpo 16 px, totales 72–96 px.
- Contraste WCAG AA como mínimo en todo el texto.
- Estética sobria de juego de mesa (bordes finos, sutil textura de pergamino con CSS, sin imágenes externas). Sin mascotas ni ilustraciones de personajes: usar solo iconos geométricos simples propios.
- Animaciones: 150–250 ms para cambios de estado, 700 ms para dados. Nada que distraiga.
- Todo el texto de la interfaz en español; nombres de unidades tal cual vienen de los datos.

=== 7. ESTADOS Y CASOS BORDE ===
- Al recargar, restaurar el combate en curso (civilizaciones, unidades, modificadores, historial) si existe.
- Dos civilizaciones iguales: bloquear con aviso.
- Unidad sin fila de enfrentamiento: mostrar error visible y no calcular (esto nunca debería ocurrir con los datos completos).
- Cambiar de unidad reinicia los modificadores de esa mitad, pero conserva los contadores de Hidra/Valkyrie mientras dure el combate.
- Deshacer: un botón "Deshacer última tirada" (solo la última) que revierte contadores y resultado.
- Cambiar un modificador después de tirar borra el resultado y pide tirar de nuevo.

=== 8. LO QUE NO DEBE HACER ===
No gestionar ejércitos, recursos ni puntos de victoria. No pedir cuenta, permisos ni conexión. No mostrar anuncios ni ventanas emergentes. No ocultar el desglose de cálculo. No cambiar ni redondear los totales de las tablas. No aplicar reglas que no estén descritas aquí.

=== 9. CRITERIOS DE ACEPTACIÓN ===
1. Se completa un combate (elegir civilizaciones, unidades, tirar, ver resultado) en menos de 20 segundos con 8 toques o menos.
2. Ambos jugadores leen sus datos sin tocar ni girar el teléfono.
3. Las probabilidades coinciden con una enumeración independiente de 1296 casos para los 4 casos de prueba de la sección 4.
4. Todas las reglas de Medusa y Berserker producen el resultado descrito en las reglas 1–5, incluidos los casos donde ambos lados tienen el mismo efecto.
5. Funciona sin conexión y no hace ninguna petición de red.
6. Se ve bien de 360 a 430 px de ancho y con notch/isla dinámica.
7. Los totales de la tabla coinciden con los CSV en el 100 % de las combinaciones.

Entrega solo el archivo HTML final y, aparte, una lista breve de cualquier decisión de diseño que hayas tenido que tomar por tu cuenta.
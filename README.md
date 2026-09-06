# Aethoria · El Valle de las Cenizas

RPG de fantasía individual para móviles y escritorio. Incluye menú principal, lobby con tres clases y un mapa isométrico jugable. Mundo, personajes, historia y arte originales.

## Arquero 0.2

- Explorador renovado en el lobby y el mapa, con ocho orientaciones reales.
- Pasos ligados a la distancia recorrida y detenidos al encontrar un obstáculo.
- Preparación, tensión, suelta y recuperación del arco; daño cuando llega la flecha.
- Cadencia y daño base conservados. El disparo detiene brevemente el movimiento; esquivar cancela una flecha que aún no ha salido.
- Lluvia de flechas sincronizada con la suelta del arco. Las partidas guardadas siguen siendo compatibles.

Pruebas de integración: `node tests/archer.test.mjs`. Comprueban ocho direcciones, pies apoyados, daño diferido, pausa, colisiones, cancelación al esquivar, reaparición y habilidad especial.

## Publicar en GitHub Pages

El juego completo está en `docs/` y no necesita instalación ni compilación.

1. Abre [Settings → Pages](https://github.com/mindsentrix-cpu/aethoria/settings/pages).
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige la rama **main**, la carpeta **/docs** y pulsa **Save**.
4. Espera a que GitHub indique que la publicación terminó.

Una vez activado, la dirección prevista del juego es **https://mindsentrix-cpu.github.io/aethoria/**. La subida de archivos por sí sola no activa esa dirección.

GitHub Free permite Pages en repositorios públicos. Para publicar desde este repositorio privado hace falta un plan compatible, como GitHub Pro. El sitio de Pages será público salvo que se configure una opción de acceso empresarial compatible.

## Jugar en móvil

Abre el enlace publicado directamente en Safari o Chrome. En iPhone puedes usar **Compartir → Añadir a pantalla de inicio** para abrirlo como una aplicación. Los controles del visor de ChatGPT pertenecen a ese visor y pueden seguir apareciendo si abres el juego dentro de él.

La interfaz se dispone en horizontal desde la apertura y mantiene los controles en los bordes. Al entrar intenta pantalla completa y bloqueo de orientación cuando el navegador lo permite; en los demás casos usa rotación visual y adapta las coordenadas táctiles. La página limita el desplazamiento del documento, conservando el desplazamiento interno de los paneles que lo necesitan.

El progreso se guarda en el navegador y dispositivo utilizados. La partida del alojamiento anterior no se transfiere automáticamente al nuevo dominio. Es un prototipo individual, sin servidor multijugador.

## Contenido y controles

- Guardián, Arcanista y Explorador, con estadísticas, alcance y habilidad propia.
- Joystick táctil; WASD, flechas o clic para caminar en escritorio.
- Ataque, habilidad, esquiva, pociones y recolección.
- Misión de Lyra, recursos, enemigos, cofres y jefe final.
- Experiencia, niveles, mochila, diario, minimapa y guardado automático.

## Desarrollo

Sirve `docs/` con un servidor estático, por ejemplo:

```sh
python -m http.server 8080 --directory docs
```

Abre `http://localhost:8080/` en el navegador. Las rutas relativas permiten servir el juego tanto en la raíz como bajo `/aethoria/`.

`index.html` define la interfaz; `style.css` y `mobile.css`, su presentación; `viewport.mjs`, la orientación y coordenadas; `model.mjs`, las reglas del juego; `renderer.mjs`, el mundo en Canvas 2D; `ui.mjs`, interacción y audio.

La versión de origen tiene verificaciones de misión completa con las tres clases, combate, guardado y geometría móvil. La adaptación a Pages comprueba las rutas y recursos locales. No se ha probado esta publicación en un teléfono físico.

Ilustración del menú generada para este proyecto. Iconos Lucide bajo licencia ISC, incluida en `docs/assets/LUCIDE-LICENSE`.

## Arquero pintado: ocho direcciones (beta)

El Explorador usa sprites pintados en las ocho direcciones del mapa y en el lobby. El ciclo hacia la derecha conserva los mismos fotogramas, escala y tiempos de la beta aprobada. Las otras siete vistas derivan del diseño de referencia y tienen reposo, cuatro poses de caminata y cuatro de disparo. La escala es fija por dirección; las plantas de los pies se alinean al suelo. Los nuevos atlas se distribuyen con transparencia preparada, sin procesamiento de píxeles durante la animación.

La animación original sirve como respaldo únicamente si falla la carga de imágenes. Las reglas del combate, la misión, los controles y el guardado no se modifican en esta actualización. Siguen existiendo variaciones de dibujo entre poses: esta entrega completa las vistas como beta, no como animación final.

Validación de esta entrega: ciclos completos de las ocho direcciones en Canvas, comparación idéntica de píxeles del ciclo derecho con la versión anterior, pruebas existentes del arquero y misión completa de las tres clases con navegación por las colisiones reales. Las comprobaciones de Canvas siguen siendo locales; todavía falta incorporarlas al repositorio con sus dependencias y CI.

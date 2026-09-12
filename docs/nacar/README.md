# Nácar · Los nombres del fondo

Aventura original para móviles y escritorio. Explora una ciudad subterránea, aprende habilidades, fabrica equipo y descubre un barrio borrado del registro. Incluye tres sectores, tutorial guiado y dos desenlaces locales.

## Módulo independiente

Nácar vive en `docs/nacar/` dentro del repositorio `mindsentrix-cpu/aethoria` y usa la publicación de GitHub Pages que ya existe.

Ruta del juego: `https://mindsentrix-cpu.github.io/aethoria/nacar/`.

- Entrada propia: `index.html`; no se carga la interfaz de Aethoria.
- Mundo, historia, motor, fabricación, controles y estilos pertenecen a esta carpeta.
- Todas las imágenes, iconos y módulos se resuelven dentro de `nacar/`.
- Partidas propias: `nacar-save-v1` y `nacar-save-backup-v1`. No se leen ni modifican las partidas o preferencias de Aethoria.
- El manifiesto usa un inicio y ámbito relativos a `nacar/`, para que el icono de Inicio abra Nácar.
- Sin paquetes compartidos, cambios en el juego anfitrión ni servicio de caché que intercepte otras rutas.
- Las pruebas del módulo están en `docs/nacar/tests/`. Desde la raíz del repositorio: `node --test docs/nacar/tests/*.test.mjs`.

La carpeta completa puede trasladarse a la raíz de otro repositorio o a otra subcarpeta sin cambiar el código. No necesita instalación ni compilación. GitHub Pages confirma la publicación; subir los archivos por sí solo no prueba que el enlace ya esté activo.

## Pantalla y móvil

El mundo ocupa el ancho y el alto dinámicos completos del navegador, sin contenedor con márgenes, proporción fija ni bandas añadidas. La cámara se centra en todo el lienzo; la interfaz se adapta alrededor de ella. Las zonas seguras del teléfono solo desplazan los botones, no el mundo.

Separa dos dedos sobre el escenario para acercar la cámara; júntalos para alejarla, entre 70 % y 180 %. El zoom sigue centrado en Noa y no altera el tamaño de los botones, la velocidad ni las reglas del mundo. **Menú → Cámara** ofrece botones + / −, un deslizador y **Restablecer · 100 %**. En escritorio también está en Pausa; las teclas + / − y 0 funcionan durante la partida.

La distancia elegida se guarda con la partida y se conserva al rotar el teléfono, cambiar de sector o actualizar la guía. Solo participan los dedos que empiezan sobre el escenario: usar el joystick y atacar simultáneamente no activa zoom. Durante la partida se cancelan los gestos nativos sobre el lienzo y los controles, incluido el doble toque; los menús conservan su desplazamiento y la ampliación de texto del navegador. Si el navegador ya ha ampliado una pestaña antigua o el texto de un menú, se permite juntar los dedos para recuperar la pantalla; al volver a la escala normal, la pinza controla de nuevo la cámara. Si aún tienes cargada la versión anterior, cierra esa pestaña y abre el enlace actualizado.

Abre la dirección del juego directamente en Safari o Chrome. Los botones Share y Edit site que aparecen en el visor de ChatGPT son externos al juego: su código no puede retirarlos. En iPhone, Safari → Compartir → Agregar a Inicio permite abrir Nácar desde su propio icono como app web. Cuando el navegador admite Fullscreen API, el menú ofrece la acción correspondiente. No se exige una orientación fija.

## Conservar la partida

El progreso se guarda en el navegador. Para continuar desde otro dominio, navegador o app de Inicio:

1. En la instalación anterior, entra en **Menú → Tu partida → Guardar copia de partida**.
2. Abre el nuevo juego y pulsa **Cargar partida**.
3. Selecciona la copia y confirma el sector y nivel antes de continuar.

Si el navegador impide descargar, **Usar copiar y pegar** permite guardar el texto de la partida en Notas y recuperarlo después. No hay sincronización en la nube ni traslado automático entre dominios.

## Desarrollo y comprobaciones

Canvas 2D y módulos JavaScript sin dependencias de ejecución. `model.mjs` contiene las reglas y el guardado; `engine.mjs`, la simulación; `actions.mjs`, la campaña; `game.mjs`, la interfaz; `render.mjs`, el mundo; `workshop.mjs`, la fabricación; `layout.mjs`, la adaptación de controles; `camera.mjs`, el zoom y la protección de gestos; `journey.mjs`, la importación y exportación del progreso.

Ejecuta `node --test tests/*.test.mjs` para verificar progresión, ambos finales, navegación, fabricación, tutorial, escala móvil estable, traslado de partidas, pinza en ambas direcciones, límites y protección de los botones. Estas pruebas no sustituyen una comprobación visual en un teléfono real.

La primera carga requiere conexión. Es una aventura individual, sin servidor multijugador. Historia, código y arte originales de Nácar; no usa personajes ni recursos de Silo.

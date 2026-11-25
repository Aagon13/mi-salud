# Mi Salud · PWA v0.2

Primera versión funcional para organizar **deporte, alimentación y salud**, con estética RPG y datos privados en tu dispositivo.

## Funcionalidades operativas

- **Hoy:** nivel general, niveles de Fuerza/Nutrición/Movilidad/Descanso, misiones diarias y XP; cada misión solo puntúa una vez por día.
- **Despensa v0.2:** productos habituales con mínimo y cantidad objetivo; al agotarse, la lista de compra se calcula automáticamente. Entrada rápida por texto o dictado desde el teclado móvil (sin IA), registro de compras, lista unificada sin duplicados y copiar al portapapeles.
- **Recetas:** crear, editar y eliminar recetas; ingredientes y cantidades; guardar una foto opcional (se reduce antes de almacenarla); ejemplos iniciales que puedes modificar.
- **Táperes:** indicar raciones cocinadas y si las guardas en nevera o congelador. Cocinar descuenta los ingredientes disponibles; consumir reduce las raciones.
- **Semana:** planificar 14 comidas/cenas, elegir recetas y número de raciones; comprobar si alcanzan los ingredientes/táperes de la semana; comprar productos de la lista.
- **Entreno:** rutinas A/B/C adaptadas del Excel de origen, plan B en casa, movilidad de 15 minutos y registro diario de sesión.
- **Salud:** peso, horas de sueño, objetivo de peso y registro del progreso.
- **Copia de seguridad:** exportar/importar un único JSON con todos los registros.
- **PWA:** instalación desde navegador móvil en una web **HTTPS** y carga de la interfaz sin conexión tras la primera visita (el almacenamiento es local).

## Cómo probarla desde un ordenador

Requiere Node.js >= 20 y Python 3 (el compilador TypeScript se instala aparte si no lo tienes). En la terminal, desde la carpeta del proyecto:

```bash
npm install
npm run build
npm run serve
```

Abre `http://localhost:8080` en tu navegador. **No abras `index.html` con doble clic**: los módulos JavaScript y la PWA necesitan un servidor web. El paquete entregado incluye también `dist/` ya compilado, por lo que, si solo quieres probar esa versión, basta con `npm run serve` y tener Python 3.

## Instalar en Android

1. Sube el contenido del proyecto a un repositorio GitHub (preferiblemente **privado**; mira la nota sobre GitHub Pages más abajo).
2. En Settings → Pages, elige **GitHub Actions** como fuente. El workflow `.github/workflows/pages.yml` está incluido.
3. Abre la URL HTTPS publicada en Chrome para Android.
4. Menú ⋮ → **Añadir a pantalla de inicio** o **Instalar aplicación**.

**Importante:** según el plan y la configuración de tu cuenta, GitHub Pages puede publicar la web de forma accesible públicamente aunque el repositorio sea privado. Esta aplicación no debe incluir credenciales ni datos personales en el código fuente. Los datos que tú registres se guardan localmente en el navegador, no en el repositorio. Si quieres privacidad total de la URL, conviene plantear otro alojamiento con acceso restringido.

## Cómo se organizan los archivos

```text
src/
  main.ts              navegación, formularios y acciones
  types.ts             estructura de datos y tipos
  data/seed.ts         rutinas, misiones y recetas de ejemplo
  screens/             una pantalla por apartado
  lib/planner.ts       inventario, raciones y cobertura de comidas
  lib/progress.ts      XP y niveles
  lib/storage.ts       IndexedDB y copias JSON
  lib/dates.ts         fechas y semana
  lib/helpers.ts       utilidades
  ui/icons.ts          iconos
  styles.css           interfaz oscura adaptable al móvil
public/                 manifest y iconos PWA
scripts/build.mjs       compila TypeScript y genera Service Worker
.github/workflows/      publicación automática en GitHub Pages
tests/                  pruebas de lógica
```

## Cambios y nuevas funciones

- Cambia una pantalla concreta en `src/screens/` para no romper otras secciones.
- Modifica la lógica de despensa o menú en `src/lib/planner.ts`.
- Si cambias el formato de los datos, actualiza `src/types.ts` y añade una **migración de versión** en `src/lib/storage.ts` antes de actualizar la aplicación.
- Ejecuta `npm test` después de cada cambio. Crea commits con mensajes claros; crea nuevas versiones `v0.2`, `v0.3`.
- Antes de experimentar, usa Salud → **Exportar copia JSON**.

## Límites de esta versión

- **No hay reconocimiento de tickets ni chat con IA todavía. El dictado funciona con el micrófono del teclado del móvil, no es un asistente de voz integrado.** No existe conexión con modelos externos.
- No envía notificaciones ni sincroniza entre móviles y ordenadores.
- La disponibilidad semanal es una estimación basada en la despensa que hayas actualizado y las raciones registradas; no deduce automáticamente lo que has comido.
- Las recetas iniciales son **ejemplos**, no una lista exacta de tus recetas ni de lo que tienes en casa.
- La primera instalación necesita conexión; tras instalarse, la interfaz y los datos ya guardados pueden consultarse sin conexión. Si se borra el almacenamiento del navegador, puedes perder los datos: exporta copias periódicas.
- Las sesiones de gimnasio se registran a nivel de rutina completada, no aún por pesos/series específicos.

## Hoja de ruta

- **v0.2**: compras recurrentes, reposición y registro rápido por texto (implementado). La lectura de tickets con IA se traslada a una versión posterior.
- **v0.3**: recetas enviadas por texto o imagen, favoritos, menú sugerido y cálculo nutricional aproximado.
- **v0.4**: seguimiento de ejercicios, pesos y series, métricas de volumen semanal.
- **v0.5**: sincronización opcional segura entre dispositivos, recordatorios configurables y revisión de caducidades.

## Licencia

Proyecto personal. Sin dependencias de ejecución ni servicios externos obligatorios.

La publicación se actualiza automáticamente cuando se incorporan mejoras a la rama `main`.

<!-- Ajuste de publicación PWA Android v0.2.2 -->

<!-- Republicación de validación de despensa: 24-11-2026 -->

<!-- Republicación corrección identificación formularios 2026-11-25 -->

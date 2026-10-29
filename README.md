# Club de Lectura

App web instalable (PWA) para administrar el club de lectura: chicas, clubes, cuotas, libros de cumpleaños, actividades, The It Club, bookmommies/mommies, Vincci, tasas BCV y PDF contable.

- **Los datos se guardan solo en el teléfono** (almacenamiento local del navegador). Este repositorio no contiene ningún dato personal.
- **Copia de seguridad / Restaurar**: sección *Respaldo* de la app (archivo `.json`).
- Funciona sin internet gracias al service worker (`sw.js`).
- Para publicar una versión nueva se cambia `VERSION` en `sw.js`; la app la toma sola al abrirse con internet, sin tocar los datos.

Instalar en iPhone: abrir el enlace en Safari → Compartir → *Agregar a pantalla de inicio*.

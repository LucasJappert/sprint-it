# Changelog

Todos los cambios del proyecto se registran aquí por versión y fecha.

---

## v1.1.20 - 2026-02-21

### Nuevas Funciones

- **Agregar comentario desde Changelog**: Nueva funcionalidad para facilitar el pegado de detalles desde un changelog.
    - Botón "From Changelog" ubicado a la izquierda del botón "Add Comment" en la sección de comentarios
    - Abre un modal con un label predefinido: "Tarea realizada, así quedó el detalle en el changelog:"
    - El textarea obtiene el foco automáticamente al abrir el modal
    - Al guardar, se genera el comentario con formato: `Tarea completada, así quedó el detalle en el changelog:<br>[contenido pegado]`
    - Disponible tanto en items como en tasks

- **Copy to Clipboard**: Nueva funcionalidad para copiar título y descripción de items y tasks al portapapeles.
    - Icono `mdi-content-copy` ubicado a la derecha del campo de título en ItemDialog y TaskDialog
    - Al hacer click, copia el título y la descripción en formato texto plano
    - Elimina etiquetas HTML (p, u, strong, b, br) y las convierte a texto
    - Muestra notificación de éxito: "Copied to clipboard"

- **Ctrl+S para guardar sin cerrar**: Atajo de teclado para guardar items/tasks sin cerrar el diálogo.
    - Presionando Ctrl+S se guardan los cambios sin cerrar la ventana
    - Guarda solo los campos principales (title, description, assigned person, state, effort, etc.)
    - Ignora comentarios pendientes (ya que estos se manejan independientemente)

- **Efecto Pulse en diálogos**: Indicador visual de cambios pendientes en item/task.
    - Efecto de pulso animado en el borde del diálogo cuando hay cambios sin guardar
    - Se activa cuando: hay cambios en el formulario, se está escribiendo un comentario, o se está editando un comentario

### Cambios

- **MyDialog**: Agregada prop `pulse` para mostrar indicador visual de cambios pendientes

---

## v1.1.19 - 2026-02-19

### Nuevas Funciones

- **Export Sprint**: Nueva opción en el header para exportar los datos del sprint actual en formato JSON. Incluye:
    - Items con tareas completadas (estado Done)
    - Solo las tareas completadas de cada item
    - Comentarios asociados a items y tasks
    - Propiedad `prompt` con instrucción para ChatGPT generar resumen para colegas no técnicos

### Cambios

- **Import Data**: Renombrado de "Importar items" a "Import Data" en el menú de usuario
- **UI**: Eliminada línea separadora entre "Export Data" e "Import Data" en el menú

---

## v1.1.18 - 2026-02-18

### Cambios

- Mejoras en la UI del selector de sprints

---

## v1.1.17 - 2026-02-17

### Nuevas Funciones

- Sistema de instalación PWA

---

### Formato de entradas

Para agregar una nueva versión:

```markdown
## v1.X.X - YYYY-MM-DD

### Nuevas Funciones

- Descripción de nuevas funcionalidades

### Cambios

- Descripción de cambios existentes

### Arreglos

- Descripción de errores corregidos
```

---

_Este changelog se actualiza con cada versión del proyecto._

# Plan: Campos calculados automáticamente para items con tasks

## Problema identificado

Cuando un item tiene tasks, los campos "Assigned User", "Estado" y "Esfuerzos" deberían calcularse automáticamente desde las tasks, no permitir edición manual. Actualmente:

1. El usuario puede editar estos campos manualmente
2. Al guardar, los valores se persisten pero pueden sobrescribirse por la lógica de cálculo de tasks
3. Esto causa confusión y pérdida de datos percibida

## Solución propuesta

### 1. Modificar ItemDialog.vue

Bloquear la edición de campos cuando el item tiene tasks:

```typescript
// Computed para determinar si el item tiene tasks
const itemHasTasks = computed(() => {
    return props.existingItem?.tasks && props.existingItem.tasks.length > 0;
});
```

En el template, deshabilitar los campos:

- `assignedUser` - deshabilitar si `itemHasTasks`
- `state` - deshabilitar si `itemHasTasks`
- `estimatedEffort` - deshabilitar si `itemHasTasks`
- `actualEffort` - deshabilitar si `itemHasTasks`

### 2. Modificar sprint.ts - Lógica de cálculo automático

Agregar funciones para calcular los campos automáticamente:

```typescript
// Calcular estado del item basado en sus tasks
const calculateItemState = (tasks: Task[]): StateValue => {
    const activeTasks = tasks.filter((t) => t.deletedAt === null);
    if (activeTasks.length === 0) return STATE_VALUES.TODO;

    // Prioridad: InProgress > Ready For Test > Done > Waiting > To Do
    if (activeTasks.some((t) => t.state === STATE_VALUES.IN_PROGRESS)) {
        return STATE_VALUES.IN_PROGRESS;
    }
    if (activeTasks.some((t) => t.state === STATE_VALUES.READY_FOR_TEST)) {
        return STATE_VALUES.READY_FOR_TEST;
    }
    if (activeTasks.every((t) => t.state === STATE_VALUES.DONE)) {
        return STATE_VALUES.DONE;
    }
    if (activeTasks.some((t) => t.state === STATE_VALUES.WAITING)) {
        return STATE_VALUES.WAITING;
    }
    return STATE_VALUES.TODO;
};

// Calcular assigned user del item
const calculateItemAssignedUser = (tasks: Task[], currentAssignedUser: string | null): string | null => {
    const activeTasks = tasks.filter((t) => t.deletedAt === null);
    if (activeTasks.length === 0) return currentAssignedUser;

    // Prioridad 1: Task en estado In Progress
    const inProgressTask = activeTasks.find((t) => t.state === STATE_VALUES.IN_PROGRESS);
    if (inProgressTask?.assignedUser) {
        return inProgressTask.assignedUser;
    }

    // Prioridad 2: Usuario con más tasks asignadas
    const userTaskCount = new Map<string, number>();
    activeTasks.forEach((task) => {
        if (task.assignedUser) {
            userTaskCount.set(task.assignedUser, (userTaskCount.get(task.assignedUser) || 0) + 1);
        }
    });

    if (userTaskCount.size > 0) {
        const maxUser = [...userTaskCount.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
        return maxUser[0];
    }

    return currentAssignedUser;
};

// Calcular esfuerzos del item
const calculateItemEfforts = (tasks: Task[]) => {
    const activeTasks = tasks.filter((t) => t.deletedAt === null);
    return {
        estimatedEffort: activeTasks.reduce((sum, t) => sum + t.estimatedEffort, 0),
        actualEffort: activeTasks.reduce((sum, t) => sum + t.actualEffort, 0),
    };
};
```

### 3. Modificar sprint.ts - Actualización automática

En las funciones que modifican tasks, actualizar automáticamente el item padre:

```typescript
// En updateTask, addTask, moveTask, deleteTask, etc.
const autoUpdateParentItem = (item: Item) => {
    if (item.tasks.length > 0) {
        const newState = calculateItemState(item.tasks);
        const newAssignedUser = calculateItemAssignedUser(item.tasks, item.assignedUser);
        const { estimatedEffort, actualEffort } = calculateItemEfforts(item.tasks);

        item.state = newState;
        item.assignedUser = newAssignedUser;
        item.estimatedEffort = estimatedEffort;
        item.actualEffort = actualEffort;
    }
};
```

### 4. Lugares donde disparamos actualización

- `updateTask` - cuando se actualiza una task
- `addItem` (para tasks dentro del item)
- Mover task entre items (origen y destino)
- Eliminar task (soft delete)
- Crear nueva task

## Acciones a realizar

- [ ] **Item 1**: Modificar `ItemDialog.vue` para deshabilitar campos cuando hay tasks
- [ ] **Item 2**: Agregar funciones de cálculo en `sprint.ts`
- [ ] **Item 3**: Modificar `updateTask` para recalcular item padre
- [ ] **Item 4**: Modificar funciones de movimiento de tasks
- [ ] **Item 5**: Modificar funciones de eliminación de tasks
- [ ] **Item 6**: Modificar funciones de creación de tasks

## Notas adicionales

- El campo "Prioridad" y "ProjectName" deben permanecer editables
- El campo "Título" y "Detalle" también deben permanecer editables
- Mostrar indicador visual en el diálogo cuando los campos están calculados automáticamente

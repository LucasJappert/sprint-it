import { PRIORITY_VALUES } from "@/constants/priorities";
import { STATE_VALUES } from "@/constants/states";
import { getAllUsers } from "@/services/firestore";
import type { Item, Task, User } from "@/types";

/**
 * Utilidad para importar items desde archivos JSON
 * Maneja validación, sanitización y conversión de datos
 */

export interface ImportResult {
    items: Item[];
    totalItems: number;
    totalTasks: number;
}

export interface ImportValidationError {
    itemIndex?: number;
    taskIndex?: number;
    field: string;
    message: string;
}

/**
 * Busca el ID de usuario por username en una cadena de texto que puede contener nombre completo y email
 */
const findUserIdByText = (text: string, users: User[]): string | null => {
    if (!text || typeof text !== "string") return null;

    const lowerText = text.toLowerCase();

    // Primero buscar por username exacto
    for (const user of users) {
        if (user.username && lowerText.includes(user.username.toLowerCase())) {
            return user.id;
        }
    }

    // Si no se encuentra por username, buscar por email
    for (const user of users) {
        if (user.email && lowerText.includes(user.email.toLowerCase())) {
            return user.id;
        }
    }

    // Si no se encuentra por email, buscar por nombre completo
    for (const user of users) {
        const fullName = `${user.name} ${user.lastName}`.toLowerCase();
        if (lowerText.includes(fullName)) {
            return user.id;
        }
    }

    return null;
};

/**
 * Valida y sanitiza un item importado desde JSON
 */
export const sanitizeImportedItem = async (rawItem: any, index: number, users: User[]): Promise<Item> => {
    // Validar campos requeridos
    if (!rawItem.title || typeof rawItem.title !== "string") {
        throw new Error(`Item ${index + 1}: El campo 'title' es requerido y debe ser un string`);
    }

    // Validar y sanitizar state
    const validStates = Object.values(STATE_VALUES);
    const itemState = validStates.includes(rawItem.state) ? rawItem.state : STATE_VALUES.TODO;

    // Validar y sanitizar priority
    const validPriorities = Object.values(PRIORITY_VALUES);
    const itemPriority = validPriorities.includes(rawItem.priority) ? rawItem.priority : PRIORITY_VALUES.NORMAL;

    // Sanitizar tasks si existen
    const sanitizedTasks: Task[] = [];
    if (Array.isArray(rawItem.tasks)) {
        for (const [taskIndex, rawTask] of rawItem.tasks.entries()) {
            if (!rawTask.title || typeof rawTask.title !== "string") {
                throw new Error(`Item ${index + 1}, Task ${taskIndex + 1}: El campo 'title' es requerido y debe ser un string`);
            }

            // Validar y sanitizar state de task
            const taskState = validStates.includes(rawTask.state) ? rawTask.state : STATE_VALUES.TODO;

            // Validar y sanitizar priority de task
            const taskPriority = validPriorities.includes(rawTask.priority) ? rawTask.priority : PRIORITY_VALUES.NORMAL;

            // Buscar assignedUser para task
            const taskAssignedUser = rawTask.assignedUser ? findUserIdByText(rawTask.assignedUser, users) : null;

            const sanitizedTask: Task = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Nuevo ID
                title: rawTask.title,
                detail: rawTask.detail || "",
                priority: taskPriority,
                state: taskState,
                estimatedEffort: typeof rawTask.estimatedEffort === "number" ? rawTask.estimatedEffort : 0,
                actualEffort: typeof rawTask.actualEffort === "number" ? rawTask.actualEffort : 0,
                assignedUser: taskAssignedUser,
                order: typeof rawTask.order === "number" ? rawTask.order : taskIndex + 1,
                createdAt: new Date(),
                createdBy: "",
                deletedAt: null,
                projectName: rawTask.projectName || "",
            };
            sanitizedTasks.push(sanitizedTask);
        }
    }

    // Buscar assignedUser para item
    const itemAssignedUser = rawItem.assignedUser ? findUserIdByText(rawItem.assignedUser, users) : null;

    // Crear item sanitizado con nuevo ID
    const sanitizedItem: Item = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Nuevo ID
        title: rawItem.title,
        detail: rawItem.detail || "",
        priority: itemPriority,
        state: itemState,
        estimatedEffort: typeof rawItem.estimatedEffort === "number" ? rawItem.estimatedEffort : 0,
        actualEffort: typeof rawItem.actualEffort === "number" ? rawItem.actualEffort : 0,
        assignedUser: itemAssignedUser,
        tasks: sanitizedTasks,
        order: typeof rawItem.order === "number" ? rawItem.order : index + 1,
        createdAt: new Date(),
        createdBy: "",
        deletedAt: null,
        projectName: rawItem.projectName || "",
    };

    return sanitizedItem;
};

/**
 * Procesa un array de items crudos y devuelve items sanitizados
 */
export const processImportedItems = async (rawItems: any[]): Promise<ImportResult> => {
    if (!Array.isArray(rawItems)) {
        throw new Error("El archivo debe contener un array de items");
    }

    // Obtener todos los usuarios para buscar assignedUser
    const users = await getAllUsers();

    // Sanitizar todos los items con orden correcto
    const sanitizedItems: Item[] = [];
    for (let index = 0; index < rawItems.length; index++) {
        const rawItem = rawItems[index];
        const sanitizedItem = await sanitizeImportedItem(rawItem, index, users);
        sanitizedItems.push(sanitizedItem);
    }

    // Reordenar items y tasks con números consecutivos
    sanitizedItems.forEach((item, itemIndex) => {
        item.order = itemIndex + 1; // Items: 1, 2, 3, 4...

        // Reordenar tasks dentro del item
        item.tasks.forEach((task, taskIndex) => {
            task.order = taskIndex + 1; // Tasks: 1, 2, 3... dentro de cada item
        });
    });

    // Contar items y tasks
    const totalItems = sanitizedItems.length;
    const totalTasks = sanitizedItems.reduce((sum, item) => sum + item.tasks.length, 0);

    return {
        items: sanitizedItems,
        totalItems,
        totalTasks,
    };
};

/**
 * Crea un input file oculto para seleccionar archivos JSON
 */
export const createFileInput = (): Promise<File | null> => {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.style.display = "none";

        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0] || null;
            resolve(file);
        };

        input.oncancel = () => {
            resolve(null);
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
};

import { getAllChangesRecent, getAllSprints, getAllUsers } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { ChangeHistory, Sprint, User } from "@/types";
import { computed, ref } from "vue";

export interface UserActivity {
    user: User;
    activities: ActivityItem[];
}

export interface ActivityItem {
    id: string;
    type: "task" | "item" | "comment" | "change";
    action: string;
    description: string;
    timestamp: Date;
    sprintTitle?: string;
    itemId?: string;
    itemTitle?: string;
    taskId?: string;
    taskTitle?: string;
}

export const useUserActivity = () => {
    const authStore = useAuthStore();
    const users = ref<User[]>([]);
    const activities = ref<UserActivity[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const isInitialized = ref(false);

    const initialize = async () => {
        if (isInitialized.value) return;

        loading.value = true;
        error.value = null;

        try {
            console.log(" Inicializando user activity...");

            // Obtener todos los usuarios
            const allUsers = await getAllUsers();
            console.log(" Usuarios obtenidos:", allUsers.length);
            users.value = allUsers;

            // Obtener todos los sprints para analizar actividad
            const allSprints = await getAllSprints();
            console.log(" Sprints obtenidos:", allSprints.length);

            // Obtener todos los cambios recientes de una vez (batch query)
            const allChanges = await getAllChangesRecent(7);
            console.log(" Cambios recientes obtenidos:", allChanges.length);

            // Procesar actividad para cada usuario
            const userActivities: UserActivity[] = [];

            for (const user of allUsers) {
                console.log(` Procesando actividad de ${user.name}...`);
                const userActivitiesList = await getUserActivities(user, allSprints, allChanges, allUsers);
                userActivities.push({
                    user,
                    activities: userActivitiesList,
                });
                console.log(` ${user.name} tiene ${userActivitiesList.length} actividades`);
            }

            activities.value = userActivities;
            isInitialized.value = true;
            console.log(" User activity inicializado correctamente");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error al cargar actividad de usuarios";
            error.value = errorMessage;
            console.error(" Error initializing user activity:", err);
        } finally {
            loading.value = false;
            console.log(" Loading finalizado");
        }
    };

    const getUserActivities = async (user: User, sprints: Sprint[], allChanges: ChangeHistory[], allUsers: User[]): Promise<ActivityItem[]> => {
        const activities: ActivityItem[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        console.log(`🔍 Procesando ${allChanges.length} cambios para ${user.name}...`);

        // Filtrar cambios del usuario en los últimos 7 días
        const userChanges = allChanges.filter((change) => change.userId === user.id && change.createdAt >= sevenDaysAgo);

        console.log(`📋 ${user.name} tiene ${userChanges.length} cambios en los últimos 7 días`);

        // Crear un mapa de todos los items y tasks por ID para búsqueda rápida
        const itemsMap = new Map<string, { item: any; sprint: Sprint }>();
        const tasksMap = new Map<string, { task: any; item: any; sprint: Sprint }>();

        for (const sprint of sprints) {
            for (const item of sprint.items || []) {
                if (item.deletedAt === null) {
                    itemsMap.set(item.id, { item, sprint });
                    for (const task of item.tasks || []) {
                        if (task.deletedAt === null) {
                            tasksMap.set(task.id, { task, item, sprint });
                        }
                    }
                }
            }
        }

        // Procesar items creados por el usuario
        for (const sprint of sprints) {
            for (const item of sprint.items || []) {
                if (item.deletedAt !== null) continue;

                if (item.createdBy === user.id && item.createdAt >= sevenDaysAgo) {
                    activities.push({
                        id: `item-${item.id}`,
                        type: "item",
                        action: "Item agregado",
                        description: `"${item.title}"`,
                        timestamp: item.createdAt,
                        sprintTitle: sprint.titulo,
                        itemId: item.id,
                        itemTitle: item.title,
                    });
                }

                // Procesar tasks creadas por el usuario
                for (const task of item.tasks || []) {
                    if (task.deletedAt !== null) continue;

                    if (task.createdBy === user.id && task.createdAt >= sevenDaysAgo) {
                        activities.push({
                            id: `task-${task.id}`,
                            type: "task",
                            action: "Task agregada",
                            description: `"${task.title}" a Item "${item.title}"`,
                            timestamp: task.createdAt,
                            sprintTitle: sprint.titulo,
                            itemId: item.id,
                            itemTitle: item.title,
                            taskId: task.id,
                            taskTitle: task.title,
                        });
                    }

                    if (task.assignedUser === user.id && task.createdAt >= sevenDaysAgo) {
                        activities.push({
                            id: `task-assigned-${task.id}`,
                            type: "task",
                            action: "Task asignada",
                            description: `"${task.title}"`,
                            timestamp: task.createdAt,
                            sprintTitle: sprint.titulo,
                            itemId: item.id,
                            itemTitle: item.title,
                            taskId: task.id,
                            taskTitle: task.title,
                        });
                    }
                }
            }
        }

        // Procesar todos los cambios del usuario
        let processedChanges = 0;
        let notFoundChanges = 0;
        for (const change of userChanges) {
            const itemData = itemsMap.get(change.associatedId);
            const taskData = tasksMap.get(change.associatedId);

            if (itemData) {
                processedChanges++;
                // Es un cambio en un item
                const { item, sprint } = itemData;
                let actionText = "";
                let descriptionText = "";

                switch (change.field) {
                    case "state":
                        actionText = "Cambio de estado";
                        descriptionText = `en Item "${item.title}": de "${change.oldValue}" a "${change.newValue}"`;
                        break;
                    case "priority":
                        actionText = "Cambio de prioridad";
                        descriptionText = `en Item "${item.title}": de "${change.oldValue}" a "${change.newValue}"`;
                        break;
                    case "estimatedEffort":
                        actionText = "Cambio de esfuerzo estimado";
                        descriptionText = `en Item "${item.title}": de ${change.oldValue} a ${change.newValue}`;
                        break;
                    case "actualEffort":
                        actionText = "Cambio de esfuerzo real";
                        descriptionText = `en Item "${item.title}": de ${change.oldValue} a ${change.newValue}`;
                        break;
                    case "detail":
                        actionText = "Editó detalle";
                        descriptionText = `de Item "${item.title}"`;
                        break;
                    case "title":
                        actionText = "Editó título";
                        descriptionText = `de Item "${item.title}"`;
                        break;
                    default:
                        actionText = `Modificó ${change.field}`;
                        descriptionText = `en Item "${item.title}": de "${change.oldValue}" a "${change.newValue}"`;
                }

                activities.push({
                    id: `change-${change.id}`,
                    type: "change",
                    action: actionText,
                    description: descriptionText,
                    timestamp: change.createdAt,
                    sprintTitle: sprint.titulo,
                    itemId: item.id,
                    itemTitle: item.title,
                });
            } else if (taskData) {
                processedChanges++;
                // Es un cambio en una task
                const { task, item, sprint } = taskData;
                let actionText = "";
                let descriptionText = "";

                switch (change.field) {
                    case "state":
                        actionText = "Cambio de estado";
                        descriptionText = `en Task "${task.title}": de "${change.oldValue}" a "${change.newValue}"`;
                        break;
                    case "priority":
                        actionText = "Cambio de prioridad";
                        descriptionText = `en Task "${task.title}": de "${change.oldValue}" a "${change.newValue}"`;
                        break;
                    case "estimatedEffort":
                        actionText = "Cambio de esfuerzo estimado";
                        descriptionText = `en Task "${task.title}": de ${change.oldValue} a ${change.newValue}`;
                        break;
                    case "actualEffort":
                        actionText = "Cambio de esfuerzo real";
                        descriptionText = `en Task "${task.title}": de ${change.oldValue} a ${change.newValue}`;
                        break;
                    case "order":
                        actionText = "Reordenamiento";
                        descriptionText = `de Task "${task.title}"`;
                        break;
                    case "detail":
                        actionText = "Editó detalle";
                        descriptionText = `de Task "${task.title}"`;
                        break;
                    case "title":
                        actionText = "Editó título";
                        descriptionText = `de Task "${task.title}"`;
                        break;
                    case "assignedUser":
                        const oldUser = allUsers.find((u) => u.id === change.oldValue);
                        const newUser = allUsers.find((u) => u.id === change.newValue);
                        const oldUserName = oldUser ? `${oldUser.name} ${oldUser.lastName}` : "Sin asignar";
                        const newUserName = newUser ? `${newUser.name} ${newUser.lastName}` : "Sin asignar";
                        actionText = "Cambio de asignación";
                        descriptionText = `en Task "${task.title}": de ${oldUserName} a ${newUserName}`;
                        break;
                    default:
                        actionText = `Modificó ${change.field}`;
                        descriptionText = `en Task "${task.title}": de "${change.oldValue}" a "${change.newValue}"`;
                }

                activities.push({
                    id: `change-${change.id}`,
                    type: "change",
                    action: actionText,
                    description: descriptionText,
                    timestamp: change.createdAt,
                    sprintTitle: sprint.titulo,
                    itemId: item.id,
                    itemTitle: item.title,
                    taskId: task.id,
                    taskTitle: task.title,
                });
            } else {
                notFoundChanges++;
            }
        }

        console.log(`✅ ${user.name}: procesados ${processedChanges} cambios, ${notFoundChanges} no encontrados, ${activities.length} actividades totales`);

        // Ordenar actividades por timestamp descendente (más recientes primero)
        return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };

    const getUserActivityById = (userId: string) => {
        return computed(() => activities.value.find((activity) => activity.user.id === userId));
    };

    const shouldShowButton = computed(() => authStore.isAuthenticated);

    return {
        users,
        activities,
        loading,
        error,
        isInitialized,
        initialize,
        getUserActivityById,
        shouldShowButton,
    };
};

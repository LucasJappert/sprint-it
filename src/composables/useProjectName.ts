import { useSprintStore } from "@/stores/sprint";

const LAST_PROJECT_KEY = "sprint-it-last-project";

// Proyectos por defecto que siempre estarán disponibles
const DEFAULT_PROJECTS = [
    "APIX/front",
    "APIX/back-node",
    "APIX/back-python",
    "Agroideas-In/front",
    "Agroideas-In/back",
];

/**
 * Composable para gestionar la selección de proyectos en items y tasks.
 * Proporciona una lista de proyectos únicos obtenidos de los últimos 10 sprints
 * y maneja la persistencia del último proyecto usado en localStorage.
 */
export const useProjectName = () => {
    const sprintStore = useSprintStore();

    /**
     * Obtiene todos los proyectos únicos de los últimos 10 sprints,
     * más los proyectos por defecto, ordenados alfabéticamente.
     */
    const getAllProjects = (): string[] => {
        const allProjects = new Set<string>(DEFAULT_PROJECTS);

        // Obtener los últimos 10 sprints ordenados por número
        const sortedSprints = [...sprintStore.sprints].sort((a, b) => {
            const numA = parseInt(a.id.replace("sprint-", ""));
            const numB = parseInt(b.id.replace("sprint-", ""));
            return numB - numA;
        });

        const last10Sprints = sortedSprints.slice(0, 10);

        // Recorrer todos los items y tasks para collect projectNames
        for (const sprint of last10Sprints) {
            if (sprint.items) {
                for (const item of sprint.items) {
                    // Skip deleted items
                    if (item.deletedAt) continue;

                    if (item.projectName && item.projectName.trim()) {
                        allProjects.add(item.projectName.trim());
                    }

                    // Also check tasks within the item
                    if (item.tasks) {
                        for (const task of item.tasks) {
                            if (task.deletedAt) continue;
                            if (task.projectName && task.projectName.trim()) {
                                allProjects.add(task.projectName.trim());
                            }
                        }
                    }
                }
            }
        }

        // Convertir a array y ordenar alfabéticamente
        return Array.from(allProjects).sort((a, b) => a.localeCompare(b));
    };

    /**
     * Filtra los proyectos según el texto escrito.
     * Si el texto está vacío, retorna todos los proyectos.
     */
    const filterProjects = (searchText: string): string[] => {
        const allProjects = getAllProjects();

        if (!searchText.trim()) {
            return allProjects;
        }

        const lowerSearch = searchText.toLowerCase();
        return allProjects.filter((project) => project.toLowerCase().includes(lowerSearch));
    };

    /**
     * Guarda el último proyecto usado en localStorage.
     */
    const saveLastProject = (projectName: string): void => {
        if (projectName && projectName.trim()) {
            localStorage.setItem(LAST_PROJECT_KEY, projectName.trim());
        }
    };

    /**
     * Obtiene el último proyecto usado desde localStorage.
     */
    const getLastProject = (): string => {
        return localStorage.getItem(LAST_PROJECT_KEY) || "";
    };

    /**
     * Limpia el último proyecto guardado en localStorage.
     */
    const clearLastProject = (): void => {
        localStorage.removeItem(LAST_PROJECT_KEY);
    };

    return {
        getAllProjects,
        filterProjects,
        saveLastProject,
        getLastProject,
        clearLastProject,
    };
};

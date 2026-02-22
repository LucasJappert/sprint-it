import { useSprintStore } from "@/stores/sprint";

const LAST_PROJECT_KEY = "sprint-it-last-project";

// Interfaz para proyectos con color
interface ProjectConfig {
    name: string;
    color: string;
}

// Constante de proyectos con acceso directo: PROJECTS.APIX.color, PROJECTS.APIX.name
const PROJECTS = {
    DASHBOARD_SPRINT_IT: {
        name: "📋 Dashboard Sprint-It",
        color: "#4CAF50",
    },
    APIX: {
        name: "🟢 APIX",
        color: "#00ab22",
    },
    AGROIDEAS_IN: {
        name: "🔵 Agroideas-In",
        color: "#2196F3",
    },
    MEETINGS: {
        name: "🟣 Meetings",
        color: "#9b44f8",
    },
    VARIOS: {
        name: "⚫ Varios",
        color: "#282828",
    }
} as const;

// Retrocompatibilidad: array de nombres default para funciones existentes
const DEFAULT_PROJECTS = Object.values(PROJECTS).map((p) => p.name);

const DEFAULT_COLOR = "#ecebeb";

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
     * Obtiene todos los proyectos por defecto con su color.
     * Retorna objetos con { name, color } para uso cuando se necesita el color.
     */
    const getProjectsWithColors = (): ProjectConfig[] => {
        return Object.values(PROJECTS);
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

    /**
     * Obtiene el color de un proyecto.
     * Retorna el color definido en PROJECTS o el color gris por defecto.
     */
    const getProjectColor = (projectName: string): string => {
        if (!projectName || !projectName.trim()) return DEFAULT_COLOR;

        const trimmedName = projectName.trim().toLowerCase();

        // Buscar en PROJECTS comparando el texto sin emoji
        for (const project of Object.values(PROJECTS)) {
            const projectText = project.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
            const searchText = trimmedName.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();

            // Comparar si el texto del proyecto está contenido en el nombre buscado
            if (projectText.includes(searchText) || searchText.includes(projectText)) {
                return project.color;
            }
        }

        return DEFAULT_COLOR;
    };

    return {
        getAllProjects,
        filterProjects,
        saveLastProject,
        getLastProject,
        clearLastProject,
        getProjectsWithColors,
        getProjectColor,
        PROJECTS,
    };
};

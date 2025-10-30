export const useUrlManagement = (router: any) => {
    const getRouter = () => {
        return router;
    };

    const setTaskUrl = (taskId: string) => {
        const r = getRouter();
        if (r && r.currentRoute) {
            const route = r.currentRoute.value;
            r.replace({ query: { ...route.query, id: taskId } });
        }
    };

    const setItemUrl = (itemId: string) => {
        const r = getRouter();
        if (r && r.currentRoute) {
            const route = r.currentRoute.value;
            r.replace({ query: { ...route.query, id: itemId } });
        }
    };

    const clearQueryParams = () => {
        const r = getRouter();
        if (r && r.currentRoute) {
            r.replace({ query: {} });
        }
    };

    const getIdFromUrl = (): string | null => {
        try {
            const router = getRouter();
            if (router && router.currentRoute) {
                return router.currentRoute.value.query.id as string || null;
            }
        } catch (e) {
            console.warn("Error getting id from URL:", e);
        }
        return null;
    };

    const getTaskIdFromUrl = (): string | null => {
        const id = getIdFromUrl();
        if (id && id.startsWith("task-")) {
            return id;
        }
        return null;
    };

    const getItemIdFromUrl = (): string | null => {
        const id = getIdFromUrl();
        if (id && id.startsWith("item-")) {
            return id;
        }
        return null;
    };

    return {
        setTaskUrl,
        setItemUrl,
        clearQueryParams,
        getTaskIdFromUrl,
        getItemIdFromUrl,
    };
};

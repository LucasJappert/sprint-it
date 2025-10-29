export const useUrlManagement = (router: any) => {
    const getRouter = () => {
        return router;
    };

    const setTaskUrl = (taskId: string) => {
        const r = getRouter();
        if (r && r.currentRoute) {
            const route = r.currentRoute.value;
            r.replace({ query: { ...route.query, taskId } });
        }
    };

    const setItemUrl = (itemId: string) => {
        const r = getRouter();
        if (r && r.currentRoute) {
            const route = r.currentRoute.value;
            r.replace({ query: { ...route.query, itemId } });
        }
    };

    const clearQueryParams = () => {
        const r = getRouter();
        if (r && r.currentRoute) {
            r.replace({ query: {} });
        }
    };

    const getTaskIdFromUrl = (): string | null => {
        try {
            const router = getRouter();
            if (router && router.currentRoute) {
                return router.currentRoute.value.query.taskId as string || null;
            }
        } catch (e) {
            console.warn("Error getting taskId from URL:", e);
        }
        return null;
    };

    const getItemIdFromUrl = (): string | null => {
        try {
            const router = getRouter();
            if (router && router.currentRoute) {
                return router.currentRoute.value.query.itemId as string || null;
            }
        } catch (e) {
            console.warn("Error getting itemId from URL:", e);
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

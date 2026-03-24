import { supabase } from "@/supabase";

/**
 * Elimina un archivo del storage de Supabase
 */
export const deleteFromStorage = async (storageUrl: string): Promise<boolean> => {
    try {
        // Extraer el path del archivo desde la URL
        const url = new URL(storageUrl);
        const pathParts = url.pathname.split('/');
        const objectPath = pathParts.slice(pathParts.indexOf('sprint-it') + 1).join('/');
        
        const { error } = await supabase
            .storage
            .from('sprint-it')
            .remove([objectPath]);
            
        return !error;
    } catch (error) {
        console.error('Error deleting from storage:', error);
        return false;
    }
};

/**
 * Elimina múltiples archivos del storage en lote
 */
export const deleteBatchFromStorage = async (storageUrls: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
}> => {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };

    // Procesar en lotes de 10 para no sobrecargar
    const batchSize = 10;
    for (let i = 0; i < storageUrls.length; i += batchSize) {
        const batch = storageUrls.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
            batch.map(async (url) => {
                const success = await deleteFromStorage(url);
                return { url, success };
            })
        );

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`Failed to delete: ${batch[index]}`);
                }
            } else {
                results.failed++;
                results.errors.push(`Error: ${batch[index]} - ${result.reason}`);
            }
        });
    }

    return results;
};

/**
 * Obtiene el tamaño de un archivo desde su URL
 */
export const getFileSizeFromUrl = async (storageUrl: string): Promise<number> => {
    try {
        // Usar AbortController para manejar mejor los errores de red
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
        
        const response = await fetch(storageUrl, { 
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // Archivo no existe o no es accesible, retornamos 0 silenciosamente
            return 0;
        }
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength) : 0;
    } catch (error) {
        // Cualquier error de red o abort, retornamos 0 silenciosamente
        // Esto captura los ERR_ABORTED y otros errores de red
        return 0;
    }
};

/**
 * Obtiene el tamaño total de múltiples archivos
 */
export const getTotalSize = async (storageUrls: string[]): Promise<number> => {
    const sizes = await Promise.allSettled(
        storageUrls.map(url => getFileSizeFromUrl(url))
    );
    
    return sizes.reduce((total, result) => {
        return total + (result.status === 'fulfilled' ? result.value : 0);
    }, 0);
};

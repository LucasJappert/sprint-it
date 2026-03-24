import { deleteAttachment, getAllAttachments, getAllComments, getAllSprints } from "@/services/firestore";
import type { Attachment, Comment } from "@/types";
import { deleteBatchFromStorage, getTotalSize } from "@/utils/supabaseStorageManager";

export interface CleanupStats {
    sprintId: string;
    sprintTitle: string;
    attachmentsDeleted: number;
    imagesDeleted: number;
    sizeFreed: number;
}

export interface CleanupResult {
    totalFilesDeleted: number;
    totalSizeFreed: number;
    sprintStats: CleanupStats[];
    errors: string[];
}

/**
 * Verifica si una imagen existe en el storage
 */
const verifyImageExists = async (imageUrl: string): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout
        
        const response = await fetch(imageUrl, { 
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * Verifica existencia de múltiples imágenes en paralelo
 */
const filterExistingImages = async (imageUrls: string[], onProgress?: (verified: number, total: number) => void): Promise<string[]> => {
    if (imageUrls.length === 0) return [];
    
    // Ejecutar verificaciones en lotes paralelos
    const batchSize = 20; // Verificar 20 URLs a la vez
    const existingUrls: string[] = [];
    let verifiedCount = 0;
    
    for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
            batch.map(url => verifyImageExists(url))
        );
        
        // Agregar solo las URLs que existen
        batch.forEach((url, index) => {
            if (results[index].status === 'fulfilled' && results[index].value) {
                existingUrls.push(url);
            }
        });
        
        verifiedCount += batch.length;
        onProgress?.(verifiedCount, imageUrls.length);
    }
    
    return existingUrls;
};

/**
 * Extrae URLs de imágenes de un texto HTML
 */
const extractImageUrls = (text: string): string[] => {
    if (!text) return [];
    const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const urls: string[] = [];
    let match;
    while ((match = imageRegex.exec(text)) !== null) {
        urls.push(match[1]);
    }
    return urls;
};

/**
 * Obtiene el número del sprint actual
 */
const getCurrentSprintNumber = (currentSprintId?: string): number => {
    // Primero intentar desde el parámetro
    if (currentSprintId) {
        const match = currentSprintId.match(/sprint-(\d+)/);
        if (match) {
            return parseInt(match[1]);
        }
    }
    
    // Luego intentar desde la URL
    const urlMatch = window.location.href.match(/sprint-(\d+)/);
    if (urlMatch) {
        return parseInt(urlMatch[1]);
    }
    
    // Si no está en la URL, intentar desde localStorage
    const storedSprint = localStorage.getItem('sprint-it-current-sprint');
    if (storedSprint) {
        const match = storedSprint.match(/sprint-(\d+)/);
        if (match) {
            return parseInt(match[1]);
        }
    }
    
    // Si no hay sprint actual, usar un fallback razonable
    console.warn('No se pudo determinar el sprint actual, usando fallback');
    return 1;
};

/**
 * Determina desde qué sprint comenzar la limpieza (actual - 4)
 */
const getCleanupStartSprint = (currentSprintId?: string): number => {
    const currentSprint = getCurrentSprintNumber(currentSprintId);
    return currentSprint - 4;
};

/**
 * Identifica todos los archivos a eliminar de sprints antiguos
 */
export const identifyFilesToCleanup = async (
    currentSprintId?: string, 
    onProgress?: (verified: number, total: number) => void
): Promise<{
    sprintId: string;
    sprintTitle: string;
    attachments: Attachment[];
    imageUrls: string[];
}[]> => {
    const allSprints = await getAllSprints();
    const cleanupStartNumber = getCleanupStartSprint(currentSprintId);
    
    // Obtener todos los attachments de una sola vez
    const allAttachments = await getAllAttachments();
    
    // Obtener todos los comentarios de una sola vez
    const allComments = await getAllComments();
    
    // Crear mapas para búsqueda rápida
    const attachmentsByAssociatedId = new Map<string, Attachment[]>();
    const commentsByAssociatedId = new Map<string, Comment[]>();
    
    // Agrupar attachments por associatedId
    allAttachments.forEach(attachment => {
        if (!attachmentsByAssociatedId.has(attachment.associatedId)) {
            attachmentsByAssociatedId.set(attachment.associatedId, []);
        }
        attachmentsByAssociatedId.get(attachment.associatedId)!.push(attachment);
    });
    
    // Agrupar comentarios por associatedId
    allComments.forEach(comment => {
        if (!commentsByAssociatedId.has(comment.associatedId)) {
            commentsByAssociatedId.set(comment.associatedId, []);
        }
        commentsByAssociatedId.get(comment.associatedId)!.push(comment);
    });
    
    const results = [];
    
    for (const sprint of allSprints) {
        const sprintNumber = parseInt(sprint.id.replace('sprint-', ''));
        
        if (sprintNumber > cleanupStartNumber) continue;
        
        const attachments: Attachment[] = [];
        const imageUrls: string[] = [];
        
        // Extraer imágenes de descripciones de items
        for (const item of sprint.items || []) {
            const itemImages = extractImageUrls(item.detail || '');
            
            // Filtrar solo imágenes que realmente existen
            const existingItemImages = await filterExistingImages(itemImages, onProgress);
            imageUrls.push(...existingItemImages);
            
            // Obtener attachments del item (búsqueda rápida en mapa)
            if (item.id && attachmentsByAssociatedId.has(item.id)) {
                const itemAttachments = attachmentsByAssociatedId.get(item.id)!;
                attachments.push(...itemAttachments);
            }
            
            // Extraer imágenes y attachments de tasks
            for (const task of item.tasks || []) {
                const taskImages = extractImageUrls(task.detail || '');
                
                // Filtrar solo imágenes que realmente existen
                const existingTaskImages = await filterExistingImages(taskImages, onProgress);
                imageUrls.push(...existingTaskImages);
                
                // Obtener attachments de la task (búsqueda rápida en mapa)
                if (task.id && attachmentsByAssociatedId.has(task.id)) {
                    const taskAttachments = attachmentsByAssociatedId.get(task.id)!;
                    attachments.push(...taskAttachments);
                }
                
                // Obtener comentarios de la task (búsqueda rápida en mapa)
                if (task.id && commentsByAssociatedId.has(task.id)) {
                    const taskComments = commentsByAssociatedId.get(task.id)!;
                    for (const comment of taskComments) {
                        const commentImages = extractImageUrls(comment.description || '');
                        
                        // Filtrar solo imágenes que realmente existen
                        const existingCommentImages = await filterExistingImages(commentImages, onProgress);
                        imageUrls.push(...existingCommentImages);
                    }
                }
            }
            
            // Obtener comentarios del item (búsqueda rápida en mapa)
            if (item.id && commentsByAssociatedId.has(item.id)) {
                const itemComments = commentsByAssociatedId.get(item.id)!;
                for (const comment of itemComments) {
                    const commentImages = extractImageUrls(comment.description || '');
                    
                    // Filtrar solo imágenes que realmente existen
                    const existingCommentImages = await filterExistingImages(commentImages, onProgress);
                    imageUrls.push(...existingCommentImages);
                }
            }
        }
        
        // Siempre agregar el sprint al resultado, incluso si no tiene archivos
        results.push({
            sprintId: sprint.id,
            sprintTitle: sprint.titulo,
            attachments,
            imageUrls
        });
    }
    
    return results;
};

/**
 * Ejecuta la limpieza de storage
 */
export const executeStorageCleanup = async (): Promise<CleanupResult> => {
    const result: CleanupResult = {
        totalFilesDeleted: 0,
        totalSizeFreed: 0,
        sprintStats: [],
        errors: []
    };
    
    try {
        const filesToCleanup = await identifyFilesToCleanup();
        
        for (const sprintData of filesToCleanup) {
            const sprintStats: CleanupStats = {
                sprintId: sprintData.sprintId,
                sprintTitle: sprintData.sprintTitle,
                attachmentsDeleted: 0,
                imagesDeleted: 0,
                sizeFreed: 0
            };
            
            // Eliminar attachments
            const attachmentUrls = sprintData.attachments.map(a => a.storageUrl).filter(Boolean);
            if (attachmentUrls.length > 0) {
                const sizeBefore = await getTotalSize(attachmentUrls);
                await deleteBatchFromStorage(attachmentUrls);
                
                // Eliminar registros de Firestore
                for (const attachment of sprintData.attachments) {
                    try {
                        await deleteAttachment(attachment.id);
                        sprintStats.attachmentsDeleted++;
                    } catch (error) {
                        result.errors.push(`Error deleting attachment ${attachment.id}: ${error}`);
                    }
                }
                
                const sizeAfter = await getTotalSize(attachmentUrls);
                sprintStats.sizeFreed += sizeBefore - sizeAfter;
            }
            
            // Eliminar imágenes
            if (sprintData.imageUrls.length > 0) {
                const sizeBefore = await getTotalSize(sprintData.imageUrls);
                const imageCleanupResult = await deleteBatchFromStorage(sprintData.imageUrls);
                sprintStats.imagesDeleted = imageCleanupResult.success;
                
                const sizeAfter = await getTotalSize(sprintData.imageUrls);
                sprintStats.sizeFreed += sizeBefore - sizeAfter;
                
                // Agregar errores si los hay
                result.errors.push(...imageCleanupResult.errors);
            }
            
            result.totalFilesDeleted += sprintStats.attachmentsDeleted + sprintStats.imagesDeleted;
            result.totalSizeFreed += sprintStats.sizeFreed;
            result.sprintStats.push(sprintStats);
        }
        
    } catch (error) {
        result.errors.push(`Error general en limpieza: ${error}`);
    }
    
    return result;
};

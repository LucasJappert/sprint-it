import { exportAllData, getAllAttachments } from "@/services/firestore";
import type { Attachment, Comment, Item, Sprint, Task } from "@/types";
import { saveAs } from "file-saver";
import JSZip from "jszip";

export interface ExportStats {
    sprintsCount: number;
    itemsCount: number;
    tasksCount: number;
    usersCount: number;
    commentsCount: number;
    attachmentsCount: number;
    imagesInDescriptionsCount: number;
    imagesInCommentsCount: number;
    estimatedSizeMB: number;
    estimatedTimeMinutes: number;
}

export interface ExportProgress {
    stage: "preparing" | "database" | "attachments" | "images" | "compressing" | "complete" | "error";
    progress: number;
    currentItem: string;
    error?: string;
}

type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Extrae URLs de imágenes de un texto HTML
 */
const extractImageUrls = (text: string): string[] => {
    if (!text) return [];

    const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const urls: string[] = [];
    let match;

    while ((match = imageRegex.exec(text)) !== null) {
        const url = match[1];
        if (isValidImageUrl(url)) {
            urls.push(url);
        }
    }

    return urls;
};

/**
 * Verifica si una URL es una imagen válida
 */
const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
        lowerUrl.includes("image") ||
        lowerUrl.includes("cloudfront") ||
        lowerUrl.includes("supabase");
};

/**
 * Obtiene todas las URLs de imágenes de los sprints y comentarios
 */
const extractAllImageUrls = (sprints: Sprint[], comments: Comment[]): { itemImages: Map<string, string[]>, taskImages: Map<string, string[]>, commentImages: Map<string, string[]>; } => {
    const itemImages = new Map<string, string[]>();
    const taskImages = new Map<string, string[]>();
    const commentImages = new Map<string, string[]>();

    for (const sprint of sprints) {
        for (const item of sprint.items || []) {
            if (item.deletedAt) continue;

            const itemImgUrls = extractImageUrls(item.detail || "");
            if (itemImgUrls.length > 0) {
                itemImages.set(item.id, itemImgUrls);
            }

            for (const task of item.tasks || []) {
                if (task.deletedAt) continue;

                const taskImgUrls = extractImageUrls(task.detail || "");
                if (taskImgUrls.length > 0) {
                    taskImages.set(task.id, taskImgUrls);
                }
            }
        }
    }

    // Extraer imágenes de comentarios
    for (const comment of comments) {
        const commentImgUrls = extractImageUrls(comment.description || "");
        if (commentImgUrls.length > 0) {
            commentImages.set(comment.id, commentImgUrls);
        }
    }

    return { itemImages, taskImages, commentImages };
};

/**
 * Obtiene estadísticas de la base de datos
 */
export const getExportStats = async (): Promise<ExportStats> => {
    const data = await exportAllData();
    const attachments = await getAllAttachments();

    let itemsCount = 0;
    let tasksCount = 0;
    let imagesInDescriptionsCount = 0;
    let imagesInCommentsCount = 0;

    for (const sprint of data.sprints as Sprint[]) {
        itemsCount += sprint.items?.filter((i: Item) => !i.deletedAt).length || 0;
        for (const item of sprint.items || []) {
            if (item.deletedAt) continue;
            tasksCount += item.tasks?.filter((t: Task) => !t.deletedAt).length || 0;
            imagesInDescriptionsCount += extractImageUrls(item.detail || "").length;
            for (const task of item.tasks || []) {
                if (task.deletedAt) continue;
                imagesInDescriptionsCount += extractImageUrls(task.detail || "").length;
            }
        }
    }

    // Contar imágenes en comentarios
    for (const comment of data.comments as Comment[]) {
        imagesInCommentsCount += extractImageUrls(comment.description || "").length;
    }

    const totalFiles = attachments.length + imagesInDescriptionsCount + imagesInCommentsCount;
    const estimatedTimeMinutes = Math.max(1, Math.ceil(totalFiles / 50)); // ~50 archivos por minuto

    const estimatedSizeMB = (
        attachments.length * 0.5 +
        imagesInDescriptionsCount * 0.3 +
        imagesInCommentsCount * 0.3 +
        data.sprints.length * 0.1
    );

    return {
        sprintsCount: data.sprints.length,
        itemsCount,
        tasksCount,
        usersCount: data.users.length,
        commentsCount: data.comments.length,
        attachmentsCount: attachments.length,
        imagesInDescriptionsCount,
        imagesInCommentsCount,
        estimatedSizeMB: Math.max(0.5, estimatedSizeMB),
        estimatedTimeMinutes,
    };
};

/**
 * Descarga un archivo desde una URL
 */
const downloadFile = async (url: string): Promise<ArrayBuffer | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.arrayBuffer();
    } catch {
        return null;
    }
};

/**
 * Extrae el nombre de archivo de una URL
 */
const getFileNameFromUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split("/");
        return parts[parts.length - 1] || `image_${Date.now()}`;
    } catch {
        return `image_${Date.now()}`;
    }
};

/**
 * Genera el backup completo de la base de datos
 */
export const generateFullBackup = async (
    onProgress?: ProgressCallback,
    signal?: AbortSignal
): Promise<void> => {
    const updateProgress = (progress: ExportProgress) => {
        if (signal?.aborted) return;
        onProgress?.(progress);
    };

    try {
        updateProgress({ stage: "preparing", progress: 0, currentItem: "Cargando datos..." });

        if (signal?.aborted) throw new Error("Exportación cancelada");

        const [data, attachments] = await Promise.all([
            exportAllData(),
            getAllAttachments(),
        ]);

        if (signal?.aborted) throw new Error("Exportación cancelada");

        updateProgress({ stage: "database", progress: 10, currentItem: "Base de datos exportada" });

        const zip = new JSZip();
        const baseDataFolder = zip.folder("base_de_datos");

        if (baseDataFolder) {
            baseDataFolder.file("sprints.json", JSON.stringify(data.sprints, null, 2));
            baseDataFolder.file("users.json", JSON.stringify(data.users, null, 2));
            baseDataFolder.file("comments.json", JSON.stringify(data.comments, null, 2));
            baseDataFolder.file("changes.json", JSON.stringify(data.changes, null, 2));
            baseDataFolder.file("attachments.json", JSON.stringify(data.attachments, null, 2));
        }

        if (signal?.aborted) throw new Error("Exportación cancelada");

        updateProgress({ stage: "attachments", progress: 20, currentItem: `Descargando ${attachments.length} archivos adjuntos...` });

        const attachmentsFolder = zip.folder("adjuntos");
        let downloadedAttachments = 0;

        for (const attachment of attachments as Attachment[]) {
            if (signal?.aborted) throw new Error("Exportación cancelada");

            const fileData = await downloadFile(attachment.storageUrl);
            if (fileData && attachmentsFolder) {
                attachmentsFolder.file(attachment.fileName, fileData);
            }

            downloadedAttachments++;
            const attachProgress = 20 + Math.floor((downloadedAttachments / Math.max(1, attachments.length)) * 30);
            updateProgress({
                stage: "attachments",
                progress: attachProgress,
                currentItem: `Descargando adjuntos (${downloadedAttachments}/${attachments.length})`
            });
        }

        if (signal?.aborted) throw new Error("Exportación cancelada");

        updateProgress({ stage: "images", progress: 50, currentItem: "Extrayendo imágenes de descripciones y comentarios..." });

        const { itemImages, taskImages, commentImages } = extractAllImageUrls(data.sprints as Sprint[], data.comments as Comment[]);
        const allImageUrls: { url: string; parentId: string; type: "item" | "task" | "comment"; }[] = [];

        itemImages.forEach((urls, itemId) => {
            urls.forEach(url => allImageUrls.push({ url, parentId: itemId, type: "item" }));
        });

        taskImages.forEach((urls, taskId) => {
            urls.forEach(url => allImageUrls.push({ url, parentId: taskId, type: "task" }));
        });

        commentImages.forEach((urls, commentId) => {
            urls.forEach(url => allImageUrls.push({ url, parentId: commentId, type: "comment" }));
        });

        updateProgress({
            stage: "images",
            progress: 60,
            currentItem: `Descargando ${allImageUrls.length} imágenes de descripciones...`
        });

        const imagesFolder = zip.folder("imagenes");
        const itemsImagesFolder = imagesFolder?.folder("items");
        const tasksImagesFolder = imagesFolder?.folder("tasks");
        const commentsImagesFolder = imagesFolder?.folder("comentarios");

        let downloadedImages = 0;
        const downloadedUrls = new Set<string>();

        for (const img of allImageUrls) {
            if (signal?.aborted) throw new Error("Exportación cancelada");

            if (downloadedUrls.has(img.url)) continue;
            downloadedUrls.add(img.url);

            const fileData = await downloadFile(img.url);
            if (fileData) {
                const fileName = getFileNameFromUrl(img.url);
                let parentFolder;
                if (img.type === "item") {
                    parentFolder = itemsImagesFolder?.folder(img.parentId);
                } else if (img.type === "task") {
                    parentFolder = tasksImagesFolder?.folder(img.parentId);
                } else {
                    parentFolder = commentsImagesFolder?.folder(img.parentId);
                }
                if (parentFolder) {
                    parentFolder.file(fileName, fileData);
                }
            }

            downloadedImages++;
            const imgProgress = 60 + Math.floor((downloadedImages / Math.max(1, allImageUrls.length)) * 30);
            updateProgress({
                stage: "images",
                progress: imgProgress,
                currentItem: `Descargando imágenes (${downloadedImages}/${allImageUrls.length})`
            });
        }

        if (signal?.aborted) throw new Error("Exportación cancelada");

        updateProgress({ stage: "compressing", progress: 90, currentItem: "Generando archivo comprimido..." });

        const zipContent = await zip.generateAsync({ type: "blob" });

        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
        const fileName = `sprint-it_backup_${timestamp}.zip`;

        saveAs(zipContent, fileName);

        updateProgress({ stage: "complete", progress: 100, currentItem: "Exportación completada" });

    } catch (error) {
        if ((error as Error).message === "Exportación cancelada") {
            updateProgress({ stage: "error", progress: 0, currentItem: "Exportación cancelada", error: "Cancelado por el usuario" });
            return;
        }

        updateProgress({
            stage: "error",
            progress: 0,
            currentItem: "Error en la exportación",
            error: (error as Error).message
        });
        throw error;
    }
};

/**
 * Exporta solo la base de datos a JSON
 */
export const exportDatabaseToJson = async (): Promise<void> => {
    const data = await exportAllData();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    const fileName = `sprint-it_database_${timestamp}.json`;

    saveAs(blob, fileName);
};

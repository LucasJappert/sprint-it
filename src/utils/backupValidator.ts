import type { Attachment, Comment, Sprint } from "@/types";
import JSZip from "jszip";

export interface BackupValidationResult {
    isValid: boolean;
    error?: string;
    stats?: {
        sprintsCount: number;
        attachmentsCount: number;
        commentsCount: number;
        imagesCount: number;
        totalSize: number;
    };
}

/**
 * Valida que un archivo ZIP sea un backup compatible del sistema
 */
export const validateBackupZip = async (file: File): Promise<BackupValidationResult> => {
    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        // Verificar estructura básica del backup
        const baseDataFolder = zipContent.folder("base_de_datos");
        if (!baseDataFolder) {
            return {
                isValid: false,
                error: "El archivo no contiene la carpeta 'base_de_datos' requerida"
            };
        }

        // Verificar archivos JSON esenciales
        const requiredFiles = ["sprints.json", "users.json", "comments.json", "attachments.json"];
        const missingFiles = requiredFiles.filter(fileName => !baseDataFolder.file(fileName));
        
        if (missingFiles.length > 0) {
            return {
                isValid: false,
                error: `Faltan archivos requeridos: ${missingFiles.join(", ")}`
            };
        }

        // Validar contenido de los archivos JSON
        const sprintsFile = baseDataFolder.file("sprints.json");
        const commentsFile = baseDataFolder.file("comments.json");
        const attachmentsFile = baseDataFolder.file("attachments.json");

        if (!sprintsFile || !commentsFile || !attachmentsFile) {
            return {
                isValid: false,
                error: "No se pueden leer los archivos JSON del backup"
            };
        }

        // Parsear y validar estructura
        const [sprintsContent, commentsContent, attachmentsContent] = await Promise.all([
            sprintsFile.async("text"),
            commentsFile.async("text"),
            attachmentsFile.async("text")
        ]);

        let sprints: Sprint[];
        let comments: Comment[];
        let attachments: Attachment[];

        try {
            sprints = JSON.parse(sprintsContent);
            comments = JSON.parse(commentsContent);
            attachments = JSON.parse(attachmentsContent);
        } catch (parseError) {
            return {
                isValid: false,
                error: "Los archivos JSON del backup tienen formato inválido"
            };
        }

        // Validar que sean arrays
        if (!Array.isArray(sprints) || !Array.isArray(comments) || !Array.isArray(attachments)) {
            return {
                isValid: false,
                error: "Los archivos JSON deben contener arrays de datos"
            };
        }

        // Contar imágenes en descripciones
        let imagesCount = 0;
        const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;

        for (const sprint of sprints) {
            for (const item of sprint.items || []) {
                const itemImages = (item.detail || "").match(imageRegex) || [];
                imagesCount += itemImages.length;

                for (const task of item.tasks || []) {
                    const taskImages = (task.detail || "").match(imageRegex) || [];
                    imagesCount += taskImages.length;
                }
            }
        }

        for (const comment of comments) {
            const commentImages = (comment.description || "").match(imageRegex) || [];
            imagesCount += commentImages.length;
        }

        // Verificar que existan las carpetas de archivos adjuntos e imágenes
        const hasAttachmentsFolder = !!zipContent.folder("adjuntos");
        const hasImagesFolder = !!zipContent.folder("imagenes");
        
        if (!hasAttachmentsFolder || !hasImagesFolder) {
            return {
                isValid: false,
                error: "El backup debe contener las carpetas 'adjuntos' e 'imagenes'"
            };
        }

        const stats = {
            sprintsCount: sprints.length,
            attachmentsCount: attachments.length,
            commentsCount: comments.length,
            imagesCount,
            totalSize: file.size
        };

        return {
            isValid: true,
            stats
        };

    } catch (error) {
        return {
            isValid: false,
            error: `Error al leer el archivo ZIP: ${(error as Error).message}`
        };
    }
};

/**
 * Extrae los datos de un backup ZIP validado
 */
export const extractBackupData = async (file: File): Promise<{
    sprints: Sprint[];
    comments: Comment[];
    attachments: Attachment[];
}> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const baseDataFolder = zipContent.folder("base_de_datos");
    
    if (!baseDataFolder) {
        throw new Error("No se encuentra la carpeta base_de_datos");
    }

    const [sprintsContent, commentsContent, attachmentsContent] = await Promise.all([
        baseDataFolder.file("sprints.json")?.async("text") || Promise.resolve("[]"),
        baseDataFolder.file("comments.json")?.async("text") || Promise.resolve("[]"),
        baseDataFolder.file("attachments.json")?.async("text") || Promise.resolve("[]")
    ]);

    return {
        sprints: JSON.parse(sprintsContent),
        comments: JSON.parse(commentsContent),
        attachments: JSON.parse(attachmentsContent)
    };
};

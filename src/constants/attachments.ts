export const ATTACHMENT_CONFIG = {
    MAX_FILE_SIZE: 3 * 1024 * 1024,
    MAX_ATTACHMENTS_PER_ITEM: 4,
    ALLOWED_TYPES: [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "application/zip",
        "application/x-rar-compressed",
    ],
    ALLOWED_EXTENSIONS: [".pdf", ".xlsx", ".xls", ".csv", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip", ".rar", ".json"],
} as const;

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getFileExtension = (fileName: string): string => {
    const parts = fileName.split(".");
    return parts.length > 1 ? "." + parts.pop()?.toLowerCase() : "";
};

export const isAllowedFileType = (file: File): boolean => {
    const extension = getFileExtension(file.name);
    return ATTACHMENT_CONFIG.ALLOWED_EXTENSIONS.includes(extension as typeof ATTACHMENT_CONFIG.ALLOWED_EXTENSIONS[number]);
};

export const isFileSizeValid = (file: File): boolean => {
    return file.size <= ATTACHMENT_CONFIG.MAX_FILE_SIZE;
};

import { supabaseUploader } from "@/utils/supabaseUploader";

const sanitizeFileName = (name: string): string => {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_|_$/g, "");
};

export const uploadAttachment = async (file: File): Promise<string> => {
    const sanitizedName = sanitizeFileName(file.name);
    const storageKey = `detalles/${crypto.randomUUID()}_${sanitizedName}`;
    const url = await supabaseUploader(file, storageKey);
    return url;
};

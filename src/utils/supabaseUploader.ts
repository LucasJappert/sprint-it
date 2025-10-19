import { supabase } from "@/supabase";

export const supabaseUploader = async (file: File): Promise<string> => {
    const key = `detalles/${crypto.randomUUID()}_${file.name}`;
    const { error } = await supabase
        .storage
        .from("sprint-it")
        .upload(key, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from("sprint-it").getPublicUrl(key);
    if (!data?.publicUrl) throw new Error("No public URL returned by Supabase");
    return data.publicUrl;
};

import { createClient } from "@supabase/supabase-js";
import config from "../config.json";

export const supabase = createClient(
    config.supabase.url,
    config.supabase.anonKey
);

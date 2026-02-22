import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";

const stripHtmlTags = (html: string): string => {
    if (!html) return "";

    return html
        .replace(/<br\s*\/>/gi, "\n")
        .replace(/<br>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<u[^>]*>/gi, "")
        .replace(/<\/u>/gi, "")
        .replace(/<strong[^>]*>/gi, "")
        .replace(/<\/strong>/gi, "")
        .replace(/<b[^>]*>/gi, "")
        .replace(/<\/b>/gi, "")
        .replace(/&lt;br\s*\/&gt;/gi, "\n")
        .replace(/&lt;br&gt;/gi, "\n")
        .replace(/&nbsp;/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\n+/g, "\n\n")
        .trim();
};

export const useClipboard = () => {
    const copyToClipboardAsync = async (title: string, detail: string): Promise<void> => {
        const cleanDetail = stripHtmlTags(detail);
        const textToCopy = `Title: ${title}${cleanDetail ? `\n\nDescription: ${cleanDetail}` : ''
            }`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            notifyOk("Copied to clipboard", "Title and description copied successfully");
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
        }
    };

    return {
        copyToClipboardAsync,
    };
};

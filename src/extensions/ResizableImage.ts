// Extensión "image" con NodeView de Vue (sin React).
import ResizableImageView from "@/components/ResizableImageView.vue";
import Image from "@tiptap/extension-image";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

const ResizableImage = Image.extend({
    // mantenemos el nombre "image" para que el resto del código funcione igual
    name: "image",
    addAttributes() {
        const parent = (this as any).parent?.() ?? {};
        return {
            parent,
            src: { default: null },
            alt: { default: "" },
            width: { default: null },   // guardamos el ancho (número => %)
        };
    },
    addNodeView() {
        return VueNodeViewRenderer(ResizableImageView);
    },
});

export default ResizableImage;

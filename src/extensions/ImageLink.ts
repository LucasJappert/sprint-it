// Extensión "image" con NodeView de Vue que renderiza links en lugar de imágenes.
import ImageLinkView from "@/components/ImageLinkView.vue";
import Image from "@tiptap/extension-image";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

const ImageLink = Image.extend({
    // mantenemos el nombre "image" para que el resto del código funcione igual
    name: "image",
    addAttributes() {
        const parent = (this as any).parent?.() ?? {};
        return {
            parent,
            src: { default: null },
            alt: { default: "" },
            // Eliminamos width ya que no necesitamos resize
        };
    },
    addNodeView() {
        return VueNodeViewRenderer(ImageLinkView);
    },
});

export default ImageLink;

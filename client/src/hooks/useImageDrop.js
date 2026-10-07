import { useCallback, useState } from "react";
import toast from "react-hot-toast";

const isImage = (file) => file?.type?.startsWith("image/");

export default function useImageDrop(onFiles, { multiple = false, disabled = false } = {}) {
    const [isDragging, setIsDragging] = useState(false);

    const acceptFiles = useCallback((fileList) => {
        const files = Array.from(fileList || []);
        const images = files.filter(isImage);
        if (images.length !== files.length) toast.error("Please choose image files only.");
        const selected = multiple ? images : images.slice(0, 1);
        if (selected.length) onFiles(selected);
    }, [multiple, onFiles]);

    const onFileInputChange = useCallback((event) => {
        acceptFiles(event.target.files);
        event.target.value = "";
    }, [acceptFiles]);

    return {
        isDragging,
        onFileInputChange,
        dragProps: {
            onDragEnter: (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!disabled) setIsDragging(true);
            },
            onDragOver: (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? "none" : "copy";
            },
            onDragLeave: (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
            },
            onDrop: (event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(false);
                if (!disabled) acceptFiles(event.dataTransfer?.files);
            },
        },
    };
}

"use client";

import { ImagePlus, Plus } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Shared file picker for media and document uploads. Renders either a small
 * "+ Add" tile or a full-width empty-state drop zone. The component itself
 * only collects File objects and forwards them via `onFiles`; pending
 * placeholder cards and the actual upload work live in the calling section.
 */

interface FileUploaderProps {
	/** Callback invoked with the picked / dropped files. */
	onFiles: (files: File[]) => void;
	/** Accept attribute forwarded to the underlying <input type="file"> */
	accept?: string;
	/** Allow multiple files (defaults to true). */
	multiple?: boolean;
	/** Label inside the tile (defaults to "Add"). */
	label?: string;
	/** When true, renders the full-width empty-state drop zone instead. */
	empty?: boolean;
	/** Empty-state label, e.g. "Drag & drop media here" */
	emptyLabel?: string;
}

export default function FileUploader({
	onFiles,
	accept,
	multiple = true,
	label = "Add",
	empty = false,
	emptyLabel,
}: FileUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	function pick(fileList: FileList | null) {
		if (!fileList || fileList.length === 0) return;
		onFiles(Array.from(fileList));
		if (inputRef.current) inputRef.current.value = "";
	}

	function onDragOver(e: React.DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function onDragLeave() {
		setDragging(false);
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		pick(e.dataTransfer.files);
	}

	if (empty) {
		return (
			<label
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center h-56 cursor-pointer transition-colors w-full max-w-3xl ${
					dragging
						? "border-primary bg-primary/10"
						: "border-border bg-surface-container hover:border-primary/40"
				}`}
			>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					multiple={multiple}
					className="hidden"
					onChange={(e) => pick(e.target.files)}
				/>
				<ImagePlus className="w-10 h-10 text-outline mb-3" />
				<p className="text-sm font-medium text-on-surface-variant">
					{emptyLabel ?? "Drag & drop files here"}
				</p>
				<p className="text-xs text-outline mt-1">or click to browse files</p>
			</label>
		);
	}

	return (
		<label
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={`w-32 h-32 shrink-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
				dragging
					? "border-primary bg-primary/10"
					: "border-border bg-surface-container/50 hover:bg-surface-container-high"
			}`}
		>
			<Plus className="w-5 h-5 text-outline" />
			<span className="text-badge text-outline mt-1">{label}</span>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				className="hidden"
				onChange={(e) => pick(e.target.files)}
			/>
		</label>
	);
}

"use client";

import { PenTool, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "./SignaturePad";

export interface WitnessEntry {
	name: string;
	signature: string; // base64 data URL
}

interface WitnessTagInputProps {
	value: WitnessEntry[];
	onChange: (value: WitnessEntry[]) => void;
	placeholder?: string;
	label?: string;
}

export default function WitnessTagInput({
	value,
	onChange,
	placeholder = "Type witness name, press Enter",
}: WitnessTagInputProps) {
	const [input, setInput] = useState("");
	const [pendingName, setPendingName] = useState<string | null>(null);
	/** Index of the tag being edited (name or signature) */
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingField, setEditingField] = useState<"name" | "signature" | null>(
		null,
	);
	const [editNameValue, setEditNameValue] = useState("");
	const editNameRef = useRef<HTMLInputElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-focus inline name editor when it opens
	useEffect(() => {
		if (editingField === "name" && editNameRef.current) {
			editNameRef.current.focus();
			editNameRef.current.select();
		}
	}, [editingIndex, editingField]);

	function startAddWitness() {
		const trimmed = input.trim();
		if (!trimmed) return;
		if (value.some((w) => w.name.toLowerCase() === trimmed.toLowerCase()))
			return;
		setPendingName(trimmed);
		setInput("");
	}

	function handleSignatureConfirm(signatureDataUrl: string) {
		// Re-signing an existing entry
		if (editingIndex !== null && editingField === "signature") {
			const updated = [...value];
			updated[editingIndex] = {
				...updated[editingIndex],
				signature: signatureDataUrl,
			};
			onChange(updated);
			setEditingIndex(null);
			setEditingField(null);
			inputRef.current?.focus();
			return;
		}
		// Adding a new entry
		if (!pendingName) return;
		onChange([...value, { name: pendingName, signature: signatureDataUrl }]);
		setPendingName(null);
		inputRef.current?.focus();
	}

	function handleSignatureCancel() {
		if (editingIndex !== null) {
			setEditingIndex(null);
			setEditingField(null);
		}
		setPendingName(null);
		inputRef.current?.focus();
	}

	function removeWitness(index: number) {
		onChange(value.filter((_, i) => i !== index));
		inputRef.current?.focus();
	}

	function startEditName(index: number) {
		setEditingIndex(index);
		setEditingField("name");
		setEditNameValue(value[index].name);
	}

	function commitEditName() {
		if (editingIndex === null) return;
		const trimmed = editNameValue.trim();
		if (trimmed && trimmed !== value[editingIndex].name) {
			// Avoid duplicates
			const duplicate = value.some(
				(w, i) =>
					i !== editingIndex && w.name.toLowerCase() === trimmed.toLowerCase(),
			);
			if (!duplicate) {
				const updated = [...value];
				updated[editingIndex] = { ...updated[editingIndex], name: trimmed };
				onChange(updated);
			}
		}
		setEditingIndex(null);
		setEditingField(null);
		inputRef.current?.focus();
	}

	function startEditSignature(index: number) {
		setEditingIndex(index);
		setEditingField("signature");
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			startAddWitness();
		} else if (e.key === "Backspace" && input === "" && value.length > 0) {
			removeWitness(value.length - 1);
		}
	}

	function handleEditNameKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			commitEditName();
		} else if (e.key === "Escape") {
			setEditingIndex(null);
			setEditingField(null);
			inputRef.current?.focus();
		}
	}

	const showSignaturePad =
		pendingName !== null ||
		(editingIndex !== null && editingField === "signature");

	const signaturePadName =
		editingIndex !== null && editingField === "signature"
			? (value[editingIndex]?.name ?? "")
			: (pendingName ?? "");

	return (
		<>
			<div className="relative">
				{/* Tags + input */}
				<div
					className={
						"flex flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 " +
						"bg-card border-border " +
						"focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors"
					}
					onClick={() => inputRef.current?.focus()}
				>
					{value.map((witness, idx) => (
						<span
							key={idx}
							className={
								"inline-flex items-stretch rounded-md text-xs font-medium " +
								"bg-primary/10 text-primary border border-primary/20 overflow-hidden"
							}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Mini signature preview — click to re-sign */}
							{witness.signature && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										startEditSignature(idx);
									}}
									className="inline-flex items-center justify-center w-14 -my-px -ml-px bg-primary/5 border-r border-primary/10 overflow-hidden shrink-0 cursor-pointer hover:bg-primary/10 transition-all rounded-l-[calc(var(--radius-md)-1px)]"
									title="Click to change signature"
								>
									<img
										src={witness.signature}
										alt={`${witness.name}'s signature`}
										className="h-full w-full object-contain scale-150"
									/>
								</button>
							)}

							{/* Name — click to edit inline */}
							{editingIndex === idx && editingField === "name" ? (
								<input
									ref={editNameRef}
									type="text"
									className="bg-transparent outline-none text-xs font-medium text-primary border-b border-primary/40 w-24 px-2 py-1.5"
									value={editNameValue}
									onChange={(e) => setEditNameValue(e.target.value)}
									onKeyDown={handleEditNameKeyDown}
									onBlur={commitEditName}
								/>
							) : (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										startEditName(idx);
									}}
									className="px-2 py-1.5 cursor-text hover:underline"
									title="Click to edit name"
								>
									{witness.name}
								</button>
							)}

							{/* Remove button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									removeWitness(idx);
								}}
								className="self-center hover:bg-primary/20 rounded-full p-0.5 transition-colors mr-1.5"
								title="Remove"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					))}
					<div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
						<PenTool className="w-3.5 h-3.5 text-outline shrink-0" />
						<input
							ref={inputRef}
							type="text"
							className={
								"flex-1 bg-transparent outline-none text-sm " +
								"text-on-surface placeholder:text-outline"
							}
							placeholder={
								value.length === 0 ? placeholder : "Add another witness…"
							}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
				</div>
				{input.trim() && (
					<p className="typo-badge text-outline mt-1 ml-1">
						Press Enter to capture signature
					</p>
				)}
			</div>

			{/* Signature capture modal */}
			{showSignaturePad && (
				<SignaturePad
					name={signaturePadName}
					onConfirm={handleSignatureConfirm}
					onCancel={handleSignatureCancel}
				/>
			)}
		</>
	);
}

"use client";

import { PenTool, X } from "lucide-react";
import { useRef, useState } from "react";
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
	const inputRef = useRef<HTMLInputElement>(null);

	function startAddWitness() {
		const trimmed = input.trim();
		if (!trimmed) return;
		if (value.some((w) => w.name.toLowerCase() === trimmed.toLowerCase()))
			return;
		setPendingName(trimmed);
		setInput("");
	}

	function handleSignatureConfirm(signatureDataUrl: string) {
		if (!pendingName) return;
		onChange([...value, { name: pendingName, signature: signatureDataUrl }]);
		setPendingName(null);
		inputRef.current?.focus();
	}

	function handleSignatureCancel() {
		setPendingName(null);
		inputRef.current?.focus();
	}

	function removeWitness(index: number) {
		onChange(value.filter((_, i) => i !== index));
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			startAddWitness();
		} else if (e.key === "Backspace" && input === "" && value.length > 0) {
			removeWitness(value.length - 1);
		}
	}

	return (
		<>
			<div className="relative">
				{/* Tags + input */}
				<div
					className={
						"flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 " +
						"bg-card border-border " +
						"focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors"
					}
					onClick={() => inputRef.current?.focus()}
				>
					{value.map((witness, idx) => (
						<span
							key={idx}
							className={
								"inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium " +
								"bg-primary/10 text-primary border border-primary/20"
							}
						>
							{/* Mini signature preview */}
							{witness.signature && (
								<span className="inline-flex items-center justify-center h-5 w-10 rounded bg-primary/5 border border-primary/10 overflow-hidden shrink-0">
									<img
										src={witness.signature}
										alt={`${witness.name}'s signature`}
										className="h-full w-full object-contain"
									/>
								</span>
							)}
							<span className="border-l border-primary/20 pl-2">
								{witness.name}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									removeWitness(idx);
								}}
								className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5"
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
					<p className="text-[10px] text-outline mt-1 ml-1">
						Press Enter to capture signature
					</p>
				)}
			</div>

			{/* Signature capture modal */}
			{pendingName && (
				<SignaturePad
					name={pendingName}
					onConfirm={handleSignatureConfirm}
					onCancel={handleSignatureCancel}
				/>
			)}
		</>
	);
}

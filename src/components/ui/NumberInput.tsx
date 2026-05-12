"use client";

import { cn } from "@/lib/utils";
import {
    forwardRef,
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type InputHTMLAttributes,
} from "react";

/**
 * NumberInput — text-based numeric input that auto-formats with thousands
 * separators (commas) as the user types, while reporting the underlying
 * numeric value via `onValueChange`.
 *
 * Use this in place of `<input type="number">` for any field that takes a
 * monetary amount, area, dimension, or other count >= 1000.
 *
 * Behavior:
 * - Displays "1,234,567" while the user types "1234567"
 * - Allows a single decimal point and optional leading "-"
 * - Reports `null` for empty input
 * - Standard `onChange` is also forwarded with the raw numeric string
 *   (no commas), to ease integration with form libraries that read
 *   `event.target.value`.
 */

export interface NumberInputProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "onChange" | "type"
> {
	value: number | string | null | undefined;
	onValueChange?: (value: number | null) => void;
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
	allowDecimal?: boolean;
	allowNegative?: boolean;
	maxFractionDigits?: number;
	className?: string;
}

function toRawString(value: number | string | null | undefined): string {
	if (value === null || value === undefined || value === "") return "";
	const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
	if (!Number.isFinite(n)) return "";
	return String(n);
}

function formatDisplay(raw: string): string {
	if (!raw) return "";
	// Preserve trailing "." or trailing zeros while typing decimals.
	const negative = raw.startsWith("-");
	const body = negative ? raw.slice(1) : raw;
	const [intPart, decPart] = body.split(".");
	const intFormatted = intPart
		? new Intl.NumberFormat("en-US").format(Number(intPart) || 0)
		: "";
	let out = intFormatted;
	if (body.includes(".")) {
		out += `.${decPart ?? ""}`;
	}
	return negative ? `-${out}` : out;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
	function NumberInput(
		{
			value,
			onValueChange,
			onChange,
			allowDecimal = true,
			allowNegative = false,
			maxFractionDigits = 2,
			className,
			inputMode,
			...rest
		},
		ref,
	) {
		const [internalRaw, setInternalRaw] = useState<string>(() =>
			toRawString(value),
		);

		// Sync internal state when the controlled `value` prop changes to a
		// different numeric value than what the user has typed. We allow
		// transient typing states like "1." or "-" to be preserved.
		useEffect(() => {
			const externalRaw = toRawString(value);
			const externalNum = externalRaw === "" ? null : Number(externalRaw);
			const internalNum =
				internalRaw === "" || internalRaw === "-" || internalRaw === "."
					? null
					: Number(internalRaw);
			if (
				externalNum !== internalNum &&
				!(internalRaw.endsWith(".") || internalRaw === "-")
			) {
				setInternalRaw(externalRaw);
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [value]);

		const handleChange = useCallback(
			(e: ChangeEvent<HTMLInputElement>) => {
				const input = e.target.value;
				// Strip everything except digits, optional minus, single dot.
				let cleaned = input.replace(/,/g, "");
				if (!allowNegative) cleaned = cleaned.replace(/-/g, "");
				else cleaned = cleaned.replace(/(?!^)-/g, "");

				if (allowDecimal) {
					// keep only first dot
					const firstDot = cleaned.indexOf(".");
					if (firstDot !== -1) {
						cleaned =
							cleaned.slice(0, firstDot + 1) +
							cleaned.slice(firstDot + 1).replace(/\./g, "");
					}
					// limit fraction digits
					if (firstDot !== -1 && maxFractionDigits >= 0) {
						const [i, d = ""] = cleaned.split(".");
						cleaned = `${i}.${d.slice(0, maxFractionDigits)}`;
					}
				} else {
					cleaned = cleaned.replace(/\./g, "");
				}

				// reject anything else
				cleaned = cleaned.replace(/[^0-9.\-]/g, "");

				setInternalRaw(cleaned);

				const numeric =
					cleaned === "" || cleaned === "-" || cleaned === "."
						? null
						: Number(cleaned);
				onValueChange?.(
					Number.isFinite(numeric as number) ? (numeric as number) : null,
				);

				if (onChange) {
					// Forward a synthetic-ish change event with raw numeric string.
					const synthetic = {
						...e,
						target: { ...e.target, value: cleaned },
						currentTarget: { ...e.currentTarget, value: cleaned },
					} as ChangeEvent<HTMLInputElement>;
					onChange(synthetic);
				}
			},
			[allowDecimal, allowNegative, maxFractionDigits, onChange, onValueChange],
		);

		return (
			<input
				ref={ref}
				type="text"
				inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
				autoComplete="off"
				value={formatDisplay(internalRaw)}
				onChange={handleChange}
				className={cn(className)}
				{...rest}
			/>
		);
	},
);

export default NumberInput;

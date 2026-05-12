"use client";

import {
    formatCurrencyCompact,
    formatCurrencyFull,
    formatNumberCompact,
    formatNumberFull,
} from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * AbbreviatedNumber — display a large number in compact form (e.g. "1.2M",
 * "3.4B") and reveal the full value on hover via a native title tooltip.
 *
 * Three modes:
 *  - `mode="number"` (default): plain number, no unit
 *  - `mode="currency"`: uses currency formatters with optional country/currency
 *  - `mode="area"`: appends a unit (default "sqm")
 */

interface BaseProps extends Omit<HTMLAttributes<HTMLSpanElement>, "title"> {
	value: number | null | undefined;
	/** Override the auto-generated tooltip text */
	titleOverride?: string;
	/** Below this absolute value, render the full formatted number instead of compact form */
	compactThreshold?: number;
	fractionDigits?: number;
}

interface NumberProps extends BaseProps {
	mode?: "number";
}

interface CurrencyProps extends BaseProps {
	mode: "currency";
	country?: string;
	currency?: string;
	locale?: string;
}

interface AreaProps extends BaseProps {
	mode: "area";
	unit?: "sqm" | "acres";
}

export type AbbreviatedNumberProps = NumberProps | CurrencyProps | AreaProps;

export default function AbbreviatedNumber(props: AbbreviatedNumberProps) {
	const {
		value,
		titleOverride,
		compactThreshold = 10_000,
		fractionDigits = 1,
		...rest
	} = props;

	if (value === null || value === undefined || !Number.isFinite(value)) {
		return <span {...(rest as HTMLAttributes<HTMLSpanElement>)}>—</span>;
	}

	let display: string;
	let full: string;

	if (props.mode === "currency") {
		const { country, currency, locale } = props;
		display =
			Math.abs(value) < compactThreshold
				? formatCurrencyFull(value, country, currency, locale)
				: formatCurrencyCompact(value, country, currency, locale);
		full = formatCurrencyFull(value, country, currency, locale);
	} else if (props.mode === "area") {
		const unit = props.unit ?? "sqm";
		display =
			Math.abs(value) < compactThreshold
				? `${formatNumberFull(value)} ${unit}`
				: `${formatNumberCompact(value, fractionDigits)} ${unit}`;
		full = `${formatNumberFull(value)} ${unit}`;
	} else {
		display =
			Math.abs(value) < compactThreshold
				? formatNumberFull(value)
				: formatNumberCompact(value, fractionDigits);
		full = formatNumberFull(value);
	}

	const title = titleOverride ?? full;

	// Strip mode-specific props before spreading onto span
	const { mode: _m, ...domRest } = rest as {
		mode?: string;
	} & HTMLAttributes<HTMLSpanElement>;
	void _m;
	return (
		<span title={title} {...domRest}>
			{display}
		</span>
	);
}

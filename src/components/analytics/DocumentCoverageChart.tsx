"use client";

import { DocumentType, Property } from "@/types/property";
import {
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

const DOC_LABELS: Record<string, string> = {
	[DocumentType.DEED]: "Deed",
	[DocumentType.TITLE]: "Title",
	[DocumentType.SURVEY]: "Survey",
	[DocumentType.INSURANCE]: "Insurance",
	[DocumentType.TAX_DOCUMENT]: "Tax",
	[DocumentType.LEASE]: "Lease",
	[DocumentType.CONTRACT]: "Contract",
	[DocumentType.CONTRACT_OF_SALE]: "Sale Contract",
	[DocumentType.BUILDING_PERMIT]: "Building Permit",
	[DocumentType.INSPECTION_REPORT]: "Inspection",
	[DocumentType.PERMIT]: "Permit",
	[DocumentType.APPRAISAL]: "Appraisal",
	[DocumentType.CERTIFICATE_OF_OCCUPANCY]: "CoO",
	[DocumentType.OTHER]: "Other",
};

interface DocumentCoverageChartProps {
	properties: Property[];
}

export default function DocumentCoverageChart({
	properties,
}: DocumentCoverageChartProps) {
	const docCounts: Record<string, number> = {};
	for (const p of properties) {
		for (const doc of p.documents ?? []) {
			docCounts[doc.type] = (docCounts[doc.type] ?? 0) + 1;
		}
	}

	const data = Object.entries(docCounts)
		.map(([type, count]) => ({
			type: DOC_LABELS[type] ?? type,
			count,
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 8); // top 8 for readability

	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[260px] text-xs text-outline">
				No documents uploaded yet
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={280}>
			<RadarChart data={data} outerRadius="70%">
				<PolarGrid stroke="var(--chart-grid)" />
				<PolarAngleAxis
					dataKey="type"
					tick={{ fontSize: 10, fill: "var(--chart-label)" }}
				/>
				<Radar
					dataKey="count"
					name="Documents"
					stroke="#60a5fa"
					fill="#60a5fa"
					fillOpacity={0.25}
					strokeWidth={2}
				/>
				<Tooltip
					contentStyle={{
						background: "var(--color-card)",
						border: "1px solid var(--color-border)",
						borderRadius: 12,
						fontSize: 12,
					}}
				/>
			</RadarChart>
		</ResponsiveContainer>
	);
}

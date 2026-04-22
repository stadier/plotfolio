/**
 * Procedurally-generated land-parcel / map placeholder SVG.
 *
 * Each instance is seeded by a string (e.g. property id or name) so every
 * card gets a visually distinct but deterministic pattern.
 */

interface PropertyPlaceholderSvgProps {
	/** Seed string — produces a unique but repeatable pattern per value. */
	seed: string;
	/** Show a small building footprint on one of the parcels. */
	hasBuilding?: boolean;
	className?: string;
}

/* ------------------------------------------------------------------ */
/*  Colour palettes — each is [bg-gradient-from, bg-gradient-via,     */
/*  bg-gradient-to, parcel1, parcel2, parcel3, parcel4, road, bldg]   */
/* ------------------------------------------------------------------ */

const PALETTES = [
	// sage / cream (original)
	[
		"#eef3ea",
		"#f7f4ec",
		"#dde7dd",
		"#F9FBF7",
		"#DDE8D8",
		"#C7D9C5",
		"#E8DCC8",
		"#FFFFFF",
		"#637455",
	],
	// warm sand
	[
		"#f4efe6",
		"#faf5ec",
		"#e8dfd2",
		"#FAF8F3",
		"#E8DCC8",
		"#D4C8AA",
		"#F0E4D0",
		"#FFFFFF",
		"#8B7355",
	],
	// cool blue-grey
	[
		"#e8edf3",
		"#f0f2f7",
		"#d8dee8",
		"#F4F6FA",
		"#D8E2EE",
		"#C2CDD9",
		"#E0E4EC",
		"#FFFFFF",
		"#5A6B7A",
	],
	// dusty rose
	[
		"#f3eaea",
		"#f8f0f0",
		"#e4d6d6",
		"#FAF5F5",
		"#E8D4D4",
		"#D4BCBC",
		"#EEE0D8",
		"#FFFFFF",
		"#7A5558",
	],
	// moss
	[
		"#e6ede4",
		"#eef5ec",
		"#d2ddd0",
		"#F2F7F0",
		"#D0E0CC",
		"#B8CCB4",
		"#E4E8D0",
		"#FFFFFF",
		"#5A6B4A",
	],
	// slate teal
	[
		"#e4edec",
		"#ecf5f4",
		"#d0ddd8",
		"#F0F6F5",
		"#CCE0DA",
		"#B4CCC8",
		"#D8E8E0",
		"#FFFFFF",
		"#4A6B64",
	],
	// golden hour
	[
		"#f4eee2",
		"#faf4e8",
		"#e6dac6",
		"#FAF6EE",
		"#E8D8B8",
		"#D4C4A0",
		"#F0E0C4",
		"#FFFFFF",
		"#7A6830",
	],
	// lavender mist
	[
		"#ece8f2",
		"#f2eef8",
		"#dcd4e6",
		"#F6F2FA",
		"#DCD0EA",
		"#C8BCD8",
		"#E4DCE8",
		"#FFFFFF",
		"#6A5878",
	],
] as const;

/* Simple numeric hash from a string. */
function hashSeed(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h * 31 + seed.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

/* Deterministic pseudo-random sequence from seed. */
function seededRand(hash: number, index: number): number {
	const x = Math.sin(hash + index * 9301 + 49297) * 49979693;
	return x - Math.floor(x);
}

export default function PropertyPlaceholderSvg({
	seed,
	hasBuilding = false,
	className,
}: PropertyPlaceholderSvgProps) {
	const h = hashSeed(seed);
	const palette = PALETTES[h % PALETTES.length];
	const [bgFrom, bgVia, bgTo, p1, p2, p3, p4, road, bldg] = palette;

	// Vary rectangle positions and sizes slightly
	const r = (i: number) => seededRand(h, i);

	// Major road — horizontal position varies
	const roadY = 100 + Math.round(r(0) * 24 - 12); // 88–112
	// Minor road — vertical position varies
	const roadX = 160 + Math.round(r(1) * 40 - 20); // 140–200
	// Dashed road
	const dashX = 260 + Math.round(r(2) * 40 - 20); // 240–300

	// Parcel corner radii vary
	const rx = 10 + Math.round(r(3) * 8); // 10–18

	// Building placement quadrant
	const bldgQuadrant = Math.floor(r(4) * 4); // 0–3

	// Parcel rectangles — slight size/position jitter
	const parcels = [
		{
			x: 20 + r(5) * 8,
			y: 20 + r(6) * 8,
			w: 124 + r(7) * 16,
			h: 68 + r(8) * 12,
			fill: p1,
		},
		{
			x: roadX + 16 + r(9) * 6,
			y: 20 + r(10) * 8,
			w: 400 - roadX - 36 + r(11) * 10,
			h: 68 + r(12) * 12,
			fill: p2,
		},
		{
			x: 20 + r(13) * 8,
			y: roadY + 14 + r(14) * 6,
			w: 148 + r(15) * 16,
			h: 72 + r(16) * 12,
			fill: p3,
		},
		{
			x: roadX + 22 + r(17) * 6,
			y: roadY + 14 + r(18) * 6,
			w: 400 - roadX - 42 + r(19) * 10,
			h: 72 + r(20) * 12,
			fill: p4,
		},
	];

	// Building position inside the selected parcel
	const bq = parcels[bldgQuadrant];
	const bldgW = 48 + Math.round(r(21) * 16);
	const bldgH = 34 + Math.round(r(22) * 12);
	const bldgX = bq.x + (bq.w - bldgW) / 2;
	const bldgY = bq.y + (bq.h - bldgH) / 2;

	return (
		<div
			className={className}
			style={{
				background: `linear-gradient(135deg, ${bgFrom}, ${bgVia}, ${bgTo})`,
			}}
		>
			<svg
				viewBox="0 0 400 220"
				className="h-full w-full"
				fill="none"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
			>
				{/* Land parcels */}
				{parcels.map((p, i) => (
					<rect
						key={i}
						x={p.x}
						y={p.y}
						width={p.w}
						height={p.h}
						rx={rx}
						fill={p.fill}
					/>
				))}

				{/* Major road (horizontal) */}
				<path d={`M0 ${roadY}H400`} stroke={road} strokeWidth="10" />

				{/* Minor road (vertical) */}
				<path d={`M${roadX} 0V220`} stroke={road} strokeWidth="8" />

				{/* Dashed boundary / secondary road */}
				<path
					d={`M${dashX} 0V220`}
					stroke={road}
					strokeWidth="6"
					strokeDasharray="8 8"
				/>

				{/* Optional building footprint */}
				{hasBuilding && (
					<>
						<rect
							x={bldgX}
							y={bldgY}
							width={bldgW}
							height={bldgH}
							rx={8}
							fill={bldg}
						/>
						<rect
							x={bldgX + bldgW / 2 - 8}
							y={bldgY - 14}
							width={16}
							height={18}
							rx={4}
							fill={bldg}
						/>
					</>
				)}
			</svg>
		</div>
	);
}

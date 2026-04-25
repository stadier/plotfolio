"use client";

import { Booking, BookingType, Property } from "@/types/property";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface CalendarWidgetProps {
	properties: Property[];
	bookings?: Booking[];
}

const BOOKING_TYPE_COLORS: Record<BookingType, string> = {
	[BookingType.CONSULTATION]: "bg-blue-500",
	[BookingType.INSPECTION]: "bg-emerald-500",
	[BookingType.INQUIRY]: "bg-amber-500",
	[BookingType.SITE_VISIT]: "bg-cyan-500",
	[BookingType.VALUATION]: "bg-violet-500",
	[BookingType.NEGOTIATION]: "bg-red-500",
	[BookingType.OTHER]: "bg-slate-500",
};

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
	[BookingType.CONSULTATION]: "Consultation",
	[BookingType.INSPECTION]: "Inspection",
	[BookingType.INQUIRY]: "Inquiry",
	[BookingType.SITE_VISIT]: "Site Visit",
	[BookingType.VALUATION]: "Valuation",
	[BookingType.NEGOTIATION]: "Negotiation",
	[BookingType.OTHER]: "Other",
};

function bookingsToEvents(bookings: Booking[], properties: Property[]) {
	const propMap = new Map(properties.map((p) => [p.id, p.name]));
	return bookings
		.filter((b) => b.status !== "cancelled")
		.map((b) => ({
			id: b.id,
			propertyName: b.propertyId
				? (propMap.get(b.propertyId) ?? "Property")
				: "General",
			type: BOOKING_TYPE_LABELS[b.type] ?? b.type,
			color: BOOKING_TYPE_COLORS[b.type] ?? "bg-slate-500",
			date: new Date(b.date + "T00:00:00"),
		}));
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarWidget({
	properties,
	bookings,
}: CalendarWidgetProps) {
	const [monthOffset, setMonthOffset] = useState(0);

	const today = new Date();
	const viewDate = new Date(
		today.getFullYear(),
		today.getMonth() + monthOffset,
		1,
	);
	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();

	const events = useMemo(
		() => bookingsToEvents(bookings ?? [], properties),
		[bookings, properties],
	);

	// Build calendar grid
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const daysInMonth = lastDay.getDate();

	// Monday = 0
	let startOffset = firstDay.getDay() - 1;
	if (startOffset < 0) startOffset = 6;

	const cells: (number | null)[] = [];
	for (let i = 0; i < startOffset; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);
	while (cells.length % 7 !== 0) cells.push(null);

	// Map events to day numbers for the current month/year
	const eventsByDay = new Map<number, typeof events>();
	for (const ev of events) {
		if (ev.date.getFullYear() === year && ev.date.getMonth() === month) {
			const d = ev.date.getDate();
			if (!eventsByDay.has(d)) eventsByDay.set(d, []);
			eventsByDay.get(d)!.push(ev);
		}
	}

	const isToday = (day: number) =>
		day === today.getDate() &&
		month === today.getMonth() &&
		year === today.getFullYear();

	const monthLabel = viewDate.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	// Upcoming events list (next 4)
	const upcoming = events
		.filter((ev) => ev.date >= today)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.slice(0, 4);

	return (
		<div className="bg-card sz-card border border-border break-inside-avoid widget-card animate-fade-in-up">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center sz-gap">
					<div className="sz-icon-box rounded-full bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center">
						<Calendar className="sz-icon text-violet-600 dark:text-violet-400" />
					</div>
					<span className="typo-caption font-semibold text-on-surface-variant">
						Schedule
					</span>
				</div>
			</div>

			{/* Month nav */}
			<div className="flex items-center justify-between mb-2">
				<button
					type="button"
					onClick={() => setMonthOffset((o) => o - 1)}
					className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5 text-on-surface-variant" />
				</button>
				<span className="typo-caption font-bold text-primary">
					{monthLabel}
				</span>
				<button
					type="button"
					onClick={() => setMonthOffset((o) => o + 1)}
					className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
				>
					<ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
				</button>
			</div>

			{/* Day headers */}
			<div className="grid grid-cols-7 mb-1">
				{DAYS.map((d) => (
					<div
						key={d}
						className="text-center typo-badge font-bold text-outline py-1"
					>
						{d}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7">
				{cells.map((day, i) => {
					const dayEvents = day ? eventsByDay.get(day) : undefined;
					return (
						<div
							key={i}
							className={`relative flex flex-col items-center justify-center h-8 rounded-sm typo-badge transition-colors ${
								day == null
									? ""
									: isToday(day)
										? "bg-primary text-on-primary font-bold"
										: "text-on-surface hover:bg-surface-container cursor-default"
							}`}
						>
							{day && (
								<>
									<span>{day}</span>
									{dayEvents && dayEvents.length > 0 && (
										<div className="absolute bottom-0.5 flex gap-0.5">
											{dayEvents.slice(0, 3).map((ev, j) => (
												<span
													key={j}
													className={`w-1 h-1 rounded-full ${ev.color}`}
												/>
											))}
										</div>
									)}
								</>
							)}
						</div>
					);
				})}
			</div>

			{/* Upcoming events */}
			{upcoming.length > 0 && (
				<div className="mt-3 pt-3 border-t border-border space-y-2">
					<span className="typo-badge font-bold text-outline uppercase tracking-widest">
						Upcoming
					</span>
					{upcoming.map((ev) => (
						<div key={ev.id + ev.type} className="flex items-center gap-2">
							<span className={`w-2 h-2 rounded-full shrink-0 ${ev.color}`} />
							<div className="min-w-0 flex-1">
								<p className="typo-badge font-semibold text-on-surface truncate">
									{ev.type}
								</p>
								<p className="typo-badge text-outline truncate">
									{ev.propertyName}
								</p>
							</div>
							<span className="typo-badge font-bold text-on-surface-variant shrink-0">
								{ev.date.toLocaleDateString("en-GB", {
									day: "numeric",
									month: "short",
								})}
							</span>
						</div>
					))}
				</div>
			)}
			{events.length === 0 && (
				<p className="mt-3 pt-3 border-t border-border typo-badge text-outline text-center">
					No upcoming bookings
				</p>
			)}
		</div>
	);
}

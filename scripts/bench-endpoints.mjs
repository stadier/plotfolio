#!/usr/bin/env node
/**
 * Endpoint response-time benchmark.
 *
 * Hits a representative set of GET endpoints (with focus on properties CRUD
 * read paths) and reports first-call (cold) and median-of-N (warm) timings.
 *
 * Usage:
 *   node scripts/bench-endpoints.mjs            # default: http://localhost:4600
 *   BASE=http://localhost:4600 RUNS=5 node scripts/bench-endpoints.mjs
 *   COOKIE="connect.sid=..." node scripts/bench-endpoints.mjs
 */

const BASE = process.env.BASE || "http://localhost:4600";
const RUNS = Number(process.env.RUNS || 5);
const COOKIE = process.env.COOKIE || "";

const HEADERS = COOKIE ? { cookie: COOKIE } : {};

async function timeOnce(method, path, body) {
	const url = BASE + path;
	const init = { method, headers: { ...HEADERS } };
	if (body !== undefined) {
		init.headers["content-type"] = "application/json";
		init.body = typeof body === "string" ? body : JSON.stringify(body);
	}
	const t0 = performance.now();
	let status = 0;
	let bytes = 0;
	try {
		const res = await fetch(url, init);
		status = res.status;
		const buf = await res.arrayBuffer();
		bytes = buf.byteLength;
	} catch (e) {
		return { ms: -1, status: 0, bytes: 0, error: e.message };
	}
	return { ms: performance.now() - t0, status, bytes };
}

function fmt(ms) {
	if (ms < 0) return "  ERR  ";
	return `${ms.toFixed(0).padStart(5)}ms`;
}

function statusColor(s) {
	if (s === 0) return "\x1b[31m";
	if (s >= 500) return "\x1b[31m";
	if (s >= 400) return "\x1b[33m";
	if (s >= 300) return "\x1b[36m";
	return "\x1b[32m";
}

function tag(ms) {
	if (ms < 0) return "\x1b[31mFAIL\x1b[0m";
	if (ms < 200) return "\x1b[32mfast\x1b[0m";
	if (ms < 800) return "\x1b[36m ok \x1b[0m";
	if (ms < 2000) return "\x1b[33mslow\x1b[0m";
	return "\x1b[31mBAD!\x1b[0m";
}

async function bench(label, method, path, body) {
	const cold = await timeOnce(method, path, body);
	const warm = [];
	for (let i = 0; i < RUNS; i++) {
		warm.push(await timeOnce(method, path, body));
	}
	const okWarm = warm.filter((w) => w.ms >= 0).map((w) => w.ms);
	okWarm.sort((a, b) => a - b);
	const median = okWarm.length ? okWarm[Math.floor(okWarm.length / 2)] : -1;
	const min = okWarm.length ? okWarm[0] : -1;
	const max = okWarm.length ? okWarm[okWarm.length - 1] : -1;
	const sCol = statusColor(cold.status);
	console.log(
		`${tag(median)} ${sCol}${String(cold.status).padStart(3)}\x1b[0m  ` +
			`cold ${fmt(cold.ms)}  med ${fmt(median)}  ` +
			`min ${fmt(min)}  max ${fmt(max)}  ` +
			`${(cold.bytes / 1024).toFixed(1).padStart(7)}KB  ` +
			`${method.padEnd(6)} ${path}  ${label}`,
	);
	return {
		label,
		method,
		path,
		cold: cold.ms,
		median,
		min,
		max,
		status: cold.status,
		bytes: cold.bytes,
	};
}

async function main() {
	console.log(`\nBenchmarking ${BASE}  (warm runs per endpoint: ${RUNS})\n`);
	console.log(
		"flag stat  cold        med         min         max         size      method path\n" +
			"---- ----  ---------   ---------   ---------   ---------   --------  ------ ----",
	);

	const results = [];

	// Discover a real property id to drive the per-id endpoints.
	let propertyId = null;
	let portfolioId = null;
	try {
		const r = await fetch(BASE + "/api/properties", { headers: HEADERS });
		if (r.ok) {
			const list = await r.json();
			if (Array.isArray(list) && list.length) {
				propertyId = list[0].id || list[0]._id;
				portfolioId = list[0].portfolioId || list[0].portfolio || null;
			}
		}
	} catch {}

	// Top-level
	results.push(await bench("auth session", "GET", "/api/auth/session"));
	results.push(await bench("profile", "GET", "/api/profile"));
	results.push(await bench("portfolios list", "GET", "/api/portfolios"));
	results.push(await bench("subscriptions/me", "GET", "/api/subscriptions/me"));
	results.push(await bench("favourites", "GET", "/api/favourites"));
	results.push(await bench("exchange-rates", "GET", "/api/exchange-rates"));

	// Properties — the focus
	results.push(await bench("PROPERTIES list (all)", "GET", "/api/properties"));

	if (propertyId) {
		console.log(`\n--- per-property endpoints (id=${propertyId}) ---\n`);
		results.push(
			await bench("property GET by id", "GET", `/api/properties/${propertyId}`),
		);
		results.push(
			await bench(
				"property documents",
				"GET",
				`/api/properties/${propertyId}/documents`,
			),
		);
		results.push(
			await bench(
				"property media",
				"GET",
				`/api/properties/${propertyId}/media`,
			),
		);
		results.push(
			await bench(
				"property ownership-history",
				"GET",
				`/api/properties/${propertyId}/ownership-history`,
			),
		);
		results.push(
			await bench(
				"property transfers",
				"GET",
				`/api/properties/${propertyId}/transfers`,
			),
		);
	} else {
		console.log("\n(no properties found — skipping per-id checks)\n");
	}

	// Marketplace / sales surface
	results.push(await bench("sales", "GET", "/api/sales"));
	results.push(await bench("offers", "GET", "/api/offers"));
	results.push(await bench("bids", "GET", "/api/bids"));
	results.push(await bench("bookings", "GET", "/api/bookings"));
	results.push(await bench("disputes", "GET", "/api/disputes"));
	results.push(await bench("chat", "GET", "/api/chat"));
	results.push(
		await bench("document-requests", "GET", "/api/document-requests"),
	);
	results.push(await bench("invitations", "GET", "/api/invitations"));

	// Summary
	console.log("\n=== Slowest by warm median ===");
	const sorted = [...results].sort((a, b) => b.median - a.median).slice(0, 10);
	for (const r of sorted) {
		console.log(
			`  ${fmt(r.median)}  (cold ${fmt(r.cold)})  ${r.method} ${r.path}`,
		);
	}

	console.log("\n=== Slowest by cold ===");
	const sortedCold = [...results].sort((a, b) => b.cold - a.cold).slice(0, 10);
	for (const r of sortedCold) {
		console.log(
			`  ${fmt(r.cold)}  (med ${fmt(r.median)})  ${r.method} ${r.path}`,
		);
	}

	console.log("\nDone.\n");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

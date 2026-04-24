/**
 * Shared session / authentication helpers for API routes.
 * Centralises the session cookie parsing so new routes don't have
 * to re-implement the same logic.
 */

import connectDB from "@/lib/mongoose";
import { IUser, UserModel } from "@/models/User";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "plotfolio_session";

/** Parse the session cookie and return the userId, or null. */
export async function getSessionUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [token, userId] = session.split(":");
	if (!token || !userId) return null;
	return userId;
}

/** Load the current authenticated user from the session, or null. */
export async function getSessionUser(): Promise<IUser | null> {
	const userId = await getSessionUserId();
	if (!userId) return null;
	await connectDB();
	const user = await UserModel.findOne({ id: userId }).lean<IUser | null>();
	return user;
}

/** Throw-style helper. Use inside API routes that require auth. */
export async function requireSessionUser(): Promise<IUser> {
	const user = await getSessionUser();
	if (!user) {
		throw new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}
	return user;
}

/** Require an authenticated user that is a platform admin. */
export async function requireAdminUser(): Promise<IUser> {
	const user = await requireSessionUser();
	if (!user.isAdmin) {
		throw new Response(JSON.stringify({ error: "Admin access required" }), {
			status: 403,
		});
	}
	return user;
}

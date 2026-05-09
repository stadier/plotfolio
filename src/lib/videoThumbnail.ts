/**
 * Client-side video poster capture.
 *
 * Renders the first decoded frame of a video file into a JPEG `File` that
 * can be uploaded as the media's `thumbnail` (the `property-thumb` upload
 * scope). Doing this in the browser avoids any server-side video decoding
 * (no ffmpeg in the stack) and keeps uploads fully client-direct to B2.
 *
 * Returns `null` when the browser cannot decode the file (e.g. some HEVC
 * `.mov` files on non-Safari) so callers can fall back to leaving
 * `thumbnail` empty — the UI then uses the `<video>` element's own poster.
 */
export async function generateVideoThumbnail(file: File): Promise<File | null> {
	if (typeof document === "undefined") return null;
	if (!file.type.startsWith("video/")) return null;

	const videoUrl = URL.createObjectURL(file);
	const video = document.createElement("video");
	try {
		video.src = videoUrl;
		video.muted = true;
		video.playsInline = true;
		// `auto` (not `metadata`) so the browser actually decodes pixel data.
		// With `metadata` many browsers fire `loadeddata` before any frame is
		// drawable, leaving `drawImage` to paint a transparent/black canvas.
		video.preload = "auto";
		// Required by Safari for offscreen <video> to decode frames.
		video.crossOrigin = "anonymous";

		await new Promise<void>((resolve, reject) => {
			video.addEventListener("loadedmetadata", () => resolve(), { once: true });
			video.addEventListener(
				"error",
				() =>
					reject(
						new Error(
							`Failed to load video for thumbnail (${file.type || "unknown"})`,
						),
					),
				{ once: true },
			);
		});

		if (!video.videoWidth || !video.videoHeight) {
			console.warn(
				"[videoThumbnail] no video dimensions — codec likely unsupported",
				file.type,
			);
			return null;
		}

		// Seek a fraction in to skip the often-black opening frame. Use the
		// smaller of 0.5s or 10% of duration so very short clips still work.
		const target = Number.isFinite(video.duration)
			? Math.min(0.5, Math.max(0.05, video.duration * 0.1))
			: 0.1;

		await new Promise<void>((resolve, reject) => {
			video.addEventListener("seeked", () => resolve(), { once: true });
			video.addEventListener(
				"error",
				() => reject(new Error("Failed to seek video for thumbnail")),
				{ once: true },
			);
			video.currentTime = target;
		});

		const canvas = document.createElement("canvas");
		const maxWidth = 960;
		const targetWidth = Math.min(video.videoWidth, maxWidth);
		const targetHeight = Math.round(
			(targetWidth / video.videoWidth) * video.videoHeight,
		);
		canvas.width = targetWidth;
		canvas.height = targetHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/jpeg", 0.82);
		});
		if (!blob) {
			console.warn(
				"[videoThumbnail] canvas.toBlob returned null (canvas may be tainted)",
			);
			return null;
		}

		const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
		return new File([blob], `${baseName}-thumbnail.jpg`, {
			type: "image/jpeg",
		});
	} catch (err) {
		console.warn("[videoThumbnail] generation failed", err);
		return null;
	} finally {
		// Detach src to release decoder resources before revoking.
		video.removeAttribute("src");
		video.load();
		URL.revokeObjectURL(videoUrl);
	}
}

/** Convierte minutos desde medianoche a "HH:mm". */
export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
		.toString()
		.padStart(2, "0");
	const remainder = (minutes % 60).toString().padStart(2, "0");
	return `${hours}:${remainder}`;
}

/** Convierte "HH:mm" a minutos desde medianoche. */
export function timeToMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

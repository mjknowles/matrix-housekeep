// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: import('$lib/server/auth').Session;
		}
		interface PageData {
			user?: { userId: string; isAdmin: boolean } | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

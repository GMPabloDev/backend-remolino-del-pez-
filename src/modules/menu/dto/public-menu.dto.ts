/** Plato en el menú público de una sucursal. */
export interface PublicMenuDish {
	id: string;
	name: string;
	description: string;
	imageUrl: string | null;
	ingredients: string[];
	allergens: string[];
	position: number;
	price: string;
	status: "available" | "sold_out";
}

/** Categoría con sus platos publicables en el menú público. */
export interface PublicMenuCategory {
	id: string;
	name: string;
	position: number;
	dishes: PublicMenuDish[];
}

/** Respuesta completa del menú público. */
export interface PublicMenuResponse {
	restaurantSlug: string;
	branchSlug: string;
	categories: PublicMenuCategory[];
}

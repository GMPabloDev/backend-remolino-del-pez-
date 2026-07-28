/** Configuración de un plato en una sucursal específica. */
export interface BranchDishConfigDto {
	price: string;
	status: "available" | "sold_out" | "inactive";
}

/** Plato listado en el contexto de una sucursal, con su configuración local. */
export interface BranchDishListItemDto {
	id: string;
	restaurantId: string;
	categoryId: string;
	categoryName: string;
	name: string;
	description: string;
	imageUrl: string | null;
	ingredients: string[];
	allergens: string[];
	position: number;
	status: "active" | "inactive";
	branchConfiguration: BranchDishConfigDto | null;
	createdAt: string;
	updatedAt: string;
}

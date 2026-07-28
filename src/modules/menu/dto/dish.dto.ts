/** Representación pública de un plato. */
export interface DishDto {
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
	createdAt: string;
	updatedAt: string;
}

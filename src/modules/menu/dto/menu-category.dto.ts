/** Representación pública de una categoría del menú. */
export interface MenuCategoryDto {
	id: string;
	restaurantId: string;
	name: string;
	position: number;
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
}

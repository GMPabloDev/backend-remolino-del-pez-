export interface ChangePasswordUseCase {
	execute(
		userId: string,
		input: {
			currentPassword: string;
			newPassword: string;
		},
	): Promise<void>;
}

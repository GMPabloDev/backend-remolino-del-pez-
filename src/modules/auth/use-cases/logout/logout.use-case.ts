export interface LogoutUseCase {
	execute(input: { refreshToken: string }): Promise<void>;
}

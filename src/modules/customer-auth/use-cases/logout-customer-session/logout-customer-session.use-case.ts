export interface LogoutCustomerSessionUseCase {
	execute(refreshToken: string): Promise<void>;
}

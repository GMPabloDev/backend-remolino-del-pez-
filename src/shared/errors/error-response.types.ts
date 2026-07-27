export interface ErrorDetail {
	field: string;
	code: string;
	message: string;
}

export interface ErrorResponseBody {
	error: {
		code: string;
		message: string;
		details: ErrorDetail[];
	};
}

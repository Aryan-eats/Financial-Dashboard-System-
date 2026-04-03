export function successResponse<T>(data: T) {
  return {
    status: "success" as const,
    data,
  };
}

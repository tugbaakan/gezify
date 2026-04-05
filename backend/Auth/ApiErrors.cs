using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;

namespace Gezify.Api.Auth;

public sealed record ApiErrorPayload(
    [property: JsonPropertyName("status")] int Status,
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("details")] IReadOnlyDictionary<string, string[]>? Details = null);

public sealed record ApiErrorEnvelope(
    [property: JsonPropertyName("error")] ApiErrorPayload Error);

public static class ApiErrors
{
    public static ApiErrorEnvelope Unauthorized(string message) =>
        new(new ApiErrorPayload(StatusCodes.Status401Unauthorized, "unauthorized", message));

    public static ApiErrorEnvelope Forbidden(string message) =>
        new(new ApiErrorPayload(StatusCodes.Status403Forbidden, "forbidden", message));

    public static ApiErrorEnvelope NotFound(string message) =>
        new(new ApiErrorPayload(StatusCodes.Status404NotFound, "not_found", message));

    public static ApiErrorEnvelope Validation(IReadOnlyDictionary<string, string[]> details) =>
        new(new ApiErrorPayload(
            StatusCodes.Status422UnprocessableEntity,
            "validation_error",
            "One or more validation errors occurred.",
            details));

    public static ApiErrorEnvelope ServerError(string message = "An unexpected error occurred.") =>
        new(new ApiErrorPayload(StatusCodes.Status500InternalServerError, "server_error", message));
}

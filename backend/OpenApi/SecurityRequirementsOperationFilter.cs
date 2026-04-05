using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Gezify.Api.OpenApi;

/// <summary>
/// Adds Bearer security only to operations that use <c>RequireAuthorization()</c>, so anonymous
/// endpoints (e.g. <c>/health</c>, <c>POST /auth/google</c>) are not sent a JWT by default in Swagger UI.
/// </summary>
internal sealed class SecurityRequirementsOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        if (!metadata.OfType<IAuthorizeData>().Any())
            return;

        if (metadata.OfType<IAllowAnonymous>().Any())
            return;

        operation.Security ??= new List<OpenApiSecurityRequirement>();
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            }] = Array.Empty<string>()
        });
    }
}

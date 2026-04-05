using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Gezify.Api.Auth;

public static class GezifyStatusCodePagesExtensions
{
    public static IApplicationBuilder UseGezifyStatusCodePages(this IApplicationBuilder app)
    {
        return app.UseStatusCodePages(async context =>
        {
            var response = context.HttpContext.Response;
            if (response.HasStarted)
                return;

            if (response.StatusCode != StatusCodes.Status404NotFound)
                return;

            response.ContentType = "application/json";
            await response.WriteAsJsonAsync(ApiErrors.NotFound("The requested resource was not found."));
        });
    }
}

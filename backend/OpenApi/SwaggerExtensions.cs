using Microsoft.OpenApi.Models;

namespace Gezify.Api.OpenApi;

public static class SwaggerExtensions
{
    public static IServiceCollection AddGezifySwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Gezify API",
                Version = "v1",
                Description = "Expense-sharing API. Obtain a JWT via POST /auth/google, then authorize here with Bearer {token}."
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste the accessToken from POST /auth/google (no \"Bearer \" prefix required in the Authorize dialog)."
            });

            options.OperationFilter<SecurityRequirementsOperationFilter>();
        });

        return services;
    }

    public static WebApplication UseGezifySwagger(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
            return app;

        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Gezify API v1");
            options.DocumentTitle = "Gezify API";
        });

        return app;
    }
}

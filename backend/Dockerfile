# Multi-stage: SDK publishes; aspnet runtime image runs (dotnet CLI not required at runtime beyond host).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish Gezify.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
# Railway sets PORT at runtime; default matches typical container listen.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Gezify.Api.dll"]

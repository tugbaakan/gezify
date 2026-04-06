namespace Gezify.Api.Auth.Options;

public sealed class ExchangeRateOptions
{
    public const string SectionName = "ExchangeRate";

    /// <summary>ExchangeRate-API key. Also set via EXCHANGE_RATE_API_KEY.</summary>
    public string ApiKey { get; set; } = string.Empty;
}

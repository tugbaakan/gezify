using System.Net.Http;
using System.Text.Json;
using Gezify.Api.Auth.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Gezify.Api.Services;

public sealed class ExchangeRateService(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    IOptions<ExchangeRateOptions> options,
    ILogger<ExchangeRateService> logger) : IExchangeRateService
{
    public const string HttpClientName = "ExchangeRateApi";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);

    private readonly ExchangeRateOptions _options = options.Value;

    public async Task<decimal> GetTryRateAsync(string fromCurrency, CancellationToken cancellationToken)
    {
        var code = fromCurrency.Trim().ToUpperInvariant();
        if (code == "TRY")
            return 1m;

        if (code.Length != 3 || code.Any(c => c < 'A' || c > 'Z'))
            throw new ArgumentException("Currency must be a 3-letter ISO 4217 code.");

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException(
                "Exchange rate API is not configured. Set ExchangeRate:ApiKey or EXCHANGE_RATE_API_KEY.");

        var cacheKey = $"gezify_fx_try_{code}";
        if (cache.TryGetValue(cacheKey, out decimal cached))
            return cached;

        try
        {
            var client = httpClientFactory.CreateClient(HttpClientName);
            var url = $"https://v6.exchangerate-api.com/v6/{Uri.EscapeDataString(_options.ApiKey)}/pair/{code}/TRY";
            using var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Exchange rate API returned {(int)response.StatusCode}.");

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = doc.RootElement;
            if (root.GetProperty("result").GetString() != "success")
                throw new InvalidOperationException("Exchange rate API could not compute the rate.");

            decimal rate;
            if (root.TryGetProperty("conversion_rate", out var rateEl))
            {
                rate = rateEl.ValueKind == JsonValueKind.Number
                    ? rateEl.GetDecimal()
                    : decimal.Parse(rateEl.GetRawText(), System.Globalization.CultureInfo.InvariantCulture);
            }
            else
                throw new InvalidOperationException("Exchange rate API response missing conversion_rate.");

            cache.Set(cacheKey, rate, CacheDuration);
            return rate;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(ex, "Exchange rate fetch failed for {Currency}→TRY.", code);
            throw new InvalidOperationException("Could not fetch the exchange rate. Try again shortly.");
        }
    }
}

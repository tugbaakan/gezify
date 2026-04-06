namespace Gezify.Api.Services;

public interface IExchangeRateService
{
    /// <summary>Returns the multiplier: original amount × rate = amount in TRY.</summary>
    Task<decimal> GetTryRateAsync(string fromCurrency, CancellationToken cancellationToken);
}

using Gezify.Api.Auth;
using Gezify.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Travels;

public static class TravelAuthorization
{
    /// <summary>Returns 404 if the travel does not exist, 403 if the user is not a member, otherwise null.</summary>
    public static async Task<IResult?> RequireTravelMemberAsync(
        ApplicationDbContext db,
        Guid travelId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var exists = await db.Travels.AsNoTracking().AnyAsync(t => t.Id == travelId, cancellationToken);
        if (!exists)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        var isMember = await db.TravelMembers.AnyAsync(m => m.TravelId == travelId && m.UserId == userId, cancellationToken);
        if (!isMember)
            return Results.Json(ApiErrors.Forbidden("You must be a member of this travel."), statusCode: StatusCodes.Status403Forbidden);

        return null;
    }
}

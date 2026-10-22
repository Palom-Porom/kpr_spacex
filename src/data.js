/** Чистые функции подготовки результатов Launch Library 2 к рендерингу. */

function getCoordinates(rawPad) {
    if (!rawPad || rawPad.latitude == null || rawPad.longitude == null) return null;
    const latitude = Number(rawPad.latitude);
    const longitude = Number(rawPad.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return [longitude, latitude]; // GeoJSON: [longitude, latitude]
}

function buildLaunchpads(launchpads, launches = []) {
    const padsById = new Map();
    // В отдельных ответах API поле agencies может не содержать все связанные объекты.
    // Дополняем список площадками непосредственно из полученных запусков SpaceX.
    for (const raw of [...launchpads, ...launches.map(launch => launch.pad)]) {
        if (raw?.id == null) continue;
        const id = String(raw.id);
        const old = padsById.get(id);
        if (!old || (!getCoordinates(old) && getCoordinates(raw))) padsById.set(id, raw);
    }
    return Array.from(padsById.values());
}

function toGeoJSON(rawPads) {
    return {
        type: "FeatureCollection",
        features: rawPads.filter(pad => pad?.id != null && getCoordinates(pad))
            .map(pad => ({
                type: "Feature",
                id: String(pad.id),
                properties: {
                    id: String(pad.id),
                    name: pad.name || `Площадка #${pad.id}`,
                    location: pad.location?.name || pad.country?.name || "Местоположение не указано",
                    active: pad.active ?? null,
                },
                geometry: { type: "Point", coordinates: getCoordinates(pad) },
            })),
    };
}

function getLaunchPadId(launch) {
    const id = launch?.pad?.id ?? (typeof launch?.pad === "number" ? launch.pad : null);
    return id == null ? null : String(id);
}

export { getCoordinates, buildLaunchpads, toGeoJSON, getLaunchPadId };

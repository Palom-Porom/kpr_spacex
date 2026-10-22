/** Учебные примеры для режима ?demo=1. НЕ являются ответом API и не показывают реальные миссии. */
const demoPads = [
    { id: 80, name: "Space Launch Complex 40", latitude: 28.56194122, longitude: -80.57735736, location: {name: "Cape Canaveral, Florida"}},
    { id: 101, name: "Launch Complex 39A", latitude: 28.608389, longitude: -80.604333, location: {name: "Kennedy Space Center, Florida"}},
    { id: 93, name: "Space Launch Complex 4E", latitude: 34.632, longitude: -120.610, location: {name: "Vandenberg, California"}},
    { id: 190, name: "Starbase (учебная точка)", latitude: 25.997, longitude: -97.156, location: {name: "Boca Chica, Texas"}},
];
const demoLaunches = [
    { id: "demo-a", name: "Учебный запуск A — Falcon 9", net: "2026-03-01T09:30:00Z", pad: demoPads[0], status: {name: "Demo"} },
    { id: "demo-b", name: "Учебный запуск B — Falcon Heavy", net: "2026-02-27T16:00:00Z", pad: demoPads[1], status: {name: "Demo"} },
    { id: "demo-c", name: "Учебный запуск C — Falcon 9", net: "2026-02-25T22:10:00Z", pad: demoPads[2], status: {name: "Demo"} },
    { id: "demo-d", name: "Учебный запуск D — Starship", net: "2026-02-18T19:00:00Z", pad: demoPads[3], status: {name: "Demo"} },
    { id: "demo-e", name: "Учебный запуск E — Falcon 9", net: "2026-02-12T05:10:00Z", pad: demoPads[0], status: {name: "Demo"} },
];

export { demoPads, demoLaunches };

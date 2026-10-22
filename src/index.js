import { SpaceX } from "./api/spacex";
import { buildLaunchpads, getLaunchPadId, toGeoJSON } from "./data";
import { demoPads, demoLaunches } from "./demo-data";
import * as d3 from "d3";
import worldGeoJSON from "./geo.json";

const WIDTH = 1000;
const HEIGHT = 530;
const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
const client = new SpaceX();

let launches = [];
let padsById = new Map();
let padSelection = null;
let selectedId = null;
let currentLaunchId = null;

const ui = {
    list: document.getElementById("listContainer"),
    map: document.getElementById("map"),
    details: document.getElementById("padDetails"),
    status: document.getElementById("status"),
    padCount: document.getElementById("padCount"),
    launchCount: document.getElementById("launchCount"),
    search: document.getElementById("searchInput"),
    reload: document.getElementById("reloadButton"),
    badge: document.getElementById("sourceBadge"),
};

function drawMap() {
    const svg = d3.select(ui.map)
        .append("svg")
        .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("role", "img")
        .attr("aria-label", "Карта мира и стартовые площадки SpaceX");

    const projection = d3.geoNaturalEarth1()
        .fitExtent([[22, 22], [WIDTH - 22, HEIGHT - 22]], { type: "Sphere" });
    const path = d3.geoPath(projection);

    svg.append("path").datum({type:"Sphere"}).attr("class", "sphere").attr("d", path);
    svg.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", path);
    svg.append("g")
        .selectAll("path")
        .data(worldGeoJSON.features)
        .join("path")
        .attr("class", "country")
        .attr("d", path);

    const markersLayer = svg.append("g").attr("class", "markers-layer");

    function setPads(featureCollection) {
        // Все точки — GeoJSON Features с geometry.type="Point".
        padSelection = markersLayer.selectAll("circle")
            .data(featureCollection.features, feature => feature.properties.id)
            .join("circle")
            .attr("class", "launchpad")
            .attr("data-pad-id", feature => feature.properties.id)
            .attr("cx", feature => projection(feature.geometry.coordinates)[0])
            .attr("cy", feature => projection(feature.geometry.coordinates)[1])
            .attr("r", 5.4)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", feature => `Площадка ${feature.properties.name}`)
            .on("mouseenter", (_, feature) => selectPad(feature.properties.id, null))
            .on("mouseleave", () => selectPad(null, null))
            .on("focus", (_, feature) => selectPad(feature.properties.id, null))
            .on("blur", () => selectPad(null, null));
        padSelection.selectAll("title").remove();
        padSelection.append("title").text(feature => `${feature.properties.name} — ${feature.properties.location}`);
    }
    return setPads;
}

const setPadsOnMap = drawMap();

function selectPad(padId, launchId) {
    selectedId = padId == null ? null : String(padId);
    currentLaunchId = launchId;

    if (padSelection) {
        padSelection
            .classed("is-active", feature => feature.properties.id === selectedId)
            .classed("is-dimmed", feature => selectedId !== null && feature.properties.id !== selectedId)
            .attr("r", feature => feature.properties.id === selectedId ? 9.6 : 5.4);
        if (selectedId !== null) {
            padSelection.filter(feature => feature.properties.id === selectedId).raise();
        }
    }
    ui.list.querySelectorAll(".launch-button").forEach(button => {
        button.classList.toggle("is-active", button.dataset.launchId === currentLaunchId);
    });

    const pad = padsById.get(selectedId);
    const textContainer = ui.details.querySelector("div:last-child");
    textContainer.replaceChildren();
    const title = document.createElement("strong");
    const description = document.createElement("p");
    if (pad) {
        title.textContent = pad.name || `Площадка #${selectedId}`;
        description.textContent = pad.location?.name || pad.country?.name || "Местоположение не указано";
    } else if (selectedId !== null) {
        title.textContent = "Площадка не найдена";
        description.textContent = "Для этого запуска API не вернул информацию о координатах.";
    } else {
        title.textContent = "Выберите запуск";
        description.textContent = "Название стартовой площадки появится здесь.";
    }
    textContainer.append(title, description);
}

function renderLaunches() {
    const query = ui.search.value.trim().toLocaleLowerCase();
    const filtered = launches.filter(launch => launch.name?.toLocaleLowerCase().includes(query));
    const ul = document.createElement("ul");
    ul.className = "launch-list";

    for (const launch of filtered) {
        const padId = getLaunchPadId(launch);
        const li = document.createElement("li");
        li.className = "launch-item";
        const button = document.createElement("button");
        button.className = "launch-button";
        button.type = "button";
        button.dataset.launchId = String(launch.id);
        if (padId) button.dataset.padId = padId;

        const group = document.createElement("span");
        const title = document.createElement("span");
        title.className = "launch-name";
        title.textContent = launch.name || "Запуск без названия";
        const info = document.createElement("span");
        info.className = "launch-meta";
        const date = launch.net && !Number.isNaN(new Date(launch.net).getTime())
            ? new Date(launch.net).toLocaleDateString("ru-RU", {day:"2-digit",month:"short",year:"numeric"})
            : "Дата неизвестна";
        info.textContent = `${date} · ${launch.pad?.name || "Площадка не указана"}`;
        group.append(title, info);
        const mark = document.createElement("span");
        mark.className = "launch-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "↗";
        button.append(group, mark);

        const show = () => selectPad(padId, String(launch.id));
        button.addEventListener("mouseenter", show);
        button.addEventListener("mouseleave", () => selectPad(null, null));
        button.addEventListener("focus", show);
        button.addEventListener("blur", () => selectPad(null, null));
        button.addEventListener("click", show);
        li.append(button);
        ul.append(li);
    }

    if (!filtered.length) {
        const message = document.createElement("p");
        message.className = "empty";
        message.textContent = launches.length ? "По вашему запросу запусков не найдено." : "Список запусков пуст.";
        ui.list.replaceChildren(message);
    } else {
        ui.list.replaceChildren(ul);
    }
    ui.launchCount.textContent = String(launches.length);
}

function updateStatus(text, isError = false) {
    ui.status.textContent = text;
    ui.status.classList.toggle("is-error", isError);
}

async function loadData(forceReload = false) {
    ui.reload.disabled = true;
    ui.search.disabled = true;
    updateStatus(isDemo ? "Загрузка учебного примера…" : "Запрашиваем данные Launch Library 2…");
    ui.list.innerHTML = '<p class="loading">Загружаем данные…</p>';
    if (forceReload && !isDemo) client.clearCache();
    try {
        let rawLaunches, rawPads;
        let apiWarning = "";
        if (isDemo) {
            rawLaunches = demoLaunches;
            rawPads = demoPads;
            ui.badge.textContent = "ДЕМО · учебные данные";
        } else {
            const [launchResult, padsResult] = await Promise.allSettled([
                client.launches(), client.launchpads(),
            ]);
            rawLaunches = launchResult.status === "fulfilled" ? launchResult.value : [];
            rawPads = padsResult.status === "fulfilled" ? padsResult.value : [];
            if (launchResult.status === "rejected" && padsResult.status === "rejected") {
                throw new Error(`${launchResult.reason.message}; ${padsResult.reason.message}`);
            }
            if (launchResult.status === "rejected") apiWarning += `Запуски: ${launchResult.reason.message}. `;
            if (padsResult.status === "rejected") apiWarning += `Площадки: ${padsResult.reason.message}. `;
        }

        launches = rawLaunches;
        const allPads = buildLaunchpads(rawPads, rawLaunches);
        padsById = new Map(allPads.map(pad => [String(pad.id), pad]));
        const geoJSON = toGeoJSON(allPads);
        setPadsOnMap(geoJSON);
        ui.padCount.textContent = String(geoJSON.features.length);
        renderLaunches();
        selectPad(null, null);
        const note = `${launches.length} запусков · ${geoJSON.features.length} площадок с координатами`;
        updateStatus(apiWarning ? `${note}. ${apiWarning}Демо: добавьте ?demo=1 к адресу.` :
            `${note}. ${isDemo ? "Это демонстрационные записи, а не данные API." : "Данные предоставлены The Space Devs."}`, Boolean(apiWarning));
    } catch (error) {
        console.error("Launch Library 2:", error);
        launches = [];
        padsById.clear();
        setPadsOnMap(toGeoJSON([]));
        ui.launchCount.textContent = "0";
        ui.padCount.textContent = "0";
        const message = document.createElement("p");
        message.className = "error-text";
        message.textContent = "Ошибка загрузки: " + error.message + ". Для проверки без API запустите страницу с параметром ?demo=1.";
        ui.list.replaceChildren(message);
        selectPad(null, null);
        updateStatus("Не удалось загрузить API. Проверьте интернет, лимит запросов или включите ?demo=1.", true);
    } finally {
        ui.reload.disabled = false;
        ui.search.disabled = false;
    }
}

ui.search.addEventListener("input", () => { renderLaunches(); selectPad(null, null); });
ui.reload.addEventListener("click", () => loadData(true));
loadData();

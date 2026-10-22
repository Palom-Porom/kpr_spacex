/**
 * Адаптер Launch Library 2 (The Space Devs), API v2.3.0.
 * Сохраняет имена методов из исходной лабораторной SpaceX.
 * Документация: https://ll.thespacedevs.com/docs
 */
const DEFAULT_BASE_URL = "https://ll.thespacedevs.com/2.3.0/";
const SPACEX_AGENCY_ID = 121;
const CACHE_TTL_MS = 30 * 60 * 1000;

class SpaceX {
    constructor(baseUrl = DEFAULT_BASE_URL, options = {}) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        this.fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
        this.storage = options.storage === undefined
            ? (typeof localStorage === "undefined" ? null : localStorage)
            : options.storage;
        this.now = options.now || Date.now;
    }

    async request(path, params = {}, { cache = true } = {}) {
        const url = new URL(path, this.baseUrl);
        Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, String(value)));
        const cacheKey = `ll2:v2:${url.toString()}`;

        if (cache && this.storage) {
            try {
                const saved = JSON.parse(this.storage.getItem(cacheKey));
                if (saved && saved.expires > this.now()) return saved.payload;
            } catch (_) { /* storage может быть недоступен */ }
        }

        let response;
        try {
            response = await this.fetchImpl(url.toString(), {
                headers: { Accept: "application/json" },
            });
        } catch (error) {
            throw new Error(`Не удалось подключиться к Launch Library 2: ${error.message}`);
        }

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("API ограничил количество запросов (HTTP 429). Попробуйте позже или используйте демонстрационный режим.");
            }
            throw new Error(`Ошибка Launch Library 2: HTTP ${response.status} ${response.statusText || ""}`.trim());
        }

        let payload;
        try {
            payload = await response.json();
        } catch (_) {
            throw new Error("API вернул ответ, который не является JSON.");
        }

        if (cache && this.storage) {
            try {
                this.storage.setItem(cacheKey, JSON.stringify({ expires: this.now() + CACHE_TTL_MS, payload }));
            } catch (_) { /* полный storage не должен ломать приложение */ }
        }
        return payload;
    }

    /** Последние завершённые запуски SpaceX. `mode=normal` содержит поле pad. */
    async launches(limit = 80) {
        const payload = await this.request("launches/previous/", {
            lsp__id: SPACEX_AGENCY_ID,
            ordering: "-net",
            limit: Math.max(1, Math.min(100, limit)),
            mode: "normal",
        });
        if (!Array.isArray(payload.results)) throw new Error("API запусков вернул неожиданный формат данных.");
        return payload.results;
    }

    /** Все площадки, связанные с SpaceX; обрабатываем пагинацию API. */
    async launchpads() {
        const results = [];
        let offset = 0;
        const limit = 100;
        // Защита от неожиданно бесконечной пагинации и излишних вызовов лимитированного API.
        for (let page = 0; page < 5; page += 1) {
            const payload = await this.request("pads/", {
                agencies_ids: SPACEX_AGENCY_ID, ordering: "id", limit, offset,
            });
            if (!Array.isArray(payload.results)) throw new Error("API площадок вернул неожиданный формат данных.");
            results.push(...payload.results);
            if (!payload.next) return results;
            offset += payload.results.length;
            if (payload.results.length === 0) throw new Error("API вернул пустую страницу с продолжением пагинации.");
        }
        throw new Error("API вернул слишком много страниц стартовых площадок.");
    }

    /** Очистить кеш приложения; кнопка «Обновить» выполняет настоящие запросы. */
    clearCache() {
        if (!this.storage) return;
        try {
            for (let i = this.storage.length - 1; i >= 0; i -= 1) {
                const key = this.storage.key(i);
                if (key && key.startsWith("ll2:v2:")) this.storage.removeItem(key);
            }
        } catch (_) { /* некоторые браузеры запрещают доступ к localStorage */ }
    }

    /** Данные одной конкретной площадки по числовому ID Launch Library 2. */
    launchpad(id) {
        if (!/^\d+$/.test(String(id))) throw new Error("Некорректный ID стартовой площадки.");
        return this.request(`pads/${id}/`);
    }
}

export { SpaceX, SPACEX_AGENCY_ID };

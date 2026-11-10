import {
    GITHUB_USER,
    BASE_URL,
    FALLBACK_ICON,
    METADATA_CACHE_DURATION,
    LANGUAGE_CACHE_DURATION,
    ICON_CACHE_DURATION
} from "./config.js";


export const projectMetadata = new Map();
export const projectLanguages = new Map();

const iconCache = new Map();


// --------------------------------------------------
// Repository metadata
// --------------------------------------------------

export async function getProjectMetadata(project) {
    const repo = project.repo ?? project.path;
    const cacheKey = `metadata:${GITHUB_USER}/${repo}`;

    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));

        if (
            cached &&
            Date.now() - cached.timestamp < METADATA_CACHE_DURATION
        ) {
            return cached.data;
        }
    } catch {
        // Ignore unavailable or invalid cache.
    }

    try {
        const url = `https://api.github.com/repos/${
            encodeURIComponent(GITHUB_USER)
        }/${encodeURIComponent(repo)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`GitHub API: ${response.status}`);
        }

        const repoData = await response.json();

        const data = {
            pushedAt: repoData.pushed_at
        };

        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch {
            // Storage unavailable.
        }

        return data;
    } catch (error) {
        console.warn(`Metadata lookup failed for ${repo}`, error);
        return null;
    }
}


// --------------------------------------------------
// Programming languages
// --------------------------------------------------

export async function getProjectLanguages(project) {
    const repo = project.repo ?? project.path;
    const cacheKey = `languages:${GITHUB_USER}/${repo}`;

    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));

        if (
            cached &&
            Date.now() - cached.timestamp < LANGUAGE_CACHE_DURATION
        ) {
            return cached.languages;
        }
    } catch {
        // Ignore invalid cache entries.
    }

    try {
        const url = `https://api.github.com/repos/${
            encodeURIComponent(GITHUB_USER)
        }/${encodeURIComponent(repo)}/languages`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`GitHub API: ${response.status}`);
        }

        const data = await response.json();

        const total = Object.values(data)
            .reduce((sum, bytes) => sum + bytes, 0);

        const languages = Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .map(([name, bytes]) => ({
                name,
                percentage: total ? bytes / total * 100 : 0
            }));

        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                languages
            }));
        } catch {
            // Storage may be unavailable.
        }

        return languages;

    } catch (error) {
        console.warn(`Language lookup failed for ${repo}`, error);
        return [];
    }
}


// --------------------------------------------------
// Website favicon discovery
// --------------------------------------------------

async function discoverIcon(project, forceRefresh = false) {
    const cacheKey = `favicon:${project.path}`;

    if (!forceRefresh) {
        // Check in-memory cache.
        if (iconCache.has(project.path)) {
            return iconCache.get(project.path);
        }

        // Check persistent browser cache.
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey));

            if (
                cached &&
                Array.isArray(cached.icons) &&
                Date.now() - cached.timestamp < ICON_CACHE_DURATION
            ) {
                iconCache.set(project.path, cached.icons);
                return cached.icons;
            }
        } catch {
            // Cache unavailable or invalid.
        }
    }

    const pageUrl = new URL(project.path + "/", BASE_URL);

    try {
        const response = await fetch(pageUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const candidates = [...doc.querySelectorAll("link[rel]")]
            .filter(link =>
                link.rel.toLowerCase().split(/\s+/).includes("icon")
            )
            .map(link => link.getAttribute("href"))
            .filter(Boolean)
            .map(href => new URL(href, pageUrl).href);

        // Conventional fallback locations.
        candidates.push(
            new URL("favicon.ico", pageUrl).href,
            new URL("/favicon.ico", BASE_URL).href
        );

        const icons = [...new Set(candidates)];

        iconCache.set(project.path, icons);

        // Save discovered URLs for future visits.
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                icons
            }));
        } catch {
            // Storage unavailable.
        }

        return icons;

    } catch (error) {
        console.warn(`Could not discover icon for ${project.name}`, error);

        // Avoid caching failed discovery attempts persistently.
        const fallback = [
            new URL("favicon.ico", pageUrl).href
        ];

        iconCache.set(project.path, fallback);
        return fallback;
    }
}


export async function loadIcon(img, project) {
    let candidates = await discoverIcon(project);

    if (!img.isConnected) return;

    let index = 0;
    let refreshed = false;

    async function tryNext() {
        if (!img.isConnected) return;

        if (index < candidates.length) {
            img.src = candidates[index++];
            return;
        }

        // Cached URLs may be outdated. Rediscover once.
        if (!refreshed) {
            refreshed = true;

            candidates = await discoverIcon(project, true);
            index = 0;

            if (!img.isConnected) return;

            if (candidates.length) {
                tryNext();
                return;
            }
        }

        // Final fallback.
        img.onerror = null;
        img.src = FALLBACK_ICON;
    }

    img.onerror = tryNext;
    tryNext();
}
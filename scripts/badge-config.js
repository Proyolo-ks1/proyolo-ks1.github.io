import {
    ProjectStatus,
    ProjectFunctionality
} from "./enums.js";

import { projects } from "./projects.js";


export const statusConfig = {
    [ProjectStatus.WIP]: {
        label: "Work in Progress",
        className: "badge-warning"
    },
    [ProjectStatus.COMPLETED]: {
        label: "Completed",
        className: "badge-success"
    },
    [ProjectStatus.ARCHIVED]: {
        label: "Archived",
        className: "badge-neutral"
    }
};


export const functionalityConfig = {
    [ProjectFunctionality.WORKING]: {
        label: "Working",
        className: "badge-success"
    },
    [ProjectFunctionality.PARTIAL]: {
        label: "Partially Working",
        className: "badge-warning"
    },
    [ProjectFunctionality.BROKEN]: {
        label: "Not Working",
        className: "badge-danger"
    }
};


export function getBadgeClass(name) {
    const status = Object.values(statusConfig)
        .find(config => config.label === name);

    if (status) return status.className;

    const functionality = Object.values(functionalityConfig)
        .find(config => config.label === name);

    if (functionality) return functionality.className;

    const isCustomBadge = projects.some(project =>
        (project.badges ?? []).includes(name)
    );

    if (isCustomBadge) return "badge-custom";

    // Programming language badge.
    return "";
}
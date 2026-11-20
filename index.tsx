/*
 * ClientMask - local Vencord userplugin
 * Based on the user-supplied Discord Platform-Spoofer console script.
 * No remote code, network calls, token access, or persistence beyond plugin settings.
 *
 * Notes: Discord may change its undocumented Gateway internals at any time.
 * The 'Xbox' and 'PlayStation' selections share the same browser identifier.
 */

import { addGlobalContextMenuPatch, removeGlobalContextMenuPatch, type GlobalContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Menu } from "@webpack/common";

const IDENTIFY = 2;

const platforms = {
    windows: { label: "Windows / Desktop", browser: "Discord Client" },
    web: { label: "Web", browser: "Discord Web" },
    android: { label: "Android / Mobile", browser: "Discord Android" },
    ios: { label: "iOS / Mobile", browser: "Discord iOS" },
    xbox: { label: "Xbox / Console", browser: "Discord Embedded" },
    playstation: { label: "PlayStation / Console", browser: "Discord Embedded" },
    vr: { label: "VR", browser: "Discord VR" }
} as const;

type Platform = "off" | keyof typeof platforms;

type SocketSend = (op: number, data: any, ...args: any[]) => any;

interface GatewaySocket {
    send: SocketSend;
    sessionId?: string | null;
    seq?: number;
    webSocket?: WebSocket | null;
}

let active = false;
let patchedSocket: GatewaySocket | null = null;
let previousSend: SocketSend | null = null;
let ourSend: SocketSend | null = null;

function getSocket(): GatewaySocket | null {
    try {
        const gateway = findByProps("getSocket");
        return typeof gateway?.getSocket === "function" ? gateway.getSocket() : null;
    } catch (error) {
        console.warn("[ClientMask] Failed to find the Gateway socket.", error);
        return null;
    }
}

function restoreSocket() {
    if (patchedSocket && previousSend && patchedSocket.send === ourSend) {
        patchedSocket.send = previousSend;
    }

    patchedSocket = null;
    previousSend = null;
    ourSend = null;
}

function patchSocket(): boolean {
    const socket = getSocket();
    if (!socket || typeof socket.send !== "function") return false;
    if (socket === patchedSocket && socket.send === ourSend) return true;

    restoreSocket();
    const originalSend = socket.send;
    const wrapper: SocketSend = function (this: GatewaySocket, op, data, ...args) {
        const selected = settings.store.platform as Platform;

        if (op === IDENTIFY && data?.properties && selected !== "off") {
            const browser = platforms[selected]?.browser;
            if (browser) {
                data = {
                    ...data,
                    properties: { ...data.properties, browser }
                };
            }
        }

        return Reflect.apply(originalSend, this, [op, data, ...args]);
    };

    socket.send = wrapper;
    patchedSocket = socket;
    previousSend = originalSend;
    ourSend = wrapper;
    return true;
}

function reconnect(): boolean {
    const socket = getSocket();
    const ws = socket?.webSocket;
    if (!socket || !ws || ws.readyState >= WebSocket.CLOSING) return false;

    // Force a new IDENTIFY rather than resuming the prior Gateway session.
    socket.sessionId = null;
    socket.seq = 0;
    ws.close(1000);
    return true;
}

function onPlatformChanged() {
    if (!active) return;

    if (!patchSocket()) {
        console.warn("[ClientMask] Gateway socket unavailable. Reload Vesktop.");
        return;
    }

    if (!reconnect()) {
        console.warn("[ClientMask] Unable to reidentify. Reload Vesktop to apply your selection.");
    }
}

const options: Array<{ label: string; value: Platform; }> = [
    { label: "Default (no spoofing)", value: "off" },
    ...Object.entries(platforms).map(([value, info]) => ({
        label: info.label,
        value: value as Platform
    }))
];

const settings = definePluginSettings({
    platform: {
        type: OptionType.SELECT,
        description: "Device displayed to others. Change it here or in your profile status menu.",
        default: "off",
        restartNeeded: false,
        options,
        onChange: onPlatformChanged
    }
});

function statusOptionsPresent(children: any[]): boolean {
    // Discord has changed its menu layout a few times. We check the content
    // instead of assuming a single, permanent navId for the status submenu.
    const found = new Set<string>();
    const visit = (items: any[], depth: number) => {
        if (depth > 5) return;

        for (const item of items) {
            if (!item) continue;
            if (Array.isArray(item)) {
                visit(item, depth + 1);
                continue;
            }

            const id = String(item.props?.id ?? "").toLowerCase();
            const label = typeof item.props?.label === "string"
                ? item.props.label.toLowerCase()
                : "";
            const is = (name: string) => id === name || id.endsWith(`-${name}`);

            if (is("online") || label === "online") found.add("online");
            if (is("idle") || label === "idle") found.add("idle");
            if (is("dnd") || label === "do not disturb") found.add("dnd");
            if (is("invisible") || label === "invisible") found.add("invisible");

            const nested = item.props?.children;
            if (Array.isArray(nested)) visit(nested, depth + 1);
            else if (nested) visit([nested], depth + 1);
        }
    };

    visit(children, 0);
    return ["online", "idle", "dnd", "invisible"].every(status => found.has(status));
}

const patchStatusMenu: GlobalContextMenuPatchCallback = (_navId, children) => {
    if (!active || !statusOptionsPresent(children)) return;
    // Avoid adding our own menu twice if the host reuses a rendered tree.
    if (children.some(item => item?.props?.id === "vc-clientmask-submenu")) return;

    const selected = settings.store.platform as Platform;
    const selectedLabel = selected === "off" ? "Default" : platforms[selected]?.label ?? "Unknown";

    children.push(
        <Menu.MenuSeparator key="vc-clientmask-divider" />,
        <Menu.MenuItem
            id="vc-clientmask-submenu"
            key="vc-clientmask-submenu"
            label={`ClientMask · ${selectedLabel}`}
        >
            {options.map(option => (
                <Menu.MenuRadioItem
                    group="vc-clientmask-platform"
                    id={`vc-clientmask-${option.value}`}
                    key={option.value}
                    label={option.label}
                    checked={selected === option.value}
                    action={() => {
                        if (settings.store.platform !== option.value) {
                            // The registered settings onChange handler performs reconnection.
                            settings.store.platform = option.value;
                        }
                    }}
                />
            ))}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "ClientMask",
    description: "Change your reported Discord platform from the profile status menu.",
    authors: [{ name: "Local", id: 0n }],
    settings,

    start() {
        active = true;
        addGlobalContextMenuPatch(patchStatusMenu);

        if (!patchSocket()) {
            console.warn("[ClientMask] Gateway unavailable. Reopen or reload Vesktop.");
        } else if (settings.store.platform !== "off" && !reconnect()) {
            console.warn("[ClientMask] Reload Vesktop if the displayed platform has not changed.");
        }
    },

    stop() {
        removeGlobalContextMenuPatch(patchStatusMenu);
        const wasSpoofing = settings.store.platform !== "off";
        active = false;
        restoreSocket();

        if (wasSpoofing && !reconnect()) {
            console.warn("[ClientMask] Reload Vesktop to restore its normal platform.");
        }
    }
});

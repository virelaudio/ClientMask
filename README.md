# ClientMask

ClientMask is a local [Vencord](https://vencord.dev/) userplugin for Vencord builds used with Vesktop or Discord Desktop. It lets you choose the Discord client platform reported when the app connects.

> [!WARNING]
> This is an unofficial client modification that relies on Discord's undocumented Gateway internals. It may stop working after a Discord or Vencord update, and using client modifications may violate Discord's Terms of Service. Use it at your own risk.

## What it does

- Adds a **ClientMask** submenu to the profile status menu.
- Lets you report Windows/Desktop, Web, Android, iOS, Xbox, PlayStation, or VR.
- Reconnects the Gateway when you change a selection, so the next identify uses that platform.
- Restores the default platform when you disable the plugin or select **Default**.

ClientMask only changes the `browser` value sent in Discord's Gateway identify payload. It does not alter your operating system, user agent, account data, or messages.

## Demo

![Opening the ClientMask platform selector from the profile status menu](https://r2.fakecrime.bio/uploads/7f0c1551-7d09-41f0-bedd-e0d9b49ad310.gif)

## Installation

Custom Vencord plugins require a Vencord build from source; they cannot be added to the standard prebuilt Vencord install. Follow Vencord's [custom-plugin guide](https://docs.vencord.dev/installing/custom-plugins/) first.

1. Clone this repository or download `index.tsx`.
2. In your Vencord source checkout, create this path if it does not exist:

   ```text
   src/userplugins/clientMask/index.tsx
   ```

3. Copy this repository's `index.tsx` to that path.
4. From the Vencord checkout, rebuild with:

   ```sh
   pnpm build
   ```

5. Restart your client. In Vesktop, select the Vencord checkout's `dist` folder under **Vesktop Settings → Open Developer Settings → Vencord Location**, then fully restart Vesktop.

Vencord documents the full build and Vesktop setup process in its [installation guide](https://docs.vencord.dev/installing/).

## Usage

1. Enable **ClientMask** under **Settings → Vencord → Plugins**.
2. Open the profile status menu from your avatar.
3. Choose **ClientMask →** the platform you want to report.
4. Choose **Default (no spoofing)** to go back to the normal client platform.

Changing the selection briefly reconnects Discord. If the menu is missing or the platform does not update, reload/restart Vesktop and try again.

## Compatibility

| Component | Requirement |
| --- | --- |
| Client | A local Vencord build running in Vesktop or Discord Desktop |
| Vencord | Current source build with support for custom userplugins |
| Platform | Desktop environments supported by Vencord/Vesktop |

Xbox and PlayStation currently share Discord's `Discord Embedded` browser identifier, so Discord may display them the same way.

## Privacy and security

The plugin has no network requests, no token access, and no native Node.js code. Its only persistent state is the selected platform stored in Vencord plugin settings.

## Troubleshooting

- **The plugin is not listed:** confirm the file is exactly `src/userplugins/clientMask/index.tsx`, then rebuild Vencord.
- **The selection does not apply:** fully restart the client. Discord can change the internal Gateway interface this plugin uses.
- **Vesktop does not load the build:** point **Vencord Location** at the Vencord checkout's `dist` directory, not the repository directory.

## Contributing

Issues and pull requests are welcome. For a bug report, include your client (Vesktop or Discord Desktop), OS, Vencord commit/version, ClientMask commit, and reproducible steps. Do not include account tokens, user IDs, or console output containing private information.

## License

Licensed under the [MIT License](LICENSE).

# El Dabboos branding

Project-owned display text uses **El Dabboos**. Machine identifiers use `el-dabboos`, including the root package `el-dabboos-analytics` and the five private workspaces `@el-dabboos/{domain,application,data,api,web}`. Update workspace references through pnpm; the brand sanity tests reject spelling drift in source, documentation and configuration.

## Official assets

The unchanged transparent RGBA originals were copied from the developer's Downloads directory:

| Original | Repository asset | Dimensions | Use |
| --- | --- | --- | --- |
| `dabboos-logo-cropped.png` | `apps/web/public/brand/el-dabboos-mark.png` | 692 × 518 | Sidebar, mobile drawer, PNG favicon |
| `dabboos-logo.png` | `apps/web/public/brand/el-dabboos-corporate-logo.png` | 1709 × 532 | Retained official corporate asset; currently not displayed |

The mark keeps its aspect ratio and original blue gradient. Expanded navigation renders El Dabboos and the existing localized Analytics Studio descriptor alongside it; collapsed navigation uses only the mark. The image is decorative (`alt=""`) beside visible brand text and named `El Dabboos` when alone. The full lockup embeds “Dabboos / Technical Solutions”; displaying it beside the app name would duplicate branding. No new corporate page was added. Never recolor, filter, stretch or flatten these assets.

Asset tests verify original dimensions, RGBA type and SHA-256 bytes. Ordinary interface icons remain Lucide; chart palettes and semantic design tokens remain unchanged.

## Browser preference compatibility

`apps/web/src/presentation/preference-storage.ts` contains the only permitted noncanonical literals: five explicitly commented legacy browser keys. Theme, sidebar, locale and last authorized tenant remain localStorage preferences; the demo identity remains a sessionStorage preference.

Read the canonical key first. When absent, read and validate the corresponding legacy value, use it and copy it to the canonical key. An invalid canonical value takes precedence and uses the existing safe fallback. Invalid legacy values are ignored. A blocked copy still permits the valid legacy value for the current session; future writes use canonical keys only. Legacy keys remain available for compatibility. Tenant migration validates against current memberships and does not grant access.

This compatibility logic stays in web presentation code. It does not write dashboard specs, saved records or databases, perform analytics requests, or dirty working drafts. Business identifiers, routes, schema versions and validator structure are unchanged. Project-owned schema `$id` URL annotations and transient builder drag labels use the canonical slug; no persisted business identity is renamed.

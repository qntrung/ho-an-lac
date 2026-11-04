# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hồ An Lạc: a free Android app where friends on the **same Wi-Fi** walk around a circular lake together, release virtual fish (phóng sanh), pray, bow, and pick up trash. No fake players. The UI, README, code comments, and commit messages are all in Vietnamese; keep that convention.

Current stage: a test build for friends. Priority is better visuals without breaking the gameplay that already works.

## Commands

- Build debug APK: `gradle assembleDebug` (JDK 17, Android SDK 34, Gradle 8.7; no Gradle wrapper is checked in). Output: `app/build/outputs/apk/debug/app-debug.apk`.
- CI: [.github/workflows/build-apk.yml](.github/workflows/build-apk.yml) runs on push to `main` (and manual dispatch) and publishes a prerelease `build-<run_number>` with the APK attached.
- Browser test without Android: `cd server && npm install && npm start` (WebSocket on port 8787, override with `PORT`). Open `app/src/main/assets/www/index.html` in two Chrome tabs and join `localhost:8787`. The first tab to connect becomes the host. Serve the `www` folder over http (for example `python3 -m http.server 8080` inside it) if `file://` gives trouble.
- URL flags for testing (also usable in the Android WebView via `localStorage`):
  - `?debug` or `localStorage hal_debug = true`: fps / draw call / triangle meter, plus test hooks on `HAL.dbg` (`act('pray')`, `me()`, `frameCam`, `makeFish`, ...).
  - `?low` (turn off with `?low=0`) or `localStorage hal_low = true`: low-quality mode. It also switches on by itself if fps stays under 40 for the first 4 seconds in the lake, and is remembered.
  - `?hoathan` or `?hoathan=sen|hac|rong`: every thanked fish transforms (lotus, crane, dragon) when sent off.
- There are no tests and no linter. Check JS syntax with `node --check <file>`.

## Architecture

The game is a web app in `app/src/main/assets/www/` running inside a WebView ([MainActivity.java](app/src/main/java/vn/hoanlac/app/MainActivity.java) loads `file:///android_asset/www/index.html`):

- `index.html`: lobby and in-lake HUD. Script order: `three.min.js` → `art.js` → `art3d.js` → `game.js` → `screens.js`.
- `art3d.js` (`window.A3`): shared 3D toolkit for the "Chibi mịn" style. `Parts` merges many pieces with baked vertex colors into one geometry (one draw call, optional per-piece bone index), plus rounded shapes (`lathe`, `capsule`, `limb`, `folds`, `rockGeo`), fake-AO shading (`shadeY`, `shade`), PMREM environment (`makeEnv`), fish body bending (`bendFish`), `disposeTree`, the low-quality flag (`Quality`) and the debug meter.
- `game.js`: Three.js scene, characters, fish, poses/animation, networking, `localStorage`. Exposes `window.HAL` for `screens.js`.
- `screens.js`: menu screens (Tích phước, Trang phục, Bộ sưu tập cá) and mini activities (thắp hương, gõ mõ, thiền). Uses `HAL.makePreview` for the outfit preview.
- `art.js`: 2D SVG art for fish and hairstyles used by the UI. It is a rough demo and will be replaced.
- `three.min.js`: **Three.js r128, bundled**. The app runs offline: no CDN, no npm packages at runtime.

The Java side only handles networking that a WebView can't do:

- [Bridge.java](app/src/main/java/vn/hoanlac/app/Bridge.java) is exposed as `window.Android` (`localIp`, `port`, `startHost`, `stopHost`, `startDiscovery`, `stopDiscovery`). Java calls back into JS through `evaluateJavascript`, for example `window.onLakeFound(json)`. `game.js` treats `window.Android` as optional (`var A = window.Android || null`) so it also runs in a plain browser. Keep that fallback working.
- Hosting: `startHost` starts [LakeServer.java](app/src/main/java/vn/hoanlac/app/LakeServer.java) (Java-WebSocket, port 8787) plus [Beacon.java](app/src/main/java/vn/hoanlac/app/Beacon.java), which sends a UDP broadcast on port 41234 every second. The host's own WebView then connects to its local server like any other client.
- Joining: [Discovery.java](app/src/main/java/vn/hoanlac/app/Discovery.java) listens for beacons and lists nearby lakes. Players can also enter the host's IP by hand.

### Relay server and host authority

The server is a dumb relay. It stamps `from` on each message, sends to `to` if that field is set, and otherwise broadcasts to everyone else (including the sender when `all: true`). All game logic lives in `game.js` on the clients. The **host client** is the authority for shared state, such as trash spawning and resolving `pick` requests (`hostInitTrash`, `hostPick`). Each client simulates its own avatar and sends `st` updates 10 times per second.

Who counts as host depends on the server:
- `LakeServer.java`: the first **loopback** connection (the device running the server).
- `server/server.js`: the first connection.

**`server/server.js` must stay behavior-identical to `LakeServer.java`.** Any protocol change must go into both. The message table (`welcome`, `join`/`leave`, `hello`, `st`, `act`, `tuyhy`, `trash`/`tnew`/`gone`, `pick`) is documented in [README.md](README.md#giao-thức-json-qua-websocket); update it when the protocol changes.

### Characters, poses, fish

- Colors: the renderer outputs sRGB, so every hex color goes through `lin()` (`M()` and `VC()` materials do this). Plain hex numbers passed straight to three.js look washed out.
- `LatheGeometry` faces point outward only when the profile goes **bottom to top**; a top-to-bottom profile renders inside-out (see-through skirts and sleeves). Check new lathe profiles.
- `chibi(look)` builds a character as a joint hierarchy (`hips`, `spine`, `chestG`, `head`, legs `L`/`R` with `hip`/`knee`/`ank`/`ft`, arms `AL`/`AR` with `sh`/`el`/`hand` and a jointed hand `H`). Poses are plain objects of joint angles (`base()`, `P_kneel`, `prayArms`, ...) blended with `seg`/`mix` and applied by `setPose`. Sitting cross-legged uses `legIK`. The mõ hall, zen scene and outfit preview all reuse `chibi()` and these joints.
- Since Phase A each character is one rigidly skinned `SkinnedMesh` (body) plus one glossy one (hair, eyes, beads): every joint group is a bone and every piece is welded to one bone (`Rig` in `game.js`). Pieces are hidden by scaling their bone to ~0 (skirt vs. lap when sitting, eyes vs. closed lids), not with `visible`. Bones must stay unscaled until `rig.build()` has computed the bind pose. Hand-held items (fan, lantern, lotus) and the mõ mallet are separate meshes attached to hand bones.
- `PRAY` holds the palms-together pose (forearms raised, palms pressed, fingertips up). It was found by numeric search on hand position and orientation; re-tune it the same way if body proportions change.
- Actions: local names `release`, `pick`, `pray`, `bow`, `niem` (`ACT_LEN`). Over the network fish release is sent as `act` with `n: 'throw'`.
- Fish release flow is a state machine in `updateFish` (`held → drop → away → swim → return → circle → leave/fade`). The "fish comes back to thank you" case circles the release spot until the player says A Di Đà Phật (`releaseCircling`).
- Fish: each species has a shape entry in `FISH_SHAPE`. Fish materials are transparent with `renderOrder` after the water, so they are drawn on top of the water surface and only tinted by depth (`fishTint`); drawing them under the semi-transparent water made them look washed out.
- Fish transformation (cá hóa thân): when the owner sends off a thanking fish, it sometimes turns into a lotus, a crane or a dragon flying up to the sky (higher chance on rằm / mùng 1, estimated from moon age) and `stats[fish].tf` goes up. It is shown only on the owner's device because no network message may change.

- Movement: players walk freely on the land ring between the shore and the outer trees (`R_MIN`..`R_MAX`, position `px`/`pz`), steered with the on-screen joystick (`#joy`) or arrow keys / WASD, relative to the camera direction. Big rocks, stone lanterns and shrubs block the way (`COLLIDE`, `keepOnLand`). The island is not reachable. Pressing "Thả cá" far from the water first auto-walks the player to the shore (`S.approach`), then the release walks from the current spot to the water edge and back (`relFrom` → `relTo`).
- Lake camera: third-person behind the character (`CAM.yaw`), easing back behind the character while walking. Drag the screen to orbit 360° and tilt, mouse wheel or two-finger pinch to zoom, double-tap to snap back behind (`ORB.el`, `ORB.zoom`). A short tap still picks up trash. The mõ hall and zen scene keep their fixed cameras.
- `st` carries optional `x`, `z`, `ry` (position and facing) besides the original `a`, `v`, `d`. Players on older builds ignore them and see free-walking friends on the path at angle `a`; friends on older builds (no `x`) are still drawn on the path.

### Persistence

Per-device state (merit points, trash bag, name, look, owned items, daily fish-release turns, progress) is kept in `localStorage` under the `hal_` prefix (see the `store` helper at the top of `game.js`). Nothing is stored on the server.

## Rules agreed with the owner

- **Network/data compatibility:** never change the `look` format (`{robe, hair, hat, beads, hand}`) or the meaning of existing message fields. Friends on an older build share the same lake. New optional fields are allowed only when older builds still behave sensibly without them (as `x`, `z`, `ry` in `st`), and must be listed in the README table.
- **Customization coverage:** every option in `ROBES`, `HAIRS`, `ACCS` and all 9 `FISH` must keep working, including in `makePreview`, the mõ hall and the zen scene.
- **Test-build flags stay:** `UNLOCK_ALL_FISH`, `HOST_UNLIMITED_TURNS` (the lake host releases fish without the daily 5-turn limit; the turn dots show ∞), `INFINITE_PHUOC` (merit shows ∞ and spending never deducts; earned merit still counts toward progress) and `UNLOCK_ALL_ITEMS` (every robe, hairstyle and accessory owned). The last two only change in-memory state, never the saved `hal_phuoc` / `hal_owned` and similar test shortcuts are intentional. Don't remove them; keep them easy to find.
- **Performance target: mid-range Android at 60 fps.** pixelRatio ≤ 2, merge static geometry, total draw calls under ~80, one shadow-casting light with a 1024 shadow map, a low-quality flag for weak phones (no shadows, pixelRatio 1.5). No extra libraries beyond the bundled Three.js r128.
- **Review:** the owner reviews visuals by eye. When changing visuals, say how to view the change and provide 390×844 portrait screenshots.
- **Git:** commit only when asked, in logical chunks. Ask before any push (pushing `main` triggers a public prerelease build). Don't commit to `main` directly.
- Edit only `app/src/main/assets/www/` for 3D work; don't touch Java unless asked.

## Visual roadmap

- **Phase A (code-built "Chibi mịn", done on branch `feature/glb-model`):** restyle lake, characters and fish in code following [design/chibi-reference.html](design/chibi-reference.html): big head (~45% of height), pastel colors, smooth rounded surfaces, eyes with highlights, blush, smile, blinking and breathing when idle, pleated robe with wide sleeves, hemisphere + warm sun with soft shadows, water with ripples, foam edge and visible lake bed, pebbles, mossy rocks, bodhi tree, stone lanterns, lotus. Improve on the reference in two places: fish under water must not look washed out, and the prayer pose must have forearms raised with palms pressed together.
- **Phase B (not started):** replace characters and fish with `.glb` models with skeletons and animations, made by Claude driving Blender through Blender MCP on the owner's machine (optionally with AI 3D generation).
  - Load with a local non-module r128 `GLTFLoader` plus `AnimationMixer`; fall back to the code-built character if a model is missing.
  - Animation names: `idle`, `walk`, `throw`, `pick`, `pray`, `bow`, `niem`; fish use `swim`.
  - Attachment points: right hand, neck, head. Robe material kept separate so it can be recolored.
  - About 300 KB or less per character model, stored in `assets/www/models/`.
  - When starting Phase B, ask whether the owner uses Windows or Mac, then walk them through installing Blender MCP (check the latest install instructions first).

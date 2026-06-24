# Volt Desktop Pet

Volt is a small, transparent, always-on-top Electron desktop companion. It wanders around the active display, reacts to attention, can be dragged and tossed, and keeps lightweight happiness, energy, and hunger stats.

## Run it

```powershell
npm install
npm start
```

## Controls

- Drag Volt to pick it up; release while moving to toss it.
- Double-click to pet it.
- Right-click Volt (or the tray icon) for food, sleep, pause, and quit controls.
- Hover over Volt to see its current stats.

## Notes

- The app uses a context-isolated preload bridge; Node.js is not exposed to the renderer.
- Artwork is an original mascot generated for this project and is not a Pokémon asset.
- On Linux, transparent always-on-top windows depend on the compositor. Windows and macOS provide the smoothest experience.

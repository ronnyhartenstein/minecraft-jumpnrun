# Minecraft Jump 'n' Run

Ein 2.5D-Sidescroller im Minecraft-Stil für den Browser, gebaut mit [Three.js](https://threejs.org/).

**Spielen:** https://blog.rh-flow.de/minecraft-jumpnrun/

## Steuerung

| Taste | Aktion |
| --- | --- |
| A / D oder ← / → | Laufen |
| Leertaste, W oder ↑ | Springen (länger halten = höher) |
| R | Level neu starten |
| Esc | Levelauswahl |
| Enter | Nach dem Ziel: nächstes Level |
| M | Ton an/aus |

## Level

| # | Level | Neu in diesem Level |
| --- | --- | --- |
| 1 | Die Wiese | Laufen, Springen, Lücken |
| 2 | Die Wüste | Lava |
| 3 | Die Höhle | Decken, Lavaseen mit Trittsteinen, Fackeln |
| 4 | Die Schneeberge | Rutschiges Eis, viel Klettern |
| 5 | Der Nether | Seelensand, Lavameer, Nether-Festung |

In jedem Level liegen 10 Diamanten 💎: manche auf dem Weg, manche für Mutige über Lava und Abgründen, und einer ist gut versteckt.

Das nächste Level wird freigeschaltet, sobald das vorherige geschafft ist. Bestzeiten und gefundene Diamanten merkt sich der Browser.
Direkt zu einem Level springen: `#level=3` an die Adresse anhängen.

Die Level sind Text-Raster in `src/levels/`. Welches Zeichen welcher Block ist, steht in `src/levels/format.ts`.

## Entwickeln

Node.js läuft im Docker-Container, auf dem Rechner muss nur Docker installiert sein.

```sh
docker compose up
```

Danach läuft das Spiel unter http://localhost:5173/minecraft-jumpnrun/. Änderungen am Code werden sofort neu geladen.

Build prüfen (TypeScript-Check und Produktions-Build):

```sh
docker compose run --rm dev npm run build
```

Jeder Push auf `main` wird automatisch auf GitHub Pages veröffentlicht.

## Aufbau

```
src/
  engine/    Game-Loop, Tastatur
  game/      Szene, Welt, Steve, Spieler-Physik, Kamera, Partikel
  ui/        Menü, Hinweise, Ziel-Anzeige
  levels/    Level als Text-Raster und Biome
  textures/  Pixel-Texturen, im Code erzeugt
```

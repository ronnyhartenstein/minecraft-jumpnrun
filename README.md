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

Fünf Welten mit je drei Leveln. Jede Welt bringt etwas Neues, x-3 ist jeweils das schwerste Level.

| Welt | Neu in dieser Welt | Level |
| --- | --- | --- |
| 1 Wiese | Laufen, Springen, Lücken, Slimes, Creeper | 1-1 Die Wiese · 1-2 Der Wald · 1-3 Das Dorf |
| 2 Wüste | Lava | 2-1 Die Wüste · 2-2 Der Canyon · 2-3 Der Wüstentempel |
| 3 Höhle | Decken, Lavaseen mit Trittsteinen, Fackeln | 3-1 Die Höhle · 3-2 Die Mine · 3-3 Die Diamantenhöhle |
| 4 Schneeberge | Rutschiges Eis, viel Klettern | 4-1 Die Schneeberge · 4-2 Der Eissee · 4-3 Der Gipfel |
| 5 Nether | Seelensand, Lavameer, Magmawürfel | 5-1 Der Nether · 5-2 Das Lavameer · 5-3 Die Netherfestung |

Creeper und Slimes (im Nether Magmawürfel) laufen oder hüpfen herum. Von oben draufspringen besiegt sie. Slimes seitlich berühren heißt zurück zum Checkpoint. Durch Creeper kommt man nicht hindurch. Kommt man ihnen zu nah, blinken sie weiß und explodieren nach 1,5 Sekunden – schnell drüberspringen und weg, oder gleich draufspringen!

In jedem Level liegen 10 Diamanten 💎: manche auf dem Weg, manche für Mutige über Lava und Abgründen.

Das nächste Level wird freigeschaltet, sobald das vorherige geschafft ist. Bestzeiten und gefundene Diamanten merkt sich der Browser.
Direkt zu einem Level springen: `#level=2-3` an die Adresse anhängen.
Alle Level automatisch prüfen (Regeln und ein Bot, der jedes Level durchspielt): `?pruefen` an die Adresse anhängen.

**Eigene Level bauen:** Die Level sind einfache Textdateien im Ordner `levels/`. Eigene Level kommen nach `levels/eigene/` und erscheinen automatisch im Menü in der Spalte „Eigene“. Die Anleitung mit allen Zeichen steht in [LEVELS.md](LEVELS.md).

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
  levels/    Level-Format, Biome, Laden der Level-Dateien
  textures/  Pixel-Texturen, im Code erzeugt
levels/      Die Level als Textdateien, eigene Level in levels/eigene/
```

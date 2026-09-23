# Baue dein eigenes Level! 🧱

Jedes Level in diesem Spiel ist eine ganz normale **Textdatei**. Jedes Zeichen darin ist ein Block.
Du brauchst keine Programmierkenntnisse, nur einen Texteditor (zum Beispiel VS Code).

Ein kleines Level sieht so aus:

```
Name: Mein erstes Level
Biom: Wiese

...............*.........
...S.....t..........###.Z
GGGGGGGGGGGGGG..GGGGGGGGG
DDDDDDDDDDDDDD..DDDDDDDDD
```

- `S` ist der **Start**, hier steht Steve am Anfang.
- `Z` ist die **Ziel-Fahne**, dort ist das Level geschafft.
- `G` ist der Boden oben (Gras), `D` der Boden darunter (Erde).
- `.` ist Luft. Wo unten kein Boden ist, ist ein Abgrund.
- `*` ist ein Diamant, `#` ein Stein, `t` ein Baum im Hintergrund.

**Oben in der Datei ist oben im Spiel.** Jede Zeile ist eine Reihe Blöcke.

## So legst du los

1. Öffne den Ordner `levels/eigene/`. Dort liegt schon `mein-erstes-level.txt`.
2. **Kopiere** die Datei und gib ihr einen neuen Namen, zum Beispiel `drachenburg.txt`.
3. Ändere oben die Zeile `Name:`, zum Beispiel `Name: Die Drachenburg`.
4. Starte das Spiel mit `docker compose up` und öffne http://localhost:5173/minecraft-jumpnrun/
5. In der Levelauswahl siehst du ganz rechts die Spalte **Eigene**. Da ist dein Level!
6. Ändere etwas in der Datei und **speichere**. Das Spiel lädt sofort neu und du kannst es ausprobieren.

## Der Kopf der Datei

Ganz oben stehen ein paar Zeilen, dann kommt eine Leerzeile und danach das Level.

| Zeile | Bedeutung |
| --- | --- |
| `Name: Die Drachenburg` | So heißt dein Level im Spiel. |
| `Biom: Wiese` | Die Welt, in der dein Level spielt: `Wiese`, `Wüste`, `Höhle`, `Schnee` oder `Nether`. |
| `Info: …` | Eine Notiz für dich. Das Spiel liest sie nicht. |

Das Biom bestimmt, wie der Himmel aussieht, ob es schneit, welche Musik läuft und was `G`, `D` und `t` sind.
In der Wüste wird `G` zu Sand, im Schnee zu verschneitem Gras, im Nether zu Netherrack.

## Alle Zeichen

### Boden und Blöcke

| Zeichen | Block |
| --- | --- |
| `.` | Luft |
| `G` | Boden oben (je nach Biom: Gras, Sand, Schnee, Stein, Netherrack) |
| `D` | Boden darunter (je nach Biom: Erde, Sandstein, Stein, Netherrack) |
| `#` | Stein |
| `C` | Bruchstein |
| `P` | Holzbretter, gut für schwebende Plattformen |
| `H` | Holzstamm |
| `L` | Laub |
| `A` | Sand |
| `Y` | Sandstein |
| `K` | Kaktus |
| `M` | Schnee |
| `E` | Eis – **rutschig!** |
| `1` `2` `3` `4` | Kohle-, Eisen-, Gold- und Diamant-Erz |
| `R` | Netherrack |
| `N` | Nether-Ziegel |
| `O` | Glowstone (leuchtet) |
| `W` | Seelensand – Steve wird **langsam** |
| `~` | Lava – **heiß!** Wer sie berührt, fängt neu an |

### Besondere Dinge

| Zeichen | Was ist das? |
| --- | --- |
| `S` | Start von Steve (nur einmal!) |
| `Z` | Ziel-Fahne |
| `X` | Checkpoint: Nach einem Sturz geht es hier weiter |
| `*` | Diamant zum Einsammeln |
| `c` | Creeper: Kommt man ihm zu nah, blinkt er und explodiert |
| `s` | Slime (im Nether ein Magmawürfel): hüpft herum |
| `5` `6` | Creeper bzw. Slime, die erst ab **Mittel** auftauchen |
| `7` `8` | Creeper bzw. Slime, die nur auf **Schwer** auftauchen |
| `t` | Baum oder Deko im Hintergrund (je nach Biom: Baum, Kaktus, Fichte, Tropfstein …) |
| `f` | Fackel (leuchtet, gut für die Höhle) |

Gegner besiegt man, indem man **von oben** draufspringt.

### Schwierigkeitsgrade

Jedes Level gibt es auf **Leicht**, **Mittel** und **Schwer**. Das Raster bleibt gleich, aber:

- Mit `5` `6` `7` `8` kannst du Gegner setzen, die erst auf Mittel oder nur auf Schwer dabei sind.
- Auf Mittel und Schwer zünden Creeper schneller, Slimes hüpfen öfter und weiter, und die Lava ist weniger gnädig.
- Auf Schwer gibt es **keine Checkpoints**.

Auf **Leicht** muss dein Level schaffbar sein – das prüft auch der Prüf-Roboter.

## Tipps für ein gutes Level

Steve kann **2 Blöcke hoch** springen und über **3 Blöcke breite** Lücken.
Alles, was höher oder weiter ist, schafft er nicht!

- **Hohe Stufen:** Mehr als 2 Blöcke auf einmal nach oben geht nicht. Baue lieber eine Treppe.
- **Anlauf lassen:** Nach einem hohen Hindernis mindestens 5 Blöcke Boden bis zur nächsten Lücke. Sonst fliegt man beim Runterspringen direkt hinein.
- **Breite Trittsteine:** Steine in einem Lavasee sollten 2–3 Blöcke breit sein. Einzelne Blöcke sind sehr schwer zu treffen.
- **Platz nach oben:** In Höhlen braucht man vor einem Sprung eine hohe Decke, sonst stößt Steve sich den Kopf und fällt zu kurz.
- **Gegner nicht direkt hinter Sprüngen:** Sonst landet man genau neben ihnen und hat keine Chance.
- **Unter Plattformen:** Steve ist knapp 2 Blöcke groß. Unter einer Plattform müssen 2 Blöcke Luft sein, sonst kommt er nicht durch.
- **Checkpoints:** Ist dein Level lang oder schwer, setze ein oder zwei `X` hinein.
- **Selbst testen:** Spiel dein Level mehrmals. Schaffst du es? Dann schafft es auch jemand anders!

## Der Prüf-Roboter 🤖

Öffne das Spiel mit `?pruefen` am Ende der Adresse:

http://localhost:5173/minecraft-jumpnrun/?pruefen

Dann passiert zweierlei:

1. Das Spiel prüft die **Regeln** von oben (Anlauf, Lückenbreite, Stufenhöhe, Platz nach oben, Gegner hinter Sprüngen) und zeigt, an welcher Stelle (`x=…`, gezählt von links) etwas nicht passt.
2. Ein **Roboter** spielt jedes Level durch. Er läuft immer nach rechts und springt, wenn etwas im Weg ist.
   Schafft er dein Level, ist es auf jeden Fall schaffbar. Stirbt er, steht dabei, an welcher Stelle.

Grün heißt: alles in Ordnung. Gelb heißt: schau dir die Stelle nochmal an.

## Wenn etwas nicht stimmt

Hast du ein Zeichen benutzt, das es nicht gibt, oder den Start vergessen, zeigt das Spiel oben einen **gelben Kasten** an.
Dort steht, in welcher Zeile und Spalte der Fehler ist.

## Die großen Level

Die Welten des Spiels liegen im Ordner `levels/`, drei Level pro Welt: von `1-1-wiese.txt` bis `5-3-netherfestung.txt`.
Die Zahlen am Anfang des Dateinamens sind **Welt und Level**: `2-3-wuestentempel.txt` ist das dritte Level in Welt 2.
Du kannst sie dir anschauen und lernen, wie sie gebaut sind.
Eine neue Datei `6-1-irgendwas.txt` würde automatisch als Welt 6 im Menü erscheinen.

## Dein Level für alle

Wenn dein Level fertig ist, kann es mit auf die Webseite.
Bitte deinen Papa, es hochzuladen (`git add`, `git commit`, `git push`). Ein paar Minuten später ist es online.

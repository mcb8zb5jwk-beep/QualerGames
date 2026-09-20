# QuälerGames – lokales Projekt

## Starten
- **Am PC:** `index.html` per Doppelklick im Browser öffnen. Es wird kein Server gebraucht.
- **Am Handy testen:** im Projektordner `python -m http.server 8000` ausführen und am Handy `http://<PC-IP>:8000` öffnen (PC und Handy im selben WLAN).

## Ordner
| Pfad | Inhalt |
|---|---|
| `index.html` | Grundgerüst der Seite (bindet CSS und JS ein) |
| `css/style.css` | das komplette Design |
| `js/app.js` | Spiellogik aller Spiele, Startseite, Suche, Einstellungen und Sound |
| `images/` | Spielbilder als WebP: `imposter`, `bombe`, `buzzer`, `chooser`, `circa` (je 720 px breit) |
| `QualerGames_Einzeldatei.html` | dasselbe Spiel als eine einzige Datei (alles eingebettet), als Sicherung |

## Sounds
Es gibt keine Sounddateien. Alle Töne (Tippen, Countdown, Explosion, Zündschnur-Zischen usw.) erzeugt `js/app.js` beim Spielen selbst über die Web-Audio-API, im Abschnitt „Sound-Engine“. Eigene Aufnahmen kannst du dort im Objekt `SAMPLES` als Base64-mp3 eintragen, zum Beispiel `SAMPLES.success='...'`.

## Schriften
Die Schriften (Inter, Lilita One, Barlow) lädt die Seite von Google Fonts. Ohne Internet nimmt der Browser Ersatzschriften (Impact, Arial Black, Systemschrift). Für volle Offline-Optik lädst du die drei Schriften von fonts.google.com herunter und bindest sie in `css/style.css` per `@font-face` ein.

## Bilder austauschen
Die Datei in `images/` mit demselben Namen ersetzen (WebP, Seitenverhältnis möglichst 2:3 oder 3:4). Die Namen entsprechen den Spiel-IDs.

## Neues Spiel eintragen (in `js/app.js`)
- `GAMES`: Liste für „Jetzt spielbar“, „Demnächst“ und die Suche. `play:false` = gesperrt unter „Demnächst“.
- `SLIDES`: nur die großen Folien im Karussell oben. Platzhalter stehen dort absichtlich nicht.
- Neues Bild: `images/<id>.webp` anlegen und die ID in `IMG_FILES` am Anfang von `js/app.js` ergänzen.

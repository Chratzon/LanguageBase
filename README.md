# LanguageBase

Eine PWA zum **Auffrischen** von Fremdsprachen, für Menschen, die eine Sprache schon einmal konnten und lange nicht mehr gesprochen haben. Oberfläche und Erklärungen sind auf Deutsch.

Sprachen: Englisch, Französisch, Spanisch, Italienisch.

## Was die App kann

- **Grammatik mit dem Warum:** Jede Lektion hat Regeln mit Beispielsätzen, eine Erklärung, *warum* die Sprache so funktioniert, einen Vergleich mit dem Deutschen und einen Merksatz. Jede einzelne Übung hat ihre eigene Begründung.
- **Übungstypen:** Multiple Choice, Lücken füllen, Übersetzen, Fehler finden und korrigieren, Hördiktat, Sprechen mit Spracherkennung.
- **Korrektur wie mit dem Rotstift:** Falsche Wörter werden durchgestrichen, fehlende markiert. Tippfehler und fehlende Akzente zählen als „fast richtig“.
- **Vokabeln in der Lernkartei:** 7 Fächer mit wachsenden Abständen (0, 1, 2, 4, 8, 16, 32 Tage). Je sicherer ein Wort sitzt, desto schwerer die Abfrage: erst Auswahl, dann Schreiben, Hören, Sprechen.
- **Falsche Freunde, Alltag, Arbeit, Gefühle, Redewendungen** je Sprache.
- **Umgangssprache und Fluchen** mit Stärke-Skala (locker / derb / vulgär), Nutzungshinweisen und Situations-Quiz. Sehr derbe Ausdrücke lassen sich in den Einstellungen ausblenden.
- **Tägliche Wiederholung:** Fehler aus Lektionen und fällige Vokabeln landen gesammelt unter „Heute wiederholen“.
- **Offline nutzbar**, Fortschritt bleibt lokal im Browser. Sicherung als JSON speichern und auf einem anderen Gerät laden.

## Sprache auf dem Handy

- **Sprachausgabe** nutzt die Stimmen des Geräts. Unter Android: *Einstellungen › System › Sprache › Sprachausgabe* die Sprachpakete (Google Sprachausgabe) für EN, FR, ES, IT installieren.
- **Spracherkennung** läuft über die Web Speech API, am zuverlässigsten in **Chrome für Android**. Sie braucht meist Internet und Mikrofonfreigabe. Ohne Spracherkennung bewertet man sich bei Sprechübungen selbst.
- Beides funktioniert nur über `https://` (GitHub Pages) oder `localhost`, nicht beim Öffnen der Datei direkt.

## Veröffentlichen mit GitHub Pages

1. Repository auf GitHub → *Settings › Pages*
2. *Source: Deploy from a branch*, Branch `main`, Ordner `/ (root)`
3. Nach kurzer Zeit erreichbar unter `https://chratzon.github.io/LanguageBase/`. Immer genau diese Schreibweise nutzen, denn Chrome merkt sich die App unter der Adresse, unter der sie installiert wurde
4. Auf dem Handy in Chrome öffnen → Menü → *App installieren*

Nach Änderungen an Dateien in `sw.js` die `VERSION` hochzählen, damit installierte Apps die neue Fassung laden.

### Wenn Chrome „bereits installiert“ meldet, die App aber fehlt

Dann ist die Installation unter Android hängen geblieben. Die Einstellungen der App enthalten eine Anleitung dazu. Kurzfassung: `chrome://webapks` prüfen, in Chrome unter *Website-Einstellungen › chratzon.github.io* „Löschen und zurücksetzen“ (vorher Sicherung speichern), Seite neu laden und erneut installieren. Das Manifest hat eine feste `id`, damit Chrome die App eindeutig zuordnet.

## Aufbau

```
index.html            Einstieg
css/app.css           Gestaltung (hell und dunkel)
js/core.js            Speicher, Lernkartei, Antwortprüfung, Sprachausgabe und -erkennung
js/app.js             Oberfläche und Übungsablauf
data/en|fr|es|it.js   Kursinhalte je Sprache
sw.js                 Offline-Cache
manifest.webmanifest  PWA-Angaben
icons/                App-Symbole
```

## Inhalte erweitern

Jede Sprache ist eine Datei in `data/`. Eine neue Sprache (z. B. Polnisch) bekommt eine neue Datei `data/pl.js` nach demselben Muster, wird in `index.html` eingebunden und in `js/app.js` in `ORDER` und `SHORT` ergänzt.

**Grammatik-Lektion**

```js
{
  id: "eindeutige-id", title: "Titel", sub: "Untertitel", lvl: "B1",
  intro: "Einleitung",
  rules: [{ h: "Regel", p: "Erklärung", ex: [["Beispiel mit **Hervorhebung**", "Deutsche Übersetzung"]] }],
  why: "Warum ist das so?", de: "Vergleich zum Deutschen", tip: "Merksatz",
  ex: [ /* Übungen */ ]
}
```

**Übungen** (`w` ist immer die Erklärung, die nach der Antwort erscheint)

| Typ | Felder | Zweck |
|---|---|---|
| `mc` | `q`, `o` (Optionen), `a` (Index der richtigen) | Auswahl. `___` im Satz wird mit der Lösung gefüllt und vorgelesen. Mehrere Lücken: Option als `"Have / been"` |
| `gap` | `q`, `a` (alle akzeptierten Antworten) | Lücke füllen. Hinweis in Klammern am Ende |
| `tr` | `q` (deutsch), `a` | Übersetzen |
| `fix` | `q` (fehlerhafter Satz), `a` | Fehler finden |
| `listen` | `s` (gesprochener Satz), `de` | Hördiktat |
| `speak` | `q` (Aufgabe), `a` | Sprechen mit Erkennung |

**Vokabeln:** `{ de, t, a: [Alternativen], n: "Hinweis" }`. Decks mit `mcOnly: true` (Redewendungen) werden nie frei geschrieben abgefragt.

**Umgangssprache:** `{ t, de, lvl: 1–3, n }` plus `situations` als `mc`-Übungen.

Bewusst nicht enthalten sind Beleidigungen gegen Gruppen (rassistische, homophobe oder ähnliche Ausdrücke).

## Ideen für später

- Osteuropäische Sprachen (Polnisch, Tschechisch, Kroatisch, Ungarisch)
- Einsteigermodus von Grund auf
- Weitere Lektionen je Sprache (z. B. Passiv, indirekte Rede, Relativpronomen)
- Als App im Google Play Store über eine Trusted Web Activity (z. B. mit Bubblewrap)

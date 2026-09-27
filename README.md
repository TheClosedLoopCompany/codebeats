# codebeats

Background music written as code. Every track is a single JavaScript file that schedules notes on a small
Web Audio synth rack — no samples, no audio files, no dependencies.

Live at **https://codebeats.theclosedloop.co**. To run it locally, serve the folder with any static file server
(browsers don't load ES modules from `file://`), e.g. the one built into Python:

```sh
python3 -m http.server 8787 -d public   # → http://localhost:8787
```

Pick a track, press play (or <kbd>Space</kbd>), and move the sliders: changes apply on the next note.
Settings live in the URL hash (`#lofi?bpm=70&vinyl=0.9`), so a link reproduces what you hear.
Double-click a slider row to reset that one parameter.

Keys: <kbd>Space</kbd> play / pause, <kbd>Esc</kbd> stop, arrows change track, <kbd>[</kbd> <kbd>]</kbd> previous / next loop,
<kbd>V</kbd> switch visualizer, <kbd>C</kbd> copy share link. Drag the dot on the progress bar to jump within the loop.
Tracks vary from one time round to the next (parts join later, motifs mutate), which is why loops can be skipped too.

## Tracks

| Track | Feel |
| --- | --- |
| Angry | Drop-D metal: distorted chugging riffs, double kick, and a screaming lead with a whammy dive |
| Calm | Warm pad, soft bass and a music-box arpeggio in D major |
| Chill | Sunny downtempo in Ab: kalimba over a pumping pad, round sub bass, shaker and waves |
| Concentration | Steady, hook-free focus music: a slowly shifting ostinato, soft chords, optional noise bed |
| Creative | Generative lydian motifs that mutate every loop — playful, curious, never the same twice |
| Energetic | Four-on-the-floor dance loop in A minor with a build-up every 8 bars |
| Epic | Cinematic build in D minor: driving strings, taiko drums, brass swells and a heroic theme |
| Futuristic | Synthwave in D minor: octave bass and an echoing arpeggio under a sweeping filter |
| Groovy | Funk in E: wah clav on the 16ths, slap bass, horn stabs and a tight pocket |
| Happy | Bouncy C major pop: marimba tune, offbeat ukulele chords, glockenspiel |
| Island | Sunny reggae in G: steel drums, offbeat guitar skank, a one-drop beat and optional dub echoes |
| Lo-fi | Swung boom-bap, a wobbly Rhodes on a descending jazz loop, vinyl crackle |
| Meditation | Drumless and drenched in reverb: lydian chords, backwards swells, shimmering chimes, soft flute |
| Melancholic | Fingerpicked guitar in B minor, brushed drums, a whistled tune — a rainy evening looking back |
| Sad | A lone breathy flute sighing over a dark D minor pad and a low drone. No beat |
| Sleepy | Lullaby in 3/4: music box, soft arpeggios, a slow heartbeat — and a timer to drift off |
| Spooky | An out-of-tune music box, a sliding theremin, eerie high chords and creaking floorboards |
| Tense | Thriller suspense: a pulsing low note, a ticking clock, rising string clusters, sudden hits |
| Triumphant | Marching band in Bb: brass fanfare, oom-pah tuba, snare rolls, glockenspiel and cymbals |
| Troll | Sneaky tiptoeing pizzicato and a kazoo in E minor — with wrong notes, boings and honks |

## Layout

The site is everything in `public/`:

- `public/engine.js` — the synth rack (pad, pluck, bell, piano, Rhodes, guitar, flute, brass, wah, bowed/kazoo lead, glides,
  distorted power chords, bass, drums, noise beds, sidechain ducking, reverb, echo, tape wobble), the global Mix
  parameters, and the look-ahead scheduler.
- `public/tracks/<name>.js` — one file per track. It exports `name`, `description`, `color`, `steps` (loop length in
  16ths), `defaults` (overrides for the Mix params, e.g. tempo) and `params` (its own sliders), optionally `loops`
  (`{ intro, period }`: how its loops repeat) and `bar` (16ths per bar, if not 16), plus
  `play(v, step, time, loop, p)`, which is called for every 16th note and schedules whatever sounds then.
- `public/viz.js` — the player's visualizers (piano roll, step grid, chords, spectrum, waveform), fed by every note the engine plays.
- `public/index.html` — the player UI; builds sliders from each track's `params`.

To add a track, drop a file in `public/tracks/` and add its name to `NAMES` in `public/index.html`.

## License

- **The music** — the tracks in [`public/tracks/`](public/tracks/) — is licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([full text](public/tracks/LICENSE)). Use it anywhere,
  including recordings in videos, streams, games and remixes, commercially too, as long as you give credit, e.g.:

  > Music: "Lo-fi" from codebeats by The Closed Loop Company (https://codebeats.theclosedloop.co), CC BY 4.0

- **Everything else** (the synth engine, player and visualizers) is [MIT](LICENSE).

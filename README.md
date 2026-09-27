# codebeats

Background music written as code. Every track is a single JavaScript file that schedules notes on a small
Web Audio synth rack — no samples, no audio files, no dependencies.

```sh
npm start        # or: node server.js  →  http://localhost:8787
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

Calm, Energetic, Happy and Futuristic come from the background music in `connect-4-ai`.

## Layout

- `engine.js` — the synth rack (pad, pluck, bell, piano, Rhodes, guitar, flute, bowed/kazoo lead, glides, sidechain ducking, distorted power chords, bass, drums, noise beds, reverb, echo,
  tape wobble), the global Mix parameters, and the look-ahead scheduler.
- `tracks/<name>.js` — one file per track. It exports `name`, `description`, `color`, `steps` (loop length in
  16ths), `defaults` (overrides for the Mix params, e.g. tempo) and `params` (its own sliders), plus
  `play(v, step, time, loop, p)`, which is called for every 16th note and schedules whatever sounds then.
- `viz.js` — the player's visualizers (piano roll, step grid, chords, spectrum, waveform), fed by every note the engine plays.
- `index.html` — the player UI; builds sliders from each track's `params`.
- `server.js` — a zero-dependency static server (ES modules don't load from `file://`).

To add a track, drop a file in `tracks/` and add its name to `NAMES` in `index.html`.

The faces the site serves (`src/shared/ui/fonts.ts`), each under the SIL Open
Font License 1.1, cut to the Latin range a French/English page renders.
`tests/fonts.test.ts` holds the copy to that range, so a character the cut
leaves out fails the tests rather than rendering in a fallback face.

- `Fraunces-Bold.woff2` — headings. Fraunces, © The Fraunces Project Authors
  ([Fraunces-OFL.txt](Fraunces-OFL.txt)). From the variable master in
  google/fonts `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf` (v1.000),
  instanced at `wght=700 SOFT=0 WONK=1` with the optical-size axis kept
  (`opsz` 9–144), so each heading size takes the cut drawn for it.
- `InstrumentSans-Variable.woff2` — text. Instrument Sans, © The Instrument
  Sans Project Authors ([InstrumentSans-OFL.txt](InstrumentSans-OFL.txt)).
  From google/fonts `ofl/instrumentsans/InstrumentSans[wdth,wght].ttf`
  (v1.000), instanced at `wdth=100` with weight kept over 400–700 — the four
  weights the text uses, in one file.
- `Inter-Regular.ttf` — what the OG card (`app/og/route.tsx`) draws with;
  Satori reads TrueType, not WOFF2. From the `@evinvest/sites-tools` template
  ([Inter-OFL.txt](Inter-OFL.txt)).

To rebuild the web files (fonttools with brotli, `pip install fonttools brotli`):

```sh
LATIN="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2197,U+2212,U+2215,U+2605,U+260E,U+2630,U+2713,U+FEFF,U+FFFD"
fonttools varLib.instancer 'Fraunces[SOFT,WONK,opsz,wght].ttf' wght=700 SOFT=0 WONK=1 opsz=9:144 -o Fraunces-Bold.ttf
fonttools varLib.instancer 'InstrumentSans[wdth,wght].ttf' wdth=100 wght=400:700 -o InstrumentSans-Variable.ttf
for f in Fraunces-Bold InstrumentSans-Variable; do
  pyftsubset "$f.ttf" --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file="$f.woff2"
done
```

The range is aquafix's `scripts/subset-fonts.sh` `LATIN` list plus `U+2197`
(↗, the reviews band's "Read all … ↗"); all layout features are kept, so
kerning and `tnum` survive. Only Instrument Sans draws ↗ — Fraunces has no
such glyph, and no heading uses it.

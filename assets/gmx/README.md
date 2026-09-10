# Bundled GMX compiler

The Windows x64 compiler runtime is stored in `windows-x64`.

- `gmx.exe` was built from the sibling `gmx-rs` repository at commit `4b3e52f`.
- Runtime dependencies came from `gmx-rs/dependencies`.
- Audio codecs are embedded in `gmx.exe`; no external `ffmpeg.exe` is required.
- Debug symbols, Rust libraries, and other build-only files are intentionally excluded.

Development builds read `assets/gmx/windows-x64/gmx.exe` directly. Packaged Windows builds copy the directory to `resources/gmx`; `src/main/compiler.ts` resolves and validates both layouts. Set `OPENGMS_GMX_PATH` to override the executable during compiler development. All companion files must remain next to the overridden executable.

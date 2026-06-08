# STVES TSX to JSX Conversion Report

Converted project source from TypeScript/TSX to JavaScript/JSX.

## What changed
- All `.tsx` React components/pages were converted to `.jsx`.
- All source `.ts` files were converted to `.js`.
- `src/main.tsx` was converted to `src/main.jsx`.
- `index.html` now points to `/src/main.jsx`.
- `vite.config.ts` was converted to `vite.config.js`.
- Removed TypeScript-only dev dependencies from `package.json`.
- Removed `tsconfig.json` because the project no longer uses TypeScript source files.

## Verification
- `npm install` completed successfully.
- `npm run build` completed successfully.

## File counts after conversion
- `.tsx` files: 0
- `.ts` files: 0
- `.jsx` files in `src`: 37
- `.js` source files in `src`: 6

## Run project
```bash
npm install
npm run dev
```

## Build project
```bash
npm run build
```

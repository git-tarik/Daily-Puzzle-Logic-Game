# Daily Puzzle Logic Game

## Live Deployment
https://daily-puzzle-logic-game.vercel.app/

## Working Principle
This application provides a daily logic-training workflow where users solve one generated puzzle per day and track progress over time.
Puzzle type and base difficulty are selected from the calendar date, then generated deterministically using a seeded PRNG so the same date maps to the same puzzle seed.
A seven-day puzzle window is preloaded and persisted locally, and difficulty is adaptively adjusted using prior solve statistics (`puzzlesSolved`, `avgSolveTime`).
Application state is managed with React + Redux Toolkit slices (`auth`, `user`, `puzzle`) together with component-level state for inputs, timer, and UI toggles.
User actions (input changes, hint requests, submissions) dispatch async thunks that validate attempts by puzzle type, persist progress in IndexedDB, and update validation feedback.
When a puzzle is solved, the app applies scoring (base points, time bonus, hint penalty, streak multiplier, optional timed bonus), updates streak/achievements/heatmap activity, and queues server sync when an authenticated user exists.

## Features Implemented
- Daily puzzle generation and loading with date-based puzzle rotation (`matrix`, `pattern`, `sequence`, `deduction`, `binary`).
- Deterministic puzzle generation with SHA-256 seeded randomness and solution-hash validation.
- Interactive puzzle UIs for all five puzzle types with input handling and submission validation.
- Real-time progress persistence (`gameState`) to local IndexedDB and restoration on reload.
- Hint system with enforced daily limit (`3` hints per puzzle).
- Score computation including difficulty, solve time, hints used, streak bonus, and timed-mode bonus.
- Streak tracking, total score accumulation, average solve time, and achievement unlocking.
- Heatmap-style daily activity tracking with milestone achievement storage.
- Shareable challenge links containing date and current puzzle state payload.
- Leaderboard fetch and display for current day top scores.
- Offline-aware caching and background sync queue for score submissions.
- Daily auto-reset hook that loads the next day puzzle at midnight.
- Authentication flows for guest mode, Google sign-in, Truecaller integration, and credentials endpoints.
- Service worker registration with app shell/runtime caching and leaderboard cache strategy.
- Vercel SPA rewrite/header configuration for frontend deployment.

## Technologies Used
- React 19
- Redux Toolkit + React Redux
- Vite 7
- JavaScript (ES Modules)
- Tailwind CSS 4
- styled-components
- Bootstrap Icons (CDN)
- Day.js
- Dexie (IndexedDB wrapper)
- idb
- LZ-String (data compression)
- CryptoJS + seedrandom
- Express 5
- Prisma ORM
- PostgreSQL (Prisma datasource)
- Zod (API validation)
- Google Auth Library
- bcryptjs
- Jest + Testing Library
- Vercel configuration (`vercel.json`)

## What Has Been Completed
The repository contains a fully functional frontend gameplay flow with daily puzzle generation, attempt validation, scoring, and user progress persistence. Core game mechanics are implemented across five puzzle types, supported by local stats, achievements, and activity visualization. API-ready backend modules for authentication, score submission, leaderboard retrieval, and activity sync are implemented with Prisma-backed data models. The project includes production-oriented deployment configuration for Vercel and is in a demo-ready state for capstone presentation.

## Challenges Faced
- Designing five different puzzle types while keeping generation deterministic by date and ensuring validators stayed aligned with generator output.
- Balancing local-first gameplay (offline persistence, caching, sync queues) with reliable server synchronization when connectivity returns.
- Handling consistency across multiple storage layers (Dexie IndexedDB, idb activity store, and Prisma-backed backend records).
- Implementing secure and practical score submission flow with validation, verification, and rate limiting.
- Managing multi-provider authentication paths (guest, Google, Truecaller, credentials) without breaking the core puzzle flow.
- Maintaining responsive, user-friendly puzzle interaction patterns across varied input styles (numeric grids, pattern symbols, logic mapping, truth tables).

## Future Scope
- Add a complete authenticated session layer (token/cookie lifecycle, refresh handling, route protection).
- Extend backend integration to support full profile synchronization across devices.
- Introduce persistent global leaderboards with seasonal and puzzle-type filters.
- Add multiplayer challenge mode with invitation and head-to-head score comparison.
- Implement selectable difficulty tiers and user-controlled puzzle mode preferences.
- Build a richer puzzle generation pipeline with expanded rule families and constraint tuning.

## Improvements Needed
- Refactor puzzle UI components to reduce duplicated state-handling patterns.
- Improve modular separation between UI, puzzle orchestration, and persistence/sync logic.
- Add deeper performance optimization for sync polling, rendering frequency, and cache invalidation.
- Strengthen mobile responsiveness for dense puzzle layouts and stats views.
- Expand automated test coverage for UI interaction flows and async error paths.
- Improve accessibility (semantic labels, keyboard flow, focus states, and screen-reader feedback).

## Suggestions
- Implement comprehensive unit/integration tests for puzzle reducers, thunks, and API contracts.
- Add product analytics to measure completion rates, hint usage, and retention trends.
- Introduce AI-assisted puzzle generation as an optional controlled content source.
- Add accessibility auditing in CI (lint + automated checks) before deployment.

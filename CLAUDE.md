# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A beginner "vibe coding" practice workspace of plain static web pages: HTML, CSS and vanilla JS, with no build step, package manager, linter or tests. To view a page, open its `index.html` in a browser.

The user communicates in Korean, and page content is in Korean (`<html lang="ko">`).

## Conventions

- Always write code comments in Korean (HTML, CSS and JS alike).

## Structure

Each page lives in its own folder and has its own `index.html` and `style.css`. Pages do not share code or assets.

- `index.html` + `style.css` (root): the first "Hello World" page, with a sky-blue gradient and a button that has no handler.
- `profile/`: a self-introduction card page.
  - `main.js` intentionally holds only an empty `initApp()` that nothing calls yet. Add behavior there.
  - Theme colors are CSS variables on `:root` in `profile/style.css` (`--primary: #667eea`, `--primary-dark: #764ba2`, `--primary-light`).

`test.txt` and `profile/text.txt` are empty placeholder files. Leave them alone.

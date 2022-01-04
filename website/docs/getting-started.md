---
id: getting-started
title: Getting Started
---

## Installation

Add MagicBin to your project using Yarn:

```bash
yarn add magicbin
```

## Create an configuration file

MagicBin has a simple `init` command to create a dummy `magicbin.config.js` file.

```bash
yarn mb init
```

Once your tasks are ready, just call `sync` to start your tasks:

```bash
yarn mb sync
```

Once the sync has started, any change to the configuration file will be immediately applied (this can be disabled from the web UI).

## Web UI

As long as the daemon runs, you can open [localhost:6890](http://localhost:6890) (or run `yarn mb open`) to access the task manager. From there, you can start/stop/restart tasks as you need, and see their logs in real time.

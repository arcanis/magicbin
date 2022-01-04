---
id: overview
title: Overview
slug: /
---

When working on web applications, having to manage multiple services is a common task. For instance, you could have to run a http server along with a couple of workers and possible some kind of graphql automated code generator. These processes could be handled through multiple terminal windows, each running a different task. Unfortunately, not only does it not scale very well as the number of services grow, but it also starts to get more and more complex as youstart to require inter-services dependencies or reload capabilities.

MagicBin simplifies all that by letting you define your application as a set of commands in a single manifest file. Once ready, all you have to do is run `yarn mb sync` for the commands to executed within the context of a live daemon. Then, should you need to make changes, just edit the manifest file and the changes will be immediately reflected in the daemon.

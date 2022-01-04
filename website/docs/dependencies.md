---
id: dependencies
title: Dependencies
---

It may happen that some tasks can only start once other tasks have started (in other words, that a task depends on another one). For instance, tasks that would mutate your database would typically need to wait for the database to be ready first.

The simplest way to achieve this is through the use of the `dependsOn` field: you can list as many task ids in this array as you wish, and MagicBin will automatically wait for them to be fully started before starting the depending task. For example:

```ts
module.exports = {
  tasks: {
    server: {
      shell: `node ./server`,
    },
    sendRequest: {
      shell: `node ./sendRequest`,
      dependsOn: `server`,
    },
  },
};
```

In this scenario, `sendRequest` would only start once `server` has started.

## Modern confirmation mode

The default confirmation mode (defined via the `confirmationMode` task setting) is `none`. Under this mode, a task dependency is presumed fulfilled as soon as it starts. While it can be fine in many cases, there's a significant risk of race condition: processes must often go through various steps before being truly ready, such as opening network sockets.

MagicBin implements a smarter confirmation strategy when `confirmationMode` is set to `modern`. Under this mode, MagicBin will wait for the process to report its readiness by itself, via the `confirmProcess` function:

```ts
import {createServer} from 'http';
import {confirmProcess} from 'magicbin';

createServer(() => {
  // handle request
}).listen(8080, () => {
  confirmProcess();
});
```

With the following configuration, not only will `sendRequest` wait for the `server` to start, but it'll also wait for its server to have started listening.

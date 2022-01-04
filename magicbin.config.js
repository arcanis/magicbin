// @ts-check

/** @type {import('magicbin').Configuration} */
module.exports = {
  namespace: `magicbin`,
  descriptionFile: `magicbin.md`,
  tasks: {
    showTime: {
      name: `Show Time`,
      shell: `yarn exec date`,
      rebootInterval: 1000,
      fence: false,
    },
    delayedServer: {
      name: `Delayed Server`,
      shell: `node ./examples/delayedServer`,
      confirmationMode: `modern`,
    },
    dataProducer: {
      name: `Data Producer`,
      shell: `node ./examples/dataProducer`,
      dependsOn: `delayedServer`,
    },
  },
};

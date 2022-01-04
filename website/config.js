// @ts-check

module.exports = {
  name: `MagicBin`,
  repository: `magicbin`,
  description: `Simple process manager; alternative to pm2`,
  algolia: `d4d96f8710b3d92b82fe3e01cb108e0c`,

  icon: {
    letter: `B`,
  },

  colors: {
    primary: `#62ad98`,
  },

  sidebar: {
    General: [`overview`, `getting-started`, `configuration`],
    Advanced: [`dependencies`],
  },

  index: {
    getStarted: `/docs`,
    features: [{
      title: `Simple`,
      description: `MagicBin intends to be as intuitive as possible; deploying and mastering it takes minutes, not days.`,
    }, {
      title: `Browser UI`,
      description: `We have no time to waste fighting to get the information we need, so MagicBin shows it all through a web dashboard.`,
    }, {
      title: `Offline-first`,
      description: `MagicBin doesn't require access to the network to show you the state of your application, and doesn't transmit any data to remote servers.`,
    }],
  },
};

const fetch = require(`node-fetch`);
const {setTimeout} = require(`timers/promises`);

async function main() {
  let counter = 0;

  while (true) {
    const url = `/${counter++}`;
    console.log(Date.now(), `Sending a request:`, url);
    await fetch(`http://localhost:4500${url}`);
    await setTimeout(1000);
  }
}

main();

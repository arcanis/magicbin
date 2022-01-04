require(`ts-node/register/transpile-only`);

const http = require(`http`);
const {confirmProcess} = require(`magicbin`);

const server = http.createServer((req, res) => {
  console.log(Date.now(), `Receiving a request:`, req.url);
  res.end();
});

setTimeout(() => {
  server.listen(4500, () => {
    console.log(`Started to listen`);
    confirmProcess();
  });
}, 5000);

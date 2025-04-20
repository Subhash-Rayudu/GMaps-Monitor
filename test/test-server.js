// test-server.js
import http from 'http';

const server = http.createServer((req, res) => {
  res.end('Hello World');
});

server.listen(7357, '127.0.0.1', () => {
  console.log('Test server running at http://127.0.0.1:7357');
});

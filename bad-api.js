const http = require('http');

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    // 1. Auth Stripping Failure (Returns sensitive data even with NO auth header)
    if (url.pathname === '/vuln/auth') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ secretData: 'This should have been 401 Unauthorized!' }));
      return;
    }

    // 2. SQL Injection Vulnerability (Crashes or dumps data if payload contains SQL)
    if (url.pathname === '/vuln/sqli' && req.method === 'POST') {
      if (body.includes("'") || body.includes("OR 1=1")) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "SQL Syntax Error: Unclosed quotation mark near ''" }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'Success' }));
      }
      return;
    }

    // 3. XSS Vulnerability (Reflects payload directly in response)
    if (url.pathname === '/vuln/xss' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Welcome, ' + body + '</body></html>');
      return;
    }

    // 4. Fuzzing Failure (Crashes server/returns 500 if input is null/missing)
    if (url.pathname === '/vuln/fuzz' && req.method === 'POST') {
      try {
        const parsed = JSON.parse(body || '{}');
        // If a field is missing or wrong type, simulate a severe internal crash
        if (!parsed.email || typeof parsed.email !== 'string') {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end("INTERNAL SERVER ERROR: Cannot read properties of undefined (reading 'length')");
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Valid input' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('INTERNAL SERVER ERROR: JSON parse error');
      }
      return;
    }

    // 5. Schema Regression (Returns a randomly changing schema)
    if (url.pathname === '/vuln/regression') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const r = Math.random();
      if (r < 0.5) {
        res.end(JSON.stringify({ id: 1, price: 50.99, name: 'Product A' }));
      } else {
        // BREAKING CHANGE: price is now a string, id is missing
        res.end(JSON.stringify({ product_name: 'Product A', price: '50.99 USD' }));
      }
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });
});

server.listen(3001, () => {
  console.log('Bad API Server running on port 3001');
});

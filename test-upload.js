const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch'); // wait, node 20+ has fetch

async function run() {
  const form = new FormData();
  form.append('file', fs.createReadStream('package.json'), 'Файл.json');

  const res = await fetch('http://localhost:3001/disk/upload', {
    method: 'POST',
    body: form
  });
  console.log(res.status);
  console.log(await res.text());
}
run();

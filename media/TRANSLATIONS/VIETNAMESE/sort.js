const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const t = readFileSync('TRANSLATION.DAT', 'utf16le').toString();

let re = /.+\s+\n\t+<STRING>ORIGINAL:(.+)\s+<STRING>TRANSLATION:(.+\s+)\n.+/g;
let r;

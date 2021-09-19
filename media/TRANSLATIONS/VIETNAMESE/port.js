const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const ja = readFileSync('JA.DAT', 'utf16le').toString();
const vi = readFileSync('VI.DAT', 'utf16le').toString();

let re = /\n.+\s+\n\t+<STRING>ORIGINAL:(.+)\s+<STRING>TRANSLATION:(.+\s+)\n.+/g;
let r;
writeFileSync('TRANSLATION.DAT', '[TRANSLATIONS]');
do {
    r = re.exec(ja);
    if (!r) break;
    let str = r[1]
        .replace(/\|/g, '\\|')
        .replace(/\//g, '\\/')
        .replace(/\+/g, '\\+')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
    if (str.match(/\|/g)) {
        console.log(str);
    }
    v = new RegExp('\n.+\n\t+<STRING>ORIGINAL:' + str + '\n.+\n.+', 'gm').exec(vi);
    appendFileSync('TRANSLATION.DAT',
        v ? v[0] : r[0].replace(r[2], ''),
        (err) => {
            if (err) {
                console.error(err)
                return
            }
        });
} while (r);

appendFileSync('TRANSLATION.DAT', '\n[/TRANSLATIONS]\n', (err) => {
    if (err) {
        console.error(err)
        return
    }
});
const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const t = readFileSync('TRANSLATION.DAT', 'utf16le').toString();

let re = /\t+\[TRANSLATION\]\n.+<STRING>ORIGINAL:(.+)\n(?:\t+<STRING>(.+)\n)+\t+\[\/TRANSLATION\]\n/g;
let dest = '[TRANSLATIONS]\n';
let arr = [];
let r = re.exec(t);
while (r) {
    arr.push([r[1], r[0]]);
    r = re.exec(t);
};
arr.sort((a, b) => {
    let groupRe = /<STRING>GROUP:(.+)\n/;
    let sSrc = a[0];
    let sDest = b[0];
    let gSrc = groupRe.exec(a[1]);
    let gDest = groupRe.exec(b[1]);
    if (gSrc || gDest) {
        gSrc = gSrc ? gSrc[1] : null;
        gDest = gDest ? gDest[1] : null;
        if (gSrc != gDest) {
            if(!gSrc) return 1;
            return gSrc.localeCompare(gDest);
        }
    }
    if (sSrc.match(/(\+|-)\[/)) {
        sSrc = sSrc.substr(1);
    }
    if (sDest.match(/(\+|-)\[/)) {
        sDest = sDest.substr(1);
    }
    return sSrc.localeCompare(sDest);
});

arr.forEach(x => {
    dest += x[1];
});

writeFileSync('TRANSLATION.DAT', dest + '[/TRANSLATIONS]', { encoding: 'utf16le' });

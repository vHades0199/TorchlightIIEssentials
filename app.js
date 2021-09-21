const path = require('path');
const yaml = require('js-yaml');
const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const pathSrc = process.argv[2].replace(__dirname, '.').toUpperCase();
const fSrc = path.parse(pathSrc);
const src = readFileSync(pathSrc, fSrc.ext == '.DAT' ? 'utf16le' : 'utf8');
let transFile;

if (process.argv[3] && process.argv[3].toLowerCase() == 'sort') {
    const sortGroupFunc = (a, b) => {
        if (a == 'original') return -1;
        if (b == 'original') return 1;
        if (a == 'Common') return 1;
        if (b == 'Common') return -1;

        return a.localeCompare(b);
    };
    const doc = yaml.load(src);
    Object.keys(doc).forEach(k => {
        doc[k] = doc[k].sort((a, b) => {
            return a.original.localeCompare(b.original);
        })
    });
    const text = yaml.dump(doc, { sortKeys: sortGroupFunc, quotingType: '"', lineWidth: -1 });
    writeFileSync(pathSrc, text, { encoding: 'utf8' });
}

let dest = '';
const convertToDAT = (node) => {
    Object.entries(node).forEach(([key, val]) => {
        if (Array.isArray(val)) {
            val.forEach(x => {
                dest += `\t[TRANSLATION]\n`
                dest += `\t\t<STRING>ORIGINAL:${x.original}\n`;
                dest += `\t\t<STRING>TRANSLATION:${x.translation}\n`;
                dest += `\t[/TRANSLATION]\n`
            });
        } else {
            convertToDAT(val);
        }
    });
}

const convertToYaml = (lines) => {
    let node = {};
    while (lines.length > 0) {
        const line = lines.shift();
        if (line) {
            const keywordRe = /^(?<indent>\t+)\[(?<end>\/{0,1})(?<keyword>.+)\]/;
            if (keywordRe.test(line)) {
                const { end } = line.match(keywordRe).groups;

                if (end) return node;
                if (!node) node = [];
                const obj = convertToYaml(lines);
                if (obj) {
                    let group = obj.group || 'Common';
                    delete obj.group;
                    (node[group] = node[group] || []).push(obj);
                }
            } else {
                if (!node) node = {};
                const stringsRe = /\t+<(?<type>\w+)>(?<name>\w+):(?<value>.*)/;
                if (stringsRe.test(line)) {
                    const { type, name, value } = line.match(stringsRe).groups;
                    node[name.toLowerCase()] = value;
                }
            }
        }
    }
    return node;
}

switch (fSrc.ext) {
    case '.YAML':
        const doc = yaml.load(src);
        convertToDAT(doc);
        transFile = path.join(fSrc.dir, `${fSrc.name}.DAT`);
        writeFileSync(transFile, `[TRANSLATIONS]\n${dest}[/TRANSLATIONS]\n`, { encoding: 'utf16le' });
        break;

    case '.DAT':
        const obj = convertToYaml(src.split('\n').filter(x => x && !x.toUpperCase().endsWith('TRANSLATIONS]')))
        transFile = path.join(fSrc.dir, `${fSrc.name}.YAML`);
        writeFileSync(transFile, yaml.dump(obj, { sortKeys: true, quotingType: "'" }), { encoding: 'utf8' });
        break;

    default:
        break;
}




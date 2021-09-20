const path = require('path');
const yaml = require('js-yaml');
const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const pathSrc = process.argv[2].toUpperCase();
const fSrc = path.parse(pathSrc);
const src = readFileSync(pathSrc, fSrc.ext == '.DAT' ? 'utf16le' : 'utf8');
let transFile;

let dest = '';
const convertToDAT = (node, level = 1) => {
    if (!Array.isArray(node)) {
        Object.entries(node).forEach(([key, val]) => {
            let indent = new Array(level).fill('\t').join('');
            if (typeof val == 'string') {
                const [type, name] = key.split('|');
                dest += `${indent}<${type.toUpperCase()}>${name}:${val}\n`;
            } else {
                dest += `${indent}[${key.toUpperCase()}]\n`
                convertToDAT(val, level + 1);
                dest += `${indent}[/${key.toUpperCase()}]\n`
            }
        });
    }
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
                    let group = obj['string|GROUP'] || 'origin';
                    (node[group] = node[group] || []).push(obj);
                }
            } else {
                if (!node) node = {};
                const stringsRe = /\t+<(?<type>\w+)>(?<name>\w+):(?<value>.*)/;
                if (stringsRe.test(line)) {
                    const { type, name, value } = line.match(stringsRe).groups;
                    node[`${type.toLowerCase()}|${name}`] = value;
                }
            }
        }
    }
    return node;
}

switch (fSrc.ext) {
    case '.YAML':
        const doc = yaml.load(src);
        convertToDAT(doc.translations);
        transFile = path.join(fSrc.dir, `${fSrc.name}.temp.DAT`);
        writeFileSync(transFile, `[TRANSLATIONS]\n${dest}[/TRANSLATIONS]\n`, { encoding: 'utf16le' });
        break;
    case '.DAT':
        const obj = convertToYaml(src.split('\n').filter(x => x && !x.toUpperCase().endsWith('TRANSLATIONS]')))
        // .reduce((res, item) => {
        //     let group = item['string|GROUP'] || 'origin';
        //     if (!res[group]) res[group] = [];
        //     res[group].push(item);
        //     return res;
        // }, {});
        // obj = Object.fromEntries(Object.entries(obj).sort());
        transFile = path.join(fSrc.dir, `${fSrc.name}.YAML`);
        writeFileSync(transFile, yaml.dump(obj, { sortKeys: true }), { encoding: 'utf8' });
        break;

    default:
        break;
}




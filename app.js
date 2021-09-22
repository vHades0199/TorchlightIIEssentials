const path = require('path');
const yaml = require('js-yaml');
const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const pathSrc = process.argv[2].replace(__dirname, '.').toUpperCase();
const fSrc = path.parse(pathSrc);
const src = readFileSync(pathSrc, fSrc.ext == '.DAT' ? 'utf16le' : 'utf8');

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

const getObjFromSrc = () => {
    switch (fSrc.ext) {
        case '.YAML':
            break;

        case '.DAT':
            const lines = src
                .split('\n')
                .filter(x => x && !x.toUpperCase().endsWith('TRANSLATIONS]'))
            return convertToYaml(lines);

        default:
            console.error('File is not support!!!')
            break;
    }
}

const writeYamlFile = (filePath, doc) => {
    Object.keys(doc).forEach(k => {
        doc[k] = doc[k].sort((a, b) => {
            if (!a.original) return 1;
            if (!b.original) return -1;
            return a.original.localeCompare(b.original);
        });
        console.info(` [${doc[k].length}] ${k}`);
    });
    const strDump = yaml.dump(doc, {
        sortKeys: sortGroupFunc, quotingType: '"', lineWidth: -1
    }).replace(/^(?!\s)/gm, '\n').trimStart();
    writeFileSync(filePath, strDump, { encoding: 'utf8' });
}

const sortGroupFunc = (a, b) => {
    if (a == 'original') return -1;
    if (b == 'original') return 1;
    if (['mod', 'Common'].includes(a)) return 1;
    if (['mod', 'Common'].includes(b)) return -1;

    return a.localeCompare(b);
};

switch (process.argv[3]) {
    // {file}.[YAML] sort
    case 'sort':
        if (fSrc.ext != '.YAML') {
            console.error('Is not a YAML file!');
            break;
        }

        const doc = yaml.load(src);
        writeYamlFile(pathSrc, doc);
        break;

    // {file}.[YAML|DAT] merge
    case 'merge':
        const mergeObj = getObjFromSrc();
        const rootPath = './media/TRANSLATIONS/VIETNAMESE/TRANSLATION.YAML';
        const root = yaml.load(readFileSync(rootPath, 'utf8'));
        Object.keys(root).forEach(k => {
            root[k].forEach((item, inx) => {
                const newItem = mergeObj.Common.find(x => x.original == item.original);
                if (!item.translation && newItem?.translation)
                    root[k][inx].translation = newItem.translation;
            });
        });
        writeYamlFile(rootPath, root);
        break;

    // {file}.[YAML|DAT]
    default:
        let transFile;
        switch (fSrc.ext) {
            case '.YAML':
                const doc = yaml.load(src);
                convertToDAT(doc);
                transFile = path.join(fSrc.dir, `${fSrc.name}.DAT`);
                writeFileSync(transFile, `[TRANSLATIONS]\n${dest}[/TRANSLATIONS]\n`, { encoding: 'utf16le' });
                break;

            case '.DAT':
                const obj = getObjFromSrc();
                transFile = path.join(fSrc.dir, `${fSrc.name}.YAML`);
                writeFileSync(transFile, yaml.dump(obj, {
                    sortKeys: true, quotingType: '"', lineWidth: -1
                }), { encoding: 'utf8' });
                break;

            default:
                break;
        }
        break;
}

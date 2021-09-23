const path = require('path');
const yaml = require('js-yaml');
const { readFileSync, writeFileSync, readdirSync, lstatSync } = require('fs');

const getLinesFromDAT = (str) => str
    .split('\n')
    .filter(x => x && !x.toUpperCase().endsWith('TRANSLATIONS]'));

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
            const lines = getLinesFromDAT(src);
            return convertToYaml(lines);

        default:
            console.error('File is not support!!!')
            break;
    }
}

const writeYamlFile = (filePath, doc) => {
    console.warn(`Categories:`);
    Object.keys(doc).forEach(k => {
        doc[k] = doc[k].sort((a, b) => {
            if (!a.original) return 1;
            if (!b.original) return -1;
            return a.original.localeCompare(b.original);
        });
        console.info(` [${doc[k].length}] ${k}`);
    });
    const strDump = yaml.dump(doc, {
        sortKeys: sortGroupFunc,
        lineWidth: -1
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

if (process.argv[2] == 'new') {
    const [, , , category, dirPath] = process.argv;
    const rootPath = './media/TRANSLATIONS/VIETNAMESE/TRANSLATION.YAML';
    const root = yaml.load(readFileSync(rootPath, 'utf8'));

    const categoryCommon = ['Common'];

    if (!root[category]) root[category] = [];
    categoryCommon.forEach(cat => {
        if (!root[cat]) root[cat] = [];
    })

    const convertFile = (fileName) => {
        if (/TRANSLATION\.DAT$/.test(fileName.toUpperCase())) return;
        // console.info(fileName);
        const re = {
            '.DAT': /<TRANSLATE>\w+:(.+)/g,
            '.LAYOUT': /<STRING>(TEXT( \d)?|TOOL TIP|DESCRIPTOR|NAME|DIALOG 1|DISCOVERED|AREA NAME|AREA NAME LEAVING|AREA NAME ENTERING|COMPLETE|RETURN|TITLE|GREET):(.+)/g,
        }
        const str = readFileSync(fileName, 'utf16le');
        str.match(re[path.extname(fileName)])
            ?.map(x => x.replace(/^(<TRANSLATE>\w+|<STRING>(\w|\s)+):/, ''))
            .forEach(newKey => {
                if (root[category].some(z => z.original == newKey)) return;
                let newItem = root.Common.find(item => item.original == newKey);
                if (newItem) {
                    newItem = Object.assign({}, newItem);
                    root.Common = root.Common.filter(item => item.original != newKey);
                    console.log(`--> ${newItem.original}`);
                }
                if (!newItem) newItem = { original: newKey };
                root[category].push(newItem);
            });
    }
    const convertDir = (dir) => {
        readdirSync(dir).forEach(fileName => {
            const filePath = path.join(dir, fileName);
            if (lstatSync(filePath).isDirectory()) {
                convertDir(filePath);
            } else if (/.(DAT|LAYOUT)$/.test(filePath.toUpperCase())) {
                convertFile(filePath);
            }
        });
    }
    if (/.(DAT|LAYOUT)$/.test(dirPath.toUpperCase()))
        convertFile(dirPath);
    else
        convertDir(dirPath);
    console.warn('Duplicates:')
    const keys = root[category].map(x => x.original);
    const dupItems = [];
    for (const cat in root) {
        if (cat != category && !categoryCommon.includes(cat) && Object.hasOwnProperty.call(root, cat)) {
            root[cat].forEach(item => {
                if (keys.includes(item.original)) {
                    // root[categoryCommon].push(item);
                    dupItems.push(item.original);
                    console.log(`[${cat}] ${item.original}`);
                }
            });
        }
    }
    root[category] = root[category].filter(item => !dupItems.includes(item.original));
    writeYamlFile(rootPath, root);
    return;
}

const pathSrc = process.argv[2].replace(__dirname, '.').toUpperCase();
const fSrc = path.parse(pathSrc);
const src = readFileSync(pathSrc, fSrc.ext == '.DAT' ? 'utf16le' : 'utf8');

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
        console.log('check', mergeObj.Common.length);
        Object.keys(root).forEach(k => {
            root[k].forEach((item, inx) => {
                const newItem = mergeObj.Common.find(x => x.original == item.original);
                if (!item.translation && newItem?.translation) {
                    root[k][inx].translation = newItem.translation;
                }
            });
            const existsKey = root[k].map(x => x.original);
            mergeObj.Common = mergeObj.Common.filter(x => !existsKey.includes(x.original));
        });
        console.log('check', mergeObj.Common.length);

        // root.Socketables = root.Socketables.concat(mergeObj.Common
        //     .filter(x => x.original.endsWith('Chaos Ember'))
        //     .filter(x => x.translation))
        writeYamlFile(rootPath, root);
        mergeObj.Common = mergeObj.Common.filter(x => x.translation);
        writeYamlFile('./media/TRANSLATIONS/VIETNAMESE/TRANSLATION___.YAML', mergeObj);
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
                console.info('Keys:', dest.match(/\[TRANSLATION\]/g).length);
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

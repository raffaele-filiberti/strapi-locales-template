const prompts = require('prompts');
const path = require('path');
const fs = require('fs');
const csv = require('csvtojson');

const [firstArg] = process.argv.slice(2);

const LOCALES = firstArg && firstArg.includes('locale="')
  ? firstArg
    .replace('locale="')
    .replace('"')
    .split(',')
  : ['it', 'en'];

function slugify(value, separator) {
  let text = value.toString().toLowerCase().trim();

  const sets = [
    { to: 'a', from: '[ÀÁÂÃÅÆĀĂĄẠẢẤẦẨẪẬẮẰẲẴẶΑΆ]' },
    { to: 'b', from: '[Β]' },
    { to: 'ae', from: '[Ä]' },
    { to: 'c', from: '[ÇĆĈČ]' },
    { to: 'd', from: '[ÐĎĐÞΔ]' },
    { to: 'e', from: '[ÈÉÊËĒĔĖĘĚẸẺẼẾỀỂỄỆΕΈ]' },
    { to: 'f', from: '[Φ]' },
    { to: 'g', from: '[ĜĞĢǴΓ]' },
    { to: 'h', from: '[ĤḦ]' },
    { to: 'i', from: '[ÌÍÎÏĨĪĮİỈỊΗΉΙΊΪΐ]' },
    { to: 'j', from: '[Ĵ]' },
    { to: 'ij', from: '[Ĳ]' },
    { to: 'k', from: '[ĶΚ]' },
    { to: 'ks', from: '[Ξ]' },
    { to: 'l', from: '[ĹĻĽŁΛ]' },
    { to: 'm', from: '[ḾΜ]' },
    { to: 'n', from: '[ÑŃŅŇΝ]' },
    { to: 'o', from: '[ÒÓÔÕØŌŎŐỌỎỐỒỔỖỘỚỜỞỠỢǪǬƠΟΌΩΏ]' },
    { to: 'oe', from: '[ŒÖ]' },
    { to: 'p', from: '[ṕΠ]' },
    { to: 'ps', from: '[Ψ]' },
    { to: 'r', from: '[ŔŖŘΡ]' },
    { to: 's', from: '[ŚŜŞŠΣς]' },
    { to: 'ss', from: '[ß]' },
    { to: 't', from: '[ŢŤΤ]' },
    { to: 'th', from: '[Θ]' },
    { to: 'u', from: '[ÙÚÛŨŪŬŮŰŲỤỦỨỪỬỮỰƯΥΎΫΰ]' },
    { to: 'ue', from: '[Ü]' },
    { to: 'w', from: '[ẂŴẀẄ]' },
    { to: 'x', from: '[ẍΧ]' },
    { to: 'y', from: '[ÝŶŸỲỴỶỸ]' },
    { to: 'z', from: '[ŹŻŽΖ]' },
    { to: '-', from: '[·/_,:;\']' },
  ];

  sets.forEach((set) => {
    text = text.replace(new RegExp(set.from, 'gi'), set.to);
  });

  text = text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

  if (typeof separator !== 'undefined' && separator !== '-') {
    text = text.replace(/-/g, separator);
  }

  return text;
}

const makeDirIfNotExist = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const getHeaders = (name, dir) => {
  makeDirIfNotExist(dir);

  if (!fs.existsSync(`${dir}/${name}.json`)) {
    fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify([]));
  }

  const headers = require(`${dir}/${name}.json`);

  return headers.length > 0 ? headers : null;
};

const saveByType = {
  single: (json, filename, dir) => {
    const destDir = `${dir}/global`;

    makeDirIfNotExist(destDir);

    const output = json.reduce(
      (acc, { slug, value }) => ({
        ...acc,
        [slug]: value
      }),
      {}
    );

    fs.writeFileSync(`${destDir}/${filename}.json`, JSON.stringify(output));
  },
  collection: (json, filename, dir) => {
    const destDir = `${dir}/global`;

    makeDirIfNotExist(destDir);

    const output = json.reduce(
      (acc, record) => [
        ...acc,
        {
          ...record,
          slug: slugify(record.name || record.title)
        }
      ],
      []
    );

    fs.writeFileSync(`${destDir}/${filename}.json`, JSON.stringify(output));
  },
  'single-locale': (json, filename, dir) => {
    LOCALES.forEach(
      locale => {
        const destDir = `${dir}/${locale}`;

        makeDirIfNotExist(destDir);

        const output = json.reduce(
          (acc, { slug, ...field }) => ({
            ...acc,
            [slug]: field[locale]
          }),
          {}
        );

        fs.writeFileSync(`${destDir}/${filename}.json`, JSON.stringify(output));
      }
    );
  },
  'collection-locale': (json, filename, dir) => {
    LOCALES.forEach(
      locale => {
        const destDir = `${dir}/${locale}`;

        makeDirIfNotExist(destDir);

        const output = json
          .reduce(
            (acc, record) => [
              ...acc,
              record[locale] ? {
                ...record[locale],
                slug: slugify(record[locale].name || record[locale].title)
              } : {}
            ],
            []
          )
          .filter(Boolean);

        fs.writeFileSync(`${destDir}/${filename}.json`, JSON.stringify(output));
      }
    );
  },
};

(async () => {
  const csvDir = path.resolve(__dirname, 'csv');
  const jsonDir = path.resolve(__dirname, 'json');
  const headersDir = path.resolve(__dirname, 'headers');

  makeDirIfNotExist(jsonDir);

  const files = fs.readdirSync(csvDir).filter(name => name.includes('.csv'));

  const filenames = files.map(name => name.replace('.csv', ''));

  const singleFilenames = filenames
    .filter(name => name.includes('[single]'))
    .map(name => name.replace('[single]', ''));

  const singleLocaleFilenames = filenames
    .filter(name => name.includes('[single-locale]'))
    .map(name => name.replace('[single-locale]', ''));

  const collectionFilenames = filenames
    .filter(name => name.includes('[collection]'))
    .map(name => name.replace('[collection]', ''));

  const collectionLocaleFilenames = filenames
    .filter(name => name.includes('[collection-locale]'))
    .map(name => name.replace('[collection-locale]', ''));

  const response = await prompts({
    type: 'multiselect',
    name: 'file',
    message: 'Which file I pick up?',
    choices: [
      ...singleFilenames.map(filename => ({
        title: `${filename.padEnd(20)} single`,
        value: {
          type: 'single',
          filename,
          headers: getHeaders(filename, headersDir)
        }
      })),
      ...collectionFilenames.map(filename => ({
        title: `${filename.padEnd(20)} collection`,
        value: {
          type: 'collection',
          filename,
          headers: getHeaders(filename, headersDir)
        },
      })),
      ...singleLocaleFilenames.map(filename => ({
        title: `${filename.padEnd(20)} single with locales`,
        value: {
          type: 'single-locale',
          filename,
          headers: getHeaders(filename, headersDir)
        }
      })),
      ...collectionLocaleFilenames.map(filename => ({
        title: `${filename.padEnd(20)} collection with locales`,
        value: {
          type: 'collection-locale',
          filename,
          headers: getHeaders(filename, headersDir)
        },
      }))
    ],
    instructions: false,
  });

  console.log(response);

  response.file.forEach(({ type, filename, headers }) => {
    csv({ headers })
      .fromFile(`${csvDir}/${filename}[${type}].csv`)
      .then(json => {
        saveByType[type](json, filename, jsonDir);
      });
  });
})();
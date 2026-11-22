import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { readJson } from '../scripts/build-data.mjs';
const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
const { filterReferences, readTagFilters, sortItems, matchesQuery, referenceTagLabel } =
  await vite.ssrLoadModule('/src/library.ts');
after(() => vite.close());
const { items } = await readJson('public/data/catalog.json');

test('subject and visual style intersect independently without inferring untagged gender', () => {
  const photos = filterReferences(items, { tag: 'male', style: 'photo' });
  assert.equal(photos.length, 30);
  assert.ok(photos.every((item) => ['costume', 'character'].includes(item.kind)));
  assert.equal(filterReferences(items, { tag: 'male', style: 'anime' }).length, 0);
  assert.equal(
    filterReferences(items, { kind: 'pose', tag: 'male', style: 'line-art' }).length,
    22,
  );
  const untagged = { ...items[0], id: 'untagged', tags: undefined };
  assert.equal(filterReferences([untagged], { tag: 'male' }).length, 0);
  assert.equal(filterReferences([untagged], { tag: 'female' }).length, 0);
  assert.equal(filterReferences([untagged], {}).length, 1);
});

test('category, source, subject, style and search narrow the same result set', () => {
  const filters = { collection: 'custom', tag: 'male', style: 'line-art', query: '提取动作' };
  const poses = filterReferences(items, filters);
  assert.equal(poses.length, 3);
  assert.equal(filterReferences(items, { ...filters, category: 'standing' }).length, 3);
  assert.equal(filterReferences(items, { ...filters, category: 'sitting' }).length, 0);
  assert.equal(filterReferences(items, { ...filters, collection: 'builtin' }).length, 0);
  assert.equal(
    filterReferences(items, { kind: 'character', tag: 'male', style: 'photo', hair: 'long' })
      .length,
    1,
  );
});

test('existing style-tag links migrate while subject links accept an independent style', () => {
  assert.deepEqual(readTagFilters(new URLSearchParams('tag=anime')), {
    tag: 'all',
    style: 'anime',
  });
  assert.deepEqual(readTagFilters(new URLSearchParams('tag=male&style=photo')), {
    tag: 'male',
    style: 'photo',
  });
  assert.deepEqual(readTagFilters(new URLSearchParams('tag=female&style=photo')), {
    tag: 'female',
    style: 'photo',
  });
  assert.deepEqual(readTagFilters(new URLSearchParams('tag=female')), {
    tag: 'female',
    style: 'all',
  });
  assert.deepEqual(readTagFilters(new URLSearchParams()), { tag: 'all', style: 'all' });
});

test('existing characters are female photographic references, while custom male tags stay intact', () => {
  const originals = items.filter((item) => item.kind === 'character' && !item.collection);
  const females = filterReferences(items, { kind: 'character', tag: 'female', style: 'photo' });
  assert.equal(originals.length, 1499);
  assert.deepEqual(
    females.filter((item) => !item.collection).map((item) => item.id),
    originals.map((item) => item.id),
  );
  assert.equal(
    filterReferences(items, { kind: 'character', collection: 'custom', tag: 'female' }).length,
    20,
  );
  assert.equal(filterReferences(items, { kind: 'character', tag: 'male' }).length, 19);
  const longHair = filterReferences(items, { tag: 'female', style: 'photo', hair: 'long' });
  assert.ok(longHair.length > 0);
  assert.ok(longHair.every((item) => item.portrait.hair === 'long'));
  assert.equal(filterReferences(items, { kind: 'character', query: '女性 写实' }).length, 1519);
  assert.equal(
    filterReferences(items, { kind: 'character', query: 'Female Photographic' }).length,
    1519,
  );
});

test('existing costumes are female photographic references; poses keep their existing style tags', () => {
  for (const [kind, expected] of [
    ['pose', 303],
    ['costume', 2787],
  ]) {
    const females = filterReferences(items, { kind, tag: 'female' });
    assert.equal(females.length, expected);
    assert.deepEqual(
      filterReferences(items, { kind, collection: 'builtin', tag: 'female', style: 'photo' }).map(
        (item) => item.id,
      ),
      kind === 'costume'
        ? females
            .filter((item) => !item.collection && item.tags.some((tag) => tag.id === 'photo'))
            .map((item) => item.id)
        : [],
    );
  }
  assert.equal(
    filterReferences(items, { kind: 'costume', collection: 'builtin', query: '女性 写实' }).length,
    1407,
  );
  assert.equal(
    filterReferences(items, {
      kind: 'costume',
      collection: 'builtin',
      query: 'Female Photographic',
    }).length,
    1407,
  );
  assert.equal(
    filterReferences(items, { kind: 'costume', tag: 'female', style: 'anime' }).length,
    1350,
  );
  assert.equal(filterReferences(items, { collection: 'custom', tag: 'female' }).length, 95);
  assert.equal(filterReferences(items, { tag: 'female' }).length, 4609);
});

test('sort by code follows the visible numeric code rather than the internal ID', () => {
  const a = { ...items[0], id: 'first', code: 'MP-013' };
  const b = { ...items[0], id: 'last', code: 'MP-002' };
  const source = [a, b];
  assert.deepEqual(
    sortItems(source, 'code', 'zh').map((item) => item.code),
    ['MP-002', 'MP-013'],
  );
  assert.deepEqual(source, [a, b]);
});

test('every character has one age band and one ethnicity, in the fixed facet order, and they intersect with other filters', async () => {
  const facets = await readJson('data/character-facets.json');
  const characters = items.filter((item) => item.kind === 'character');
  // 人物總數＝每次上新批都會變（11-22 加 500 張臉：2105→2605），改成跟標註檔的筆數對帳，不寫死
  const attributes = await readJson('data/character-attributes.json');
  assert.equal(characters.length, Object.keys(attributes.items).length);
  assert.ok(characters.length >= 2605);
  // 舊「國家」欄位已移除：上游一律寫日本、自製的沒寫，選「日本」會讓所有男性和非東亞的臉消失
  assert.equal(items.filter((item) => 'country' in item).length, 0);
  for (const key of ['age', 'ethnicity']) {
    const ids = facets[key].map((value) => value.id);
    assert.ok(characters.every((item) => ids.includes(item[key]?.id)), `${key} missing`);
    assert.ok(items.filter((item) => item.kind !== 'character').every((item) => !item[key]));
    // 每個選項都有人，加總剛好等於全部人物
    const counts = ids.map((id) => filterReferences(items, { [key]: id }).length);
    assert.ok(counts.every((n) => n > 0), `${key} empty option`);
    assert.equal(counts.reduce((a, b) => a + b, 0), characters.length);
    for (const value of facets[key])
      for (const item of characters.filter((item) => item[key].id === value.id))
        assert.deepEqual(item[key], { id: value.id, zh: value.zh, en: value.en, tw: item[key].tw });
  }
  // 人數從標註檔現算（每批新臉都會變；11-22 加 500 張東亞臉）
  const tally = (key, id) => Object.values(attributes.items).filter((a) => a[key] === id).length;
  const eastAsian = tally('ethnicity', 'east-asian'), fiftyPlus = tally('age', '50-plus'), southeast = tally('ethnicity', 'southeast-asian');
  assert.ok(eastAsian >= 2184 && fiftyPlus >= 136);
  assert.equal(filterReferences(items, { ethnicity: 'east-asian' }).length, eastAsian);
  assert.equal(filterReferences(items, { age: '50-plus' }).length, fiftyPlus);
  // 跟性別、髮長、素材來源交叉：「內建」含上游圖庫與 Muse 自製人臉（使用者上傳的才不算）
  assert.equal(filterReferences(items, { ethnicity: 'east-asian', collection: 'builtin' }).length, eastAsian);
  assert.equal(filterReferences(items, { ethnicity: 'black', tag: 'female' }).length > 0, true);
  assert.equal(filterReferences(items, { ethnicity: 'black', tag: 'male' }).length > 0, true);
  assert.equal(filterReferences(items, { age: '50-plus', tag: 'male', hair: 'short' }).length > 0, true);
  assert.equal(filterReferences(items, { kind: 'pose', age: '18-29' }).length, 0);
  assert.equal(filterReferences(items, { ethnicity: 'unknown' }).length, 0);
  // 繁簡英都搜得到
  for (const query of ['东亚', '東亞'])
    assert.equal(filterReferences(items, { kind: 'character', query }).length, eastAsian);
  // 搜尋是比對子字串：英文 East Asian 也會找到 Southeast Asian
  assert.equal(filterReferences(items, { kind: 'character', query: 'East Asian' }).length, eastAsian + southeast);
  assert.equal(filterReferences(items, { kind: 'character', query: '50 歲以上' }).length, fiftyPlus);
});

test('visible codes are searchable and one tag ID has one bilingual display name', () => {
  const pose = items.find((item) => item.code === 'MP-012');
  assert.ok(matchesQuery(pose, 'MP-012'));
  assert.equal(filterReferences(items, { query: 'MP-012' }).length, 1);
  assert.equal(referenceTagLabel('photo', 'en', 'Photorealistic'), 'Photographic');
  assert.equal(referenceTagLabel('photo', 'zh'), '写实');
});

// Model/dance are subject/use tags; they must not migrate into visual style.
test('model and dance links retain independent subject tags and intersect with line-art', () => {
  for (const { tag, poseCount, costumeCount, queries } of [
    { tag: 'model', poseCount: 11, costumeCount: 1, queries: ['模特', 'Model'] },
    { tag: 'dance', poseCount: 10, costumeCount: 1, queries: ['舞蹈', 'Dance'] },
  ]) {
    assert.deepEqual(readTagFilters(new URLSearchParams(`tag=${tag}&style=line-art`)), {
      tag,
      style: 'line-art',
    });
    const poses = filterReferences(items, {
      kind: 'pose',
      collection: 'custom',
      tag,
      style: 'line-art',
    });
    assert.equal(poses.length, poseCount);
    assert.ok(poses.every((item) => item.tags.some((value) => value.id === tag)));
    if (tag === 'dance')
      assert.ok(poses.every((item) => item.tags.some((value) => value.id === 'model')));
    for (const query of queries) assert.equal(filterReferences(poses, { query }).length, poseCount);
    assert.equal(
      filterReferences(items, { kind: 'costume', tag, style: 'photo' }).length,
      costumeCount,
    );
  }
  assert.equal(referenceTagLabel('model', 'zh'), '模特');
  assert.equal(referenceTagLabel('dance', 'en'), 'Dance');
});

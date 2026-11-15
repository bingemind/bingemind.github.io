// Text statistics. Uses Intl.Segmenter where available so Chinese, Japanese and Thai text,
// which has no spaces between words, is counted correctly.
const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯฀-๿]/;
const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been it its this that these those i you he she we they me my your our their his her them not no so if then than too very can will just do does did have has had into about over after before up down out also more most such only own same all any each other some what which who whom when where why how there here'.split(' '));

export function wordList(text, locale = 'en') {
  // Spaced scripts: a regex keeps hyphenated words and contractions whole, like Word and Google Docs.
  if (CJK.test(text) && typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(locale, { granularity: 'word' });
    return [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
  }
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

export function stats(text, locale = 'en') {
  const words = wordList(text, locale);
  const chars = [...text].length;
  const noSpace = [...text.replace(/\s/g, '')].length;
  const sentences = (text.match(/[^.!?。！？\n]+[.!?。！？]+|[^.!?。！？\n]+$/gm) || []).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text ? text.split('\n').length : 0;
  const freq = new Map();
  for (const w of words) { const k = w.toLowerCase(); if (k.length > 1 && !STOP.has(k) && !/^\d+$/.test(k)) freq.set(k, (freq.get(k) || 0) + 1); }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  const cjk = CJK.test(text);
  const letters = words.reduce((s, w) => s + [...w].length, 0);
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  // Flesch reading ease, English only.
  const flesch = words.length && sentences && !cjk ? 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length) : null;
  return {
    words: words.length, chars, noSpace, sentences, paragraphs, lines,
    unique: new Set(words.map((w) => w.toLowerCase())).size,
    avgWord: words.length ? letters / words.length : 0,
    avgSentence: sentences ? words.length / sentences : 0,
    readMin: cjk ? noSpace / 400 : words.length / 238, speakMin: cjk ? noSpace / 250 : words.length / 150,
    top, flesch, cjk,
  };
}

export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export const LIMITS = [
  ['X (Twitter) post', 280, 'chars'], ['SMS message', 160, 'chars'], ['Google title tag', 60, 'chars'],
  ['Meta description', 155, 'chars'], ['Instagram caption', 2200, 'chars'], ['LinkedIn post', 3000, 'chars'],
  ['YouTube title', 100, 'chars'], ['Facebook post (before "See more")', 477, 'chars'],
  ['College essay (Common App)', 650, 'words'], ['UCAS personal statement', 4000, 'chars'],
];

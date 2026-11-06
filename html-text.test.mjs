import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, looksLikeHtml, decodeEntities } from './html-text.mjs';

const B = 'https://canvas.example.edu';
const t = html => htmlToText(html, B);

test('structure: paragraphs, headings, lists, tables, quotes, code', () => {
  assert.equal(
    t('<h2>Week 3</h2><p>Read <b>chapter 4</b>.</p><p>Then:</p>'),
    '## Week 3\n\nRead **chapter 4**.\n\nThen:',
  );
  assert.equal(
    t(
      '<ul><li><p>One</p></li><li>Two<ol start="3"><li>a</li><li>b</li></ol></li></ul><p>after</p>',
    ),
    '- One\n- Two\n  3. a\n  4. b\n\nafter',
  );
  assert.equal(
    t(
      '<table><tr><th>Day</th><th>Topic</th></tr><tr><td><p>Mon</p></td><td>Trees<br>Heaps</td></tr></table>',
    ),
    'Day | Topic\nMon | Trees Heaps',
  );
  assert.equal(t('<blockquote><p>Quote</p></blockquote>'), '> Quote');
  assert.equal(
    t('<pre>def f(x):\n    return x &lt; 2\n</pre>'),
    '```\ndef f(x):\n    return x < 2\n```',
  );
  assert.equal(
    t('<p>x<sup>2</sup> + H<sub>2</sub>O and <code>f(x)</code>, <s>Fri</s> <em>Mon</em></p>'),
    'x^2 + H_2O and `f(x)`, ~~Fri~~ *Mon*',
  );
  assert.equal(t('<p>a</p><hr><p>b</p>'), 'a\n\n---\n\nb');
});

test('links, images, formulas and embeds keep their targets', () => {
  assert.equal(
    t('<a href="/courses/1/pages/week-3">Week 3</a>'),
    `[Week 3](${B}/courses/1/pages/week-3)`,
  );
  assert.equal(
    t('<a href="https://x.org/">x.org</a> <a href="mailto:t@u.edu">t@u.edu</a>'),
    'https://x.org/ t@u.edu',
  );
  assert.equal(
    t('<a href="javascript:alert(1)">click</a> <a href="#top">top</a> <a href="/x"></a>'),
    'click top',
  );
  assert.equal(
    t('<img src="/courses/1/files/9/preview" alt="tree.png">'),
    `![tree.png](${B}/courses/1/files/9/preview)`,
  );
  assert.equal(
    t('<img class="equation_image" alt="LaTeX: \\frac{a}{b}" src="/equation_images/x">'),
    '$\\frac{a}{b}$',
  );
  assert.equal(t('<img data-equation-content="x^2" alt="x squared" src="/e">'), '$x^2$');
  assert.equal(
    t('<iframe title="Lecture 5" src="https://video.example/embed/1"></iframe>'),
    '[embedded: Lecture 5](https://video.example/embed/1)',
  );
  assert.equal(t('<a title="a > b" href="/p">ok</a>'), `[ok](${B}/p)`);
  assert.equal(
    t(
      '<a href="https://cs.example.edu/courses?_gl=1*abc*_ga*MTc&amp;utm_source=x&amp;term=spring">Courses</a>',
    ),
    '[Courses](https://cs.example.edu/courses?term=spring)',
  );
});

test('scripts, styles and comments disappear; text that only looks like a tag stays', () => {
  assert.equal(t('<p>a<script>alert("</p>")</script><style>p{}</style><!-- note -->b</p>'), 'ab');
  assert.equal(t('<p>if a < b && c > d</p>'), 'if a < b && c > d');
  assert.equal(t('3 < 4'), '3 < 4');
  assert.equal(
    t('&lt;p&gt; is a tag &amp;&amp; &copy; &alpha; &#x1F600; &#9731; &bogus;'),
    '<p> is a tag && © α 😀 ☃ &bogus;',
  );
  assert.equal(decodeEntities('&AMP;&nbsp;&Delta;'), '& Δ');
});

test('only real markup is treated as HTML', () => {
  assert.ok(looksLikeHtml('<p>Hello</p>'));
  assert.ok(looksLikeHtml('Text with <br> a break'));
  assert.ok(!looksLikeHtml('if a < b and c > d'));
  assert.ok(!looksLikeHtml('List<Integer> and Map<K, V>'));
  assert.ok(!looksLikeHtml(42));
});

test('hostile input stays fast and bounded', () => {
  const cases = [
    '<a'.repeat(200000),
    '<a href="'.repeat(50000) + '>',
    '<'.repeat(300000),
    '<b>'.repeat(100000),
    '<a href="/x">'.repeat(50000) + '</a>'.repeat(50000),
    '<ul><li>'.repeat(20000),
    '<p ' + 'x="1" '.repeat(100000),
    '<!--' + 'a'.repeat(300000),
    '<script>' + 'a'.repeat(300000),
  ];
  for (const html of cases) {
    const start = performance.now();
    const out = t(html);
    assert.equal(typeof out, 'string');
    assert.ok(performance.now() - start < 1500, html.slice(0, 20));
  }
});

const assert = require('assert');

describe('sanitize', () => {
  let sanitize;

  beforeEach(() => {
    sanitize = require('../src');
  });

  it('remains the same', () => {
    const testCases = [
      '<div>foo</div>',
      '<a href="https://foo">bar</a>'
    ];

    testCases.forEach((testCase) => {
      assert.equal(sanitize(testCase), testCase);
    });
  });

  it('should be filtered', () => {
    const testCases = [
      [
        '<div>foo</div><script>alert("foo")</script>',
        '<div>foo</div>'
      ],
      [
        '<div onclick="alert(\'buh!\')">foo</div>',
        '<div>foo</div>'
      ],
      [
        '<h2>Header</h2>\nParagraph.',
        '<h2>Header</h2>&#10;Paragraph.'
      ]
    ];

    testCases.forEach((testCase) => {
      assert.equal(sanitize(testCase[0]), testCase[1]);
    });
  });
});

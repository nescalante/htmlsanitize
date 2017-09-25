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
      {
        before: '<div>foo</div><script>alert("foo")</script>',
        after: '<div>foo</div>'
      },
      {
        before: '<div onclick="alert(\'buh!\')">foo</div>',
        after: '<div>foo</div>'
      }
    ];

    testCases.forEach((testCase) => {
      assert.equal(sanitize(testCase.before), testCase.after);
    });
  });
});

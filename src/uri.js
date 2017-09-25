const { parse } = require('url');

const aHrefSanitizationWhitelist = /^\s*(https?|ftp|mailto|tel|file):/;
const imgSrcSanitizationWhitelist = /^\s*((https?|ftp|file|blob):|data:image\/)/;

module.exports = function sanitizeUri(uri, isImage) {
  const regex = isImage ? imgSrcSanitizationWhitelist : aHrefSanitizationWhitelist;
  const normalizedVal = parse(uri).href;

  if (normalizedVal !== '' && !normalizedVal.match(regex)) {
    return `unsafe:${normalizedVal}`;
  }

  return uri;
};

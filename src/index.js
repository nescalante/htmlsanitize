const sanitizeUri = require('./uri');

function toMap(str, lowercaseKeys) {
  const obj = {};
  const items = str.split(',');
  let i;

  for (i = 0; i < items.length; i += 1) {
    obj[lowercaseKeys ? items[i].toLowerCase() : items[i]] = true;
  }

  return obj;
}

// Regular Expressions for parsing tags and attributes
const SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
// Match everything outside of normal chars and " (quote character)
const NON_ALPHANUMERIC_REGEXP = /([^#-~ |!])/g;

// Good source of info about elements and attributes
// http://dev.w3.org/html5/spec/Overview.html#semantics
// http://simon.html5.org/html-elements

// Safe Void Elements - HTML5
// http://dev.w3.org/html5/spec/Overview.html#void-elements
const voidElements = toMap('area,br,col,hr,img,wbr');

// Elements that you can, intentionally, leave open (and which close themselves)
// http://dev.w3.org/html5/spec/Overview.html#optional-tags
const optionalEndTagBlockElements = toMap('colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr');
const optionalEndTagInlineElements = toMap('rp,rt');
const optionalEndTagElements = Object.assign(
  {},
  optionalEndTagInlineElements,
  optionalEndTagBlockElements
);

// Safe Block Elements - HTML5
const blockElements = Object.assign({}, optionalEndTagBlockElements, toMap('address,article,' +
  'aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5,' +
  'h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,section,table,ul'));

// Inline Elements - HTML5
const inlineElements = Object.assign({}, optionalEndTagInlineElements, toMap('a,abbr,acronym,b,' +
  'bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s,' +
  'samp,small,span,strike,strong,sub,sup,time,tt,u,var'));

// Blocked Elements (will be stripped)
const blockedElements = toMap('script,style');

const validElements = Object.assign(
  {},
  voidElements,
  blockElements,
  inlineElements,
  optionalEndTagElements
);

// Attributes that have href and hence need to be sanitized
const uriAttrs = toMap('background,cite,href,longdesc,src,xlink:href');

const htmlAttrs = toMap('abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' +
    'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,' +
    'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,' +
    'scope,scrolling,shape,size,span,start,summary,tabindex,target,title,type,' +
    'valign,value,vspace,width');

// SVG attributes (without "id" and "name" attributes)
// https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Attributes
const svgAttrs = toMap('accent-height,accumulate,additive,alphabetic,arabic-form,ascent,' +
    'baseProfile,bbox,begin,by,calcMode,cap-height,class,color,color-rendering,content,' +
    'cx,cy,d,dx,dy,descent,display,dur,end,fill,fill-rule,font-family,font-size,font-stretch,' +
    'font-style,font-variant,font-weight,from,fx,fy,g1,g2,glyph-name,gradientUnits,hanging,' +
    'height,horiz-adv-x,horiz-origin-x,ideographic,k,keyPoints,keySplines,keyTimes,lang,' +
    'marker-end,marker-mid,marker-start,markerHeight,markerUnits,markerWidth,mathematical,' +
    'max,min,offset,opacity,orient,origin,overline-position,overline-thickness,panose-1,' +
    'path,pathLength,points,preserveAspectRatio,r,refX,refY,repeatCount,repeatDur,' +
    'requiredExtensions,requiredFeatures,restart,rotate,rx,ry,slope,stemh,stemv,stop-color,' +
    'stop-opacity,strikethrough-position,strikethrough-thickness,stroke,stroke-dasharray,' +
    'stroke-dashoffset,stroke-linecap,stroke-linejoin,stroke-miterlimit,stroke-opacity,' +
    'stroke-width,systemLanguage,target,text-anchor,to,transform,type,u1,u2,underline-position,' +
    'underline-thickness,unicode,unicode-range,units-per-em,values,version,viewBox,visibility,' +
    'width,widths,x,x-height,x1,x2,xlink:actuate,xlink:arcrole,xlink:role,xlink:show,xlink:title,' +
    'xlink:type,xml:base,xml:lang,xml:space,xmlns,xmlns:xlink,y,y1,y2,zoomAndPan', true);

const validAttrs = Object.assign(
  {},
  uriAttrs,
  svgAttrs,
  htmlAttrs
);

// Create an inert document that contains the dirty HTML that needs sanitizing
// Depending upon browser support we use one of three strategies for doing this.
// Support: Safari 10.x -> XHR strategy
// Support: Firefox -> DomParser strategy
const getInertBodyElement /* function(html: string): HTMLBodyElement */ = (function getInertBodyElementInner(window, document) {
  let inertDocument;

  if (document && document.implementation) {
    inertDocument = document.implementation.createHTMLDocument('inert');
  } else {
    throw new Error('Can\'t create an inert html document');
  }
  const inertBodyElement = (inertDocument.documentElement || inertDocument.getDocumentElement()).querySelector('body');

  // Check for the Safari 10.1 bug - which allows JS to run inside the SVG G element
  inertBodyElement.innerHTML = '<svg><g onload="this.parentNode.remove()"></g></svg>';
  if (!inertBodyElement.querySelector('svg')) {
    return getInertBodyElementXHR;
  }
  // Check for the Firefox bug - which prevents the inner img JS from being sanitized
  inertBodyElement.innerHTML = '<svg><p><style><img src="</style><img src=x onerror=alert(1)//">';
  if (inertBodyElement.querySelector('svg img')) {
    return getInertBodyElementDOMParser;
  }

  return getInertBodyElementInertDocument;

  function getInertBodyElementXHR(html) {
    // We add this dummy element to ensure that the rest of the content is parsed as expected
    // e.g. leading whitespace is maintained and tags like `<meta>` do not get hoisted to the `<head>` tag.
    html = `<remove></remove>${html}`;
    try {
      html = encodeURI(html);
    } catch (e) {
      return undefined;
    }
    const xhr = new window.XMLHttpRequest();

    xhr.responseType = 'document';
    xhr.open('GET', `data:text/html;charset=utf-8,${html}`, false);
    xhr.send(null);
    const { body } = xhr.response;

    body.firstChild.remove();

    return body;
  }

  function getInertBodyElementDOMParser(html) {
    // We add this dummy element to ensure that the rest of the content is parsed as expected
    // e.g. leading whitespace is maintained and tags like `<meta>` do not get hoisted to the `<head>` tag.
    html = `<remove></remove>${html}`;
    try {
      const { body } = new window.DOMParser().parseFromString(html, 'text/html');

      body.firstChild.remove();

      return body;
    } catch (e) {
      return undefined;
    }
  }

  function getInertBodyElementInertDocument(html) {
    inertBodyElement.innerHTML = html;

    // Support: IE 9-11 only
    // strip custom-namespaced attributes on IE<=11
    if (document.documentMode) {
      stripCustomNsAttrs(inertBodyElement);
    }

    return inertBodyElement;
  }
}(window, window.document));

function htmlParser(html, handler) {
  if (html === null || html === undefined) {
    html = '';
  } else if (typeof html !== 'string') {
    html = `${html}`;
  }

  let inertBodyElement = getInertBodyElement(html);

  if (!inertBodyElement) return;

  // mXSS protection
  let mXSSAttempts = 5;

  do {
    if (mXSSAttempts === 0) {
      throw new Error('Failed to sanitize html because the input is unstable');
    }
    mXSSAttempts -= 1;

    // trigger mXSS if it is going to happen by reading and writing the innerHTML
    html = inertBodyElement.innerHTML;
    inertBodyElement = getInertBodyElement(html);
  } while (html !== inertBodyElement.innerHTML);

  let node = inertBodyElement.firstChild;

  while (node) {
    switch (node.nodeType) {
      case 1: // ELEMENT_NODE
        handler.start(node.nodeName.toLowerCase(), attrToMap(node.attributes));
        break;
      case 3: // TEXT NODE
        handler.chars(node.textContent);
        break;
      default:
        break;
    }

    let nextNode = node.firstChild;

    if (!nextNode) {
      if (node.nodeType === 1) {
        handler.end(node.nodeName.toLowerCase());
      }

      nextNode = getNonDescendant('nextSibling', node);

      if (!nextNode) {
        while (nextNode == null) {
          node = getNonDescendant('parentNode', node);

          if (node === inertBodyElement) break;

          nextNode = getNonDescendant('nextSibling', node);

          if (node.nodeType === 1) {
            handler.end(node.nodeName.toLowerCase());
          }
        }
      }
    }
    node = nextNode;
  }

  // eslint-disable-next-line no-cond-assign
  while ((node = inertBodyElement.firstChild)) {
    inertBodyElement.removeChild(node);
  }
}

function attrToMap(attrs) {
  const map = {};

  for (let i = 0, ii = attrs.length; i < ii; i += 1) {
    const attr = attrs[i];

    map[attr.name] = attr.value;
  }

  return map;
}

// Escapes all potentially dangerous characters, so that the
// resulting string can be safely inserted into attribute or
// element text.
function encodeEntities(decodedValue) {
  return decodedValue
    .replace(/&/g, '&amp;')
    .replace(SURROGATE_PAIR_REGEXP, (value) => {
      const hi = value.charCodeAt(0);
      const low = value.charCodeAt(1);

      return `&#${((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000};`;
    })
    .replace(NON_ALPHANUMERIC_REGEXP, (value) => `&#${value.charCodeAt(0)};`)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// create an HTML/XML writer which writes to buffer
function htmlSanitizeWriter(buf, uriValidator) {
  let ignoreCurrentElement = false;

  return {
    start(tag, attrs) {
      tag = tag.toLowerCase();
      if (!ignoreCurrentElement && blockedElements[tag]) {
        ignoreCurrentElement = tag;
      }
      if (!ignoreCurrentElement && validElements[tag] === true) {
        buf.push('<');
        buf.push(tag);
        Object.keys(attrs).forEach((key) => {
          const value = attrs[key];
          const lkey = key.toLowerCase();
          const isImage = (tag === 'img' && lkey === 'src') || (lkey === 'background');

          if (validAttrs[lkey] === true &&
            (uriAttrs[lkey] !== true || uriValidator(value, isImage))) {
            buf.push(' ');
            buf.push(key);
            buf.push('="');
            buf.push(encodeEntities(value));
            buf.push('"');
          }
        });
        buf.push('>');
      }
    },
    end(tag) {
      tag = tag.toLowerCase();
      if (!ignoreCurrentElement && validElements[tag] === true && voidElements[tag] !== true) {
        buf.push('</');
        buf.push(tag);
        buf.push('>');
      }
      // eslint-disable-next-line eqeqeq
      if (tag == ignoreCurrentElement) {
        ignoreCurrentElement = false;
      }
    },
    chars(chars) {
      if (!ignoreCurrentElement) {
        buf.push(encodeEntities(chars));
      }
    }
  };
}

// When IE9-11 comes across an unknown namespaced attribute e.g. 'xlink:foo' it adds 'xmlns:ns1' attribute to declare
// ns1 namespace and prefixes the attribute with 'ns1' (e.g. 'ns1:xlink:foo'). This is undesirable since we don't want
// to allow any of these custom attributes. This method strips them all.
function stripCustomNsAttrs(node) {
  while (node) {
    if (node.nodeType === window.Node.ELEMENT_NODE) {
      const attrs = node.attributes;

      for (let i = 0, l = attrs.length; i < l; i += 1) {
        const attrNode = attrs[i];
        const attrName = attrNode.name.toLowerCase();

        if (attrName === 'xmlns:ns1' || attrName.lastIndexOf('ns1:', 0) === 0) {
          node.removeAttributeNode(attrNode);
          i -= 1;
          l -= 1;
        }
      }
    }

    const nextNode = node.firstChild;

    if (nextNode) {
      stripCustomNsAttrs(nextNode);
    }

    node = getNonDescendant('nextSibling', node);
  }
}

function getNonDescendant(propName, node) {
  // An element is clobbered if its `propName` property points to one of its descendants
  const nextNode = node[propName];

  if (nextNode && window.Node.prototype.contains.call(node, nextNode)) {
    throw new Error(`Failed to sanitize html because the element is clobbered: ${node.outerHTML || node.outerText}`);
  }

  return nextNode;
}

module.exports = function sanitizeHTML(html) {
  const buf = [];

  htmlParser(html, htmlSanitizeWriter(buf, (uri, isImage) => !/^unsafe:/.test(sanitizeUri(uri, isImage))));

  return buf.join('');
};

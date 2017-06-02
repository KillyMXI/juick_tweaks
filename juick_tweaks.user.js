// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Feature testing
// @match       *://juick.com/*
// @match       *://beta.juick.com/*
// @match       *://localhost:8080/*
// @author      Killy
// @version     2.13.19
// @date        2016.09.02 - 2017.05.29
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_info
// @connect     api.juick.com
// @connect     twitter.com
// @connect     bandcamp.com
// @connect     mixcloud.com
// @connect     flickr.com
// @connect     flic.kr
// @connect     deviantart.com
// @connect     slideshare.net
// @connect     gist.github.com
// @connect     codepen.io
// @connect     pixiv.net
// @connect     konachan.net
// @connect     yande.re
// @connect     gelbooru.com
// @connect     safebooru.org
// @connect     danbooru.donmai.us
// @connect     safebooru.donmai.us
// @connect     anime-pictures.net
// @connect     api.imgur.com
// @connect     tumblr.com
// @connect     reddit.com
// @connect     wordpress.com
// @connect     lenta.ru
// @connect     meduza.io
// @connect     rbc.ru
// @connect     tjournal.ru
// @connect     *.newsru.com
// @connect     *.itar-tass.com
// @connect     tass.ru
// @connect     rublacklist.net
// @connect     mk.ru
// @connect     kp.ru
// @connect     gazeta.ru
// @connect     republic.ru
// @connect     bash.im
// @connect     ixbt.com
// @connect     techxplore.com
// @connect     medicalxpress.com
// @connect     phys.org
// @connect     techcrunch.com
// @connect     bbc.com
// @connect     nplus1.ru
// @connect     elementy.ru
// @connect     news.tut.by
// @connect     imdb.com
// @connect     *
// ==/UserScript==


// pages and elements =====================================================================================

const isBeta = (window.location.hostname == 'beta.juick.com');
if (isBeta && !GM_getValue('enable_beta', true)) { throw 'NOT an error! Preventing the script from running on beta.'; }

const isLocal = (window.location.hostname == 'localhost');
if (isLocal && !GM_getValue('enable_local', false)) { throw 'NOT an error! Preventing the script from running on localhost.'; }

const content = document.getElementById('content');
const isPost = (content !== null) && content.hasAttribute('data-mid');
const isFeed = (document.querySelectorAll('#content article[data-mid]').length > 0);
const isCommonFeed = (/^(?:https?:)?\/\/[a-z0-9.:]+\/(?:$|tag|#post|\?.*show=(?:all|photos))/i.exec(window.location.href) !== null);
const isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
const isTagsPage = window.location.pathname.endsWith('/tags');
const isSingleTagPage = (window.location.pathname.indexOf('/tag/') != -1);
const isSettingsPage = window.location.pathname.endsWith('/settings');
const isUserColumn = (document.querySelector('aside#column > div#ctitle:not(.tag)') === null) ? false : true;
const isUsersTable = (document.querySelector('#content > div.users') === null) ? false : true;


// userscript features =====================================================================================

addStyle();                              // минимальный набор стилей, необходимый для работы скрипта

if (isPost) {                            // на странице поста
  tryRun(filterPostComments);
  tryRun(checkReplyPost);
  tryRun(updateTagsOnAPostPage);
  tryRun(addTagEditingLinkUnderPost);
  tryRun(addCommentRemovalLinks);
  tryRun(bringCommentsIntoViewOnHover);
  tryRun(embedLinksToPost);
}

if (isFeed) {                            // в ленте или любом списке постов
  if (isCommonFeed) {                    // в общих лентах (популярные, все, фото, теги)
    tryRun(filterArticles);
  }
  tryRun(checkReplyArticles);
  tryRun(updateTagsInFeed);
  tryRun(markNsfwPostsInFeed);
  tryRun(embedLinksToArticles);
}

if (isUserColumn) {                      // если колонка пользователя присутствует слева
  tryRun(addYearLinks);
  tryRun(colorizeTagsInUserColumn);
  tryRun(addSettingsLink);
  tryRun(biggerAvatar);
  tryRun(addMentionsLink);
  tryRun(addIRecommendLink);
}

if (isPostEditorSharp) {                 // на форме создания поста (/#post)
  tryRun(addEasyTagsUnderPostEditorSharp);
}

if (isTagsPage) {                        // на странице тегов пользователя
  tryRun(sortTagsPage);
}

if (isSingleTagPage) {                   // на странице тега (/tag/...)
  tryRun(addTagPageToolbar);
}

if (isUsersTable) {                      // на странице подписок или подписчиков
  tryRun(addUsersSortingButton);
}

if (isSettingsPage) {                    // на странице настроек
  tryRun(addTweaksSettingsButton);
}

tryRun(addToggleBetaLink);
tryRun(addLocalWarning);


// helpers ==================================================================================================

Object.values = Object.values || (obj => Object.keys(obj).map(key => obj[key]));

String.prototype.count = function(s1) {
  return (this.length - this.replace(new RegExp(s1, 'g'), '').length) / s1.length;
};

Number.prototype.pad = function(size=2) {
  let s = String(this);
  while (s.length < size) { s = '0' + s; }
  return s;
};

function longest(arr) {
  return arr.reduce((a,b) => (!a) ? b : (!b || a.length > b.length) ? a : b);
}

function intersect(a, b) {
  if (b.length > a.length) { [a, b] = [b, a]; } // loop over shorter array
  return a.filter(item => (b.indexOf(item) !== -1));
}

function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function moveAll(fromNode, toNode) {
  for (let c; c = fromNode.firstChild; ) { toNode.appendChild(c); }
}

function removeAllFrom(fromNode) {
  for (let c; c = fromNode.lastChild; ) { fromNode.removeChild(c); }
}

function parseRgbColor(colorStr, fallback=[0,0,0]){
  let [, r, g, b] = colorStr.replace(/ /g, '').match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/i) || [, ...fallback];
  return [ +r, +g, +b ];
}

function getContrastColor([r, g, b]) {
  return (r + g + b > 127*3) ? [0,0,0] : [255,255,255];
}

function getAllMatchesAndCaptureGroups(re, str) {
  let results = [], result;
  while ((result = re.exec(str)) !== null) { results.push(Array.from(result)); }
  return results;
}

function htmlDecode(str) {
  let doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent;
}

function htmlEscape(html) {
  let textarea = document.createElement('textarea');
  textarea.textContent = html;
  return textarea.innerHTML;
}

function naiveEllipsis(str, len, ellStr='...') {
  let ellLen = ellStr.length;
  if (str.length <= len) { return str; }
  let half = Math.floor((len - ellLen) / 2);
  let left = str.substring(0, half);
  let right = str.substring(str.length - (len - half - ellLen));
  return '' + left + ellStr + right;
}

function naiveEllipsisRight(str, len, ellStr='...') {
  let ellLen = ellStr.length;
  return (str.length <= len) ? str : str.substring(0, len - ellLen) + ellStr;
}

function wrapIntoTag(node, tagName, className) {
  let tag = document.createElement(tagName);
  if (className !== undefined) { tag.className = className; }
  tag.appendChild(node);
  return tag;
}

function waitAndRun(test, doneCallback, timeoutCallback, tick=100, count) {
  if (test()) {
    doneCallback();
  } else {
    let newCount = (count === undefined) ? undefined : count - 1;
    if (newCount === undefined || newCount > 0) {
      setTimeout(() => waitAndRun(test, doneCallback, timeoutCallback, tick, newCount), tick);
    } else {
      if (typeof timeoutCallback == 'function') { timeoutCallback(); }
    }
  }
}

function randomId() {
  return Math.random().toString(36).substr(2);
}

function matchWildcard(str, wildcard) {
  let ww = wildcard.split('*');
  let startFrom = 0;
  for (let i = 0; i < ww.length; i++) {
    let w = ww[i];
    if (w == '') { continue; }
    let wloc = str.indexOf(w, startFrom);
    if (wloc == -1) { return false; }
    let wend = wloc + w.length;
    let headCondition = (i > 0) || (wloc == 0);
    let tailCondition = (i < ww.length - 1) || ((i > 0) ? str.endsWith(w) : (str.substr(wloc) == w));
    if (!headCondition || !tailCondition) { return false; }
    startFrom = wend;
  }
  return true;
}

// replaceTree :: (String, [{re: RegExp, with: String}]) -> String
// replaceTree :: (String, [{re: RegExp, with: Function}]) -> String
function replaceTree(txt, rules) {
  for (let rule of rules) {
    let match = rule.re.exec(txt);
    if (match !== null) {
      let parts = [txt.substring(0, match.index), txt.substring(rule.re.lastIndex)];
      return parts.map(p => replaceTree(p, rules)).join(match[0].replace(rule.re, rule.with));
    }
  }
  return txt;
}

function getProto() {
  return (location.protocol == 'http:') ? 'http:' : 'https:';
}

function setProto(url, proto) {
  return url.replace(
    /^(https?:)?(?=\/\/)/i,
    (proto === undefined) ? getProto() : proto
  );
}

function tryRun(f) {
  try { f(); } catch (e) {
    console.warn(`Failed to run ${f.name}()`);
    console.warn(e);
  }
}

function xhrGetAsync (url, timeout=3000, predicates) {
  return new Promise(function(resolve, reject) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      timeout: timeout,
      onload: function(response) {
        if (predicates === undefined) {
          resolve(response);
        } else {
          let match = predicates.find(({msg, p}) => p(response));
          if (match === undefined) {
            resolve(response);
          } else {
            let {msg, p} = match;
            reject({reason: msg(response), response: response});
          }
        }
      },
      ontimeout: function(response) { reject({reason: 'timeout', response: response}); },
      onerror: function(response) { reject({reason: 'unknown error', response: response}); }
    });
  });
}

function xhrFirstResponse(urls, timeout, predicates) {
  return urls.reduce ( (p, url) => p.catch(e => xhrGetAsync(url, timeout, predicates)), Promise.reject({reason: 'init'}) );
}


// function definitions =====================================================================================

function svgIconHtml(name) {
  return `<div class="icon icon--ei-${name} icon--s "><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-${name}-icon"></use></svg></div>`;
}

function getMyUserId() {
  let myUserIdLink = document.querySelector('nav#actions > ul > li:nth-child(2) > a');
  return (myUserIdLink === null) ? null : myUserIdLink.textContent.replace('@', '');
}

function getColumnUserId() {
  let columnUserIdLink = document.querySelector('div#ctitle a');
  return (columnUserIdLink === null) ? null : columnUserIdLink.textContent.trim();
}

function getPostUserId(element) {
  return element.querySelector('div.msg-avatar > a > img').alt;
}

function updateTagsOnAPostPage() {
  if (!GM_getValue('enable_user_tag_links', true)) { return; }
  let tagsDiv = document.querySelector('div.msg-tags');
  if (tagsDiv === null) { return; }
  let userId = getPostUserId(document);
  Array.from(tagsDiv.children).forEach(t => { t.href = t.href.replace('tag/', userId + '/?tag='); });
}

function updateTagsInFeed() {
  if (!GM_getValue('enable_user_tag_links_in_feed', false)) { return; }
  [].forEach.call(document.querySelectorAll('#content > article'), function(article, i, arr) {
    if (!article.hasAttribute('data-mid')) { return; }
    let userId = getPostUserId(article);
    let tagsDiv = article.querySelector('div.msg-tags');
    if (tagsDiv === null) { return; }
    Array.from(tagsDiv.children).forEach(t => { t.href = t.href.replace('tag/', userId + '/?tag='); });
  });
}

function markNsfwPostsInFeed() {
  if (!GM_getValue('enable_mark_nsfw_posts_in_feed', true)) { return; }
  [].forEach.call(document.querySelectorAll('#content > article'), function(article, i, arr) {
    if (!article.hasAttribute('data-mid')) { return; }
    let tagsDiv = article.querySelector('div.msg-tags');
    let isNsfw = (tagsDiv !== null) && Array.from(tagsDiv.children).some(t => t.textContent.toUpperCase() == 'NSFW');
    if (isNsfw) { article.classList.add('nsfw'); }
  });
}

function addTagEditingLinkUnderPost() {
  if (!GM_getValue('enable_tags_editing_link', true)) { return; }
  let mtoolbar = document.querySelector('#content li.toolbar ul');
  let canEdit = (mtoolbar.textContent.indexOf('Удалить') > -1) ? true : false;
  if (!canEdit) { return; }
  let linode = document.createElement('li');
  let anode = document.createElement('a');
  let mid = document.getElementById('content').getAttribute('data-mid');
  anode.href = '//juick.com/post?body=%23' + mid + '+%2ATag';
  anode.innerHTML = '<div style="background-position: -16px 0"></div>Теги';
  linode.appendChild(anode);
  mtoolbar.appendChild(linode);
}

function addCommentRemovalLinks() {
  if (!GM_getValue('enable_comment_removal_links', true)) { return; }
  let myUserId = getMyUserId();
  let commentsBlock = document.querySelector('ul#replies');
  if ((commentsBlock !== null) && (myUserId !== null)) {
    [].forEach.call(commentsBlock.children, function(linode, i, arr) {
      let postUserAvatar = linode.querySelector('div.msg-avatar > a > img');
      if (postUserAvatar !== null) {
        let postUserId = postUserAvatar.alt;
        if (postUserId == myUserId) {
          let linksBlock = linode.querySelector('div.msg-links');
          let commentLink = linode.querySelector('div.msg-ts > a');
          let postId = commentLink.pathname.replace('/','');
          let commentId = commentLink.hash.replace('#','');
          let anode = document.createElement('a');
          anode.href = `//juick.com/post?body=D+%23${postId}%2F${commentId}`;
          anode.innerHTML = 'Удалить';
          anode.style.cssFloat = 'right';
          linksBlock.appendChild(anode);
        }
      }
    });
  }
}

function addTagPageToolbar() {
  if (!GM_getValue('enable_tag_page_toolbar', true)) { return; }
  let asideColumn = document.querySelector('aside#column');
  let tag = document.location.pathname.split('/').pop(-1);
  let html = `
    <div id="ctitle" class="tag"><a href="/tag/${tag}">*${decodeURIComponent(tag)}</a></div>
    <ul class="toolbar">
      <li><a href="/post?body=S+%2a${tag}" title="Подписаться"><div style="background-position: -16px 0"></div></a></li>
      <li><a href="/post?body=BL+%2a${tag}" title="Заблокировать"><div style="background-position: -80px 0"></div></a></li>
    </ul>
    `;
  asideColumn.innerHTML = html + asideColumn.innerHTML;
}

function addYearLinks() {
  if (!GM_getValue('enable_year_links', true)) { return; }
  let userId = getColumnUserId();
  let asideColumn = document.querySelector('aside#column');
  let hr1 = asideColumn.querySelector('form ~ hr');
  let hr2 = document.createElement('hr');
  let linksContainer = document.createElement('p');
  let years = [
    {y: (new Date()).getFullYear(), b: ''},
    {y: 2016, b: '?before=2857956'},
    {y: 2015, b: '?before=2816362'},
    {y: 2014, b: '?before=2761245'},
    {y: 2013, b: '?before=2629477'},
    {y: 2012, b: '?before=2183986'},
    {y: 2011, b: '?before=1695443'},
    {y: 2010, b: '?before=1140357'},
    {y: 2009, b: '?before=453764'},
    {y: 2008, b: '?before=20106'}
  ];
  years.forEach(item => {
    let anode = document.createElement('a');
    anode.href = `/${userId}/${item.b}`;
    anode.textContent = item.y;
    linksContainer.appendChild(anode);
    linksContainer.appendChild(document.createTextNode(' '));
  });
  asideColumn.insertBefore(hr2, hr1);
  asideColumn.insertBefore(linksContainer, hr1);
}

function addSettingsLink() {
  if (!GM_getValue('enable_settings_link', true)) { return; }
  if (getColumnUserId() == getMyUserId()) {
    let asideColumn = document.querySelector('aside#column');
    let ctitle = asideColumn.querySelector('#ctitle');
    let anode = document.createElement('a');
    anode.innerHTML = svgIconHtml('gear');
    anode.href = '//juick.com/settings';
    ctitle.appendChild(anode);
    ctitle.style.display = 'flex';
    ctitle.style.justifyContent = 'space-between';
    ctitle.style.alignItems = 'baseline';
  }
}

function biggerAvatar() {
  if (!GM_getValue('enable_big_avatar', true)) { return; }
  let avatarImg = document.querySelector('div#ctitle a img');
  avatarImg.src = avatarImg.src.replace('/as/', '/a/');
}

function loadTagsAsync() {
  return new Promise(function(resolve, reject) {
    setTimeout(function(){
      GM_xmlhttpRequest({
        method: 'GET',
        url: setProto('//juick.com/post'),
        onload: function(response) {
          if (response.status != 200) {
            reject(`failed to load tags: ${response.status}, ${response.statusText}`);
          } else {
            const re = /<p style="text-align: justify">([\s\S]+)<\/p>[\s]*<\/section>/i;
            let [result, tagsStr] = re.exec(response.responseText);
            if (result !== null) {
              let tagsContainer = document.createElement('p');
              tagsContainer.classList.add('tagsContainer');
              tagsContainer.innerHTML = tagsStr;
              resolve(tagsContainer);
            } else {
              reject('no tags found');
            }
          }
        }
      });
    }, 50);
  });
}

function addEasyTagsUnderPostEditorSharp() {
  if (!GM_getValue('enable_tags_on_new_post_form', true)) { return; }
  loadTagsAsync().then(
    tagsContainer => {
      let messageForm = document.getElementById('newmessage');
      let tagsField = messageForm.getElementsByTagName('div')[0].getElementsByClassName('tags')[0];
      messageForm.getElementsByTagName('div')[0].appendChild(tagsContainer);
      sortAndColorizeTagsInContainer(tagsContainer, 60, true);
      Array.from(tagsContainer.children).forEach(t => {
        let newTag = t.textContent;
        t.href = '';
        t.onclick = (e => { e.preventDefault(); tagsField.value = (tagsField.value.trim() + ' ' + newTag).trim(); });
      });
    }
  ).catch( err => console.warn(err) );
}

function sortAndColorizeTagsInContainer(tagsContainer, numberLimit, isSorting) {
  let tags = Array.from(tagsContainer.querySelectorAll('a[title]'));
  if (tags.length === 0) { console.log('No tags with counters.'); return; }
  let [r, g, b] = parseRgbColor(getComputedStyle(tags[0]).color);
  let p0 = 0.7; // 70% of color range is used for color coding
  let maxC = 0.1;
  const tagInfo = a => {
    let c = Math.log(parseInt(a.title, 10));
    maxC = (c > maxC) ? c : maxC;
    return { c: c, a: a, text: a.textContent.toLowerCase() };
  };
  let sortedTags = tags.map(tagInfo).sort((t1, t2) => t2.c - t1.c);
  if ((numberLimit) && (sortedTags.length > numberLimit)) {
    sortedTags = sortedTags.slice(0, numberLimit);
  }
  if (isSorting) {
    sortedTags.sort((t1, t2) => t1.text.localeCompare(t2.text));
  }
  removeAllFrom(tagsContainer);
  sortedTags.forEach(t => {
    let p = (t.c/maxC - 1)*p0 + 1; // normalize to [p0..1]
    t.a.style.setProperty('color', `rgba(${r},${g},${b},${p})`, 'important');
    tagsContainer.appendChild(t.a);
    tagsContainer.appendChild(document.createTextNode (' '));
  });
  tagsContainer.classList.add('tagsContainer');
}

function sortTagsPage() {
  if (!GM_getValue('enable_tags_page_coloring', true)) { return; }
  loadTagsAsync().then(
    tagsContainer => {
      let contentSection = document.querySelector('section#content');
      removeAllFrom(contentSection);
      contentSection.appendChild(tagsContainer);
      sortAndColorizeTagsInContainer(tagsContainer, null, true);
    }
  ).catch(err => console.warn(err));
}

function colorizeTagsInUserColumn() {
  if (!GM_getValue('enable_left_column_tags_coloring', true)) { return; }
  let tagsContainer = document.querySelector('aside#column > p.tags');
  let tagsLink = tagsContainer.lastChild;
  sortAndColorizeTagsInContainer(tagsContainer, null, false);
  tagsContainer.appendChild(tagsLink);
}

function getLastArticleDate(html) {
  const re = /datetime\=\"([^\"]+) ([^\"]+)\"/;
  //const re = /\"timestamp\"\:\"([^\"]+) ([^\"]+)\"/;
  let [, dateStr, timeStr] = re.exec(html) || [];
  return (dateStr === undefined) ? null : new Date(`${dateStr}T${timeStr}`);
}

function processPageAsync(url, retrievalFunction, timeout=110) {
  return new Promise(function(resolve, reject) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: setProto(url),
      onload: function(response) {
        let result = null;
        if (response.status != 200) {
          console.log(`${url}: failed with ${response.status}, ${response.statusText}`);
        } else {
          result = retrievalFunction(response.responseText);
        }
        setTimeout(() => resolve(result), timeout);
      }
    });
  });
}

function loadUserDatesAsync(unprocessedUsers, processedUsers=[]) {
  return new Promise(function(resolve, reject) {
    if (unprocessedUsers.length === 0) {
      resolve(processedUsers);
    } else {
      let user = unprocessedUsers.splice(0,1)[0];
      //let postsUrl = "http://api.juick.com/messages?uname=" + user.id;
      let postsUrl = '//juick.com/' + user.id + '/';
      let recsUrl = '//juick.com/' + user.id + '/?show=recomm';

      processPageAsync(postsUrl, getLastArticleDate).then(lastPostDate => {
        processPageAsync(recsUrl, getLastArticleDate).then(lastRecDate => {
          let date = (lastPostDate > lastRecDate) ? lastPostDate : lastRecDate;
          if (date === null) {
            console.log(`${user.id}: no posts or recommendations found`);
          } else {
            user.date = date;
            user.a.appendChild(document.createTextNode (` (${date.getFullYear()}-${(date.getMonth()+1).pad(2)}-${date.getDate().pad(2)})` ));
          }
          processedUsers.push(user);
          loadUserDatesAsync(unprocessedUsers, processedUsers).then(rr => resolve(rr));
        });
      });
    }
  });
}

function sortUsers() {
  let contentBlock = document.getElementById('content');
  let button = document.getElementById('usersSortingButton');
  button.parentNode.removeChild(button);
  let usersTable = document.querySelector('div.users');
  let unprocessedUsers = Array.from(usersTable.querySelectorAll('span > a')).map(anode => {
    let userId = anode.pathname.replace(/\//g, '');
    return {a: anode, id: userId, date: (new Date(1970, 1, 1))};
  });
  loadUserDatesAsync(unprocessedUsers).then(
    processedUsers => {
      processedUsers.sort((b, a) => (a.date > b.date) - (a.date < b.date));
      usersTable.parentNode.removeChild(usersTable);
      let ul = document.createElement('div');
      ul.className = 'users sorted';
      processedUsers.forEach(user => {
        let li = document.createElement('span');
        li.appendChild(user.a);
        ul.appendChild(li);
      });
      contentBlock.appendChild(ul);
    }
  );
}

function addUsersSortingButton() {
  if (!GM_getValue('enable_users_sorting', true)) { return; }
  let contentBlock = document.getElementById('content');
  let usersTable = document.querySelector('div.users');
  let button = document.createElement('button');
  button.id = 'usersSortingButton';
  button.textContent='Sort by date';
  button.onclick = sortUsers;
  contentBlock.insertBefore(button, usersTable);
}

function turnIntoCts(node, makeNodeCallback) {
  node.onclick = function(e){
    e.preventDefault();
    let newNode = makeNodeCallback();
    if (newNode !== node) {
      removeAllFrom(node);
      moveAll(newNode, node);
      node.className = (node.className.includes('highlightable'))
        ? newNode.className + ' highlightable'
        : newNode.className;
      node.onclick = '';
    } else {
      node.onclick = '';
      node.classList.remove('cts');
    }
  };
}

function makeCts(makeNodeCallback, title) {
  let ctsNode = document.createElement('div');
  let placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = title;
  ctsNode.className = 'cts';
  ctsNode.appendChild(placeholder);
  turnIntoCts(ctsNode, makeNodeCallback);
  return ctsNode;
}

function makeIframe(src, w, h, scrolling='no') {
  let iframe = document.createElement('iframe');
  iframe.style.width = w;
  iframe.style.height = h;
  iframe.frameBorder = 0;
  iframe.scrolling = scrolling;
  iframe.setAttribute('allowFullScreen', '');
  iframe.src = src;
  return iframe;
}

function makeResizableToRatio(element, ratio) {
  element.dataset['ratio'] = ratio;
  makeResizable(element, w => w * element.dataset['ratio']);
}

// calcHeight :: Number -> Number -- calculate element height for a given width
function makeResizable(element, calcHeight) {
  const resizeToRatio = el => { el.style.height = (calcHeight(el.offsetWidth)).toFixed(2) + 'px'; };
  window.addEventListener('resize', () => resizeToRatio(element));
  resizeToRatio(element);
}

function makeIframeWithHtmlAndId(myHTML) {
  let id = randomId();
  let script =  `(function(html){
                   var iframe = document.createElement('iframe');
                   iframe.id='${id}';
                   iframe.onload = function(){var d = iframe.contentWindow.document; d.open(); d.write(html); d.close();};
                   document.getElementsByTagName('body')[0].appendChild(iframe);
                 })(${JSON.stringify(myHTML)});`;
  window.eval(script);
  return id;
}

function makeIframeHtml(html, w, h, onloadCallback, onerrorCallback) {
  let iframeId = makeIframeWithHtmlAndId(html);
  let iframe = document.getElementById(iframeId);
  iframe.className = 'newIframe';
  iframe.width = w;
  iframe.height = h;
  iframe.frameBorder = 0;
  if (typeof onloadCallback == 'function') {
    iframe.addEventListener('load', () => onloadCallback(iframe.contentWindow.document), false);
  }
  if (typeof onerrorCallback == 'function') {
    iframe.onerror = onerrorCallback;
  }
  return iframe;
}

function loadScript(url, async=false, callback, once=false) {
  if (once && [].some.call(document.scripts, s => s.src == url)) {
    if (typeof callback == 'function') { callback(); }
    return;
  }

  let head = document.getElementsByTagName('head')[0];
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  if (async) { script.setAttribute('async', ''); }

  if (typeof callback == 'function') {
    script.onload = callback;
  }

  head.appendChild(script);
}

function addScript(scriptString, once=false) {
  if (once && [].some.call(document.scripts, s => s.text == scriptString)) { return; }

  let head = document.getElementsByTagName('head')[0];
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = scriptString;
  head.appendChild(script);
}

function splitScriptsFromHtml(html) {
  const scriptRe = /<script.*?(?:src="(.+?)".*?)?>([\s\S]*?)<\/\s?script>/gmi;
  let scripts = getAllMatchesAndCaptureGroups(scriptRe, html).map(m => {
    let [, url, s] = m;
    return (url !== undefined)
      ? { call: function(){ loadScript(url, true); } }
      : { call: function(){ setTimeout(window.eval(s), 0); } };
  });
  let strippedHtml = html.replace(scriptRe, '');
  return [strippedHtml, scripts];
}

function extractDomain(url) {
  const domainRe = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/i;
  return domainRe.exec(url)[1];
}

function isDefaultLinkText(aNode) {
  return (aNode.textContent == extractDomain(aNode.href));
}

function urlReplace(match, p1, p2, p3, offset, string) {
  let isBrackets = (p1 !== undefined);
  return (isBrackets)
    ? `<a href="${p2 || p3}">${p1}</a>`
    : `<a href="${match}">${extractDomain(match)}</a>`;
}

function bqReplace(match, offset, string) {
  return '<q>' + match.replace(/^(?:>|&gt;)\s?/gmi, '') + '</q>';
}

function messageReplyReplace(messageId) {
  return function(match, mid, rid, offset, string) {
    let msgPart = '//juick.com/' + (mid || messageId);
    let replyPart = (rid && rid != '0') ? '#' + rid : '';
    return `<a href="${msgPart}${replyPart}">${match}</a>`;
  };
}

function juickPostParse(txt, messageId) {
  const urlRe = /(?:\[([^\]\[]+)\](?:\[([^\]]+)\]|\(((?:[a-z]+:\/\/|www\.|ftp\.)(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[-\w+*&@#/%=~|$?!:;,.])*(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[\w+*&@#/%=~|$]))\))|\b(?:[a-z]+:\/\/|www\.|ftp\.)(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[-\w+*&@#/%=~|$?!:;,.])*(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[\w+*&@#/%=~|$]))/gi;
  const bqRe = /(?:^(?:>|&gt;)\s?[\s\S]+?$\n?)+/gmi;
  return replaceTree(htmlEscape(txt).replace(bqRe, bqReplace), [
    {re: urlRe, with: urlReplace},
    {re: /\n/g, with: '<br/>'},
    {re: /\B(?:#(\d+))?(?:\/(\d+))?\b/gmi, with: messageReplyReplace(messageId)},
    {re: /\B@([\w-]+)\b/gmi, with: '<a href="//juick.com/$1">@$1</a>'}
  ]);
}

function juickPhotoLink(postId, ext) {
  return `//i.juick.com/p/${postId}.${ext}`;
}

function juickId([, userId, postId, replyId]) {
  let isReply = ((replyId !== undefined) && (replyId != '0'));
  return '#' + postId + (isReply ? '/' + replyId : '');
}

function getEmbeddableLinkTypes() {
  return [
    {
      name: 'Juick',
      id: 'embed_juick',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/juick\.com\/(?!tag\/)(?:([\w-]+)\/)?([\d]+\b)(?:#(\d+))?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, userId, msgId, replyId] = reResult;

        let isReply = ((replyId !== undefined) && (replyId !== '0'));
        let mrid = (isReply) ? parseInt(replyId, 10) : 0;
        let idStr = juickId(reResult);
        let linkStr = '//juick.com/' + msgId + ((isReply) ? '#' + mrid : '');

        if (GM_getValue('enable_move_into_view_on_same_page', true)) {
          let thisPageMsgMatch = /\/(\d+)$/.exec(window.location.pathname);
          if (thisPageMsgMatch && thisPageMsgMatch[1] == msgId) {
            let linkedItem = Array.from(document.querySelectorAll('li.msg'))
                                  .find(x => x.id == replyId || (mrid == 0 && x.id == 'msg-' + msgId));
            if (linkedItem) {
              let thisMsg = aNode.closest('li.msg > div.msg-cont');
              let linkedMsg = linkedItem.querySelector('div.msg-cont');
              setMoveIntoViewOnHover(aNode, thisMsg, linkedMsg, 5, 30);
              return;
            }
          }
        }

        div = div || document.createElement('div');
        div.textContent = 'loading ' + idStr;
        div.className = 'juickEmbed embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: setProto('//api.juick.com/thread?mid=' + msgId),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load ${idStr} (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let threadInfo = JSON.parse(response.responseText);
            let msg = (!isReply) ? threadInfo[0] : threadInfo.find(x => (x.rid == mrid));
            if (msg === undefined) {
              div.textContent = '' + idStr + ' doesn\'t exist';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }

            let withTags = (msg.tags !== undefined);
            let withPhoto = (msg.photo !== undefined);
            let withLikes = (msg.likes !== undefined && msg.likes > 0);
            let isReplyToOp = isReply && (msg.replyto === undefined || msg.replyto == 0);
            let withReplies = (msg.replies !== undefined && msg.replies > 0);
            let isNsfw = withPhoto && (msg.tags !== undefined) && msg.tags.some(t => t.toUpperCase() == 'NSFW');

            let tagsStr = (withTags) ? '<div class="msg-tags">' + msg.tags.map(x => `<a href="//juick.com/${msg.user.uname}/?tag=${encodeURIComponent(x)}">${x}</a>`).join('') + '</div>' : '';
            let photoStr = (withPhoto) ? `<div><a href="${juickPhotoLink(msg.mid, msg.attach)}"><img ${(isNsfw ? 'class="nsfw" ' : '')}src="${setProto(msg.photo.small)}"/></a></div>` : '';
            let replyStr = (isReply)
                             ? ` in reply to <a class="whiteRabbit" href="//juick.com/${msg.mid}${isReplyToOp ? '' : '#' + msg.replyto}">#${msg.mid}${isReplyToOp ? '' : '/' + msg.replyto}</a>`
                             : '';
            let likesDiv = (withLikes) ? `<div class="likes"><a href="${linkStr}">${svgIconHtml('heart')}${msg.likes}</a></div>` : '';
            let commentsDiv = (withReplies) ? `<div class="replies"><a href="${linkStr}">${svgIconHtml('comment')}${msg.replies}</a></div>` : '';
            div.innerHTML = `
              <div class="top">
                <div class="msg-avatar"><a href="/${msg.user.uname}/"><img src="//i.juick.com/a/${msg.user.uid}.png" alt="${msg.user.uname}"></a></div>
                <div class="top-right">
                  <div class="top-right-1st">
                    <div class="title"><a href="//juick.com/${msg.user.uname}/">@${msg.user.uname}</a></div>
                    <div class="date"><a href="${linkStr}">${msg.timestamp}</a></div>
                  </div>
                  <div class="top-right-2nd">${tagsStr}</div>
                </div>
              </div>
              <div class="desc">${juickPostParse(msg.body, msgId)}</div>${photoStr}
              <div class="bottom">
                <div class="embedReply msg-links"><a href="${linkStr}">${idStr}</a>${replyStr}</div>
                <div class="right">${likesDiv}${commentsDiv}</div>
              </div>
              `;

            let allLinks = div.querySelectorAll('.desc a, .embedReply a.whiteRabbit');
            let embedContainer = div.parentNode;
            embedLinks(Array.from(allLinks).reverse(), embedContainer, true, div);

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return juickId(reResult);
      },
      linkTextUpdate: function(aNode, reResult) {
        if (isDefaultLinkText(aNode)) {
          //var isUser = (reResult[1] !== undefined);
          aNode.textContent = juickId(reResult); // + ((!isReply && isUser) ? ' (@' + reResult[1] + ')' : '');
        }
      }
    },
    {
      name: 'Jpeg and png images',
      id: 'embed_jpeg_and_png_images',
      onByDefault: false,
      ctsDefault: false,
      re: /\.(jpeg|jpg|png|svg)(:[a-zA-Z]+)?(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        let aNode2 = document.createElement('a');
        let imgNode = document.createElement('img');
        imgNode.src = aNode.href;
        aNode2.href = aNode.href;
        aNode2.appendChild(imgNode);
        return wrapIntoTag(aNode2, 'div', 'picture');
      }
    },
    {
      name: 'Gif images',
      id: 'embed_gif_images',
      onByDefault: false,
      ctsDefault: true,
      re: /\.gif(:[a-zA-Z]+)?(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        let aNode2 = document.createElement('a');
        let imgNode = document.createElement('img');
        imgNode.src = aNode.href;
        aNode2.href = aNode.href;
        aNode2.appendChild(imgNode);
        return wrapIntoTag(aNode2, 'div', 'picture');
      }
    },
    {
      name: 'Video (webm, mp4, ogv)',
      id: 'embed_webm_and_mp4_videos',
      onByDefault: false,
      ctsDefault: false,
      re: /\.(webm|mp4|m4v|ogv)(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        let video = document.createElement('video');
        video.src = aNode.href;
        video.title = aNode.href;
        video.setAttribute('controls', '');
        return wrapIntoTag(video, 'div', 'video');
      }
    },
    {
      name: 'Audio (mp3, ogg, weba, opus, m4a, oga, wav)',
      id: 'embed_sound_files',
      onByDefault: false,
      ctsDefault: false,
      re: /\.(mp3|ogg|weba|opus|m4a|oga|wav)(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        let audio = document.createElement('audio');
        audio.src = aNode.href;
        audio.title = aNode.href;
        audio.setAttribute('controls', '');
        return wrapIntoTag(audio, 'div', 'audio');
      }
    },
    {
      name: 'YouTube videos (and playlists)',
      id: 'embed_youtube_videos',
      onByDefault: false,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|m\.)?(?:youtu(?:(?:\.be\/|be\.com\/(?:v|embed)\/)([-\w]+)|be\.com\/watch)((?:(?:\?|&(?:amp;)?)(?:\w+=[-\.\w]*[-\w]))*)|youtube\.com\/playlist\?list=([-\w]*)(&(amp;)?[-\w\?=]*)?)/i,
      makeNode: function(aNode, reResult) {
        let [url, v, args, plist] = reResult;
        let iframeUrl;
        if (plist !== undefined) {
          iframeUrl = '//www.youtube-nocookie.com/embed/videoseries?list=' + plist;
        } else {
          args = args.replace(/^\?/, '');
          let arr = args.split('&').map(s => s.split('='));
          let pp = {}; arr.forEach(z => pp[z[0]] = z[1]);
          let embedArgs = { rel: '0' };
          if (pp.t != undefined) {
            const tre = /^(?:(\d+)|(?:(\d+)h)?(?:(\d+)m)?(\d+)s|(?:(\d+)h)?(\d+)m|(\d+)h)$/i;
            let [, t, h, m, s, h1, m1, h2] = tre.exec(pp.t);
            embedArgs['start'] = (+t) || ((+(h || h1 || h2 || 0))*60*60 + (+(m || m1 || 0))*60 + (+(s || 0)));
          }
          if (pp.list !== undefined) {
            embedArgs['list'] = pp.list;
          }
          v = v || pp.v;
          iframeUrl = '//www.youtube-nocookie.com/embed/' + v + '?' + Object.keys(embedArgs).map(k => `${k}=${embedArgs[k]}`).join('&');
        }
        let iframe = makeIframe(iframeUrl, '100%', '360px');
        setTimeout(() => makeResizableToRatio(iframe, 9.0/16.0), 10);
        return wrapIntoTag(iframe, 'div', 'youtube resizableV');
      }
    },
    {
      name: 'Vimeo videos',
      id: 'embed_vimeo_videos',
      onByDefault: false,
      ctsDefault: false,
      //re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:(?:video\/|album\/[\d]+\/video\/)?([\d]+)|([\w-]+)\/(?!videos)([\w-]+))/i,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/|album\/[\d]+\/video\/)?([\d]+)/i,
      makeNode: function(aNode, reResult) {
        let iframe = makeIframe('//player.vimeo.com/video/' + reResult[1], '100%', '360px');
        setTimeout(() => makeResizableToRatio(iframe, 9.0/16.0), 10);
        return wrapIntoTag(iframe, 'div', 'vimeo resizableV');
      }
    },
    {
      name: 'Dailymotion videos',
      id: 'embed_youtube_videos',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?dailymotion\.com\/video\/([a-zA-Z\d]+)(?:_[-%\w]*)?/i,
      makeNode: function(aNode, reResult) {
        let iframe = makeIframe('//www.dailymotion.com/embed/video/' + reResult[1], '100%', '360px');
        setTimeout(() => makeResizableToRatio(iframe, 9.0/16.0), 10);
        return wrapIntoTag(iframe, 'div', 'dailymotion resizableV');
      }
    },
    {
      name: 'Coub clips',
      id: 'embed_coub_clips',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?coub\.com\/(?:view|embed)\/([a-zA-Z\d]+)/i,
      makeNode: function(aNode, reResult) {
        let embedUrl = '//coub.com/embed/' + reResult[1] + '?muted=false&autostart=false&originalSize=false&startWithHD=false';
        let iframe = makeIframe(embedUrl, '100%', '360px');
        setTimeout(() => makeResizableToRatio(iframe, 9.0/16.0), 10);
        return wrapIntoTag(iframe, 'div', 'coub resizableV');
      }
    },
    {
      name: 'Bandcamp music',
      id: 'embed_bandcamp_music',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(\w+)\.bandcamp\.com\/(track|album)\/([-%\w]+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, band, pageType, pageName] = reResult;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'bandcamp embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let videoUrl, videoH;
            const metaRe = /<\s*meta\s+(?:property|name)\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            matches.forEach(m => {
              if (m[1] == 'og:video') { videoUrl = m[2]; }
              if (m[1] == 'video_height') { videoH = parseInt(m[2], 10); }
            });
            let isAlbum = pageType == 'album';
            if (isAlbum) { videoUrl = videoUrl.replace('/tracklist=false', '/tracklist=true'); }
            videoUrl = videoUrl.replace('/artwork=small', '');
            let iframe = makeIframe(videoUrl, '100%', '480px');
            removeAllFrom(div);
            div.appendChild(wrapIntoTag(iframe, 'div', 'bandcamp resizableV'));
            div.className = div.className.replace(' embed loading', '');
            let calcHeight = w => w + videoH + (isAlbum ? 162 : 0);
            setTimeout(() => makeResizable(iframe, calcHeight), 50);
          }
        });

        return div;
      }
    },
    {
      name: 'SoundCloud music',
      id: 'embed_soundcloud_music',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?soundcloud\.com\/(([\w\-\_]*)\/(?:sets\/)?(?!tracks$)([-%\w]*))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        let embedUrl = '//w.soundcloud.com/player/?url=//soundcloud.com/' + reResult[1] + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true';
        return wrapIntoTag(makeIframe(embedUrl, '100%', 450), 'div', 'soundcloud');
      }
    },
    {
      name: 'Mixcloud music',
      id: 'embed_mixcloud_music',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?mixcloud\.com\/(?!discover\/)([\w]+)\/(?!playlists\/)([-%\w]+)\/?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, author, mix] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'mixcloud embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://www.mixcloud.com/oembed/?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            div.innerHTML = json.html;
            div.className = div.className.replace(' embed loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Instagram',
      id: 'embed_instagram',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?instagram\.com\/p\/([-%\w]*)(?:\/)?(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        let iframe = makeIframe('//www.instagram.com/p/' + reResult[1] + '/embed', '100%', '722px');
        let calcHeight = w => w + 82;
        setTimeout(() => makeResizable(iframe, calcHeight), 50);
        return wrapIntoTag(iframe, 'div', 'instagram resizableV');
      }
    },
    {
      name: 'Flickr images',
      id: 'embed_flickr_images',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:(?:www\.)?flickr\.com\/photos\/([\w@-]+)\/(\d+)|flic.kr\/p\/(\w+))(?:\/)?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'flickr embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://www.flickr.com/services/oembed?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);

            let imageUrl = (json.url !== undefined) ? json.url : json.thumbnail_url; //.replace('_b.', '_z.');
            let imageStr = `<a href="${aNode.href}"><img src="${imageUrl}"></a>`;
            let typeStr = (json.flickr_type == 'photo') ? '' : ` (${json.flickr_type})`;
            let titleDiv = `<div class="title"><a href="${json.web_page}">${json.title}</a>${typeStr} by <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = `<div class="top">${titleDiv}</div>${imageStr}`;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'DeviantArt images',
      id: 'embed_deviantart_images',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/([\w-]+)\.deviantart\.com\/art\/([-%\w]+)/i,
      makeNode: function(aNode, reResult, div) {
        let [url, userId, workId] = reResult;
        let thisType = this;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'deviantart embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://backend.deviantart.com/oembed?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);

            let date = new Date(json.pubdate);
            let typeStr = (json.type == 'photo') ? '' : ` (${json.type})`;
            let dateDiv = `<div class="date">${date.toLocaleString('ru-RU')}</div>`;
            let titleDiv = `<div class="title"><a href="${url}">${json.title}</a>${typeStr} by <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = `<div class="top">${titleDiv}${dateDiv}</div>`;

            if ((json.type == 'rich') && (json.html !== undefined)) {
              div.innerHTML += `<div class="desc">${json.html}...</div>`;
            } else {
              let imageClassStr = (json.safety == 'adult') ? 'class="rating_e"' : '';
              let imageUrl = (json.fullsize_url !== undefined) ? json.fullsize_url : (json.url !== undefined) ? json.url : json.thumbnail_url;
              div.innerHTML += `<a href="${aNode.href}"><img ${imageClassStr} src="${imageUrl}"></a>`;
            }

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Imgur gifv videos',
      id: 'embed_imgur_gifv_videos',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?imgur\.com\/([a-zA-Z\d]+)\.gifv/i,
      makeNode: function(aNode, reResult) {
        let video = document.createElement('video');
        video.src = '//i.imgur.com/' + reResult[1] + '.mp4';
        video.title = aNode.href + '\n' + video.src;
        video.setAttribute('controls', '');
        return wrapIntoTag(video, 'div', 'video');
      }
    },
    {
      name: 'Imgur indirect links',
      id: 'embed_imgur_indirect_links',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?imgur\.com\/(?:(gallery|a)\/)?(?!gallery|jobs|about|blog|apps)([a-zA-Z\d]+)(?:#\d{1,2}$|#([a-zA-Z\d]+))?(\/\w+)?$/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [, albumType, contentId, albumImageId] = reResult;
        div = div || document.createElement('div');
        div.innerHTML = '<span>loading ' + naiveEllipsis(reResult[0], 60) + '</span>';
        div.className = 'imgur embed loading';
        let isAlbum = (albumType !== undefined);
        let isSpecificImage = (albumImageId !== undefined);
        let url = (isAlbum && isSpecificImage)
                    ? 'http://imgur.com/' + albumImageId
                    : 'http://imgur.com/' + (isAlbum ? albumType + '/' : '') + contentId;
        GM_xmlhttpRequest({
          method: 'GET',
          url: 'http://api.imgur.com/oembed.json?url=' + url,
          onload: function(response) {
            if (response.status != 200) {
              console.log(`Failed to load ${reResult[0]} (${url})`);
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let iframe = makeIframeHtml(json.html, '100%', 24, doc => {
              waitAndRun(
                () => (doc.querySelector('iframe') !== null),
                () => {
                  div.replaceChild(doc.querySelector('iframe'), iframe);
                  div.querySelector('span').remove();
                  div.classList.remove('embed');
                  div.classList.remove('loading');
                }
              );
            });
            div.appendChild(iframe);
          }
        });
        return div;
      }
    },
    {
      name: 'Gfycat indirect links',
      id: 'embed_gfycat_indirect_links',
      onByDefault: true,
      ctsDefault: true,
      re: /^(?:https?:)?\/\/(?:\w+\.)?gfycat\.com\/([a-zA-Z\d]+)$/i,
      makeNode: function(aNode, reResult) {
        return wrapIntoTag(makeIframe('//gfycat.com/ifr/' + reResult[1], '100%', 480), 'div', 'gfycat');
      }
    },
    {
      name: 'Twitter',
      id: 'embed_twitter_status',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:mobile\.)?twitter\.com\/([\w-]+)\/status\/([\d]+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [twitterUrl, userId, postId] = reResult;
        twitterUrl = twitterUrl.replace('mobile.','');
        div = div || document.createElement('div');
        div.textContent = 'loading ' + twitterUrl;
        div.className = 'twi embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: twitterUrl,
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            if (response.finalUrl.endsWith('account/suspended')) {
              div.textContent = 'Account @' + userId + ' is suspended';
              return;
            }
            if (response.finalUrl.indexOf('protected_redirect=true') != -1) {
              div.textContent = 'Account @' + userId + ' is protected';
              return;
            }
            let images = [];
            let userGenImg = false;
            let isVideo = false;
            let videoUrl, videoW, videoH;
            let title, description;
            const maxWidth = 620;
            const metaRe = /<\s*meta\s+property\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            matches.forEach(m => {
              if (m[1] == 'og:title') { title = m[2]; }
              if (m[1] == 'og:description') {
                description = htmlDecode(m[2])
                  .replace(/\n/g,'<br/>')
                  .replace(/\B@(\w{1,15})\b/gmi, '<a href="//twitter.com/$1">@$1</a>')
                  .replace(/#(\w+)/gmi, '<a href="//twitter.com/hashtag/$1">#$1</a>')
                  .replace(/(?:https?:)?\/\/t\.co\/([\w]+)/gmi, '<a href="$&">$&</a>');
              }
              if (m[1] == 'og:image') { images.push(m[2]); }
              if (m[1] == 'og:image:user_generated') { userGenImg = true; }
              if (m[1] == 'og:video:url') { videoUrl = m[2]; isVideo = true; }
              if (m[1] == 'og:video:height') { videoH = +m[2]; }
              if (m[1] == 'og:video:width') { videoW = +m[2]; }
            });
            const timestampMsRe = /\bdata-time-ms\s*=\s*\"([^\"]+)\"/gi;
            let timestampMsResult = timestampMsRe.exec(response.responseText);
            let dateDiv = '';
            if (timestampMsResult !== null) {
              let date = new Date(+timestampMsResult[1]);
              dateDiv = `<div class="date">${date.toLocaleString('ru-RU')}</div>`;
            }
            let titleDiv = `<div class="title">${title} (<a href="//twitter.com/${userId}">@${userId}</a>)</div>`;
            div.innerHTML = `<div class="top">${titleDiv}${dateDiv}</div><div class="desc">${description}</div>`;
            if (userGenImg) { div.innerHTML += images.map(x => { return `<a href="${x}"><img src="${x}"></a>`; }).join(''); }
            if (isVideo) {
              if (videoW > maxWidth) {
                videoH = videoH / videoW * maxWidth;
                videoW = maxWidth;
              }
              div.appendChild(makeCts(() => wrapIntoTag(makeIframe(videoUrl, videoW + 'px', videoH + 'px'), 'div'), `<img src="${images[0]}">${svgIconHtml('play')}`));
            }
            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Facebook',
      id: 'embed_facebook',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|m\.)?facebook\.com\/(?:[\w.]+\/(?:posts|videos|photos)\/[\w:./]+(?:\?[\w=%&.]+)?|(?:photo|video)\.php\?[\w=%&.]+)/i,
      makeNode: function(aNode, reResult, div) {
        setTimeout(loadScript('https://connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v2.3', false, undefined, true), 0);
        div = div || document.createElement('div');
        div.innerHTML = `<span>loading ${naiveEllipsis(reResult[0], 60)}</span><div class="fb-post" data-href="${aNode.href}" data-width="640" />`;
        div.className = 'fbEmbed embed loading';
        waitAndRun(
          () => (div.querySelector('iframe[height]') !== null),
          () => {
            div.querySelector('span').remove();
            div.classList.remove('embed');
            div.classList.remove('loading');
          },
          () => {
            console.log('Juick tweaks: time out on facebook embedding, applying workaround.');
            let embedUrl = 'https://www.facebook.com/plugins/post.php?width=640&height=570&href=' + encodeURIComponent(reResult[0]);
            div.innerHTML = '';
            div.appendChild(makeIframe(embedUrl, '100%', 570));
            div.classList.remove('embed');
            div.classList.remove('loading');
            div.classList.add('fallback');
          },
          100,
          15
        );
        return div;
      }
    },
    {
      name: 'Google+',
      id: 'embed_google_plus',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/plus\.google\.com\/(?:u\/0\/)?(\d+|\+[\w%]+)\/posts\/(\w+)/i,
      makeNode: function(aNode, reResult, div) {
        let [url, author, postId] = reResult;
        div = div || document.createElement('div');
        let id = randomId();
        div.className = 'g-post';
        div.className = 'gplusEmbed embed loading';
        div.innerHTML = `<span>loading ${naiveEllipsis(url, 60)}</span><div id="${id}" />`;
        setTimeout(loadScript('https://apis.google.com/js/plusone.js', false, () => {
          addScript('({"parsetags": "explicit"})', true);
          addScript(`gapi.post.render("${id}", {href: "${url}"});`, false);
        }, false), 0);
        waitAndRun(
          () => (div.querySelector('div[style]') !== null),
          () => {
            div.querySelector('span').remove();
            div.classList.remove('embed');
            div.classList.remove('loading');
          },
          () => { div.textContent = 'Can\'t show this post'; },
          100,
          20
        );
        return div;
      }
    },
    {
      name: 'Tumblr',
      id: 'embed_tumblr',
      onByDefault: true,
      ctsDefault: true,
      re: /^(?:https?:)?\/\/(?:([\w\-\_]+)\.)?tumblr\.com\/post\/([\d]*)(?:\/([-%\w]*))?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;
        div = div || document.createElement('div');
        div.innerHTML = '<span>loading ' + naiveEllipsis(url, 60) + '</span>';
        div.className = 'tumblr embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://www.tumblr.com/oembed/1.0?url=' + url,
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let iframe = makeIframeHtml(json.html, '100%', 24, doc => {
              waitAndRun(
                () => (doc.querySelector('iframe[height]') !== null),
                () => {
                  div.replaceChild(doc.querySelector('iframe[height]'), iframe);
                  div.querySelector('span').remove();
                  div.classList.remove('embed');
                  div.classList.remove('loading');
                }
              );
            }, () => {
              div.textContent = 'Failed to load';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
            });
            div.appendChild(iframe);
          }
        });

        return div;
      }
    },
    {
      name: 'Reddit',
      id: 'embed_reddit',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|np\.|m\.)?reddit\.com\/r\/([\w]+)\/comments\/(\w+)(?:\/(?:\w+(?:\/(\w+)?)?)?)?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;
        div = div || document.createElement('div');
        div.innerHTML = '<span>loading ' + naiveEllipsis(url, 60) + '</span>';
        div.className = 'reddit embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://www.reddit.com/oembed?url=' + encodeURIComponent(url),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let [h, ss] = splitScriptsFromHtml(json.html);
            ss.forEach(s => s.call());
            div.innerHTML += h;
            waitAndRun(
              () => { let iframe = div.querySelector('iframe'); return (iframe !== null && (parseInt(iframe.height) > 30)); },
              () => {
                div.querySelector('iframe').style.margin = '0px';
                div.querySelector('span').remove();
                div.classList.remove('embed');
                div.classList.remove('loading');
              },
              () => {
                div.textContent = 'Failed to load (time out)';
                div.className = div.className.replace(' loading', ' failed');
                turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              },
              100,
              30
            );
          }
        });

        return div;
      }
    },
    {
      name: 'WordPress',
      id: 'embed_wordpress',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(\w+)\.wordpress\.com\/(\d{4})\/(\d{2})\/(\d{2})\/([-\w%\u0400-\u04FF]+)(?:\/)?/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'wordpress embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://public-api.wordpress.com/oembed/1.0/?format=json&for=juick.com&url=' + encodeURIComponent(url),
          onload: function(response) {
            if (response.status != 200) {
              console.log('Failed to load ' + url);
              console.log(response);
              div.textContent = 'Failed to load (maybe this article can\'t be embedded)';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let titleDiv = `<div class="title">"<a href="${url}">${json.title}</a>" by <a href="${json.provider_url}">${json.provider_name}</a> / <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = `<div class="top">${titleDiv}</div><hr/><div class="desc">${json.html}</div>`;

            div.className = div.className.replace(' loading', ' loaded');
          }
        });

        return div;
      }
    },
    {
      name: 'SlideShare',
      id: 'embed_slideshare',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?slideshare\.net\/(\w+)\/([-%\w]+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, author, id] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'slideshare embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'http://www.slideshare.net/api/oembed/2?format=json&url=' + url,
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let baseSize = 640;
            let newH = 1.0 * baseSize / json.width * json.height;
            let iframeStr = json.html
                                .match(/<iframe[^>]+>[\s\S]*?<\/iframe>/i)[0]
                                .replace(/width="\d+"/i, `width="${baseSize}"`)
                                .replace(/height="\d+"/i, `height="${newH}"`);
            div.innerHTML = iframeStr;
            div.className = div.className.replace(' embed loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Gist',
      id: 'embed_gist',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/gist.github.com\/(?:([\w-]+)\/)?([A-Fa-f0-9]+)\b/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, , id] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'gistEmbed embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://gist.github.com/' + id + '.json',
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let date = new Date(json.created_at).toLocaleDateString('ru-RU');
            let titleDiv = `<div class="title">"${json.description}" by <a href="https://gist.github.com/${json.owner}">${json.owner}</a></div>`;
            let dateDiv = `<div class="date">${date}</div>`;
            let stylesheet = `<link rel="stylesheet" href="${htmlEscape(json.stylesheet)}"></link>`;
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>' + stylesheet + json.div;

            div.className = div.className.replace(' loading', ' loaded');
          }
        });

        return div;
      }
    },
    {
      name: 'JSFiddle',
      id: 'embed_jsfiddle',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?(\/\/(?:jsfiddle|fiddle.jshell)\.net\/(?:(?!embedded\b)[\w]+\/?)+)/i,
      makeNode: function(aNode, reResult) {
        let embedUrl = reResult[1].replace(/[^\/]$/, '$&/') + 'embedded/';
        return wrapIntoTag(makeIframe(embedUrl, '100%', 500), 'div', 'jsfiddle');
      }
    },
    {
      name: 'Codepen',
      id: 'embed_codepen',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/codepen\.io\/(\w+)\/(?:pen|full)\/(\w+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'codepen embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://codepen.io/api/oembed?format=json&url=' + encodeURIComponent(url.replace('/full/', '/pen/')),
          onload: function(response) {
            if (response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let json = JSON.parse(response.responseText);
            let titleDiv = `<div class="title">"${json.title}" by <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = `<div class="top">${titleDiv}</div>${json.html}`;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Pixiv',
      id: 'embed_pixiv',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/www\.pixiv\.net\/member_illust\.php\?((?:\w+=\w+&)*illust_id=(\d+)(?:&\w+=\w+)*)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, , illustId] = reResult;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'pixiv embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: url.replace(/mode=\w+/, 'mode=medium'),
          onload: function(response) {
            if (response.status != 200) {
              if (response.responseText.includes('work private')) {
                div.textContent = 'Private work';
                return;
              }
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            let isMultipage = (url.includes('mode=manga') || response.responseText.includes('member_illust.php?mode=manga'));
            const metaRe = /<\s*meta\s+(?:property|name)\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            let imageUrl, imageTitle;
            matches.forEach(m => {
              if (m[1] == 'og:image') { imageUrl = m[2]; }
              if (m[1] == 'twitter:image') { imageUrl = m[2]; }
              if (m[1] == 'twitter:title') { imageTitle = m[2]; }
            });
            if (response.responseText.includes('This work was deleted')) {
              div.textContent = 'Deleted work.';
              return;
            }
            let [, dateStr] = /<span\s+class=\"date\">([^<]+)<\/span>/.exec(response.responseText) || [];
            let [, authorId, authorName] = /<a\s+href="member\.php\?id=(\d+)">\s*<img\s+src="[^"]+"\s+alt="[^"]+"\s+title="([^"]+)"\s\/?>/i.exec(response.responseText) || [];
            //imageUrl = 'http://embed.pixiv.net/decorate.php?illust_id=' + illustId;

            let dateDiv = (dateStr !== undefined) ? `<div class="date">${dateStr}</div>` : '';
            let authorStr = (authorId !== undefined) ? ` by <a href="http://www.pixiv.net/member_illust.php?id=${authorId}">${authorName}</a>` : '';
            let titleDiv = `<div class="title">${isMultipage ? '(multipage) ' : ''}<a href="${url}">${imageTitle}</a>${authorStr}</div>`;
            div.innerHTML = `<div class="top">${titleDiv}${dateDiv}</div><a href="${aNode.href}"><img src="${imageUrl}"></a>`;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Gelbooru',
      id: 'embed_gelbooru',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?(gelbooru\.com|safebooru.org)\/index\.php\?((?:\w+=\w+&)*id=(\d+)(?:&\w+=\w+)*)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, domain, , illustId] = reResult;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + thisType.makeTitle(aNode, reResult);
        div.className = 'gelbooru booru embed loading';

        let predicates = [
          { msg: response => `${response.status} - ${response.statusText}`, p: response => response.status != 200 }
        ];
        xhrGetAsync(`http://${domain}/index.php?page=dapi&s=post&q=index&id=${illustId}`, 3000, predicates).then(response => {

          let count, id, previewUrl, rating, createdAt, change, hasNotes=false, hasComments=false;
          const attributeRe = /(\w+)="([^"]+)"/gmi;
          let matches = getAllMatchesAndCaptureGroups(attributeRe, response.responseText);
          matches.forEach(([, attr, val]) => {
            if (attr == 'count') { count = +val; }
            if (attr == 'id') { id = val; }
            if (attr == 'preview_url') { previewUrl = val; }
            if (attr == 'rating') { rating = val; }
            if (attr == 'created_at') { createdAt = new Date(val); }
            if (attr == 'change') { change = new Date(1000 * parseInt(val, 10)); }
            if (attr == 'has_notes') { hasNotes = String(val).toLowerCase() === 'true'; }
            if (attr == 'has_comments') { hasComments = String(val).toLowerCase() === 'true'; }
          });
          if (count === 0) {
            div.textContent = illustId + ' is not available';
            return;
          }

          let createdDateStr = createdAt.toLocaleDateString('ru-RU');
          let changedDateStr = change.toLocaleDateString('ru-RU');
          if (createdDateStr != changedDateStr) { createdDateStr += ` (${changedDateStr})`; }
          let ratingStr = (rating == 's') ? '' : ` (${rating})`;
          div.innerHTML = `
            <div class="top">
              <div class="title"><a href="${url}">${id}</a>${ratingStr}${hasNotes ? ' (notes)' : ''}${hasComments ? ' (comments)' : ''}</div>
              <div class="date">${createdDateStr}</div>
            </div>
            <a href="${aNode.href}"><img class="rating_${rating}" src="${previewUrl}"></a>
            `;

          div.className = div.className.replace(' loading', ' loaded');

        }).catch(({reason, response}) => {

          let msg = `Failed to load (${reason})`;
          console.log(msg);
          console.log(response);
          div.textContent = msg;
          div.className = div.className.replace(' loading', ' failed');
          turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));

        });

        return div;
      },
      makeTitle: function(aNode, [, domain, , illustId]) { return `${domain} (${illustId})`; },
      linkTextUpdate: function(aNode, [, , , illustId]) { aNode.textContent += ` (${illustId})`; }
    },
    {
      name: 'Danbooru',
      id: 'embed_danbooru',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(danbooru|safebooru)\.donmai\.us\/post(?:s|\/show)\/(\d+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, domain, id] = reResult;
        url = url.replace('http:', 'https:');

        div = div || document.createElement('div');
        div.textContent = 'loading ' + thisType.makeTitle(aNode, reResult);
        div.className = 'danbooru booru embed loading';

        let urls = (domain == 'safebooru')
          ? [`https://${domain}.donmai.us/posts/${id}.json`]
          : [`https://${domain}.donmai.us/posts/${id}.json`, `https://safebooru.donmai.us/posts/${id}.json`];
        let predicates = [
          { msg: response => `${response.status} - ${response.statusText}`, p: response => response.status != 200 }
        ];
        xhrFirstResponse(urls, 3000, predicates).then(response => {

          let [finalUrl, finalDomain, ] = thisType.re.exec(response.finalUrl);
          let json = JSON.parse(response.responseText);
          if (json.preview_file_url === undefined) {
            div.innerHTML = `<span>Can't show <a href="${finalUrl}">${id}</a> (<a href="${url}">${json.rating}</a>)</span>`;
            return;
          }

          let tagsStr = [json.tag_string_artist, json.tag_string_character, json.tag_string_copyright]
                          .filter(s => s != '')
                          .map(s => (s.count(' ') > 1) ? naiveEllipsisRight(s, 40) : `<a href="https://${finalDomain}.donmai.us/posts?tags=${encodeURIComponent(s)}">${s}</a>`)
                          .join('<br>');
          let notesStr = (json.last_noted_at !== null) ? ' (notes)' : '';
          let commentsStr = (json.last_commented_at !== null) ? ' (comments)' : '';
          let ratingStr = (json.rating == 's') ? '' : ` (<a href="${url}">${json.rating}</a>)`;
          let createdDateStr = (new Date(json.created_at)).toLocaleDateString('ru-RU');
          let updatedDateStr = (new Date(json.updated_at)).toLocaleDateString('ru-RU');
          if (createdDateStr != updatedDateStr) { createdDateStr += ` (${updatedDateStr})`; }
          div.innerHTML = `
            <div class="top">
              <div class="title"><a href="${finalUrl}">${id}</a>${ratingStr}${notesStr}${commentsStr}</div>
              <div class="date">${createdDateStr}</div>
            </div>
            <div class="booru-tags">${tagsStr}</div>
            <a href="${finalUrl}"><img class="rating_${json.rating}" src="https://${finalDomain}.donmai.us${json.preview_file_url}"></a>
            `;

          div.className = div.className.replace(' loading', ' loaded');

        }).catch(({reason, response}) => {

          let msg = `Failed to load (${reason})`;
          console.log(msg);
          console.log(response);
          div.textContent = msg;
          div.className = div.className.replace(' loading', ' failed');
          turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));

        });

        return div;
      },
      makeTitle: function(aNode, [, domain, id]) { return `${domain} (${id})`; },
      linkTextUpdate: function(aNode, [, , id]) {
        aNode.href = aNode.href.replace('http:', 'https:');
        aNode.textContent += ` (${id})`;
      }
    },
    {
      name: 'Konachan',
      id: 'embed_konachan',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/konachan\.(com|net)\/post\/show\/(\d+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, domain, id] = reResult;
        url = url.replace('.com/', '.net/');
        let unsafeUrl = url.replace('.net/', '.com/');

        div = div || document.createElement('div');
        div.textContent = 'loading ' + thisType.makeTitle(aNode, reResult);
        div.className = 'konachan booru embed loading';

        let predicates = [
          { msg: response => `${response.status} - ${response.statusText}`, p: response => response.status != 200 }
        ];
        xhrGetAsync('https://konachan.net/post.json?tags=id:' + id, 3000, predicates).then(response => {

          let json = (JSON.parse(response.responseText))[0];
          if (json === undefined || json.preview_url === undefined) {
            div.innerHTML = `<span>Can't show <a href="${url}">${id}</a> (<a href="${unsafeUrl}">${json.rating}</a>)</span>'`;
            return;
          }

          let createdDateStr = (new Date(1000 * parseInt(json.created_at, 10))).toLocaleDateString('ru-RU');
          let ratingStr = (json.rating == 's') ? '' : ` (<a href="${unsafeUrl}">${json.rating}</a>)`;
          div.innerHTML = `
            <div class="top">
              <div class="title"><a href="${url}">${id}</a>${ratingStr}</div>
              <div class="date">${createdDateStr}</div>
            </div>
            <a href="${url}"><img class="rating_${json.rating}" src="${json.preview_url}"></a>
            `;

          div.className = div.className.replace(' loading', ' loaded');

        }).catch(({reason, response}) => {

          let msg = `Failed to load (${reason})`;
          console.log(msg);
          console.log(response);
          div.textContent = msg;
          div.className = div.className.replace(' loading', ' failed');
          turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));

        });

        return div;
      },
      makeTitle: function(aNode, [, , id]) { return `konachan (${id})`; },
      linkTextUpdate: function(aNode, [, , id]) { aNode.textContent += ` (${id})`; }
    },
    {
      name: 'yande.re',
      id: 'embed_yandere',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/yande.re\/post\/show\/(\d+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, id] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + thisType.makeTitle(aNode, reResult);
        div.className = 'yandere booru embed loading';

        let predicates = [
          { msg: response => `${response.status} - ${response.statusText}`, p: response => response.status != 200 }
        ];
        xhrGetAsync('https://yande.re/post.json?tags=id:' + id, 3000, predicates).then(response => {

          let json = (JSON.parse(response.responseText))[0];
          if (json === undefined || json.preview_url === undefined) {
            div.innerHTML = `<span>Can't show <a href="${url}">${id}</a> (${json.rating})</span>`;
            return;
          }

          let ratingStr = (json.rating == 's') ? '' : ` (${json.rating})`;
          let notesStr = (json.last_noted_at !== null && json.last_noted_at !== 0) ? ' (notes)' : '';
          let commentsStr = (json.last_commented_at !== null && json.last_commented_at !== 0) ? ' (comments)' : '';
          let createdDateStr = (new Date(1000 * json.created_at)).toLocaleDateString('ru-RU');
          let updatedDateStr = (new Date(1000 * json.updated_at)).toLocaleDateString('ru-RU');
          if (createdDateStr != updatedDateStr && json.updated_at != 0) { createdDateStr += ` (${updatedDateStr})`; }
          div.innerHTML = `
            <div class="top">
              <div class="title"><a href="${url}">${id}</a>${ratingStr}${notesStr}${commentsStr}</div>
              <div class="date">${createdDateStr}</div>
            </div>
            <a href="${url}"><img class="rating_${json.rating}" src="${json.preview_url}"></a>`;

          div.className = div.className.replace(' loading', ' loaded');

        }).catch(({reason, response}) => {

          let msg = `Failed to load (${reason})`;
          console.log(msg);
          console.log(response);
          div.textContent = msg;
          div.className = div.className.replace(' loading', ' failed');
          turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));

        });

        return div;
      },
      makeTitle: function(aNode, [, id]) { return `yande.re (${id})`; },
      linkTextUpdate: function(aNode, [, id]) { aNode.textContent += ` (${id})`; }
    },
    {
      name: 'anime-pictures.net',
      id: 'embed_anime_pictures_net',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/anime-pictures.net\/pictures\/view_post\/(\d+)/i,
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url, id] = reResult;

        div = div || document.createElement('div');
        div.textContent = 'loading ' + thisType.makeTitle(aNode, reResult);
        div.className = 'yandere embed loading';

        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          onload: function(response) {
            if (response.status != 200) {
              if (response.status == 503) {
                div.textContent = 'Click to show ' + thisType.makeTitle(aNode, reResult);
              } else {
                div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              }
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult, div));
              return;
            }
            if (response.responseText.includes('must be logged in')) {
              div.innerHTML = `<span>You must be logged in to view <a href="${url}">${thisType.makeTitle(aNode, reResult)}</a></span>`;
              return;
            }

            const metaRe = /<\s*meta\s+(?:(?:property|name)\s*=\s*\"([^\"]+)\"\s+)?content\s*=\s*\"([^\"]*)\"(?:\s+(?:property|name)\s*=\s*\"([^\"]+)\")?\s*>/gmi;
            let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            let imageUrl = matches.find(m => (m[1] || m[3]) == 'og:image')[2];

            div.innerHTML = `<div class="top"><div class="title"><a href="${url}">${id}</a></div></div><a href="${aNode.href}"><img src="${imageUrl}"></a>`;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      },
      makeTitle: function(aNode, [, id]) { return `anime-pictures.net (${id})`; },
      linkTextUpdate: function(aNode, [, id]) { aNode.textContent += ` (${id})`; }
    },
    {
      name: 'Яндекс.Фотки',
      id: 'embed_yandex_fotki',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/img-fotki\.yandex\.ru\/get\/\d+\/[\w\.]+\/[\w]+$/i,
      makeNode: function(aNode, reResult) {
        let aNode2 = document.createElement('a');
        let imgNode = document.createElement('img');
        imgNode.src = aNode.href;
        aNode2.href = aNode.href;
        aNode2.appendChild(imgNode);
        return wrapIntoTag(aNode2, 'div');
      }
    },
    {
      name: 'Use meta for other links (whitelist)',
      id: 'embed_whitelisted_domains',
      onByDefault: true,
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?!juick\.com\b).*/i,
      match: function(aNode, reResult) {
        let domain = aNode.hostname.replace(/^www\./, '');
        let domainsWhitelist = GM_getValue('domains_whitelist', getDefaultDomainWhitelist().join('\n')).split(/\r?\n/);
        return domainsWhitelist.some(w => matchWildcard(domain, w));
      },
      makeNode: function(aNode, reResult, div) {
        let thisType = this;
        let [url] = reResult;
        let domain = aNode.hostname;
        div = div || document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'other embed loading ' + domain.replace(/\./g, '_');

        let unembed = (reason) => {
          if (reason !== undefined) { console.log(`${reason} - ${url}`); }
          div.innerHTML = '';
          div.className = 'notEmbed';
          aNode.classList.add('notEmbed');
        };

        GM_xmlhttpRequest({
          method: 'HEAD',
          url: url,
          timeout: 1000,
          onload: function(response1) {
            if (response1.status != 200) {
              unembed(`Failed to load (${response1.status} - ${response1.statusText})`);
              return;
            }
            const headRe = /^([\w-]+): (.+)$/gmi;
            let headerMatches = getAllMatchesAndCaptureGroups(headRe, response1.responseHeaders);
            let [, , contentType] = headerMatches.find(m => (m[1].toLowerCase() == 'content-type'));

            if (contentType !== undefined && contentType.match(/^text\/html\b/i)) {

              GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                timeout: 1500,
                onload: function(response) {
                  if (response.status != 200) {
                    unembed(`Failed to load (${response.status} - ${response.statusText})`);
                    return;
                  }

                  const metaRe = /<\s*meta\s+(?:(?:property|name)\s*=\s*[\"']([^\"']+)[\"']\s+)?content\s*=\s*\"([^\"]*)\"(?:\s+(?:property|name)\s*=\s*\"([^\"]+)\")?(?:\s*(?:\w+=\"[^\"]*\"))*\s*\/?>/gmi;
                  const titleRe = /<title>([\s\S]+?)<\/title>/gmi;
                  let [, basicTitle] = titleRe.exec(response.responseText) || [];
                  let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText).map(m => ({ k: (m[1] || m[3]).toLowerCase(), v: m[2] }));
                  let meta = {}; [].forEach.call(matches, m => { meta[m.k] = m.v; });
                  let title = meta['twitter:title'] || meta['og:title'] || meta['title'] || basicTitle || meta['sailthru.title'];
                  let image = meta['twitter:image'] || meta['twitter:image:src'] || meta['og:image'] || meta['sailthru.image.full'];
                  let description = longest([meta['og:description'], meta['twitter:description'], meta['description'], meta['sailthru.description']]);

                  if (title !== undefined && description !== undefined && (title.length > 0) && (description.length > 0)) { // enough meta content to embed
                    let titleDiv = `<div class="title"><a href="${url}">${title}</a></div>`;
                    let imageStr = (image !== undefined) ? `<a href="${url}"><img src="${image}" /></a>` : '';
                    description = htmlDecode(description).replace(/\n+/g,'<br/>');
                    div.innerHTML = `<div class="top">${titleDiv}</div>${imageStr}<div class="desc">${description}</div>`;
                    div.className = div.className.replace(' loading', '');
                  } else {
                    unembed();
                  }
                },
                ontimeout: function(response) {
                  unembed('timeout');
                },
                onerror: function(response) {
                  unembed('some error');
                }
              }); // end of GET request

            } else {
              unembed('not text/html');
              console.log(response1.responseHeaders);
            }
          },
          ontimeout: function(response1) {
            unembed('timeout');
          },
          onerror: function(response1) {
            unembed('some error');
          }
        }); // end of HEAD request

        return div;
      }
    }
  ];
}

function getDefaultDomainWhitelist() {
  return [
    'lenta.ru',
    'meduza.io',
    'rbc.ru',
    'tjournal.ru',
    '*.newsru.com',
    '*.itar-tass.com',
    'tass.ru',
    'rublacklist.net',
    'mk.ru',
    'kp.ru',
    'gazeta.ru',
    'republic.ru',
    'bash.im',
    'ixbt.com',
    'techxplore.com',
    'medicalxpress.com',
    'phys.org',
    'techcrunch.com',
    'bbc.com',
    'nplus1.ru',
    'elementy.ru',
    'news.tut.by',
    'imdb.com'
  ];
}

function embedLink(aNode, linkTypes, container, alwaysCts, afterNode) {
  let anyEmbed = false;
  let linkId = (aNode.href.replace(/^https?:/i, '').replace(/\'/i,''));
  let sameEmbed = container.querySelector(`*[data-linkid=\'${linkId}\']`); // do not embed the same thing twice
  if (sameEmbed === null) {
    anyEmbed = [].some.call(linkTypes, function(linkType) {
      if (GM_getValue(linkType.id, linkType.onByDefault)) {
        let reResult = linkType.re.exec(aNode.href);
        if (reResult !== null) {
          if ((linkType.match !== undefined) && (linkType.match(aNode, reResult) === false)) { return false; }
          let newNode;
          let isCts = alwaysCts || GM_getValue('cts_' + linkType.id, linkType.ctsDefault);
          if (isCts) {
            let linkTitle = (linkType.makeTitle !== undefined) ? linkType.makeTitle(aNode, reResult) : naiveEllipsis(aNode.href, 55);
            newNode = makeCts(() => linkType.makeNode(aNode, reResult, newNode), 'Click to show: ' + linkTitle);
          } else {
            newNode = linkType.makeNode(aNode, reResult);
          }
          if (!newNode) { return false; }
          aNode.classList.add('embedLink');
          if (GM_getValue('enable_arrows', true)) {
            aNode.classList.add('arrow');
          }
          if (GM_getValue('enable_link_text_update', true) && (linkType.linkTextUpdate !== undefined)) {
            linkType.linkTextUpdate(aNode, reResult);
          }
          newNode.setAttribute('data-linkid', linkId);
          if (afterNode !== undefined) {
            insertAfter(newNode, afterNode);
          } else {
            container.appendChild(newNode);
          }
          setHighlightOnHover(aNode, newNode);
          //setMoveIntoViewOnHover(aNode, aNode, newNode, 5, 30);
          return true;
        }
      }
    });
  } else {
    if (GM_getValue('enable_arrows', true)) { aNode.classList.add('arrow'); }
    setHighlightOnHover(aNode, sameEmbed);
    //setMoveIntoViewOnHover(aNode, aNode, newNode, 5, 30);
  }
  return anyEmbed;
}

function embedLinks(aNodes, container, alwaysCts, afterNode) {
  let anyEmbed = false;
  let embeddableLinkTypes = getEmbeddableLinkTypes();
  Array.from(aNodes).forEach(aNode => {
    let isEmbedded = embedLink(aNode, embeddableLinkTypes, container, alwaysCts, afterNode);
    anyEmbed = anyEmbed || isEmbedded;
  });
  return anyEmbed;
}

function splitUsersAndTagsLists(str) {
  let items = str.split(/[\s,]+/);
  let users = items.filter(x => x.startsWith('@')).map(x => x.replace('@','').toLowerCase());
  let tags = items.filter(x => x.startsWith('*')).map(x => x.replace('*','').toLowerCase());
  return [users, tags];
}

function articleInfo(article) {
  let tagNodes = article.querySelectorAll('.msg-tags > *');
  let tags = Array.from(tagNodes).map(d => d.textContent.toLowerCase());
  return { userId: getPostUserId(article), tags: tags };
}

function isFilteredX(x, filteredUsers, filteredTags) {
  let {userId, tags} = articleInfo(x);
  return (filteredUsers !== undefined && filteredUsers.indexOf(userId.toLowerCase()) !== -1)
         || (intersect(tags, filteredTags).length > 0);
}

function embedLinksToX(x, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags) {
  let isCtsPost = isFilteredX(x, ctsUsers, ctsTags);
  let allLinks = x.querySelectorAll(allLinksSelector);

  let existingContainer = x.querySelector('div.embedContainer');
  if (existingContainer !== null) {
    embedLinks(allLinks, existingContainer, isCtsPost);
  } else {
    let embedContainer = document.createElement('div');
    embedContainer.className = 'embedContainer';

    let anyEmbed = embedLinks(allLinks, embedContainer, isCtsPost);
    if (anyEmbed) {
      let beforeNode = x.querySelector(beforeNodeSelector);
      x.insertBefore(embedContainer, beforeNode);
    }
  }
}

function embedLinksToArticles() {
  let [ctsUsers, ctsTags] = splitUsersAndTagsLists(GM_getValue('cts_users_and_tags', ''));
  let beforeNodeSelector = 'nav.l';
  let allLinksSelector = 'p:not(.ir) a, pre a';
  Array.from(document.querySelectorAll('#content > article')).forEach(article => {
    embedLinksToX(article, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags);
  });
}

function embedLinksToPost() {
  let [ctsUsers, ctsTags] = splitUsersAndTagsLists(GM_getValue('cts_users_and_tags', ''));
  let beforeNodeSelector = '.msg-txt + *';
  let allLinksSelector = '.msg-txt a';
  Array.from(document.querySelectorAll('#content .msg-cont')).forEach(msg => {
    embedLinksToX(msg, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags);
  });
}

function filterArticles() {
  let [filteredUsers, filteredTags] = splitUsersAndTagsLists(GM_getValue('filtered_users_and_tags', ''));
  let keepHeader = GM_getValue('filtered_posts_keep_header', true);
  Array.from(document.querySelectorAll('#content > article'))
       .filter(article => isFilteredX(article, filteredUsers, filteredTags))
       .forEach(article => {
         if (keepHeader) {
           article.classList.add('filtered');
           while (article.children.length > 1) { article.removeChild(article.lastChild); }
         } else {
           article.remove();
         }
       });
}

function filterPostComments() {
  if (!GM_getValue('filter_comments_too', false)) { return; }
  let [filteredUsers, filteredTags] = splitUsersAndTagsLists(GM_getValue('filtered_users_and_tags', ''));
  let keepHeader = GM_getValue('filtered_posts_keep_header', true);
  Array.from(document.querySelectorAll('#content #replies .msg-cont')).forEach(reply => {
    let isFilteredComment = isFilteredX(reply, filteredUsers, filteredTags);
    if (isFilteredComment) {
      reply.classList.add('filteredComment');
      reply.querySelector('.msg-txt').remove();
      reply.querySelector('.msg-comment').remove();
      let linksDiv = reply.querySelector('.msg-links');
      linksDiv.querySelector('.a-thread-comment').remove();
      linksDiv.innerHTML = linksDiv.innerHTML.replace(' · ', '');
      let media = reply.querySelector('.msg-comment');
      if (media !== null) { media.remove(); }
      if (!keepHeader) {
        reply.classList.add('headless');
        reply.querySelector('.msg-header').remove();
      }
    }
  });
}

function setHighlightOnHover(hoverTarget, highlightable) {
  highlightable.classList.toggle('highlightable', true);
  hoverTarget.addEventListener('mouseenter', e => highlightable.classList.toggle('hoverHighlight', true), false);
  hoverTarget.addEventListener('mouseleave', e => highlightable.classList.toggle('hoverHighlight', false), false);
}

function setMoveIntoViewOnHover(hoverTarget, avoidTarget, movable, avoidMargin=0, threshold=0) {

  function checkFullyVisible(node, threshold=0) {
    let rect = node.getBoundingClientRect();
    let viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    let above = rect.top + threshold < 0;
    let below = rect.bottom - threshold - viewHeight >= 0;
    return !above && !below;
  }

  function resetMovementArtifacts(node) {
    node.removeEventListener('transitionend', afterBackTransition, false);
    node.classList.toggle('moved', false);
    node.classList.toggle('hoverHighlight', false);
  }

  function moveNodeIntoView(node, avoidNode, avoidMargin=0, threshold=0) {
    resetMovementArtifacts(node);
    node.classList.toggle('hoverHighlight', true);
    let onscreen = checkFullyVisible(node, threshold);
    if (!onscreen) {
      let parentNodeRect = node.parentNode.getBoundingClientRect();
      let avoidNodeRect = avoidNode.getBoundingClientRect();
      let [w, h] = [node.offsetWidth, node.offsetHeight];
      let s = getComputedStyle(node);
      let [marginT, marginR, marginB, marginL] = [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft];
      let vtop = parentNodeRect.top;
      let atop = avoidNodeRect.top - avoidMargin;
      let ah = avoidNodeRect.height + 2*avoidMargin;
      let wh = window.innerHeight;
      let isAbove = (vtop < atop);
      let moveAmount = isAbove ? (0-vtop-h+atop) : (0-vtop+atop+ah);
      let availableSpace = isAbove ? (atop - avoidMargin) : (wh - atop - ah + avoidMargin);
      if ((Math.abs(moveAmount) > threshold) && (availableSpace > threshold*2)) {
        node.classList.toggle('moved', true);
        node.style.marginTop = `${moveAmount}px`;
        node.parentNode
            .querySelector('.movable + .placeholder')
            .setAttribute('style', `width: ${w}px; height: ${h}px; margin: ${marginT} ${marginR} ${marginB} ${marginL};`);
      }
    }
  }

  function afterBackTransition(event) { resetMovementArtifacts(event.target); }

  function moveNodeBack(node) {
    const eventType = 'transitionend';
    if (node.classList.contains('moved')) {
      let parentNodeRect = node.parentNode.getBoundingClientRect();
      let nodeRect = node.getBoundingClientRect();
      if (Math.abs(parentNodeRect.top - nodeRect.top) > 1) {
        node.addEventListener(eventType, afterBackTransition, false);
      } else {
        resetMovementArtifacts(node);
      }
      node.style.marginTop = '';
    } else {
      node.classList.toggle('hoverHighlight', false);
    }
  }

  hoverTarget.addEventListener('mouseenter', e => { moveNodeIntoView(movable, avoidTarget, avoidMargin, threshold); }, false);
  hoverTarget.addEventListener('mouseleave', e => { moveNodeBack(movable); }, false);
  movable.parentNode.classList.toggle('movableContainer', true);
  movable.classList.toggle('movable', true);
  if (!movable.parentNode.querySelector('.movable + .placeholder')) {
    let pldr = document.createElement('div');
    pldr.className = 'placeholder';
    insertAfter(pldr, movable);
  }
}

function bringCommentsIntoViewOnHover() {
  if (!GM_getValue('enable_move_comment_into_view', true)) { return; }
  let replies = Array.from(document.querySelectorAll('#replies li'));
  let nodes = {};
  replies.forEach(r => { nodes[r.id] = r.querySelector('div.msg-cont'); });
  replies.forEach(r => {
    let replyToLink = Array.from(r.querySelectorAll('.msg-links a')).find(a => /\d+/.test(a.hash));
    if (replyToLink) {
      let rtid = replyToLink.hash.replace(/^#/, '');
      setMoveIntoViewOnHover(replyToLink, nodes[r.id], nodes[rtid], 5, 30);
    }
  });
}

function checkReply(allPostsSelector, replySelector) {
  let userId = getMyUserId();
  Array.from(document.querySelectorAll(allPostsSelector))
       .filter(p => (p.querySelector(replySelector) === null) && (getPostUserId(p) != userId))
       .forEach(p => p.classList.add('readonly'));
}

function checkReplyArticles() {
  if (!GM_getValue('enable_blocklisters_styling', false)) { return; }
  checkReply('#content > article', 'nav.l > a.a-comment');
}

function checkReplyPost() {
  if (!GM_getValue('enable_blocklisters_styling', false)) { return; }
  checkReply('#content div.msg-cont', 'div.msg-comment');
}

function getUserscriptSettings() {
  return [
    {
      name: 'Пользовательские теги (/user/?tag=) вместо общих (/tag/) - в постах',
      id: 'enable_user_tag_links',
      enabledByDefault: true
    },
    {
      name: 'Пользовательские теги (/user/?tag=) вместо общих (/tag/) - в ленте',
      id: 'enable_user_tag_links_in_feed',
      enabledByDefault: false
    },
    {
      name: 'Теги на форме редактирования нового поста (/#post)',
      id: 'enable_tags_on_new_post_form',
      enabledByDefault: true
    },
    {
      name: 'Сортировка и цветовое кодирование тегов на странице /user/tags',
      id: 'enable_tags_page_coloring',
      enabledByDefault: true
    },
    {
      name: 'Цветовое кодирование тегов в левой колонке',
      id: 'enable_left_column_tags_coloring',
      enabledByDefault: true
    },
    {
      name: 'Заголовок и управление подпиской на странице тега /tag/...',
      id: 'enable_tag_page_toolbar',
      enabledByDefault: true
    },
    {
      name: 'Min-width для тегов',
      id: 'enable_tags_min_width',
      enabledByDefault: true
    },
    {
      name: 'Ссылки для удаления комментариев',
      id: 'enable_comment_removal_links',
      enabledByDefault: true
    },
    {
      name: 'Ссылка для редактирования тегов поста',
      id: 'enable_tags_editing_link',
      enabledByDefault: true
    },
    {
      name: 'Большая аватарка в левой колонке',
      id: 'enable_big_avatar',
      enabledByDefault: true
    },
    {
      name: 'Ссылки для перехода к постам пользователя за определённый год',
      id: 'enable_year_links',
      enabledByDefault: true
    },
    {
      name: 'Ссылка на настройки в левой колонке на своей странице',
      id: 'enable_settings_link',
      enabledByDefault: true
    },
    {
      name: 'Сортировка подписок/подписчиков по дате последнего сообщения',
      id: 'enable_users_sorting',
      enabledByDefault: true
    },
    {
      name: 'Статистика рекомендаций',
      id: 'enable_irecommend',
      enabledByDefault: true
    },
    {
      name: 'Упоминания (ссылка на поиск)',
      id: 'enable_mentions_search',
      enabledByDefault: true
    },
    {
      name: 'Посты и комментарии, на которые нельзя ответить, — более бледные',
      id: 'enable_blocklisters_styling',
      enabledByDefault: false
    },
    {
      name: 'Показывать комментарии при наведении на ссылку "в ответ на /x"',
      id: 'enable_move_comment_into_view',
      enabledByDefault: true
    },
    {
      name: 'Стрелочки ("↓")',
      id: 'enable_arrows',
      enabledByDefault: true
    },
    {
      name: 'Скрипт активен на beta.juick.com',
      id: 'enable_beta',
      enabledByDefault: true
    },
    {
      name: 'Переключатель между juick.com и beta.juick.com',
      id: 'enable_toggle_beta',
      enabledByDefault: false
    },
    {
      name: '(только для разработчиков) умвр',
      id: 'enable_local',
      enabledByDefault: false
    },
    {
      name: 'emergency fixes',
      id: 'enable_emergency_fixes',
      enabledByDefault: true
    },
    {
      name: 'Take care of NSFW tagged posts in feed',
      id: 'enable_mark_nsfw_posts_in_feed',
      enabledByDefault: true
    }
  ];
}

function makeSettingsCheckbox(caption, id, defaultState) {
  let label = document.createElement('label');
  let cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = GM_getValue(id, defaultState);
  cb.onclick = (e => GM_setValue(id, cb.checked));
  label.appendChild(cb);
  label.appendChild(document.createTextNode(caption));
  return label;
}

function makeSettingsTextbox(caption, id, defaultString, placeholder) {
  let label = document.createElement('label');
  let wrapper = document.createElement('div');
  wrapper.className = 'ta-wrapper';
  let textarea = document.createElement('textarea');
  textarea.className = id;
  textarea.placeholder = placeholder;
  textarea.title = placeholder;
  textarea.value = GM_getValue(id, defaultString);
  textarea.oninput = (e => GM_setValue(id, textarea.value));
  wrapper.appendChild(textarea);
  label.appendChild(document.createTextNode('' + caption + ': '));
  label.appendChild(wrapper);
  return label;
}

function showUserscriptSettings() {
  let contentBlock = document.querySelector('#content > article');
  removeAllFrom(contentBlock);

  let h1 = document.createElement('h1');
  h1.textContent = 'Tweaks';

  let uiFieldset = document.createElement('fieldset');
  { // UI
    let uiLegend = document.createElement('legend');
    uiLegend.textContent = 'UI';
    uiFieldset.appendChild(uiLegend);

    let list1 = document.createElement('ul');
    let allSettings = getUserscriptSettings();
    allSettings.forEach(item => {
      let liNode = document.createElement('li');
      let p = document.createElement('p');
      p.appendChild(makeSettingsCheckbox(item.name, item.id, item.enabledByDefault));
      liNode.appendChild(p);
      list1.appendChild(liNode);
    });
    uiFieldset.appendChild(list1);
  }

  let embeddingFieldset = document.createElement('fieldset');
  { // Embedding
    let legend2 = document.createElement('legend');
    legend2.textContent = 'Embedding';
    embeddingFieldset.appendChild(legend2);

    let table2 = document.createElement('table');
    table2.style.width = '100%';
    getEmbeddableLinkTypes().forEach(linkType => {
      let row = document.createElement('tr');
      row.appendChild(wrapIntoTag(makeSettingsCheckbox(linkType.name, linkType.id, linkType.onByDefault), 'td'));
      row.appendChild(wrapIntoTag(makeSettingsCheckbox('Click to show', 'cts_' + linkType.id, linkType.ctsDefault), 'td'));
      table2.appendChild(row);
    });
    embeddingFieldset.appendChild(table2);

    let domainsWhitelist = makeSettingsTextbox('Domains whitelist ("*" wildcard is supported)', 'domains_whitelist', getDefaultDomainWhitelist().join('\n'), 'One domain per line. "*" wildcard is supported');
    embeddingFieldset.appendChild(wrapIntoTag(domainsWhitelist, 'p'));

    let moveIntoViewOnSamePageCheckbox = makeSettingsCheckbox('Ссылки на ту же страницу не встраивать, а показывать при наведении', 'enable_move_into_view_on_same_page', true);
    let updateLinkTextCheckbox = makeSettingsCheckbox('Обновлять текст ссылок, если возможно (например, "juick.com" на #123456/7)', 'enable_link_text_update', true);
    let ctsUsersAndTags = makeSettingsTextbox('Всегда использовать "Click to show" для этих юзеров и тегов в ленте', 'cts_users_and_tags', '', '@users and *tags separated with space or comma');
    ctsUsersAndTags.style = 'display: flex; flex-direction: column; align-items: stretch;';
    embeddingFieldset.appendChild(document.createElement('hr'));
    embeddingFieldset.appendChild(wrapIntoTag(ctsUsersAndTags, 'p'));
    embeddingFieldset.appendChild(wrapIntoTag(updateLinkTextCheckbox, 'p'));
    embeddingFieldset.appendChild(wrapIntoTag(moveIntoViewOnSamePageCheckbox, 'p'));
  }

  let filterinFieldset = document.createElement('fieldset');
  { // Filtering
    let legend4 = document.createElement('legend');
    legend4.textContent = 'Filtering';
    filterinFieldset.appendChild(legend4);

    let filteringUsersAndTags = makeSettingsTextbox('Убирать посты этих юзеров или с этими тегами из общей ленты', 'filtered_users_and_tags', '', '@users and *tags separated with space or comma');
    filteringUsersAndTags.style = 'display: flex; flex-direction: column; align-items: stretch;';
    let keepHeadersCheckbox = makeSettingsCheckbox('Оставлять заголовки постов', 'filtered_posts_keep_header', true);
    let filterCommentsCheckbox = makeSettingsCheckbox('Также фильтровать комментарии этих юзеров', 'filter_comments_too', false);
    filterinFieldset.appendChild(wrapIntoTag(filteringUsersAndTags, 'p'));
    filterinFieldset.appendChild(wrapIntoTag(keepHeadersCheckbox, 'p'));
    filterinFieldset.appendChild(wrapIntoTag(filterCommentsCheckbox, 'p'));
  }

  let resetButton = document.createElement('button');
  { // Reset button
    resetButton.textContent='Reset userscript settings to default';
    resetButton.onclick = function(e){
      if (!confirm('Are you sure you want to reset Tweaks settings to default?')) { return; }
      GM_listValues().slice().forEach(key => GM_deleteValue(key));
      showUserscriptSettings();
      alert('Done!');
    };
  }

  let versionInfoFieldset = document.createElement('fieldset');
  { // Version info
    let legend3 = document.createElement('legend');
    legend3.textContent = 'Version info';
    let ver1 = document.createElement('p');
    let ver2 = document.createElement('p');
    ver1.textContent = 'Greasemonkey (or your script runner) version: ' + GM_info.version;
    ver2.textContent = 'Userscript version: ' + GM_info.script.version;
    versionInfoFieldset.appendChild(legend3);
    versionInfoFieldset.appendChild(ver1);
    versionInfoFieldset.appendChild(ver2);
  }

  let support = document.createElement('p');
  support.innerHTML = 'Feedback and feature requests <a href="//juick.com/killy/?tag=userscript">here</a>.';

  contentBlock.appendChild(h1);
  contentBlock.appendChild(uiFieldset);
  contentBlock.appendChild(embeddingFieldset);
  contentBlock.appendChild(filterinFieldset);
  contentBlock.appendChild(resetButton);
  contentBlock.appendChild(versionInfoFieldset);
  contentBlock.appendChild(support);

  contentBlock.className = 'tweaksSettings';
}

function addTweaksSettingsButton() {
  let tabsList = document.querySelector('#pagetabs > ul');
  let liNode = document.createElement('li');
  let aNode = document.createElement('a');
  aNode.textContent = 'Tweaks';
  aNode.href = '#tweaks';
  aNode.onclick = (e => { e.preventDefault(); showUserscriptSettings(); });
  liNode.appendChild(aNode);
  tabsList.appendChild(liNode);
}

function updateUserRecommendationStats(userId, pagesPerCall) {
  let contentBlock = document.querySelector('section#content');
  removeAllFrom(contentBlock);

  let article = document.createElement('article');
  let userCounters = {};
  let totalRecs = 0;

  function recUpdate(depth, oldestMid, oldestDate) {
    if (depth <= 0) { return; }

    let beforeStr = (oldestMid !== undefined) ? '&before=' + oldestMid : '';
    let url = `//juick.com/${userId}/?show=recomm${beforeStr}`;
    GM_xmlhttpRequest({
      method: 'GET',
      url: setProto(url),
      onload: function(response) {
        if (response.status != 200) {
          console.log(`${userId}: failed with ${response.status}, ${response.statusText}`);
          return;
        }

        const articleRe = /<article[\s\S]+?<\/article>/gmi;
        let articles = response.responseText.match(articleRe);
        if (articles === null) {
          console.log('no more articles in response');
          return;
        }

        totalRecs = totalRecs + articles.length;
        let hasMore = (articles.length > 15);
        let oldestArticle = articles[articles.length - 1];

        const midRe = /data-mid="(\d+)"/i;
        const dateRe = /datetime\=\"([^\"]+) ([^\"]+)\"/i;
        let [, oldestMid] = midRe.exec(oldestArticle);
        let [, oldestDatePart, oldestTimePart] = dateRe.exec(oldestArticle);
        oldestDate = new Date(`${oldestDatePart}T${oldestTimePart}`);

        const userRe = /@<a href="\/([-\w]+)\/">/i;
        const userAvatarRe = /<img src="\/\/i\.juick\.com\/a\/\d+\.png" alt="[^\"]+"\/?>/i;
        let authors = articles.map(article => {
          let postAuthorId = (userRe.exec(article))[1];
          let postAuthorAvatar = (userAvatarRe.exec(article))[0];
          return {id: postAuthorId, avatar: postAuthorAvatar};
        });
        for (let i in authors) {
          let id = authors[i].id;
          let avatar = authors[i].avatar;
          if (id in userCounters) {
            userCounters[id].recs = userCounters[id].recs + 1;
          } else {
            userCounters[id] = {id: id, avatar: avatar, recs: 1};
          }
        }

        let sortedUsers = Object.values(userCounters).sort((a, b) => b.recs - a.recs);

        removeAllFrom(article);

        if (hasMore && (depth == 1)) {
          let moreButton = document.createElement('button');
          moreButton.style = 'float: right;';
          moreButton.textContent = 'Check older recommendations';
          moreButton.onclick = (e => recUpdate(pagesPerCall, oldestMid, oldestDate));
          article.appendChild(moreButton);
        }

        let datePNode = document.createElement('p');
        datePNode.textContent = `${totalRecs} recommendations since ${oldestDate.toLocaleDateString('ru-RU')}`;
        article.appendChild(datePNode);

        let avgPNode = document.createElement('p');
        let now = new Date();
        let days = ((now - oldestDate) / 1000 / 60 / 60 / 24);
        let avg = totalRecs / days;
        avgPNode.textContent = '' + avg.toFixed(3) + ' recommendations per day';
        article.appendChild(avgPNode);

        let userStrings = sortedUsers.map(x => `<li><a href="/${x.id}/">${x.avatar}${x.id}</a> / ${x.recs}</li>`);
        let ulNode = document.createElement('ul');
        ulNode.className = 'recUsers';
        ulNode.innerHTML = userStrings.join('');
        article.appendChild(ulNode);

        if (hasMore) {
          setTimeout(() => recUpdate(depth - 1, oldestMid, oldestDate), 100);
        } else {
          console.log('no more recommendations');
        }
      }
    });

  } // recUpdate

  recUpdate(pagesPerCall, undefined, undefined);

  contentBlock.appendChild(article);
}

function addIRecommendLink() {
  if (!GM_getValue('enable_irecommend', true)) { return; }
  let userId = getColumnUserId();
  let asideColumn = document.querySelector('aside#column');
  let ustatsList = asideColumn.querySelector('#ustats > ul');
  let li2 = ustatsList.querySelector('li:nth-child(2)');
  let liNode = document.createElement('li');
  let aNode = document.createElement('a');
  aNode.textContent = 'Я рекомендую';
  aNode.href = '#irecommend';
  aNode.onclick = (e => { e.preventDefault(); updateUserRecommendationStats(userId, 3); });
  liNode.appendChild(aNode);
  insertAfter(liNode, li2);
}

function addMentionsLink() {
  if (!GM_getValue('enable_mentions_search', true)) { return; }
  let userId = getColumnUserId();
  let asideColumn = document.querySelector('aside#column');
  let ustatsList = asideColumn.querySelector('#ustats > ul');
  let li2 = ustatsList.querySelector('li:nth-child(2)');
  let liNode = document.createElement('li');
  let aNode = document.createElement('a');
  aNode.textContent = 'Упоминания';
  aNode.href = '//juick.com/?search=%40' + userId;
  liNode.appendChild(aNode);
  insertAfter(liNode, li2);
}

function addToggleBetaLink() {
  if (!GM_getValue('enable_toggle_beta', false)) { return; }
  if (isLocal) { return; }
  let aNode = document.createElement('a');
  aNode.id = 'toggleBetaLink';
  aNode.href = '#toggleBeta';
  aNode.textContent = isBeta ? 'beta - go to prod' : 'prod - go to beta';
  aNode.onclick = (e => {
    e.preventDefault();
    window.location.hostname = isBeta ? 'juick.com' : 'beta.juick.com';
  });

  document.getElementById('body').appendChild(aNode);
}

function addLocalWarning () {
  if (isLocal) {
    let warn = document.createElement('div');
    warn.id = 'localWarning';
    warn.textContent = 'userscript is active';

    document.getElementById('body').appendChild(warn);
  }
}

function addStyle() {
  let [br, bg, bb] = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor, [255,255,255]);
  let [tr, tg, tb] = parseRgbColor(getComputedStyle(document.body).color, [34,34,34]);
  const rgba = (r,g,b,a) => `rgba(${r},${g},${b},${a})`;
  let bg10 = rgba(br, bg, bb, 1.0);
  let color10 = rgba(tr, tg, tb, 1.0);
  let color07 = rgba(tr, tg, tb, 0.7);
  let color03 = rgba(tr, tg, tb, 0.3);
  let color02 = rgba(tr, tg, tb, 0.2);

  if (GM_getValue('enable_tags_min_width', true)) {
    GM_addStyle('.tagsContainer a { min-width: 25px; display: inline-block; text-align: center; }');
  }
  GM_addStyle(`
    .embedContainer { margin-top: 0.7em; display: flex; flex-wrap: wrap; padding: 0.15em; margin-left: -0.3em; margin-right: -0.3em; }
    .embedContainer > * { box-sizing: border-box; flex-grow: 1; margin: 0.15em; min-width: 49%; }
    .embedContainer .picture img { display: block; }
    .embedContainer img,
    .embedContainer video { max-width: 100%; max-height: 80vh; }
    .embedContainer .audio { min-width: 90%; }
    .embedContainer audio { width: 100%; }
    .embedContainer iframe { overflow:hidden; resize: vertical; }
    .embedContainer > .embed { width: 100%; border: 1px solid ${color02}; padding: 0.5em; display: flex; flex-direction: column; }
    .embedContainer > .embed.loading,
    .embedContainer > .embed.failed { text-align: center; color: ${color07}; padding: 0; }
    .embedContainer > .embed.failed { cursor: pointer; }
    .embedContainer .embed .cts { margin: 0; }
    .embed .top,
    .embed .bottom { display: flex; flex-shrink: 0; justify-content: space-between; }
    .embed .top { margin-bottom: 0.5em; }
    .embed .date,
    .embed .date > a,
    .embed .likes > a,
    .embed .replies > a,
    .embed .title { color: ${color07}; }
    .embed .date { font-size: small; text-align: right; }
    .embed .likes,
    .embed .replies { font-size: small; white-space:nowrap; margin-left: 12px; }
    .embed .likes .icon,
    .embed .replies .icon { width: 20px; height: 20px; }
    .embed .desc { margin-bottom: 0.5em; max-height: 55vh; overflow-y: auto; }
    .twi.embed > .cts > .placeholder { display: inline-block; }
    .embedContainer > .embed.twi .cts > .placeholder { border: 0; }
    .embedContainer > .youtube { min-width: 90%; }
    .embedContainer > .bandcamp:not(.loading):not(.cts) { max-width: 480px; }
    .juickEmbed > .top > .top-right { display: flex; flex-direction: column; flex: 1; }
    .juickEmbed > .top > .top-right > .top-right-1st { display: flex; flex-direction: row; justify-content: space-between; }
    .juickEmbed > .bottom > .right { margin-top: 5px; display: flex; flex: 0; }
    .gistEmbed .gist-file .gist-data .blob-wrapper,
    .gistEmbed .gist-file .gist-data article { max-height: 70vh; overflow-y: auto; }
    .gistEmbed.embed.loaded { border-width: 0px; padding: 0; }
    .wordpress .desc { max-height: 70vh; overflow-y: auto; line-height: 160%; }
    .tumblr { max-height: 86vh; overflow-y: auto; min-width: 90%; }
    .tumblr.loading iframe { visibility: hidden; height: 0px; }
    .reddit { max-height: 75vh; overflow-y: auto; min-width: 90%; }
    .reddit iframe { resize: none; }
    .reddit.loading > blockquote,
    .reddit.loading > div { display: none; }
    .fbEmbed { min-width: 90%; }
    .fbEmbed:not(.fallback) iframe { resize: none; }
    .fbEmbed.loading > div { visibility: hidden; height: 0px; }
    .imgur { min-width: 90%; }
    .imgur iframe { border-width: 0px; }
    .imgur.loading iframe { visibility: hidden; height: 0px; }
    .embedContainer > .gelbooru.embed,
    .embedContainer > .danbooru.embed,
    .embedContainer > .konachan.embed,
    .embedContainer > .yandere.embed { width: 49%; position: relative; }
    .danbooru.embed .booru-tags { display: none; position:absolute; bottom: 0.5em; right: 0.5em; font-size: small; text-align: right; color: ${color07}; }
    .danbooru.embed.loaded { min-height: 110px; }
    .danbooru.embed:hover .booru-tags { display: block; }
    article.nsfw .embedContainer img,
    article.nsfw .embedContainer iframe,
    .embed .rating_e,
    .embed img.nsfw { opacity: 0.1; }
    article.nsfw .embedContainer img:hover,
    article.nsfw .embedContainer iframe:hover,
    article.nsfw .embedContainer .msg-avatar img,
    .embed .rating_e:hover,
    .embed img.nsfw:hover { opacity: 1.0; }
    .embed.notEmbed { display: none; }
    .embedLink.arrow:not(.notEmbed):after { content: ' ↓' }
    .videoWrapper16x9 { position: relative; padding-bottom: 56.25%; /* 16:9 */ padding-top: 25px; height: 0; }
    .videoWrapper16x9 iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .tweaksSettings * { box-sizing: border-box; }
    .tweaksSettings table { border-collapse: collapse; }
    .tweaksSettings tr { border-bottom: 1px solid transparent; }
    .tweaksSettings tr:hover { background: rgba(127,127,127,.1) }
    .tweaksSettings td > * { display: block; width: 100%; height: 100%; }
    .tweaksSettings > button { margin-top: 25px; }
    .tweaksSettings .ta-wrapper { width: 100%; height: 100%; }
    .tweaksSettings .ta-wrapper > textarea { width: 100%; height: 100%; }
    .tweaksSettings textarea.domains_whitelist { min-height: 72pt; }
    .embedContainer > .cts { width: 100%; }
    .embedContainer .cts > .placeholder { border: 1px dotted ${color03}; color: ${color07}; text-align: center; cursor: pointer; word-wrap: break-word; }
    .cts > .placeholder { position: relative; }
    .cts > .placeholder > .icon { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; color: ${bg10}; -webkit-filter: drop-shadow( 0 0 10px ${color10} ); filter: drop-shadow( 0 0 10px ${color10} ); }
    .embed .cts .icon { display: flex; align-items: center; justify-content: center; }
    .embed .cts .icon > svg { max-width: 100px; max-height: 100px; }
    .filtered header { overflow: hidden; }
    .filtered .msg-avatar { margin-bottom: 0px; }
    .filteredComment.headless .msg-links { margin: 0px; }
    article.readonly > p,
    div.readonly > .msg-txt { opacity: 0.55; }
    .movable { transition: all 0.2s ease-out 0.2s; transition-property: margin, margin-top; }
    .movable.moved { position: absolute; z-index: 10; }
    .movable.hoverHighlight,
    .highlightable.hoverHighlight { outline: 1px solid ${color10} !important; }
    .movableContainer { position: relative; }
    .movableContainer > .placeholder { display: none; }
    .movableContainer .moved+.placeholder { display: block; }
    .recUsers img { height: 32px; margin: 2px; margin-right: 6px; vertical-align: middle; width: 32px; }
    .users.sorted > span { width: 300px; }
    #toggleBetaLink,
    #localWarning { display: block; position: fixed; top: 5px; right: 5px; }
    `);
  if (GM_getValue('enable_emergency_fixes', true)) {
    GM_addStyle(`
      .embedContainer { height: unset; text-align: unset; }
      .embedContainer embed,.embedContainer iframe,.embedContainer object { position: unset; top: unset; left: unset; width: unset; height: unset; }
      .embedContainer iframe { resize: both; }
      `);
  }
}

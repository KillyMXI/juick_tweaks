// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     2.8.1
// @date        2016.09.02 - 2016.12.25
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
// @connect     republic.ru
// @connect     bash.im
// @connect     ixbt.com
// @connect     *
// ==/UserScript==


// pages and elements =====================================================================================

var content = document.getElementById("content");
var isPost = (content !== null) && content.hasAttribute("data-mid");
var isFeed = (document.querySelectorAll("#content article[data-mid]").length > 0);
var isCommonFeed = (/^(?:https?:)?\/\/juick\.com\/(?:$|tag|#post|\?.*show=(?:all|photos))/i.exec(window.location.href) !== null);
var isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
var isTagsPage = window.location.pathname.endsWith('/tags');
var isSingleTagPage = (window.location.pathname.indexOf('/tag/') != -1);
var isSettingsPage = window.location.pathname.endsWith('/settings');
var isUserColumn = (document.querySelector("aside#column > div#ctitle:not(.tag)") === null) ? false : true;
var isUsersTable = (document.querySelector("table.users") === null) ? false : true;


// userscript features =====================================================================================

addStyle();                             // минимальный набор стилей, необходимый для работы скрипта

if(isPost) {                            // на странице поста
  filterPostComments();
  checkReplyPost();
  updateTagsOnAPostPage();
  addTagEditingLinkUnderPost();
  addCommentRemovalLinks();
  embedLinksToPost();
}

if(isFeed) {                            // в ленте или любом списке постов
  if(isCommonFeed) {                    // в общих лентах (популярные, все, фото, теги)
    filterArticles();
  }
  checkReplyArticles();
  updateTagsInFeed();
  embedLinksToArticles();
}

if(isUserColumn) {                      // если колонка пользователя присутствует слева
  addYearLinks();
  colorizeTagsInUserColumn();
  addSettingsLink();
  biggerAvatar();
  addIRecommendLink();
}

if(isPostEditorSharp) {                 // на форме создания поста (/#post)
  addEasyTagsUnderPostEditorSharp();
}

if(isTagsPage) {                        // на странице тегов пользователя
  sortTagsPage();
}

if(isSingleTagPage) {                   // на странице тега (/tag/...)
  addTagPageToolbar();
}

if(isUsersTable) {                      // на странице подписок или подписчиков
  addUsersSortingButton();
}

if(isSettingsPage) {                    // на странице настроек
  addTweaksSettingsButton();
}


// helpers ==================================================================================================

Object.values = Object.values || (obj => Object.keys(obj).map(key => obj[key]));

String.prototype.count=function(s1) {
  return (this.length - this.replace(new RegExp(s1,"g"), '').length) / s1.length;
}

function intersect(a, b) {
  if (b.length > a.length) { [a, b] = [b, a]; } // loop over shorter array
  return a.filter(item => (b.indexOf(item) !== -1));
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function parseRgbColor(colorStr){
  colorStr = colorStr.replace(/ /g,'').toLowerCase();
  var [, r, g, b] = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/.exec(colorStr);
  return [ +r, +g, +b ];
}

function getContrastColor(baseColor) {
  return (baseColor[0] + baseColor[1] + baseColor[2] > 127*3) ? [0,0,0] : [255,255,255];
}

function getAllMatchesAndCaptureGroups(re, str) {
  var results = [], result;
  while ((result = re.exec(str)) !== null) {
    results.push(Array.from(result));
  }
  return results;
}

function htmlDecode(str) {
  var doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent;
}

function htmlEscape(html) {
  var textarea = document.createElement('textarea');
  textarea.textContent = html;
  return textarea.innerHTML;
}

function naiveEllipsis(str, len) {
  var ellStr = '...';
  var ellLen = ellStr.length;
  if(str.length <= len) { return str; }
  var half = Math.floor((len - ellLen) / 2);
  var left = str.substring(0, half);
  var right = str.substring(str.length - (len - half - ellLen));
  return '' + left + ellStr + right;
}

function naiveEllipsisRight(str, len) {
  var ellStr = '...';
  var ellLen = ellStr.length;
  return (str.length <= len) ? str : str.substring(0, len - ellLen) + ellStr;
}

function wrapIntoTag(node, tagName, className) {
  var tag = document.createElement(tagName);
  if(className !== undefined) {
    tag.className = className;
  }
  tag.appendChild(node);
  return tag;
}

function waitAndRun(test, doneCallback, timeoutCallback, tick=100, count) {
  if(test()) {
    doneCallback();
  } else {
    var newCount = (count === undefined) ? undefined : count - 1;
    if(newCount === undefined || newCount > 0) {
      setTimeout(function(){ waitAndRun(test, doneCallback, timeoutCallback, tick, newCount); }, tick);
    } else {
      if(typeof timeoutCallback == 'function') {
        timeoutCallback();
      }
    }
  }
}

function randomId() {
  return Math.random().toString(36).substr(2,11) + Date.now().toString(36).substr(-3,3);
}

function matchWildcard(str, wildcard) {
  let ww = wildcard.split('*');
  let startFrom = 0;
  for(var i = 0; i < ww.length; i++) {
    let w = ww[i];
    if(w == '') { continue; }
    let wloc = str.indexOf(w, startFrom);
    if(wloc == -1) { return false; }
    let wend = wloc + w.length;
    let headCondition = (i > 0) || (wloc == 0);
    let tailCondition = (i < ww.length - 1) || ((i > 0) ? str.endsWith(w) : (str.substr(wloc) == w));
    if(!headCondition || !tailCondition) { return false; }
    startFrom = wend;
  }
  return true;
}


// function definitions =====================================================================================

function updateTagsOnAPostPage() {
  if(!GM_getValue('enable_user_tag_links', true)) { return; }
  var tagsDiv = document.querySelector("div.msg-tags");
  if(tagsDiv === null) { return; }
  var userId = document.querySelector("div.msg-avatar > a > img").alt;
  [].forEach.call(tagsDiv.childNodes, function(item, i, arr) {
    var link = item.href;
    item.href = link.replace("tag/", userId + "/?tag=");
  });
}

function updateTagsInFeed() {
  if(!GM_getValue('enable_user_tag_links', true)) { return; }
  [].forEach.call(document.querySelectorAll("#content > article"), function(article, i, arr) {
    if(!article.hasAttribute('data-mid')) { return; }
    var userId = article.querySelector("div.msg-avatar > a > img").alt;
    var tagsDiv = article.getElementsByClassName("msg-tags")[0];
    if(tagsDiv === null) { return; }
    [].forEach.call(tagsDiv.childNodes, function(item, j, arrj) {
      var link = item.href;
      item.href = link.replace("tag/", userId + "/?tag=");
    });
  });
}

function addTagEditingLinkUnderPost() {
  if(!GM_getValue('enable_tags_editing_link', true)) { return; }
  var mtoolbar = document.getElementById("mtoolbar").childNodes[0];
  var canEdit = (mtoolbar.textContent.indexOf('Удалить') > -1) ? true : false;
  if(!canEdit) { return; }
  var linode = document.createElement("li");
  var anode = document.createElement("a");
  var mid = document.getElementById("content").getAttribute("data-mid");
  anode.href = "http://juick.com/post?body=%23" + mid + "+%2ATag";
  anode.innerHTML = "<div style='background-position: -16px 0'></div>Теги";
  linode.appendChild(anode);
  mtoolbar.appendChild(linode);
}

function addCommentRemovalLinks() {
  if(!GM_getValue('enable_comment_removal_links', true)) { return; }
  var myUserIdLink = document.querySelector("nav#actions > ul > li:nth-child(2) > a");
  var myUserId = (myUserIdLink === null) ? null : myUserIdLink.textContent.replace('@', '');
  var commentsBlock = document.querySelector("ul#replies");
  if((commentsBlock !== null) && (myUserId !== null)) {
    [].forEach.call(commentsBlock.children, function(linode, i, arr) {
      var postUserAvatar = linode.querySelector("div.msg-avatar > a > img");
      if(postUserAvatar !== null) {
        var postUserId = postUserAvatar.alt;
        if(postUserId == myUserId) {
          var linksBlock = linode.querySelector("div.msg-links");
          var commentLink = linode.querySelector("div.msg-ts > a");
          var postId = commentLink.pathname.replace('/','');
          var commentId = commentLink.hash.replace('#','');
          var anode = document.createElement("a");
          anode.href = "http://juick.com/post?body=D+%23" + postId + "%2F" + commentId;
          anode.innerHTML = "Удалить";
          anode.style.cssFloat = "right";
          linksBlock.appendChild(anode);
        }
      }
    });
  }
}

function addTagPageToolbar() {
  if(!GM_getValue('enable_tag_page_toolbar', true)) { return; }
  var asideColumn = document.querySelector("aside#column");
  var tag = document.location.pathname.split("/").pop(-1);
  var html = '<div id="ctitle" class="tag"><a href="/tag/%TAG%">*%TAGSTR%</a></div>' +
      '<ul id="ctoolbar">' +
      '<li><a href="/post?body=S+%2a%TAG%" title="Подписаться"><div style="background-position: -16px 0"></div></a></li>' +
      '<li><a href="/post?body=BL+%2a%TAG%" title="Заблокировать"><div style="background-position: -80px 0"></div></a></li>' +
      '</ul>';
  html = html.replace(/%TAG%/g, tag).replace(/%TAGSTR%/g, decodeURIComponent(tag));
  asideColumn.innerHTML = html + asideColumn.innerHTML;
}

function addYearLinks() {
  if(!GM_getValue('enable_year_links', true)) { return; }
  var userId = document.querySelector("div#ctitle a").textContent;
  var asideColumn = document.querySelector("aside#column");
  var hr1 = asideColumn.querySelector("p.tags + hr");
  var hr2 = document.createElement("hr");
  var linksContainer = document.createElement("p");
  var years = [
    {y: (new Date()).getFullYear(), b: ""},
    {y: 2015, b: "?before=2816362"},
    {y: 2014, b: "?before=2761245"},
    {y: 2013, b: "?before=2629477"},
    {y: 2012, b: "?before=2183986"},
    {y: 2011, b: "?before=1695443"}
  ];
  years.forEach(function(item, i, arr) {
    var anode = document.createElement("a");
    anode.href = `/${userId}/${item.b}`;
    anode.textContent = item.y;
    linksContainer.appendChild(anode);
    linksContainer.appendChild(document.createTextNode (" "));
  });
  asideColumn.insertBefore(hr2, hr1);
  asideColumn.insertBefore(linksContainer, hr1);
}

function addSettingsLink() {
  if(!GM_getValue('enable_settings_link', true)) { return; }
  var columnUserId = document.querySelector("div#ctitle a").textContent;
  var myUserIdLink = document.querySelector("nav#actions > ul > li:nth-child(2) > a");
  var myUserId = (myUserIdLink === null) ? null : myUserIdLink.textContent.replace('@', '');
  if(columnUserId == myUserId) {
    var asideColumn = document.querySelector("aside#column");
    var ctitle = asideColumn.querySelector("#ctitle");
    var anode = document.createElement("a");
    anode.innerHTML = '<div class="icon icon--ei-gear icon--s "><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-gear-icon"></use></svg></div>';
    anode.href = 'http://juick.com/settings';
    ctitle.appendChild(anode);
    ctitle.style.display = 'flex';
    ctitle.style.justifyContent = 'space-between';
    ctitle.style.alignItems = 'baseline';
  }
}

function biggerAvatar() {
  if(!GM_getValue('enable_big_avatar', true)) { return; }
  var avatarImg = document.querySelector("div#ctitle a img");
  avatarImg.src = avatarImg.src.replace('/as/', '/a/');
}

function loadTags(userId, doneCallback) {
  setTimeout(function(){
    GM_xmlhttpRequest({
      method: "GET",
      url: "http://juick.com/" + userId + "/tags",
      onload: function(response) {
        var re = /<section id\=\"content\">[\s]*<p>([\s\S]+)<\/p>[\s]*<\/section>/i;
        var result = re.exec(response.responseText);
        if(result !== null) {
          var tagsStr = result[1];
          var tagsContainer = document.createElement('p');
          tagsContainer.className += " tagsContainer";
          tagsContainer.innerHTML = tagsStr;
          doneCallback(tagsContainer);
        } else {
          console.log("no tags found");
        }
      }
    });
  }, 50);
}

function addEasyTagsUnderPostEditorSharp() {
  if(!GM_getValue('enable_tags_on_new_post_form', true)) { return; }
  var userId = document.querySelector("nav#actions > ul > li:nth-child(2) > a").textContent.replace('@', '');
  loadTags(userId, function(tagsContainer){
    var messageform = document.getElementById("newmessage");
    var tagsfield = messageform.getElementsByTagName('div')[0].getElementsByClassName("tags")[0];
    messageform.getElementsByTagName('div')[0].appendChild(tagsContainer);
    sortAndColorizeTagsInContainer(tagsContainer, 60, true);
    [].forEach.call(tagsContainer.childNodes, function(item, i, arr) {
      var newTag = item.textContent;
      item.onclick = function() { tagsfield.value = (tagsfield.value.trim() + ' ' + newTag).trim(); };
      item.href = "#";
    });
  });
}

function sortAndColorizeTagsInContainer(tagsContainer, numberLimit, isSorting) {
  tagsContainer.classList.add('tagsContainer');
  var linkColor = parseRgbColor(getComputedStyle(tagsContainer.getElementsByTagName('A')[0]).color);
  var p0 = 0.7; // 70% of color range is used for color coding
  var maxC = 0.1;
  var sortedTags = [];
  [].forEach.call(tagsContainer.children, function(item, i, arr) {
    var anode = (item.tagName == 'A') ? item : item.getElementsByTagName('a')[0];
    var c = Math.log(parseInt(anode.title, 10));
    maxC = (c > maxC) ? c : maxC;
    sortedTags.push({ c: c, a: anode, text: anode.textContent.toLowerCase()});
  });
  if((numberLimit !== null) && (sortedTags.length > numberLimit)) {
    sortedTags = sortedTags.slice(0, numberLimit);
  }
  if(isSorting) {
    sortedTags.sort((a, b) => a.text.localeCompare(b.text));
  }
  while (tagsContainer.firstChild) {
    tagsContainer.removeChild(tagsContainer.firstChild);
  }
  var [r, g, b] = linkColor;
  sortedTags.forEach(function(item, i, arr) {
    var c = item.c;
    var p = (c/maxC-1)*p0+1; // normalize to [p0..1]
    item.a.style.setProperty('color', `rgba(${r},${g},${b},${p})`, 'important');
    tagsContainer.appendChild(item.a);
    tagsContainer.appendChild(document.createTextNode (" "));
  });
}

function sortTagsPage() {
  if(!GM_getValue('enable_tags_page_coloring', true)) { return; }
  var tagsContainer = document.querySelector("section#content > p");
  sortAndColorizeTagsInContainer(tagsContainer, null, true);
}

function colorizeTagsInUserColumn() {
  if(!GM_getValue('enable_left_column_tags_coloring', true)) { return; }
  var tagsContainer = document.querySelector("aside#column > p.tags");
  sortAndColorizeTagsInContainer(tagsContainer, null, false);
}

function getLastArticleDate(html) {
  var re = /datetime\=\"([^\"]+) ([^\"]+)\"/;
  //var re = /\"timestamp\"\:\"([^\"]+) ([^\"]+)\"/;
  var [, dateStr, timeStr] = re.exec(html) || [];
  return (dateStr === undefined) ? null : new Date(`${dateStr}T${timeStr}`);
}

function processPage(url, retrievalFunction, doneCallback, timeout=100) {
  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: function(response) {
      var result = null;
      if(response.status != 200) {
        console.log("" + url + ": failed with " + response.status + ", " + response.statusText);
      } else {
        result = retrievalFunction(response.responseText);
      }
      setTimeout(function(){ doneCallback(result) }, timeout);
    }
  });
}

function loadUserDates(unprocessedUsers, processedUsers, doneCallback) {
  if(unprocessedUsers.length === 0) {
    doneCallback();
  } else {
    var user = unprocessedUsers.splice(0,1)[0];
    //var postsUrl = "http://api.juick.com/messages?uname=" + user.id;
    var postsUrl = 'http://juick.com/' + user.id + '/';
    var recsUrl = 'http://juick.com/' + user.id + '/?show=recomm';

    processPage(postsUrl, getLastArticleDate, function(lastPostDate) {
      processPage(recsUrl, getLastArticleDate, function(lastRecDate) {
        var date = (lastPostDate > lastRecDate) ? lastPostDate : lastRecDate;
        if(date === null) {
            console.log("" + user.id + ": no posts or recommendations found");
        } else {
          user.date = date;
          user.a.appendChild(document.createTextNode (` (${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()})` ));
        }

        processedUsers.push(user);
        loadUserDates(unprocessedUsers, processedUsers, doneCallback);
      });
    });
  }
}

function sortUsers() {
  var contentBlock = document.getElementById("content");
  var button = document.getElementById("usersSortingButton");
  button.parentNode.removeChild(button);
  var usersTable = document.querySelector("table.users");
  var unsortedUsers = [];
  var sortedUsers = [];
  [].forEach.call(usersTable.firstChild.children, function(tr, i, arr){
    [].forEach.call(tr.children, function(td, j, arrj){
      var anode = td.firstChild;
      var userId = anode.pathname.replace(/\//g, '');
      unsortedUsers.push({a: anode, id: userId, date: (new Date(1970, 1, 1))});
    });
  });
  loadUserDates(unsortedUsers, sortedUsers, function(){
    sortedUsers.sort((b, a) => (a.date > b.date) - (a.date < b.date));
    usersTable.parentNode.removeChild(usersTable);
    var ul = document.createElement("ul");
    ul.className = 'users';
    sortedUsers.forEach(function(user, i, arr){
      var li = document.createElement("li");
      li.appendChild(user.a);
      ul.appendChild(li);
    });
    contentBlock.appendChild(ul);
  });
}

function addUsersSortingButton() {
  if(!GM_getValue('enable_users_sorting', true)) { return; }
  var contentBlock = document.getElementById("content");
  var usersTable = document.querySelector("table.users");
  var button = document.createElement("button");
  button.id = 'usersSortingButton';
  button.textContent="Sort by date";
  button.onclick = sortUsers;
  contentBlock.insertBefore(button, usersTable);
}

function turnIntoCts(node, makeNodeCallback) {
  node.onclick = function(e){
    e.preventDefault();
    var newNode = makeNodeCallback();
    if(this.hasAttribute('data-linkid')) {
      newNode.setAttribute('data-linkid', this.getAttribute('data-linkid'));
    }
    this.parentNode.replaceChild(newNode, this);
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
  iframe.width = w;
  iframe.height = h;
  iframe.frameBorder = 0;
  iframe.scrolling = scrolling;
  iframe.setAttribute('allowFullScreen', '');
  iframe.src = src;
  return iframe;
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
};

function makeIframeHtml(html, w, h, onloadCallback, onerrorCallback) {
  let iframeId = makeIframeWithHtmlAndId(html);
  let iframe = document.getElementById(iframeId);
  iframe.className = 'newIframe';
  iframe.width = w;
  iframe.height = h;
  iframe.frameBorder = 0;
  if(typeof onloadCallback == 'function') {
    iframe.addEventListener("load", function(){ onloadCallback(iframe.contentWindow.document); }, false);
  }
  if(typeof onerrorCallback == 'function') {
    iframe.onerror = onerrorCallback;
  }
  return iframe;
}

// this doesn't work in FF + GreaseMonkey.
function makeIframeHtml2(html, w, h, onloadCallback, onerrorCallback) {
  let iframe = document.createElement('iframe');
  iframe.className = 'newIframe';
  iframe.width = w;
  iframe.height = h;
  iframe.frameBorder = 0;
  iframe.onload = function() {
    let doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    if(typeof onloadCallback == 'function') { onloadCallback(doc); }
  };
  if(typeof onerrorCallback == 'function') {
    iframe.onerror = onerrorCallback;
  }
  return iframe;
}

function loadScript(url, async=false, callback, once=false)
{
  if(once && [].some.call(document.scripts, s => s.src == url)) {
    console.log(url + ' is already loaded');
    return;
  }

  let head = document.getElementsByTagName('head')[0];
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  if(async) { script.setAttribute('async', ''); }

  if(typeof callback == 'function') {
    //script.onreadystatechange = callback;
    script.onload = callback;
  }

  head.appendChild(script);
}

function splitScriptsFromHtml(html) {
  const scriptRe = /<script.*?(?:src="(.+?)".*?)?>([\s\S]*?)<\/\s?script>/gmi;
  let scripts = getAllMatchesAndCaptureGroups(scriptRe, html).map(
    m => {
      let [, url, s] = m;
      return (url !== undefined)
        ? { call: function(){ loadScript(url, true); } }
        : { call: function(){ setTimeout(window.eval(s), 0); } };
    }
  );
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

function messageReplyReplace(match, mid, rid, offset, string) {
  let isReply = (rid !== undefined);
  return '<a href="//juick.com/' + mid + (isReply ? '#' + rid : '') + '">' + match + '</a>';
}

function juickPostParse(txt) {
  const urlRe = /(?:\[([^\]\[]+)\](?:\[([^\]]+)\]|\(((?:[a-z]+:\/\/|www\.|ftp\.)(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[-\w+*&@#/%=~|$?!:;,.])*(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[\w+*&@#/%=~|$]))\))|\b(?:[a-z]+:\/\/|www\.|ftp\.)(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[-\w+*&@#/%=~|$?!:;,.])*(?:\([-\w+*&@#/%=~|$?!:;,.]*\)|[\w+*&@#/%=~|$]))/gi;
  const bqRe = /(?:^(?:>|&gt;)\s?[\s\S]+?$\n?)+/gmi;
  return htmlEscape(txt)
           .replace(urlRe, urlReplace)
           .replace(bqRe, bqReplace)
           .replace(/\n/g,'<br/>')
           .replace(/\B#(\d+)(?:\/(\d+))?\b/gmi, messageReplyReplace)
           .replace(/\B@([\w-]+)\b/gmi, "<a href=\"//juick.com/$1\">@$1</a>");
}

function juickId([, userId, postId, replyId]) {
  let isReply = ((replyId !== undefined) && (replyId != '0'));
  return '#' + postId + (isReply ? '/' + replyId : '');
}

function getEmbedableLinkTypes() {
  return [
    {
      name: 'Juick',
      id: 'embed_juick',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/juick\.com\/(?:([\w-]+)\/)?([\d]+\b)(?:#(\d+))?/i,
      makeNode: function(aNode, reResult) {
        var juickType = this;

        var isReply = ((reResult[3] !== undefined) && (reResult[3] !== '0'));
        var mrid = (isReply) ? parseInt(reResult[3], 10) : 0;
        var idStr = juickId(reResult);
        var linkStr = '//juick.com/' + reResult[2] + ((isReply) ? '#' + mrid : '');

        var div = document.createElement("div");
        div.textContent = 'loading ' + idStr;
        div.className = 'juickEmbed embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://api.juick.com/thread?mid=' + reResult[2],
          onload: function(response) {

            if(response.status != 200) {
              div.textContent = 'Failed to load ' + idStr + ' (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return juickType.makeNode(aNode, reResult);});
              return;
            }
            var threadInfo = JSON.parse(response.responseText);
            var msg = (!isReply) ? threadInfo[0] : threadInfo.find(function(x) {return (x.rid == mrid);});
            if((msg == undefined)) {
              div.textContent = '' + idStr + ' doesn\'t exist';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return juickType.makeNode(aNode, reResult);});
              return;
            }

            var withTags = (msg.tags !== undefined);
            var withPhoto = (msg.photo !== undefined);
            var withLikes = (msg.likes !== undefined && msg.likes > 0);
            var isReplyToOp = isReply && (msg.replyto === undefined || msg.replyto == 0);
            var withReplies = (msg.replies !== undefined && msg.replies > 0);
            var isNsfw = withPhoto && (msg.tags !== undefined) && msg.tags.some(t => t.toUpperCase() == 'NSFW');

            var msgLink = '<a href="' + linkStr + '">' + idStr + '</a>';
            var userLink = '<a href="//juick.com/' + msg.user.uname + '/">@' + msg.user.uname + '</a>';
            var avatarStr = '<div class="msg-avatar"><a href="/' + msg.user.uname + '/"><img src="//i.juick.com/a/' + msg.user.uid + '.png" alt="' + msg.user.uname + '"></a></div>';
            var tagsStr = (withTags) ? '<div class="msg-tags">' + msg.tags.map(function(x) { return '<a href="http://juick.com/' + msg.user.uname + '/?tag=' + encodeURIComponent(x) + '">' + x + '</a>'; }).join('') + '</div>' : '';
            var photoStr = (withPhoto) ? '<div><a href="' + msg.photo.medium + '"><img ' + (isNsfw ? 'class="nsfw" ' : '') + 'src="' + msg.photo.small + '"/></a></div>' : '';
            var titleDiv = '<div class="title">' + userLink + '</div>';
            var dateDiv = '<div class="date"><a href="' + linkStr + '">' + msg.timestamp + '</a></div>';
            var replyStr = (isReplyToOp)
                             ? 'in reply to <a class="whiteRabbit" href="//juick.com/' + msg.mid + '">#' + msg.mid + '</a>'
                             : (isReply)
                               ? 'in reply to <a class="whiteRabbit" href="//juick.com/' + msg.mid + '#' + msg.replyto + '">#' + msg.mid + '/' + msg.replyto + '</a>'
                               : '';
            var replyDiv = '<div class="embedReply msg-links">' + msgLink + ((replyStr.length > 0) ? ' ' + replyStr : '') + '</div>';
            var heartIcon = '<div class="icon icon--ei-heart icon--s "><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-heart-icon"></use></svg></div>';
            var commentIcon = '<div class="icon icon--ei-comment icon--s "><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-comment-icon"></use></svg></div>';
            var likesDiv = (withLikes) ? '<div class="likes"><a href="' + linkStr + '">' + heartIcon + msg.likes + '</a></div>' : '';
            var commentsDiv = (withReplies) ? '<div class="replies"><a href="' + linkStr + '">' + commentIcon + msg.replies + '</a></div>' : '';
            var description = juickPostParse(msg.body);
            var descDiv = '<div class="desc">' + description + '</div>';
            div.innerHTML =
              '<div class="top">' + avatarStr + '<div class="top-right"><div class="top-right-1st">' + titleDiv + dateDiv + '</div><div class="top-right-2nd">' + tagsStr + '</div></div></div>' +
              descDiv + photoStr + '<div class="bottom">' + replyDiv + '<div class="right">' + likesDiv + commentsDiv + '</div></div>';

            var allLinks = div.querySelectorAll(".desc a, .embedReply a.whiteRabbit");
            var embedContainer = div.parentNode;
            embedLinks(Array.prototype.slice.call(allLinks).reverse(), embedContainer, true, div);

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return juickId(reResult);
      },
      linkTextUpdate: function(aNode, reResult) {
        if(isDefaultLinkText(aNode)) {
          //var isUser = (reResult[1] !== undefined);
          aNode.textContent = juickId(reResult); // + ((!isReply && isUser) ? ' (@' + reResult[1] + ')' : '');
        }
      }
    },
    {
      name: 'Jpeg and png images',
      id: 'embed_jpeg_and_png_images',
      ctsDefault: false,
      re: /\.(jpeg|jpg|png|svg)(:[a-zA-Z]+)?(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        var aNode2 = document.createElement("a");
        var imgNode = document.createElement("img");
        imgNode.src = aNode.href;
        aNode2.href = aNode.href;
        aNode2.appendChild(imgNode);
        return aNode2;
      }
    },
    {
      name: 'Gif images',
      id: 'embed_gif_images',
      ctsDefault: true,
      re: /\.gif(:[a-zA-Z]+)?(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        var aNode2 = document.createElement("a");
        var imgNode = document.createElement("img");
        imgNode.src = aNode.href;
        aNode2.href = aNode.href;
        aNode2.appendChild(imgNode);
        return aNode2;
      }
    },
    {
      name: 'Webm and mp4 video',
      id: 'embed_webm_and_mp4_videos',
      ctsDefault: false,
      re: /\.(webm|mp4)(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        var video = document.createElement("video");
        video.src = aNode.href;
        video.setAttribute('controls', '');
        return wrapIntoTag(video, 'div', 'video');
      }
    },
    {
      name: 'Mp3 and ogg audio',
      id: 'embed_sound_files',
      ctsDefault: false,
      re: /\.(mp3|ogg)(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        var audio = document.createElement("audio");
        audio.src = aNode.href;
        audio.setAttribute('controls', '');
        return wrapIntoTag(audio, 'div', 'audio');
      }
    },
    {
      name: 'YouTube videos (and playlists)',
      id: 'embed_youtube_videos',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|m\.)?(?:youtu(?:be\.com\/watch\?(?:[\w&=;]+&(?:amp;)?)?v=|\.be\/|be\.com\/(?:v|embed)\/)([-\w]+)(?:&(?:amp;)?(?:(?!list=)\w+=[-\w]+))*(?:&(?:amp;)?list=([-\w]+))?(?:&(?:amp;)?(?:\w+=[-\w]+))*|youtube\.com\/playlist\?list=([-\w]*)(&(amp;)?[-\w\?=]*)?)/i,
      makeNode: function(aNode, reResult) {
        let [url, v, vlist, plist] = reResult;
        let iframeUrl = (plist !== undefined)
                          ? '//www.youtube-nocookie.com/embed/videoseries?list=' + plist
                          : '//www.youtube-nocookie.com/embed/' + v + ((vlist !== undefined) ? '?list=' + vlist : '?rel=0');
        return wrapIntoTag(makeIframe(iframeUrl, 640, 360), 'div', 'youtube');
      }
    },
    {
      name: 'Vimeo videos',
      id: 'embed_vimeo_videos',
      ctsDefault: false,
      //re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:(?:video\/|album\/[\d]+\/video\/)?([\d]+)|([\w-]+)\/(?!videos)([\w-]+))/i,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/|album\/[\d]+\/video\/)?([\d]+)/i,
      makeNode: function(aNode, reResult) {
        return wrapIntoTag(makeIframe('//player.vimeo.com/video/' + reResult[1], 640, 360), 'div', 'vimeo');
      }
    },
    {
      name: 'Dailymotion videos',
      id: 'embed_youtube_videos',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?dailymotion\.com\/video\/([a-zA-Z\d]+)(?:_[\w-%]*)?/i,
      makeNode: function(aNode, reResult) {
        return wrapIntoTag(makeIframe('//www.dailymotion.com/embed/video/' + reResult[1], 640, 360), 'div', 'dailymotion');
      }
    },
    {
      name: 'Coub clips',
      id: 'embed_coub_clips',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?coub\.com\/(?:view|embed)\/([a-zA-Z\d]+)/i,
      makeNode: function(aNode, reResult) {
        var embedUrl = '//coub.com/embed/' + reResult[1] + '?muted=false&autostart=false&originalSize=false&startWithHD=false';
        return wrapIntoTag(makeIframe(embedUrl, 640, 360), 'div', 'coub');
      }
    },
    {
      name: 'Bandcamp music',
      id: 'embed_bandcamp_music',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(\w+)\.bandcamp\.com\/(track|album)\/([\w\-]+)/i,
      makeNode: function(aNode, reResult) {
        var bandcampType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'bandcamp embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: reResult[0],
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return bandcampType.makeNode(aNode, reResult);});
              return;
            }
            var baseSize = 480;
            var videoUrl, videoH;
            var metaRe = /<\s*meta\s+(?:property|name)\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            var matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            [].forEach.call(matches, function(m, i, arr) {
              if(m[1] == 'og:video') { videoUrl = m[2]; }
              if(m[1] == 'video_height') { videoH = baseSize + parseInt(m[2], 10); }
            });
            videoUrl = videoUrl.replace('/artwork=small', '');
            if(reResult[2] == 'album') {
              videoUrl = videoUrl.replace('/tracklist=false', '/tracklist=true');
              videoH += 162;
            }
            var iframe = makeIframe(videoUrl, baseSize, videoH);
            div.parentNode.replaceChild(wrapIntoTag(iframe, 'div', 'bandcamp'), div);
          }
        });

        return div;
      }
    },
    {
      name: 'SoundCloud music',
      id: 'embed_soundcloud_music',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?soundcloud\.com\/(([\w\-\_]*)\/(?:sets\/)?([\w\-\_]*))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        var embedUrl = '//w.soundcloud.com/player/?url=//soundcloud.com/' + reResult[1] + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true';
        return wrapIntoTag(makeIframe(embedUrl, '100%', 450), 'div', 'soundcloud');
      }
    },
    {
      name: 'Mixcloud music',
      id: 'embed_mixcloud_music',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?mixcloud\.com\/(?!discover\/)([\w]+)\/(?!playlists\/)([-\w]+)\/?/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url, author, mix] = reResult;

        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'mixcloud embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://www.mixcloud.com/oembed/?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?instagram\.com\/p\/([\w\-\_]*)(?:\/)?(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        return wrapIntoTag(makeIframe('//www.instagram.com/p/' + reResult[1] + '/embed', 640, 722), 'div', 'instagram');
      }
    },
    {
      name: 'Flickr images',
      id: 'embed_flickr_images',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:(?:www\.)?flickr\.com\/photos\/([\w@-]+)\/(\d+)|flic.kr\/p\/(\w+))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url] = reResult;
        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'flickr embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://www.flickr.com/services/oembed?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
              return;
            }
            let json = JSON.parse(response.responseText);

            let imageUrl = (json.url !== undefined) ? json.url : json.thumbnail_url; //.replace('_b.', '_z.');
            let imageStr = `<a href="${aNode.href}"><img src="${imageUrl}"></a>`;
            let typeStr = (json.flickr_type == 'photo') ? '' : ` (${json.flickr_type})`;
            let titleDiv = `<div class="title"><a href="${json.web_page}">${json.title}</a>${typeStr} by <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = '<div class="top">' + titleDiv + '</div>' + imageStr;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'DeviantArt images',
      id: 'embed_deviantart_images',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/([\w-]+)\.deviantart\.com\/art\/([\w-]+)/i,
      makeNode: function(aNode, reResult) {
        let [url, userId, workId] = reResult;
        let thisType = this;
        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'deviantart embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://backend.deviantart.com/oembed?format=json&url=' + encodeURIComponent(url),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
              return;
            }
            let json = JSON.parse(response.responseText);

            let date = new Date(json.pubdate);
            let typeStr = (json.type == 'photo') ? '' : ` (${json.type})`;
            let dateDiv = `<div class="date">${date.toLocaleString('ru-RU')}</div>`;
            let titleDiv = `<div class="title"><a href="${url}">${json.title}</a>${typeStr} by <a href="${json.author_url}">${json.author_name}</a></div>`;
            div.innerHTML = `<div class="top">${titleDiv}${dateDiv}</div>`;

            if((json.type == 'rich') && (json.html !== undefined)) {
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?imgur\.com\/([a-zA-Z\d]+)\.gifv/i,
      makeNode: function(aNode, reResult) {
        var video = document.createElement("video");
        video.src = '//i.imgur.com/' + reResult[1] + '.mp4';
        video.setAttribute('controls', '');
        return wrapIntoTag(video, 'div', 'video');
      }
    },
    {
      name: 'Imgur indirect links',
      id: 'embed_imgur_indirect_links',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?imgur\.com\/(?:(gallery|a)\/)?(?!gallery|jobs|about|blog|apps)([a-zA-Z\d]+)(?:#\d{1,2}$|#([a-zA-Z\d]+))?(\/\w+)?$/i,
      makeNode: function(aNode, reResult) {
        var imgurType = this;
        var div = document.createElement("div");
        div.innerHTML = '<span>loading ' + naiveEllipsis(reResult[0], 65) + '</span>';
        div.className = 'imgur embed loading';
        var isAlbum = (reResult[1] !== undefined);
        var isSpecificImage = (reResult[3] !== undefined);
        var url = (isAlbum && isSpecificImage)
                    ? 'http://imgur.com/' + reResult[3]
                    : 'http://imgur.com/' + (isAlbum ? reResult[1] + '/' : '') + reResult[2];
        GM_xmlhttpRequest({
          method: "GET",
          url: 'http://api.imgur.com/oembed.json?url=' + url,
          onload: function(response) {
            if(response.status != 200) {
              console.log('Failed to load ' + reResult[0] + ' (' + url + ')');
              div.textContent = 'Failed to load (' + response.status + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return imgurType.makeNode(aNode, reResult);});
              return;
            }
            var json = JSON.parse(response.responseText);
            var iframe = makeIframeHtml(json.html, '100%', 24, doc => {
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
      ctsDefault: true,
      re: /^(?:https?:)?\/\/(?:\w+\.)?gfycat\.com\/([a-zA-Z\d]+)$/i,
      makeNode: function(aNode, reResult) {
        return wrapIntoTag(makeIframe('//gfycat.com/ifr/' + reResult[1], '100%', 480), 'div', 'gfycat');
      }
    },
    {
      name: 'Twitter',
      id: 'embed_twitter_status',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:mobile\.)?twitter\.com\/([\w-]+)\/status\/([\d]+)/i,
      makeNode: function(aNode, reResult) {
        var twitterType = this;
        var [twitterUrl, userId, postId] = reResult;
        twitterUrl = twitterUrl.replace('mobile.','');
        var div = document.createElement("div");
        div.textContent = 'loading ' + twitterUrl;
        div.className = 'twi embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: twitterUrl,
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return twitterType.makeNode(aNode, reResult);});
              return;
            }
            if(response.finalUrl.endsWith('account/suspended')) {
              div.textContent = 'Account @' + userId + ' is suspended';
              return;
            }
            if(response.finalUrl.indexOf('protected_redirect=true') != -1) {
              div.textContent = 'Account @' + userId + ' is protected';
              return;
            }
            var images = [];
            var userGenImg = false;
            var isVideo = false;
            var videoUrl, videoW, videoH;
            var description;
            var title;
            var titleDiv, dateDiv ='', descDiv;
            var metaRe = /<\s*meta\s+property\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            var matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            [].forEach.call(matches, function(m, i, arr) {
              if(m[1] == 'og:title') { title = m[2]; }
              if(m[1] == 'og:description') {
                description = htmlDecode(m[2])
                  .replace(/\n/g,'<br/>')
                  .replace(/\B@(\w{1,15})\b/gmi, "<a href=\"//twitter.com/$1\">@$1</a>")
                  .replace(/#(\w+)/gmi, "<a href=\"//twitter.com/hashtag/$1\">#$1</a>")
                  .replace(/(?:https?:)?\/\/t\.co\/([\w]+)/gmi, "<a href=\"$&\">$&</a>");
              }
              if(m[1] == 'og:image') { images.push(m[2]); }
              if(m[1] == 'og:image:user_generated') { userGenImg = true; }
              if(m[1] == 'og:video:url') { videoUrl = m[2]; isVideo = true; }
              if(m[1] == 'og:video:height') { videoH = '' + m[2] + 'px'; }
              if(m[1] == 'og:video:width') { videoW = '' + m[2] + 'px'; }
            });
            var timestampMsRe = /\bdata-time-ms\s*=\s*\"([^\"]+)\"/gi;
            var timestampMsResult = timestampMsRe.exec(response.responseText);
            if(timestampMsResult !== null) {
              var date = new Date(+timestampMsResult[1]);
              dateDiv = '<div class="date">' + date.toLocaleString('ru-RU') + '</div>';
            }
            titleDiv = '<div class="title">' + title + ' (<a href="//twitter.com/' + userId + '">@' + userId + '</a>)' + '</div>';
            descDiv = '<div class="desc">' + description + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>' + descDiv;
            if(userGenImg) { div.innerHTML += '' + images.map(function(x){ return '<a href="' + x + '"><img src="' + x + '"></a>'; }).join(''); }
            if(isVideo) {
              var playIcon = '<div class="icon icon--ei-play icon--s " title="Click to play"><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-play-icon"></use></svg></div>';
              div.appendChild(
                makeCts(
                  function(){ return makeIframe(videoUrl, videoW, videoH); },
                  '<img src="' + images[0] + '">' + playIcon
                )
              );
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|m\.)?facebook\.com\/(?:[\w.]+\/(?:posts|videos|photos)\/[\w:./]+(?:\?[\w=%&.]+)?|(?:photo|video)\.php\?[\w=%&.]+)/i,
      makeNode: function(aNode, reResult) {
        var facebookType = this;
        var script = '(function(d, s, id) { var js, fjs = d.getElementsByTagName(s)[0]; if (d.getElementById(id)) return; ' +
            'js = d.createElement(s); js.id = id; js.src = "https://connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v2.3"; fjs.parentNode.insertBefore(js, fjs); ' +
            '}(document, "script", "facebook-jssdk"));';
        setTimeout(window.eval(script), 0);
        var div = document.createElement("div");
        div.innerHTML = '<span>loading ' + naiveEllipsis(reResult[0], 60) + '</span><div class="fb-post" data-href="' + aNode.href + '" data-width="640">';
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
            var embedUrl = 'https://www.facebook.com/plugins/post.php?width=640&height=570&href=' + encodeURIComponent(reResult[0]);
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
      name: 'Tumblr',
      id: 'embed_tumblr',
      ctsDefault: true,
      re: /^(?:https?:)?\/\/(?:([\w\-\_]+)\.)?tumblr\.com\/post\/([\d]*)(?:\/([\w\-\_]*))?/i,
      makeNode: function(aNode, reResult) {
        var tumblrType = this;
        var div = document.createElement("div");
        div.innerHTML = '<span>loading ' + naiveEllipsis(reResult[0], 65) + '</span>';
        div.className = 'tumblr embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://www.tumblr.com/oembed/1.0?url=' + reResult[0],
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return tumblrType.makeNode(aNode, reResult);});
              return;
            }
            var json = JSON.parse(response.responseText);
            //var embedUrl = (/data-href="([^"]+)"/i.exec(json.html))[1];
            //div.appendChild(makeIframe(embedUrl, '100%', 660));
            var iframe = makeIframeHtml(json.html, '100%', 24, doc => {
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
              turnIntoCts(div, function(){return tumblrType.makeNode(aNode, reResult);});
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.|np\.|m\.)?reddit\.com\/r\/([\w]+)\/comments\/(\w+)(?:\/(?:\w+(?:\/(\w+)?)?)?)?/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url] = reResult;
        let div = document.createElement("div");
        div.innerHTML = '<span>loading ' + naiveEllipsis(url, 60) + '</span>';
        div.className = 'reddit embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://www.reddit.com/oembed?url=' + encodeURIComponent(url),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
              return;
            }
            let json = JSON.parse(response.responseText);
            let [h, ss] = splitScriptsFromHtml(json.html);
            ss.forEach(s => s.call());
            div.innerHTML += h;
            waitAndRun(
              () => { var iframe = div.querySelector('iframe'); return (iframe !== null && (parseInt(iframe.height) > 30)); },
              () => {
                div.querySelector('iframe').style.margin = '0px';
                div.querySelector('span').remove();
                div.classList.remove('embed');
                div.classList.remove('loading');
              },
              () => {
                div.textContent = 'Failed to load (time out)';
                div.className = div.className.replace(' loading', ' failed');
                turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(\w+)\.wordpress\.com\/(\d{4})\/(\d{2})\/(\d{2})\/([-\w%\u0400-\u04FF]+)(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url] = reResult;

        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'wordpress embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://public-api.wordpress.com/oembed/1.0/?format=json&for=juick.com&url=' + encodeURIComponent(url),
          onload: function(response) {
            if(response.status != 200) {
              console.log('Failed to load ' + url);
              console.log(response);
              div.textContent = `Failed to load (maybe this article can't be embedded)`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?slideshare\.net\/(\w+)\/([-\w]+)/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url, author, id] = reResult;

        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'slideshare embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'http://www.slideshare.net/api/oembed/2?format=json&url=' + url,
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/gist.github.com\/(?:([\w-]+)\/)?([A-Fa-f0-9]+)\b/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url, , id] = reResult;

        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'gistEmbed embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://gist.github.com/' + id + '.json',
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/codepen\.io\/(\w+)\/(?:pen|full)\/(\w+)/i,
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url] = reResult;
        let div = document.createElement('div');
        div.textContent = 'loading ' + naiveEllipsis(url, 65);
        div.className = 'codepen embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://codepen.io/api/oembed?format=json&url=' + encodeURIComponent(url.replace('/full/', '/pen/')),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = `Failed to load (${response.status} - ${response.statusText})`;
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, () => thisType.makeNode(aNode, reResult));
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
      ctsDefault: false,
      re: /^(?:https?:)?\/\/www\.pixiv\.net\/member_illust\.php\?((?:\w+=\w+&)*illust_id=(\d+)(?:&\w+=\w+)*)/i,
      makeNode: function(aNode, reResult) {
        var pixivType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'pixiv embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: reResult[0].replace(/mode=\w+/, 'mode=medium'),
          onload: function(response) {
            if(response.status != 200) {
              if(response.responseText.includes('work private')) {
                div.textContent = 'Private work.';
                return;
              }
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return pixivType.makeNode(aNode, reResult);});
              return;
            }
            var isMultipage = (reResult[0].includes('mode=manga') || response.responseText.includes('member_illust.php?mode=manga'));
            var metaRe = /<\s*meta\s+(?:property|name)\s*=\s*\"([^\"]+)\"\s+content\s*=\s*\"([^\"]*)\"\s*>/gmi;
            var matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            var imageUrl, imageTitle;
            [].forEach.call(matches, function(m, i, arr) {
              if(m[1] == 'og:image') { imageUrl = m[2]; }
              if(m[1] == 'twitter:image') { imageUrl = m[2]; }
              if(m[1] == 'twitter:title') { imageTitle = m[2]; }
            });
            if(response.responseText.includes('This work was deleted')) {
              div.textContent = 'Deleted work.';
              return;
            }
            var [, dateStr] = /<span\s+class=\"date\">([^<]+)<\/span>/.exec(response.responseText) || [];
            var [, authorId, authorName] = /<a\s+href="member\.php\?id=(\d+)">\s*<img\s+src="[^"]+"\s+alt="[^"]+"\s+title="([^"]+)"\s\/?>/i.exec(response.responseText) || [];
            //imageUrl = 'http://embed.pixiv.net/decorate.php?illust_id=' + reResult[2];

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = imageUrl;
            aNode2.href = aNode.href;
            aNode2.appendChild(imgNode);

            var dateDiv = (dateStr !== undefined) ? '<div class="date">' + dateStr + '</div>' : '';
            var authorStr = (authorId !== undefined) ? ' by <a href="http://www.pixiv.net/member_illust.php?id=' + authorId + '">' + authorName + '</a>' : '';
            var titleDiv = '<div class="title">' + (isMultipage ? '(multipage) ' : '') + '<a href="' + reResult[0] + '">' + imageTitle + '</a>' + authorStr + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>';
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    },
    {
      name: 'Gelbooru',
      id: 'embed_gelbooru',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?(gelbooru\.com|safebooru.org)\/index\.php\?((?:\w+=\w+&)*id=(\d+)(?:&\w+=\w+)*)/i,
      makeNode: function(aNode, reResult) {
        var gelbooruType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + gelbooruType.makeTitle(aNode, reResult);
        div.className = 'gelbooru booru embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'http://' + reResult[1] + '/index.php?page=dapi&s=post&q=index&id=' + reResult[3],
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return gelbooruType.makeNode(aNode, reResult);});
              return;
            }
            var previewUrl, rating, createdAt, change, hasNotes, hasComments, id, count;
            var attributeRe = /(\w+)="([^"]+)"/gmi;
            var matches = getAllMatchesAndCaptureGroups(attributeRe, response.responseText);
            [].forEach.call(matches, function([, attr, val], i, arr) {
              if(attr == 'count') { count = +val; }
              if(attr == 'id') { id = val; }
              if(attr == 'preview_url') { previewUrl = val; }
              if(attr == 'rating') { rating = val; }
              if(attr == 'created_at') { createdAt = new Date(val); }
              if(attr == 'change') { change = new Date(1000 * parseInt(val, 10)); }
              if(attr == 'has_notes') { hasNotes = String(val).toLowerCase() === 'true'; }
              if(attr == 'has_comments') { hasComments = String(val).toLowerCase() === 'true'; }
            });
            if(count === 0) {
              div.textContent = reResult[3] + ' is not available';
              return;
            }

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = previewUrl;
            imgNode.className = 'rating_' + rating;
            aNode2.href = aNode.href;
            aNode2.appendChild(imgNode);

            var createdDateStr = createdAt.toLocaleDateString('ru-RU');
            var changedDateStr = change.toLocaleDateString('ru-RU');
            if(createdDateStr != changedDateStr) { createdDateStr += ' (' + changedDateStr + ')' }
            var dateDiv = '<div class="date">' + createdDateStr + '</div>';
            var titleDiv = '<div class="title">' + '<a href="' + reResult[0] + '">' + id + '</a>' + (hasNotes ? ' (notes)' : '') + (hasComments ? ' (comments)' : '') + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>';
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', ' loaded');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return reResult[1] + ' (' + reResult[3] + ')';
      },
      linkTextUpdate: function(aNode, reResult) {
        aNode.textContent += ' (' + reResult[3] + ')';
      }
    },
    {
      name: 'Danbooru',
      id: 'embed_danbooru',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(danbooru|safebooru)\.donmai\.us\/post(?:s|\/show)\/(\d+)/i,
      makeNode: function(aNode, reResult) {
        var danbooruType = this;
        var id = reResult[2];
        var url = reResult[0].replace('http:', 'https:');

        var div = document.createElement("div");
        div.textContent = 'loading ' + danbooruType.makeTitle(aNode, reResult);
        div.className = 'danbooru booru embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://' + reResult[1] + '.donmai.us/posts/' + id + '.json',
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return danbooruType.makeNode(aNode, reResult);});
              return;
            }
            var json = JSON.parse(response.responseText);
            if(json.preview_file_url === undefined) {
              div.innerHTML = '<span>Can\'t show <a href="' + url + '">' + id + '</a></span>';
              return;
            }

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = 'https://' + reResult[1] + '.donmai.us' + json.preview_file_url;
            imgNode.className = 'rating_' + json.rating;
            //imgNode.title = tagsStr;
            aNode2.href = url;
            aNode2.appendChild(imgNode);

            var tagsStr = [json.tag_string_artist, json.tag_string_character, json.tag_string_copyright]
                            .filter(s => s != '')
                            .map(s => (s.count(' ') > 1) ? naiveEllipsisRight(s, 40) : '<a href="https://danbooru.donmai.us/posts?tags=' + encodeURIComponent(s) + '">' + s + '</a>')
                            .join("<br>");
            var hasNotes = (json.last_noted_at !== null);
            var hasComments = (json.last_commented_at !== null);
            var createdDateStr = (new Date(json.created_at)).toLocaleDateString('ru-RU');
            var updatedDateStr = (new Date(json.updated_at)).toLocaleDateString('ru-RU');
            if(createdDateStr != updatedDateStr) { createdDateStr += ' (' + updatedDateStr + ')' }
            var dateDiv = '<div class="date">' + createdDateStr + '</div>';
            var titleDiv = '<div class="title">' + '<a href="' + url + '">' + id + '</a>' + (hasNotes ? ' (notes)' : '') + (hasComments ? ' (comments)' : '') + '</div>';
            var tagsDiv = '<div class="booru-tags">' + tagsStr + '</div>'
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>' + tagsDiv;
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', ' loaded');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return reResult[1] + ' (' + reResult[2] + ')';
      },
      linkTextUpdate: function(aNode, reResult) {
        aNode.href = aNode.href.replace('http:', 'https:');
        aNode.textContent += ' (' + reResult[2] + ')';
      }
    },
    {
      name: 'Konachan',
      id: 'embed_konachan',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/konachan\.(com|net)\/post\/show\/(\d+)/i,
      makeNode: function(aNode, reResult) {
        var konachanType = this;
        var id = reResult[2];
        var url = reResult[0].replace('.com/', '.net/');
        var unsafeUrl = reResult[0].replace('.net/', '.com/');

        var div = document.createElement("div");
        div.textContent = 'loading ' + konachanType.makeTitle(aNode, reResult);
        div.className = 'konachan booru embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://konachan.net/post.json?tags=id:' + id,
          timeout: 3000,
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return konachanType.makeNode(aNode, reResult);});
              return;
            }
            var json = (JSON.parse(response.responseText))[0];
            if(json === undefined || json.preview_url === undefined) {
              div.innerHTML = '<span>Can\'t show <a href="' + url + '">' + id + '</a></span>';
              return;
            }

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = json.preview_url;
            imgNode.className = 'rating_' + json.rating;
            aNode2.href = url;
            aNode2.appendChild(imgNode);

            var createdDateStr = (new Date(1000 * parseInt(json.created_at, 10))).toLocaleDateString('ru-RU');
            var dateDiv = '<div class="date">' + createdDateStr + '</div>';
            var titleDiv = '<div class="title"><a href="' + url + '">' + id + '</a>' + (json.rating == 's' ? '' : ' (<a href="' + unsafeUrl +'">' + json.rating + '</a>)') + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>';
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', ' loaded');
          },
          ontimeout: function(response) {
            div.textContent = 'Failed to load (time out)';
            div.className = div.className.replace(' loading', ' failed');
            turnIntoCts(div, function(){return konachanType.makeNode(aNode, reResult);});
          },
          onerror: function(response) {
            console.log('Unknown error when loading ' + url);
            console.log(response);
            div.textContent = 'Failed to load (unknown error)';
            div.className = div.className.replace(' loading', ' failed');
            turnIntoCts(div, function(){return konachanType.makeNode(aNode, reResult);});
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return 'konachan (' + reResult[2] + ')';
      },
      linkTextUpdate: function(aNode, reResult) {
        aNode.textContent += ' (' + reResult[2] + ')';
      }
    },
    {
      name: 'yande.re',
      id: 'embed_yandere',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/yande.re\/post\/show\/(\d+)/i,
      makeNode: function(aNode, reResult) {
        var yandereType = this;
        var [url, id] = reResult;

        var div = document.createElement("div");
        div.textContent = 'loading ' + yandereType.makeTitle(aNode, reResult);
        div.className = 'yandere booru embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://yande.re/post.json?tags=id:' + id,
          timeout: 3000,
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return yandereType.makeNode(aNode, reResult);});
              return;
            }
            var json = (JSON.parse(response.responseText))[0];
            if(json === undefined || json.preview_url === undefined) {
              div.innerHTML = '<span>Can\'t show <a href="' + url + '">' + id + '</a></span>';
              return;
            }

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = json.preview_url;
            imgNode.className = 'rating_' + json.rating;
            aNode2.href = url;
            aNode2.appendChild(imgNode);

            var hasNotes = (json.last_noted_at !== null && json.last_noted_at !== 0);
            var hasComments = (json.last_commented_at !== null && json.last_commented_at !== 0);
            var createdDateStr = (new Date(1000 * json.created_at)).toLocaleDateString('ru-RU');
            var updatedDateStr = (new Date(1000 * json.updated_at)).toLocaleDateString('ru-RU');
            if(createdDateStr != updatedDateStr && json.updated_at != 0) { createdDateStr += ' (' + updatedDateStr + ')' }
            var dateDiv = '<div class="date">' + createdDateStr + '</div>';
            var titleDiv = '<div class="title"><a href="' + url + '">' + id + '</a>' + (hasNotes ? ' (notes)' : '') + (hasComments ? ' (comments)' : '') + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>';
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', ' loaded');
          },
          ontimeout: function(response) {
            div.textContent = 'Failed to load (time out)';
            div.className = div.className.replace(' loading', ' failed');
            turnIntoCts(div, function(){return yandereType.makeNode(aNode, reResult);});
          },
          onerror: function(response) {
            console.log('Unknown error when loading ' + url);
            console.log(response);
            div.textContent = 'Failed to load (unknown error)';
            div.className = div.className.replace(' loading', ' failed');
            turnIntoCts(div, function(){return yandereType.makeNode(aNode, reResult);});
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return 'yande.re (' + reResult[1] + ')';
      },
      linkTextUpdate: function(aNode, reResult) {
        aNode.textContent += ' (' + reResult[1] + ')';
      }
    },
    {
      name: 'anime-pictures.net',
      id: 'embed_anime_pictures_net',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/anime-pictures.net\/pictures\/view_post\/(\d+)/i,
      makeNode: function(aNode, reResult) {
        var anipicType = this;
        var [url, id] = reResult;

        var div = document.createElement("div");
        div.textContent = 'loading ' + anipicType.makeTitle(aNode, reResult);
        div.className = 'yandere embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          onload: function(response) {
            if(response.status != 200) {
              if(response.status == 503) {
                div.textContent = 'Click to show ' + anipicType.makeTitle(aNode, reResult);
              } else {
                div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              }
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return anipicType.makeNode(aNode, reResult);});
              return;
            }
            if(response.responseText.includes('must be logged in')) {
              div.innerHTML = '<span>You must be logged in to view <a href="' + url + '">' + anipicType.makeTitle(aNode, reResult) + '</a></span>';
              return;
            }

            var metaRe = /<\s*meta\s+(?:(?:property|name)\s*=\s*\"([^\"]+)\"\s+)?content\s*=\s*\"([^\"]*)\"(?:\s+(?:property|name)\s*=\s*\"([^\"]+)\")?\s*>/gmi;
            var matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText);
            var imageUrl;
            [].forEach.call(matches, function(m, i, arr) {
              if((m[1] || m[3]) == 'og:image') { imageUrl = m[2]; }
            });

            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = imageUrl;
            aNode2.href = aNode.href;
            aNode2.appendChild(imgNode);

            var titleDiv = '<div class="title">' + '<a href="' + reResult[0] + '">' + id + '</a>' + '</div>';
            div.innerHTML = '<div class="top">' + titleDiv + '</div>';
            div.appendChild(aNode2);

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        return 'anime-pictures.net (' + reResult[1] + ')';
      },
      linkTextUpdate: function(aNode, reResult) {
        aNode.textContent += ' (' + reResult[1] + ')';
      }
    },
    {
      name: 'Use meta for other links (whitelist)',
      id: 'embed_whitelisted_domains',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?!juick\.com\b).*/i,
      match: function(aNode, reResult) {
        let domain = aNode.hostname;
        let domainsWhitelist = GM_getValue('domains_whitelist', getDefaultDomainWhitelist().join("\n")).split(/\r?\n/);
        return domainsWhitelist.some(w => matchWildcard(domain, w));
      },
      makeNode: function(aNode, reResult) {
        let thisType = this;
        let [url] = reResult;
        let domain = aNode.hostname;
        let div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(url, 60);
        div.className = 'other embed loading ' + domain.replace(/\./g, '_');

        let unembed = (reason) => { if(reason !== undefined){console.log(`${reason} - ${url}`);}; div.innerHTML = ''; div.className = 'notEmbed'; aNode.classList.add('notEmbed'); }

        GM_xmlhttpRequest({
          method: "HEAD",
          url: url,
          timeout: 1000,
          onload: function(response1) {
            if(response1.status != 200) {
              unembed(`Failed to load (${response1.status} - ${response1.statusText})`);
              return;
            }
            const headRe = /^([\w-]+): (.+)$/gmi;
            let headerMatches = getAllMatchesAndCaptureGroups(headRe, response1.responseHeaders);
            let [, , contentType] = headerMatches.find(m => (m[1].toLowerCase() == 'content-type'));

            if(contentType !== undefined && contentType.match(/^text\/html\b/i)) {

              GM_xmlhttpRequest({
                method: "GET",
                url: url,
                timeout: 1000,
                onload: function(response) {
                  if(response.status != 200) {
                    unembed(`Failed to load (${response.status} - ${response.statusText})`);
                    return;
                  }

                  const metaRe = /<\s*meta\s+(?:(?:property|name)\s*=\s*\"([^\"]+)\"\s+)?content\s*=\s*\"([^\"]*)\"(?:\s+(?:property|name)\s*=\s*\"([^\"]+)\")?\s*\/?>/gmi;
                  let matches = getAllMatchesAndCaptureGroups(metaRe, response.responseText).map(m => ({ k: (m[1] || m[3]).toLowerCase(), v: m[2] }));
                  let meta = {}; [].forEach.call(matches, m => { meta[m.k] = m.v; });
                  let title = meta['twitter:title'] || meta['og:title'] || meta['title'];
                  let image = meta['twitter:image'] || meta['og:image'];
                  let description = meta['twitter:description'] || meta['og:description'] || meta['description'];

                  if(title !== undefined && description !== undefined && (title.length > 0) && (description.length > 0)) { // enough meta content to embed
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
              console.log(response.responseHeaders);
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
    'republic.ru',
    'bash.im',
    'ixbt.com'
  ];
}

function embedLink(aNode, linkTypes, container, alwaysCts, afterNode) {
  let anyEmbed = false;
  let linkId = (aNode.href.replace(/^https?:/i, '').replace(/\'/i,''));
  let sameEmbed = container.querySelector(`*[data-linkid=\'${linkId}\']`); // do not embed the same thing twice
  if(sameEmbed === null) {
    anyEmbed = [].some.call(linkTypes, function(linkType) {
      if(GM_getValue(linkType.id, true)) {
        let reResult = linkType.re.exec(aNode.href);
        if(reResult !== null) {
          if((linkType.match !== undefined) && (linkType.match(aNode, reResult) === false)) { return false; }
          let newNode;
          let isCts = alwaysCts || GM_getValue('cts_' + linkType.id, linkType.ctsDefault);
          if(isCts) {
            let linkTitle = (linkType.makeTitle !== undefined) ? linkType.makeTitle(aNode, reResult) : naiveEllipsis(aNode.href, 65);
            newNode = makeCts(() => linkType.makeNode(aNode, reResult), 'Click to show: ' + linkTitle);
          } else {
            newNode = linkType.makeNode(aNode, reResult);
          }
          if(!newNode) { return false; }
          aNode.classList.add('embedLink');
          if(GM_getValue('enable_link_text_update', true) && (linkType.linkTextUpdate !== undefined)) {
            linkType.linkTextUpdate(aNode, reResult);
          }
          newNode.setAttribute('data-linkid', linkId);
          if(afterNode !== undefined) {
            insertAfter(newNode, afterNode);
          } else {
            container.appendChild(newNode);
          }
          return true;
        }
      }
    });
  }
  return anyEmbed;
}

function embedLinks(aNodes, container, alwaysCts, afterNode) {
  let anyEmbed = false;
  let embedableLinkTypes = getEmbedableLinkTypes();
  [].forEach.call(aNodes, function(aNode, i, arr) {
    let isEmbedded = embedLink(aNode, embedableLinkTypes, container, alwaysCts, afterNode);
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
  let userId = article.querySelector('div.msg-avatar > a > img').alt;
  let tagsDiv = article.querySelector('.msg-tags');
  let tags = [];
  if(tagsDiv !== null) {
    [].forEach.call(tagsDiv.childNodes, function(item, i, arr) {
      tags.push(item.textContent.toLowerCase());
    });
  }
  return { userId: userId, tags: tags };
}

function isFilteredX(x, filteredUsers, filteredTags) {
  let {userId, tags} = articleInfo(x);
  return (filteredUsers !== undefined && filteredUsers.indexOf(userId.toLowerCase()) !== -1)
         || (intersect(tags, filteredTags).length > 0);
}

function embedLinksToX(x, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags) {
  let isCtsPost = isFilteredX(x, ctsUsers, ctsTags);
  let allLinks = x.querySelectorAll(allLinksSelector);
  let embedContainer = document.createElement('div');
  embedContainer.className = 'embedContainer';
  let anyEmbed = embedLinks(allLinks, embedContainer, isCtsPost);
  if(anyEmbed) {
    let beforeNode = x.querySelector(beforeNodeSelector);
    x.insertBefore(embedContainer, beforeNode);
  }
}

function embedLinksToArticles() {
  let [ctsUsers, ctsTags] = splitUsersAndTagsLists(GM_getValue('cts_users_and_tags', ''));
  let beforeNodeSelector = 'nav.l';
  let allLinksSelector = 'p:not(.ir) a, pre a';
  [].forEach.call(document.querySelectorAll('#content > article'), function(article, i, arr) {
    embedLinksToX(article, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags);
  });
}

function embedLinksToPost() {
  let [ctsUsers, ctsTags] = splitUsersAndTagsLists(GM_getValue('cts_users_and_tags', ''));
  let beforeNodeSelector = '.msg-txt + *';
  let allLinksSelector = '.msg-txt a';
  [].forEach.call(document.querySelectorAll('#content .msg-cont'), function(msg, i, arr) {
    embedLinksToX(msg, beforeNodeSelector, allLinksSelector, ctsUsers, ctsTags);
  });
}

function filterArticles() {
  let [filteredUsers, filteredTags] = splitUsersAndTagsLists(GM_getValue('filtered_users_and_tags', ''));
  let keepHeader = GM_getValue('filtered_posts_keep_header', true);
  [].forEach.call(document.querySelectorAll('#content > article'), function(article, i, arr) {
    var isFilteredPost = isFilteredX(article, filteredUsers, filteredTags);
    if(isFilteredPost) {
      if(keepHeader) {
        article.classList.add('filtered');
        while (article.children.length > 1) {
          article.removeChild(article.lastChild);
        }
      } else {
        article.remove();
      }
    }
  });
}

function filterPostComments() {
  if(!GM_getValue('filter_comments_too', false)) { return; }
  let [filteredUsers, filteredTags] = splitUsersAndTagsLists(GM_getValue('filtered_users_and_tags', ''));
  let keepHeader = GM_getValue('filtered_posts_keep_header', true);
  [].forEach.call(document.querySelectorAll('#content #replies .msg-cont'), function(reply, i, arr) {
    let isFilteredComment = isFilteredX(reply, filteredUsers, filteredTags);
    if(isFilteredComment) {
      reply.classList.add('filteredComment');
      reply.querySelector('.msg-txt').remove();
      reply.querySelector('.msg-comment').remove();
      var linksDiv = reply.querySelector('.msg-links');
      linksDiv.querySelector('.a-thread-comment').remove();
      linksDiv.innerHTML = linksDiv.innerHTML.replace(' · ', '');
      var media = reply.querySelector('.msg-comment');
      if (media !== null) { media.remove(); }
      if(!keepHeader) {
        reply.classList.add('headless');
        reply.querySelector('.msg-header').remove();
      }
    }
  });
}

function checkReply(allPostsSelector, replySelector) {
  [].forEach.call(document.querySelectorAll(allPostsSelector), function(post, i, arr) {
    let replyNode = post.querySelector(replySelector);
    if(replyNode === null) {
      post.classList.add('readonly');
    }
  });
}

function checkReplyArticles() {
  if(!GM_getValue('enable_blocklisters_styling', false)) { return; }
  checkReply('#content > article', 'nav.l > a.a-comment');
}

function checkReplyPost() {
  if(!GM_getValue('enable_blocklisters_styling', false)) { return; }
  checkReply('#content div.msg-cont', 'div.msg-comment');
}

function getUserscriptSettings() {
  return [
    {
      name: 'Пользовательские теги (/user/?tag=) в постах вместо общих (/tag/)',
      id: 'enable_user_tag_links',
      enabledByDefault: true
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
      name: 'Посты и комментарии, на которые нельзя ответить, — более бледные',
      id: 'enable_blocklisters_styling',
      enabledByDefault: false
    }
  ];
}

function makeSettingsCheckbox(caption, id, defaultState) {
  var label = document.createElement("label");
  var cb = document.createElement("input");
  cb.type = 'checkbox';
  cb.checked = GM_getValue(id, defaultState);
  cb.onclick = function(e) { GM_setValue(id, cb.checked); };
  label.appendChild(cb);
  label.appendChild(document.createTextNode(caption));
  return label;
}

function makeSettingsTextbox(caption, id, defaultString, placeholder) {
  var label = document.createElement("label");
  var wrapper = document.createElement("div");
  wrapper.className = 'ta-wrapper';
  var textarea = document.createElement("textarea");
  textarea.className = id;
  textarea.placeholder = placeholder;
  textarea.title = placeholder;
  textarea.value = GM_getValue(id, defaultString);
  textarea.oninput = function(e) { GM_setValue(id, textarea.value); };
  wrapper.appendChild(textarea);
  label.appendChild(document.createTextNode('' + caption + ': '));
  label.appendChild(wrapper);
  return label;
}

function showUserscriptSettings() {
  let contentBlock = document.querySelector('#content > article');
  while (contentBlock.firstChild) {
    contentBlock.removeChild(contentBlock.firstChild);
  }

  let h1 = document.createElement('h1');
  h1.textContent = 'Tweaks';

  let uiFieldset = document.createElement('fieldset');
  { // UI
    let uiLegend = document.createElement('legend');
    uiLegend.textContent = 'UI';
    uiFieldset.appendChild(uiLegend);

    let list1 = document.createElement('ul');
    let allSettings = getUserscriptSettings();
    [].forEach.call(allSettings, function(item, i, arr) {
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
    let embedableLinkTypes = getEmbedableLinkTypes();
    [].forEach.call(embedableLinkTypes, function(linkType, i, arr) {
      let row = document.createElement("tr");
      row.appendChild(wrapIntoTag(makeSettingsCheckbox(linkType.name, linkType.id, true), 'td'));
      row.appendChild(wrapIntoTag(makeSettingsCheckbox('Click to show', 'cts_' + linkType.id, linkType.ctsDefault), 'td'));
      table2.appendChild(row);
    });
    embeddingFieldset.appendChild(table2);

    let domainsWhitelist = makeSettingsTextbox('Domains whitelist ("*" wildcard is supported)', 'domains_whitelist', getDefaultDomainWhitelist().join("\n"), 'One domain per line. "*" wildcard is supported');
    embeddingFieldset.appendChild(wrapIntoTag(domainsWhitelist, 'p'));

    let updateLinkTextCheckbox = makeSettingsCheckbox('Обновлять текст ссылок, если возможно (например, "juick.com" на #123456/7)', 'enable_link_text_update', true);
    let ctsUsersAndTags = makeSettingsTextbox('Всегда использовать "Click to show" для этих юзеров и тегов в ленте', 'cts_users_and_tags', '', '@users and *tags separated with space or comma');
    ctsUsersAndTags.style = 'display: flex; flex-direction: column; align-items: stretch;';
    embeddingFieldset.appendChild(document.createElement('hr'));
    embeddingFieldset.appendChild(wrapIntoTag(ctsUsersAndTags, 'p'));
    embeddingFieldset.appendChild(wrapIntoTag(updateLinkTextCheckbox, 'p'));
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
    resetButton.onclick = function(){
      if(!confirm('Are you sure you want to reset Tweaks settings to default?')) { return; }
      let keys = GM_listValues();
      for (var i=0, key=null; key=keys[i]; i++) {
        GM_deleteValue(key);
      }
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
  support.innerHTML = 'Feedback and feature requests <a href="http://juick.com/killy/?tag=userscript">here</a>.';

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
  aNode.onclick = function(e){ e.preventDefault(); showUserscriptSettings(); };
  liNode.appendChild(aNode);
  tabsList.appendChild(liNode);
}

function updateUserRecommendationStats(userId, pagesPerCall) {
  var contentBlock = document.querySelector('section#content');
  while (contentBlock.firstChild) {
    contentBlock.removeChild(contentBlock.firstChild);
  }
  var article = document.createElement('article');
  var userCounters = {};
  var totalRecs = 0;

  function recUpdate(depth, oldestMid, oldestDate) {
    if(depth <= 0) { return; }

    var url = 'http://juick.com/' + userId + '/?show=recomm' + ((oldestMid !== undefined) ? '&before=' + oldestMid : '');
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function(response) {
        if(response.status != 200) {
          console.log(`${user.id}: failed with ${response.status}, ${response.statusText}`);
          return;
        }

        var articleRe = /<article[\s\S]+?<\/article>/gmi;
        var articles = response.responseText.match(articleRe);
        if(articles === null) {
          console.log('no more articles in response');
          return;
        }

        totalRecs = totalRecs + articles.length;
        var hasMore = (articles.length > 15);
        var oldestArticle = articles[articles.length - 1];

        var dateRe = /datetime\=\"([^\"]+) ([^\"]+)\"/i;
        var [, oldestDatePart, oldestTimePart] = dateRe.exec(oldestArticle);
        oldestDate = new Date(`${oldestDatePart}T${oldestTimePart}`);

        var midRe = /data-mid="(\d+)"/i;
        var [, oldestMid] = midRe.exec(oldestArticle);

        var userRe = /@<a href="\/([-\w]+)\/">/i;
        var userAvatarRe = /<img src="\/\/i\.juick\.com\/a\/\d+\.png" alt="[^\"]+"\/?>/i;
        var authors = articles.map(function(article){
          var postAuthorId = (userRe.exec(article))[1];
          var postAuthorAvatar = (userAvatarRe.exec(article))[0];
          return {id: postAuthorId, avatar: postAuthorAvatar};
        });
        for(var i in authors) {
          var id = authors[i].id;
          var avatar = authors[i].avatar;
          if(id in userCounters) {
            userCounters[id].recs = userCounters[id].recs + 1;
          } else {
            userCounters[id] = {id: id, avatar: avatar, recs: 1};
          }
        }

        var sortedUsers = Object.values(userCounters).sort((a, b) => b.recs - a.recs);

        while (article.firstChild) {
          article.removeChild(article.firstChild);
        }

        if(hasMore && (depth == 1)) {
          var moreButton = document.createElement('button');
          moreButton.style = 'float: right;';
          moreButton.textContent = 'Check older recommendations';
          moreButton.onclick = function(){
            recUpdate(pagesPerCall, oldestMid, oldestDate);
          };
          article.appendChild(moreButton);
        }

        var datePNode = document.createElement('p');
        datePNode.textContent = `${totalRecs} recommendations since ${oldestDate.toLocaleDateString('ru-RU')}`;
        article.appendChild(datePNode);

        var avgPNode = document.createElement('p');
        var now = new Date();
        var days = ((now - oldestDate) / 1000 / 60 / 60 / 24);
        var avg = totalRecs / days;
        avgPNode.textContent = '' + avg.toFixed(3) + ' recommendations per day';
        article.appendChild(avgPNode);

        var userStrings = sortedUsers.map(x => `<li><a href="/${x.id}/">${x.avatar}${x.id}</a> / ${x.recs}</li>`);
        var ulNode = document.createElement('ul');
        ulNode.className = 'users';
        ulNode.innerHTML = userStrings.join('');
        article.appendChild(ulNode);

        if(hasMore) {
          setTimeout(function(){ recUpdate(depth - 1, oldestMid, oldestDate); }, 100);
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
  if(!GM_getValue('enable_irecommend', true)) { return; }
  var userId = document.querySelector("div#ctitle a").textContent;
  var asideColumn = document.querySelector("aside#column");
  var ustatsList = asideColumn.querySelector("#ustats > ul");
  var li3 = ustatsList.querySelector("li:nth-child(3)");
  var liNode = document.createElement("li");
  var aNode = document.createElement("a");
  aNode.textContent = 'Я рекомендую';
  aNode.href = '#irecommend';
  aNode.onclick = function(e){ e.preventDefault(); updateUserRecommendationStats(userId, 3); };
  liNode.appendChild(aNode);
  ustatsList.insertBefore(liNode, li3);

}

function addStyle() {
  var bg = getComputedStyle(document.documentElement).backgroundColor;
  var backColor = (bg == 'transparent') ? [255,255,255] : parseRgbColor(bg);
  var textColor = parseRgbColor(getComputedStyle(document.body).color);
  var colorVars = '' +
      '--br: ' + backColor[0] +
      '; --bg: ' +backColor[1] +
      '; --bb: ' +backColor[2] +
      '; --tr: ' +textColor[0] +
      '; --tg: ' +textColor[1] +
      '; --tb: ' +textColor[2] + ";";

  if(GM_getValue('enable_tags_min_width', true)) {
    GM_addStyle(".tagsContainer a { min-width: 25px; display: inline-block; text-align: center; } ");
  }
  GM_addStyle(
    ":root { " + colorVars + " --bg10: rgba(var(--br),var(--bg),var(--bb),1.0); --color10: rgba(var(--tr),var(--tg),var(--tb),1.0); --color07: rgba(var(--tr),var(--tg),var(--tb),0.7); --color03: rgba(var(--tr),var(--tg),var(--tb),0.3); --color02: rgba(var(--tr),var(--tg),var(--tb),0.2); } " +
    ".embedContainer { margin-top: 0.7em; display: flex; flex-wrap: wrap; padding: 0.15em; margin-left: -0.3em; margin-right: -0.3em; } " +
    ".embedContainer > * { box-sizing: border-box; flex-grow: 1; margin: 0.15em; min-width: 49%; } " +
    ".embedContainer img, .embedContainer video { max-width: 100%; max-height: 80vh; } " +
    ".embedContainer audio { width: 100%; } " +
    ".embedContainer iframe { overflow:hidden; resize: vertical; } " +
    ".embedContainer > .embed { width: 100%; border: 1px solid var(--color02); padding: 0.5em; display: flex; flex-direction: column; } " +
    ".embedContainer > .embed.loading, .embedContainer > .embed.failed { text-align: center; color: var(--color07); padding: 0; } " +
    ".embedContainer > .embed.failed { cursor: pointer; } " +
    ".embedContainer .embed .cts { margin: 0; } " +
    ".embed .top, .embed .bottom { display: flex; flex-shrink: 0; justify-content: space-between; } " +
    ".embed .top { margin-bottom: 0.5em; } " +
    ".embed .date, .embed .date > a, .embed .likes > a, .embed .replies > a, .embed .title { color: var(--color07); } " +
    ".embed .date { font-size: small; text-align: right; } " +
    ".embed .likes, .embed .replies { font-size: small; white-space:nowrap; margin-left: 12px; } " +
    ".embed .likes .icon, .embed .replies .icon { width: 20px; height: 20px; } " +
    ".embed .desc { margin-bottom: 0.5em; max-height: 55vh; overflow-y: auto; } " +
    ".twi.embed > .cts > .placeholder { display: inline-block; } " +
    ".embedContainer > .embed.twi .cts > .placeholder { border: 0; } " +
    ".juickEmbed > .top > .top-right { display: flex; flex-direction: column; flex: 1; } " +
    ".juickEmbed > .top > .top-right > .top-right-1st { display: flex; flex-direction: row; justify-content: space-between; } " +
    ".juickEmbed > .bottom > .right { margin-top: 5px; display: flex; flex: 0; }" +
    ".gistEmbed .gist-file .gist-data .blob-wrapper, .gistEmbed .gist-file .gist-data article { max-height: 70vh; overflow-y: auto; } " +
    ".gistEmbed.embed.loaded { border-width: 0px; padding: 0; } " +
    ".wordpress .desc { max-height: 70vh; overflow-y: auto; line-height: 160%; } " +
    ".tumblr { max-height: 86vh; overflow-y: auto; min-width: 90%; } " +
    ".tumblr.loading iframe { visibility: hidden; height: 0px; } " +
    ".reddit { max-height: 75vh; overflow-y: auto; min-width: 90%; } " +
    ".reddit iframe { resize: none; } " +
    ".reddit.loading > blockquote, .reddit.loading > div { display: none; }" +
    ".fbEmbed { min-width: 90%; } " +
    ".fbEmbed:not(.fallback) iframe { resize: none; } " +
    ".fbEmbed.loading > div { visibility: hidden; height: 0px; } " +
    ".imgur { min-width: 90%; } " +
    ".imgur iframe { border-width: 0px; } " +
    ".imgur.loading iframe { visibility: hidden; height: 0px; } " +
    ".embedContainer > .gelbooru.embed, .embedContainer > .danbooru.embed, .embedContainer > .konachan.embed, .embedContainer > .yandere.embed { width: 49%; position: relative; } " +
    ".danbooru.embed .booru-tags { display: none; position:absolute; bottom: 0.5em; right: 0.5em; font-size: small; text-align: right; color: var(--color07); } " +
    ".danbooru.embed.loaded { min-height: 110px; }" +
    ".danbooru.embed:hover .booru-tags { display: block; } " +
    ".embed .rating_e, .embed img.nsfw { opacity: 0.1; } " +
    ".embed .rating_e:hover, .embed img.nsfw:hover { opacity: 1.0; } " +
    ".embed.notEmbed { display: none; }" +
    ".embedLink:not(.notEmbed):after { content: ' ↓' } " +
    ".tweaksSettings * { box-sizing: border-box; } " +
    ".tweaksSettings table { border-collapse: collapse; } " +
    ".tweaksSettings tr { border-bottom: 1px solid transparent; } " +
    ".tweaksSettings tr:hover { background: rgba(127,127,127,.1) } " +
    ".tweaksSettings td > * { display: block; width: 100%; height: 100%; } " +
    ".tweaksSettings > button { margin-top: 25px; } " +
    ".tweaksSettings .ta-wrapper { width: 100%; height: 100%; } " +
    ".tweaksSettings .ta-wrapper > textarea { width: 100%; height: 100%; } " +
    ".tweaksSettings textarea.domains_whitelist { min-height: 72pt; }" +
    ".embedContainer > .cts { width: 100%; }" +
    ".embedContainer .cts > .placeholder { border: 1px dotted var(--color03); color: var(--color07); text-align: center; cursor: pointer; word-wrap: break-word; } " +
    ".cts > .placeholder { position: relative; } " +
    ".cts > .placeholder > .icon { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; color: var(--bg10); -webkit-filter: drop-shadow( 0 0 10px var(--color10) ); filter: drop-shadow( 0 0 10px var(--color10) ); } " +
    ".embed .cts .icon { display: flex; align-items: center; justify-content: center; } " +
    ".embed .cts .icon > svg { max-width: 100px; max-height: 100px; } " +
    ".filtered header { overflow: hidden; } " +
    ".filtered .msg-avatar { margin-bottom: 0px; } " +
    ".filteredComment.headless .msg-links { margin: 0px; } " +
    "article.readonly > p, div.readonly > .msg-txt { opacity: 0.55; } " +
    ""
  );
}

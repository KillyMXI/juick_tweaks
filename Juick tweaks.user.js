// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     2.4.2
// @date        2016.09.02 - 2016.11.01
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
// @connect     flickr.com
// @connect     flic.kr
// @connect     deviantart.com
// @connect     gist.github.com
// @connect     codepen.io
// ==/UserScript==


// pages and elements =====================================================================================

var content = document.getElementById("content");
var isPost = (content !== null) && content.hasAttribute("data-mid");
var isFeed = (document.querySelectorAll("#content article[data-mid]").length > 0);
var isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
var isTagsPage = window.location.pathname.endsWith('/tags');
var isSingleTagPage = (window.location.pathname.indexOf('/tag/') != -1);
var isSettingsPage = window.location.pathname.endsWith('/settings');
var isUserColumn = (document.querySelector("aside#column > div#ctitle:not(.tag)") === null) ? false : true;
var isUsersTable = (document.querySelector("table.users") === null) ? false : true;


// userscript features =====================================================================================

addStyle();                             // минимальный набор стилей, необходимый для работы скрипта

if(isPost) {                            // на странице поста
  updateTagsOnAPostPage();
  addTagEditingLinkUnderPost();
  addCommentRemovalLinks();
  embedLinksToPost();
}

if(isFeed) {                            // в ленте или любом списке постов
  updateTagsInFeed();
  embedLinksToArticles();
}

if(isUserColumn) {                      // если колонка пользователя присутствует слева
  addYearLinks();
  colorizeTagsInUserColumn();
  addSettingsLink();
  updateAvatar();
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

function intersect(a, b) {
  var t;
  if (b.length > a.length) { t = b, b = a, a = t; } // loop over shorter array
  return a.filter(function (e) { return (b.indexOf(e) !== -1); });
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function parseRgbColor(colorStr){
  colorStr = colorStr.replace(/ /g,'');
  colorStr = colorStr.toLowerCase();
  var re = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
  var bits = re.exec(colorStr);
  return [
    parseInt(bits[1]),
    parseInt(bits[2]),
    parseInt(bits[3])
  ];
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
    anode.href = "/" + userId + "/" + item.b;
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
    anode.innerHTML = '<div class="icon icon--ei-heart icon--s "><svg class="icon__cnt"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ei-gear-icon"></use></svg></div>';
    anode.href = 'http://juick.com/settings';
    ctitle.appendChild(anode);
    ctitle.style.display = 'flex';
    ctitle.style.justifyContent = 'space-between';
    ctitle.style.alignItems = 'baseline';
  }
}

function updateAvatar() {
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
      var text = item.textContent;
      item.onclick = function() { tagsfield.value = (tagsfield.value + " " + text).trim(); };
      item.href = "#";
    });
  });
}

function sortAndColorizeTagsInContainer(tagsContainer, numberLimit, isSorting) {
  tagsContainer.className += " tagsContainer";
  var linkColor = parseRgbColor(getComputedStyle(tagsContainer.getElementsByTagName('A')[0]).color);
  var backColor = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor);
  //linkColor = getContrastColor(backColor);
  var p0 = 0.7; // 70% of color range is used for color coding
  var maxC = 0.1;
  var sortedTags = [];
  [].forEach.call(tagsContainer.children, function(item, i, arr) {
    var anode = (item.tagName == 'A') ? item : item.getElementsByTagName('a')[0];
    var c = Math.log(parseInt(anode.title));
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
  sortedTags.forEach(function(item, i, arr) {
    var c = item.c;
    var p = (c/maxC-1)*p0+1; // normalize to [p0..1]
    var r = Math.round(linkColor[0]*p + backColor[0]*(1-p));
    var g = Math.round(linkColor[1]*p + backColor[1]*(1-p));
    var b = Math.round(linkColor[2]*p + backColor[2]*(1-p));
    //item.a.style.color = "rgb("+r+","+g+","+b+")";
    item.a.style.setProperty("color", "rgb("+r+","+g+","+b+")", "important");
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

function loadUsers(unprocessedUsers, processedUsers, doneCallback) {
  if(unprocessedUsers.length === 0) {
    doneCallback();
  } else {
    var user = unprocessedUsers.splice(0,1)[0];
    GM_xmlhttpRequest({
      method: "GET",
      //url: "http://api.juick.com/messages?uname=" + user.id,
      url: "http://juick.com/" + user.id + "/",
      onload: function(response) {
        if(response.status != 200) {
          console.log("" + user.id + ": failed with " + response.status + ", " + response.statusText);
        } else {
          var re = /datetime\=\"([^\"]+) ([^\"]+)\"/;
          //var re = /\"timestamp\"\:\"([^\"]+) ([^\"]+)\"/;
          var result = re.exec(response.responseText);
          if(result !== null) {
            var dateStr = "" + result[1] + "T" + result[2];// + "Z";
            var date = new Date(dateStr);
            user.date = date;
            user.a.appendChild(document.createTextNode (" (" + date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + ")" ));
          } else {
            console.log("" + user.id + ": no posts found");
          }
        }
        processedUsers.push(user);
        setTimeout(function(){ loadUsers(unprocessedUsers, processedUsers, doneCallback); }, 100);
      }
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
  loadUsers(unsortedUsers, sortedUsers, function(){
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
  var ctsNode = document.createElement('div');
  var placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = title;
  ctsNode.className = 'cts';
  ctsNode.appendChild(placeholder);
  turnIntoCts(ctsNode, makeNodeCallback);
  return ctsNode;
}

function makeIframe(src, w, h) {
  var iframe = document.createElement("iframe");
  iframe.width = w;
  iframe.height = h;
  iframe.frameBorder = 0;
  iframe.scrolling = 'no';
  iframe.setAttribute('allowFullScreen', '');
  iframe.src = src;
  return iframe;
}

function urlReplace(match, p1, p2, offset, string) {
  var isBrackets = (typeof p2 !== 'undefined');
  var domainRe = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/i;
  return (isBrackets)
    ? '<a href="' + p2 + '">' + p1 + '</a>'
    : '<a href="' + match + '">' + domainRe.exec(match)[1] + '</a>';
}

function bqReplace(match, offset, string) {
  return '<q>' + match.replace(/^(?:>|&gt;)\s?/gmi, '') + '</q>';
}

function messageReplyReplace(match, mid, rid, offset, string) {
  var isReply = (typeof rid !== 'undefined');
  return '<a href="//juick.com/' + mid + (isReply ? '#' + rid : '') + '">' + match + '</a>';
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

        var isReply = ((typeof reResult[3] !== 'undefined') && (reResult[3] !== '0'));
        var mrid = (isReply) ? parseInt(reResult[3], 10) : 0;
        var idStr = '#' + reResult[2] + ((isReply) ? '/' + mrid : '');
        var linkStr = '//juick.com/' + reResult[2] + ((isReply) ? '#' + mrid : '');

        var div = document.createElement("div");
        div.textContent = 'loading ' + idStr;
        div.className = 'juickEmbed embed loading';

        if(GM_getValue('enable_link_text_update', true) && (aNode.textContent === 'juick.com')) {
          //var isUser = (typeof reResult[1] !== 'undefined');
          aNode.textContent = idStr; // + ((!isReply && isUser) ? ' (@' + reResult[1] + ')' : '');
        }

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
            if((typeof msg == 'undefined')) {
              div.textContent = '' + idStr + ' doesn\'t exist';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return juickType.makeNode(aNode, reResult);});
              return;
            }

            var withTags = (typeof msg.tags !== 'undefined');
            var withPhoto = (typeof msg.photo !== 'undefined');
            var isReplyTo = (typeof msg.replyto !== 'undefined');
            var hasReplies = (typeof msg.replies !== 'undefined');

            var msgLink = '<a href="' + linkStr + '">' + idStr + '</a>';
            var userLink = '<a href="//juick.com/' + msg.user.uname + '/">@' + msg.user.uname + '</a>';
            var avatarStr = '<div class="msg-avatar"><a href="/' + msg.user.uname + '/"><img src="//i.juick.com/a/' + msg.user.uid + '.png" alt="' + msg.user.uname + '"></a></div>';
            var tagsStr = (withTags) ? '<div class="msg-tags">' + msg.tags.map(function(x) { return '<a href="http://juick.com/' + msg.user.uname + '/?tag=' + encodeURIComponent(x) + '">' + x + '</a>'; }).join('') + '</div>' : '';
            var photoStr = (withPhoto) ? '<div><a href="' + msg.photo.medium + '"><img src="' + msg.photo.small + '"/></a></div>' : '';
            var replyStr = (isReply) ? ( '<div>/' + mrid + (isReplyTo) ? ' in reply to /' + msg.replyto : '' ) + '</div>' : '';
            var titleDiv = '<div class="title">' + userLink + '</div>';
            var dateDiv = '<div class="date"><a href="' + linkStr + '">' + msg.timestamp + '</a></div>';
            var replyStr = (hasReplies)
                             ? (' · ' + msg.replies + ((msg.replies == '1') ? ' reply' : ' replies'))
                             : (isReplyTo)
                               ? 'in reply to <a class="whiteRabbit" href="//juick.com/' + msg.mid + '#' + msg.replyto + '">#' + msg.mid + '/' + msg.replyto + '</a>'
                               : (isReply)
                                 ? 'in reply to <a class="whiteRabbit" href="//juick.com/' + msg.mid + '">#' + msg.mid + '</a>'
                                 : '';
            var replyDiv = '<div class="embedReply msg-links">' + msgLink + ((replyStr.length > 0) ? ' ' + replyStr : '') + '</div>';
            var urlRe = /(?:\[([^\]]+)\]\[([^\]]+)\]|\b(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-\w+*&@#/%=~|$?!:,.]*\)|[-\w+*&@#/%=~|$?!:,.])*(?:\([-\w+*&@#/%=~|$?!:,.]*\)|[\w+*&@#/%=~|$]))/gi;
            var bqRe = /(?:^(?:>|&gt;)\s?[\s\S]+?$\n?)+/gmi;
            var description = htmlEscape(msg.body)
              .replace(urlRe, urlReplace)
              .replace(bqRe, bqReplace)
              .replace(/\n/g,'<br/>')
              .replace(/\B#(\d+)(?:\/(\d+))?\b/gmi, messageReplyReplace)
              .replace(/\B@([\w-]+)\b/gmi, "<a href=\"//juick.com/$1\">@$1</a>");
            var descDiv = '<div class="desc">' + description + '</div>';
            div.innerHTML =
              '<div class="top">' + avatarStr + '<div class="top-right"><div class="top-right-1st">' + titleDiv + dateDiv + '</div><div class="top-right-2nd">' + tagsStr + '</div></div></div>' +
              descDiv + photoStr + replyDiv;

            var allLinks = div.querySelectorAll(".desc a, .embedReply a.whiteRabbit");
            var embedContainer = div.parentNode;
            embedLinks(Array.prototype.slice.call(allLinks).reverse(), embedContainer, true, div);

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      },
      makeTitle: function(aNode, reResult) {
        var isReply = ((typeof reResult[3] !== 'undefined') && (reResult[3] !== '0'));
        var mrid = (isReply) ? parseInt(reResult[3], 10) : 0;
        var idStr = '#' + reResult[2] + ((isReply) ? '/' + mrid : '');
        return idStr;
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
      name: 'Webm and mp4 videos',
      id: 'embed_webm_and_mp4_videos',
      ctsDefault: false,
      re: /\.(webm|mp4)(?:\?[\w&;\?=]*)?$/i,
      makeNode: function(aNode, reResult) {
        var video = document.createElement("video");
        video.src = aNode.href;
        video.setAttribute('controls', '');
        return video;
      }
    },
    {
      name: 'YouTube videos',
      id: 'embed_youtube_videos',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?youtu(?:be\.com\/watch\?(?:[\w&=;]+&(?:amp;)?)?v=|\.be\/|be\.com\/v\/)([\w\-\_]*)(?:&(?:amp;)?[\w\?=]*)?/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//www.youtube-nocookie.com/embed/' + reResult[1] + '?rel=0', 640, 360);
      }
    },
    {
      name: 'YouTube playlists',
      id: 'embed_youtube_playlists',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?youtube\.com\/playlist\?list=([\w\-\_]*)(&(amp;)?[\w\?=]*)?/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//www.youtube-nocookie.com/embed/videoseries?list=' + reResult[1], 640, 360);
      }
    },
    {
      name: 'Vimeo videos',
      id: 'embed_vimeo_videos',
      ctsDefault: false,
      //re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:(?:video\/|album\/[\d]+\/video\/)?([\d]+)|([\w-]+)\/(?!videos)([\w-]+))/i,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/|album\/[\d]+\/video\/)?([\d]+)/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//player.vimeo.com/video/' + reResult[1], 640, 360);
      }
    },
    {
      name: 'Dailymotion videos',
      id: 'embed_youtube_videos',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?dailymotion\.com\/video\/([a-zA-Z\d]+)(?:_[\w-%]*)?/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//www.dailymotion.com/embed/video/' + reResult[1], 640, 360);
      }
    },
    {
      name: 'Coub clips',
      id: 'embed_coub_clips',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?coub\.com\/(?:view|embed)\/([a-zA-Z\d]+)/i,
      makeNode: function(aNode, reResult) {
        var embedUrl = '//coub.com/embed/' + reResult[1] + '?muted=false&autostart=false&originalSize=false&startWithHD=false';
        return makeIframe(embedUrl, 640, 360);
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
            div.parentNode.replaceChild(iframe, div);
          }
        });

        return div;
      }
    },
    {
      name: 'SoundCloud music',
      id: 'embed_soundcloud_music',
      ctsDefault: false,
      re: /(?:https?:)?\/\/(?:www\.)?soundcloud\.com\/(([\w\-\_]*)\/(?:sets\/)?([\w\-\_]*))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        var embedUrl = '//w.soundcloud.com/player/?url=//soundcloud.com/' + reResult[1] + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true';
        return makeIframe(embedUrl, '100%', 450);
      }
    },
    {
      name: 'Instagram',
      id: 'embed_instagram',
      ctsDefault: false,
      re: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/p\/([\w\-\_]*)(?:\/)?(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//www.instagram.com/p/' + reResult[1] + '/embed', 640, 722);
      }
    },
    {
      name: 'Flickr images',
      id: 'embed_flickr_images',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:(?:www\.)?flickr\.com\/photos\/([\w@-]+)\/(\d+)|flic.kr\/p\/(\w+))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        var flickrType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'flickr embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://www.flickr.com/services/oembed?format=xml&url=' + encodeURIComponent(reResult[0]),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return flickrType.makeNode(aNode, reResult);});
              return;
            }
            var fType, url, thumb, authorName, authorUrl, title, webPage;
            var xmlTagRe = /<(\w+)>\s*([^<]+)<\/\w+>/gmi;
            var matches = getAllMatchesAndCaptureGroups(xmlTagRe, response.responseText);
            [].forEach.call(matches, function(m, i, arr) {
              if(m[1] == 'flickr_type') { fType = m[2]; }
              if(m[1] == 'url') { url = m[2]; }
              if(m[1] == 'thumbnail_url') { thumb = m[2]; }
              if(m[1] == 'author_name') { authorName = m[2]; }
              if(m[1] == 'author_url') { authorUrl = m[2]; }
              if(m[1] == 'title') { title = m[2]; }
              if(m[1] == 'web_page') { webPage = m[2]; }
            });

            var imageUrl = (typeof url != 'undefined') ? url : thumb;
            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = imageUrl;//.replace('_b.', '_z.');
            aNode2.href = aNode.href;
            aNode2.appendChild(imgNode);

            var titleDiv = '<div class="title">' + '<a href="' + webPage + '">' + title + '</a>';
            if(fType != 'photo') {
              titleDiv += ' (' + fType + ')';
            }
            titleDiv += ' by <a href="' + authorUrl + '">' + authorName + '</a></div>';
            div.innerHTML = '<div class="top">' + titleDiv + '</div>';
            div.appendChild(aNode2);

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
        var daType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'deviantart embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://backend.deviantart.com/oembed?format=xml&url=' + encodeURIComponent(reResult[0]),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return daType.makeNode(aNode, reResult);});
              return;
            }
            var fType, fullsizeUrl, url, thumb, authorName, authorUrl, title, pubdate;
            var xmlTagRe = /<(\w+)>\s*([^<]+)<\/\w+>/gmi;
            var matches = getAllMatchesAndCaptureGroups(xmlTagRe, response.responseText);
            [].forEach.call(matches, function(m, i, arr) {
              if(m[1] == 'type') { fType = m[2]; }
              if(m[1] == 'fullsize_url') { fullsizeUrl = m[2]; }
              if(m[1] == 'url') { url = m[2]; }
              if(m[1] == 'thumbnail_url') { thumb = m[2]; }
              if(m[1] == 'author_name') { authorName = m[2]; }
              if(m[1] == 'author_url') { authorUrl = m[2]; }
              if(m[1] == 'title') { title = m[2]; }
              if(m[1] == 'pubdate') { pubdate = m[2]; }
            });

            var imageUrl = (typeof fullsizeUrl != 'undefined') ? fullsizeUrl : (typeof url != 'undefined') ? url : thumb;
            var aNode2 = document.createElement("a");
            var imgNode = document.createElement("img");
            imgNode.src = imageUrl;
            aNode2.href = aNode.href;
            aNode2.appendChild(imgNode);

            var date = new Date(pubdate);
            var dateDiv = '<div class="date">' + date.toLocaleString('ru-RU') + '</div>';
            var titleDiv = '<div class="title">' + '<a href="' + reResult[0] + '">' + title + '</a>';
            if(fType != 'photo') {
              titleDiv += ' (' + fType + ')';
            }
            titleDiv += ' by <a href="' + authorUrl + '">' + authorName + '</a></div>';
            div.innerHTML = '<div class="top">' + titleDiv + dateDiv + '</div>';
            div.appendChild(aNode2);

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
        return video;
      }
    },
    {
      name: 'Imgur indirect links',
      id: 'embed_imgur_indirect_links',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:\w+\.)?imgur\.com\/(?:(gallery|a)\/)?(?!gallery|jobs|about|blog|apps)([a-zA-Z\d]+)(?:#([a-zA-Z\d]+))?$/i,
      makeNode: function(aNode, reResult) {
        var isAlbum = (typeof reResult[1] != 'undefined');
        var embedUrl;
        if(isAlbum) {
          var isSpecificImage = (typeof reResult[3] != 'undefined');
          if(isSpecificImage) {
            embedUrl = '//imgur.com/' + reResult[3] + '/embed?analytics=false&amp;w=540';
          } else {
            embedUrl = '//imgur.com/a/' + reResult[2] + '/embed?analytics=false&amp;w=540&amp;pub=true';
          }
        } else {
          embedUrl = '//imgur.com/' + reResult[2] + '/embed?analytics=false&amp;w=540';
        }
        return makeIframe(embedUrl, '100%', 600);
      }
    },
    {
      name: 'Gfycat indirect links',
      id: 'embed_gfycat_indirect_links',
      ctsDefault: true,
      re: /^(?:https?:)?\/\/(?:\w+\.)?gfycat\.com\/([a-zA-Z\d]+)$/i,
      makeNode: function(aNode, reResult) {
        return makeIframe('//gfycat.com/ifr/' + reResult[1], '100%', 480);
      }
    },
    {
      name: 'Twitter',
      id: 'embed_twitter_status',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/(?:www\.)?(?:mobile\.)?twitter\.com\/([\w-]+)\/status\/([\d]+)/i,
      makeNode: function(aNode, reResult) {
        var twitterType = this;
        var twitterUrl = reResult[0].replace('mobile.','');
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
              div.textContent = 'Account @' + reResult[1] + ' is suspended';
              return;
            }
            if(response.finalUrl.indexOf('protected_redirect=true') != -1) {
              div.textContent = 'Account @' + reResult[1] + ' is protected';
              return;
            }
            var images = [];
            var userGenImg = false;
            var isVideo = false;
            var videoUrl, videoW, videoH;
            var description;
            var title;
            var id = reResult[1];
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
            titleDiv = '<div class="title">' + title + ' (<a href="//twitter.com/' + id + '">@' + id + '</a>)' + '</div>';
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
      name: 'Gist',
      id: 'embed_gist',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/gist.github.com\/(?:([\w-]+)\/)?([A-Fa-f0-9]+)\b/i,
      makeNode: function(aNode, reResult) {
        var gistType = this;
        var id = reResult[2];

        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'gistEmbed embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://gist.github.com/' + id + '.json',
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return gistType.makeNode(aNode, reResult);});
              return;
            }
            var json = JSON.parse(response.responseText);
            var titleDiv = '<div class="title">"' + json.description + '" by <a href="https://gist.github.com/' + json.owner + '">' + json.owner + '</a></div>';
            var dateDiv = '<div class="date">' + (new Date(json.created_at).toLocaleDateString('ru-RU')) + '</div>';
            var stylesheet = '<link rel="stylesheet" href="' + htmlEscape(json.stylesheet) + '"></link>';
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
        var endsWithSlash = reResult[1].endsWith('/');
        return makeIframe('' + reResult[1] + (endsWithSlash ? '' : '/') + 'embedded/', '100%', 500);
      }
    },
    {
      name: 'Codepen',
      id: 'embed_codepen',
      ctsDefault: false,
      re: /^(?:https?:)?\/\/codepen\.io\/(\w+)\/(?:pen|full)\/(\w+)/i,
      makeNode: function(aNode, reResult) {
        var codepenType = this;
        var div = document.createElement("div");
        div.textContent = 'loading ' + naiveEllipsis(reResult[0], 65);
        div.className = 'codepen embed loading';

        GM_xmlhttpRequest({
          method: "GET",
          url: 'https://codepen.io/api/oembed?format=json&url=' + encodeURIComponent(reResult[0].replace('/full/', '/pen/')),
          onload: function(response) {
            if(response.status != 200) {
              div.textContent = 'Failed to load (' + response.status + ' - ' + response.statusText + ')';
              div.className = div.className.replace(' loading', ' failed');
              turnIntoCts(div, function(){return codepenType.makeNode(aNode, reResult);});
              return;
            }
            var json = JSON.parse(response.responseText);
            var titleDiv = '<div class="title">"' + json.title + '" by <a href="' + json.author_url + '">' + json.author_name + '</a></div>';
            div.innerHTML = '<div class="top">' + titleDiv + '</div>' + json.html;

            div.className = div.className.replace(' loading', '');
          }
        });

        return div;
      }
    }
  ];
}

function embedLink(aNode, linkTypes, container, alwaysCts, afterNode) {
  var anyEmbed = false;
  var isAfterNode = (typeof afterNode !== 'undefined');
  var linkId = (aNode.href.replace(/^https?:/i, ''));
  var sameEmbed = container.querySelector('*[data-linkid=\'' + linkId + '\']'); // do not embed the same thing twice
  if(sameEmbed === null) {
    anyEmbed = [].some.call(linkTypes, function(linkType) {
      if(GM_getValue(linkType.id, true)) {
        var reResult = linkType.re.exec(aNode.href);
        var matched = (reResult !== null);
        if(matched) {
          aNode.className += ' embedLink';
          var newNode;
          var isCts = alwaysCts || GM_getValue('cts_' + linkType.id, linkType.ctsDefault);
          if(isCts) {
            var linkTitle = (typeof linkType.makeTitle !== 'undefined') ? linkType.makeTitle(aNode, reResult) : naiveEllipsis(aNode.href, 65);
            newNode = makeCts(function(){ return linkType.makeNode(aNode, reResult); }, 'Click to show: ' + linkTitle);
          } else {
            newNode = linkType.makeNode(aNode, reResult);
          }
          newNode.setAttribute('data-linkid', linkId);
          if(isAfterNode) {
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
  var anyEmbed = false;
  var embedableLinkTypes = getEmbedableLinkTypes();
  [].forEach.call(aNodes, function(aNode, i, arr) {
    var isEmbedded = embedLink(aNode, embedableLinkTypes, container, alwaysCts, afterNode);
    anyEmbed = anyEmbed || isEmbedded;
  });
  return anyEmbed;
}

function embedLinksToArticles() {
  var cts = GM_getValue('cts_users_and_tags', '').split(/[\s,]+/);
  var ctsUsers = cts.filter(function(x){ return x.startsWith('@'); }).map(function(x){ return x.replace('@','').toLowerCase(); });
  var ctsTags = cts.filter(function(x){ return x.startsWith('*'); }).map(function(x){ return x.replace('*','').toLowerCase(); });
  [].forEach.call(document.querySelectorAll("#content > article"), function(article, i, arr) {
    var userId = article.querySelector("div.msg-avatar > a > img").alt;
    var tagsDiv = article.querySelector(".msg-tags");
    var tags = [];
    if(tagsDiv !== null) {
      [].forEach.call(tagsDiv.childNodes, function(item, j, arrj) {
        tags.push(item.textContent.toLowerCase());
      });
    }
    var isCtsPost = (ctsUsers.indexOf(userId.toLowerCase()) !== -1) || (intersect(tags, ctsTags).length > 0);
    var nav = article.querySelector("nav.l");
    var allLinks = article.querySelectorAll("p:not(.ir) a, pre a");
    var embedContainer = document.createElement("div");
    embedContainer.className = 'embedContainer';
    var anyEmbed = embedLinks(allLinks, embedContainer, isCtsPost);
    if(anyEmbed){
      article.insertBefore(embedContainer, nav);
    }
  });
}

function embedLinksToPost() {
  [].forEach.call(document.querySelectorAll("#content .msg-cont"), function(msg, i, arr) {
    var txt = msg.querySelector(".msg-txt");
    var allLinks = txt.querySelectorAll("a");
    var embedContainer = document.createElement("div");
    embedContainer.className = 'embedContainer';
    var anyEmbed = embedLinks(allLinks, embedContainer, false);
    if(anyEmbed){
      msg.insertBefore(embedContainer, txt.nextSibling);
    }
  });
}

function getUserscriptSettings() {
  return [
    {
      name: 'Пользовательские теги (/user/?tag=) в постах вместо общих (/tag/)',
      id: 'enable_user_tag_links'
    },
    {
      name: 'Теги на форме редактирования нового поста (/#post)',
      id: 'enable_tags_on_new_post_form'
    },
    {
      name: 'Сортировка и цветовое кодирование тегов на странице /user/tags',
      id: 'enable_tags_page_coloring'
    },
    {
      name: 'Цветовое кодирование тегов в левой колонке',
      id: 'enable_left_column_tags_coloring'
    },
    {
      name: 'Заголовок и управление подпиской на странице тега /tag/...',
      id: 'enable_tag_page_toolbar'
    },
    {
      name: 'Ссылки для удаления комментариев',
      id: 'enable_comment_removal_links'
    },
    {
      name: 'Ссылка для редактирования тегов поста',
      id: 'enable_tags_editing_link'
    },
    {
      name: 'Большая аватарка в левой колонке',
      id: 'enable_big_avatar'
    },
    {
      name: 'Ссылки для перехода к постам пользователя за определённый год',
      id: 'enable_year_links'
    },
    {
      name: 'Ссылка на настройки в левой колонке на своей странице',
      id: 'enable_settings_link'
    },
    {
      name: 'Сортировка подписок/подписчиков по дате последнего сообщения',
      id: 'enable_users_sorting'
    },
    {
      name: 'Статистика рекомендаций',
      id: 'enable_irecommend'
    },
    {
      name: 'Min-width для тегов',
      id: 'enable_tags_min_width'
    },
    {
      name: 'Заменять текст ссылок "juick.com" на id постов и комментариев',
      id: 'enable_link_text_update'
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
  textarea.placeholder = placeholder;
  textarea.value = GM_getValue(id, defaultString);
  textarea.oninput = function(e) { GM_setValue(id, textarea.value); };
  textarea.style = 'width: 100%; height: 100%;';
  wrapper.appendChild(textarea);
  label.appendChild(document.createTextNode('' + caption + ': '));
  label.appendChild(wrapper);
  return label;
}

function wrapIntoTag(node, tagName, className) {
  var tag = document.createElement(tagName);
  if(typeof className != 'undefined') {
    tag.className = className;
  }
  tag.appendChild(node);
  return tag;
}

function showUserscriptSettings() {
  var contentBlock = document.querySelector("#content > article");
  while (contentBlock.firstChild) {
    contentBlock.removeChild(contentBlock.firstChild);
  }

  var h1 = document.createElement("h1");
  h1.textContent = 'Tweaks';

  var fieldset1 = document.createElement("fieldset");
  var legend1 = document.createElement("legend");
  legend1.textContent = 'UI';
  fieldset1.appendChild(legend1);

  var list1 = document.createElement("ul");
  var allSettings = getUserscriptSettings();
  [].forEach.call(allSettings, function(item, i, arr) {
    var liNode = document.createElement("li");
    var p = document.createElement("p");
    p.appendChild(makeSettingsCheckbox(item.name, item.id, true));
    liNode.appendChild(p);
    list1.appendChild(liNode);
  });
  fieldset1.appendChild(list1);

  var fieldset2 = document.createElement("fieldset");
  var legend2 = document.createElement("legend");
  legend2.textContent = 'Embedding';
  fieldset2.appendChild(legend2);

  var table2 = document.createElement("table");
  table2.style.width = '100%';
  var embedableLinkTypes = getEmbedableLinkTypes();
  [].forEach.call(embedableLinkTypes, function(linkType, i, arr) {
    var row = document.createElement("tr");
    row.appendChild(wrapIntoTag(makeSettingsCheckbox(linkType.name, linkType.id, true), 'td'));
    row.appendChild(wrapIntoTag(makeSettingsCheckbox('Click to show', 'cts_' + linkType.id, linkType.ctsDefault), 'td'));
    table2.appendChild(row);
  });
  fieldset2.appendChild(table2);

  var ctsUsersAndTags = makeSettingsTextbox('Всегда использовать "Click to show" для этих юзеров и тегов в ленте', 'cts_users_and_tags', '', '@users and *tags separated with space or comma');
  ctsUsersAndTags.style = 'display: flex; flex-direction: column; align-items: stretch;';
  fieldset2.appendChild(document.createElement('hr'));
  fieldset2.appendChild(wrapIntoTag(ctsUsersAndTags, 'p'));


  var resetButton = document.createElement("button");
  resetButton.textContent='Reset userscript settings to default';
  resetButton.onclick = function(){
    if(!confirm('Are you sure you want to reset Tweaks settings to default?')) { return; }
    var keys = GM_listValues();
    for (var i=0, key=null; key=keys[i]; i++) {
      GM_deleteValue(key);
    }
    showUserscriptSettings();
    alert('Done!');
  };


  var fieldset3 = document.createElement("fieldset");
  var legend3 = document.createElement("legend");
  legend3.textContent = 'Version info';
  var ver1 = document.createElement("p");
  var ver2 = document.createElement("p");
  ver1.textContent = 'Greasemonkey (or your script runner) version: ' + GM_info.version;
  ver2.textContent = 'Userscript version: ' + GM_info.script.version;
  fieldset3.appendChild(legend3);
  fieldset3.appendChild(ver1);
  fieldset3.appendChild(ver2);

  var support = document.createElement("p");
  support.innerHTML = 'Feedback and feature requests <a href="http://juick.com/killy/?tag=userscript">here</a>.';

  contentBlock.appendChild(h1);
  contentBlock.appendChild(fieldset1);
  contentBlock.appendChild(fieldset2);
  contentBlock.appendChild(resetButton);
  contentBlock.appendChild(fieldset3);
  contentBlock.appendChild(support);

  contentBlock.className = 'tweaksSettings';
}

function addTweaksSettingsButton() {
  var tabsList = document.querySelector("#pagetabs > ul");
  var liNode = document.createElement("li");
  var aNode = document.createElement("a");
  aNode.textContent = 'Tweaks';
  aNode.href = '#tweaks';
  aNode.onclick = function(e){ e.preventDefault(); showUserscriptSettings(); };
  liNode.appendChild(aNode);
  tabsList.appendChild(liNode);
}

function updateUserRecommendationStats(userId, pagesPerCall) {
  var contentBlock = document.querySelector("section#content");
  while (contentBlock.firstChild) {
    contentBlock.removeChild(contentBlock.firstChild);
  }
  var article = document.createElement("article");
  var oldestMid, oldestDate;
  var userCounters = {};
  var totalRecs = 0;

  function recUpdate(depth) {
    if(depth <= 0) { return; }

    var url = 'http://juick.com/' + userId + '/?show=recomm' + ((typeof oldestMid !== undefined) ? '&before=' + oldestMid : '');
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function(response) {
        if(response.status != 200) {
          console.log("" + user.id + ": failed with " + response.status + ", " + response.statusText);
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
        var dateResult = dateRe.exec(oldestArticle);
        oldestDate = new Date("" + dateResult[1] + "T" + dateResult[2]);

        var midRe = /data-mid="(\d+)"/i;
        var midResult = midRe.exec(oldestArticle);
        oldestMid = midResult[1];

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
          var moreButton = document.createElement("button");
          moreButton.style = 'float: right;';
          moreButton.textContent = 'Check older recommendations';
          moreButton.onclick = function(){
            recUpdate(pagesPerCall);
          };
          article.appendChild(moreButton);
        }

        var datePNode = document.createElement("p");
        datePNode.textContent = '' + totalRecs + ' recommendations since ' + oldestDate.toLocaleDateString('ru-RU');
        article.appendChild(datePNode);

        var avgPNode = document.createElement("p");
        var now = new Date();
        var days = ((now - oldestDate) / 1000 / 60 / 60 / 24);
        var avg = totalRecs / days;
        avgPNode.textContent = '' + avg.toFixed(3) + ' recommendations per day';
        article.appendChild(avgPNode);

        var userStrings = sortedUsers.map(x => '<li><a href="/' + x.id + '/">' + x.avatar + x.id + '</a> / ' + x.recs + '</li>');
        var ulNode = document.createElement("ul");
        ulNode.className = 'users';
        ulNode.innerHTML = userStrings.join('');
        article.appendChild(ulNode);

        if(hasMore) {
          setTimeout(function(){ recUpdate(depth - 1); }, 100);
        } else {
          console.log('no more recommendations');
        }
      }
    });

  } // recUpdate

  recUpdate(pagesPerCall);

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
  var backColor = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor);
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
    ".embedContainer * { box-sizing: border-box; } " +
    ".embedContainer img, .embedContainer video { max-width: 100%; max-height: 80vh; } " +
    ".embedContainer iframe { resize: vertical; } " +
    ".embedContainer { margin-top: 0.7em; } " +
    ".embedContainer > .embed { width: 100%; margin-bottom: 0.3em; border: 1px solid var(--color02); padding: 0.5em; display: flex; flex-direction: column; } " +
    ".embedContainer > .embed.loading, .embedContainer > .embed.failed { text-align: center; color: var(--color07); padding: 0; } " +
    ".embedContainer > .embed.failed { cursor: pointer; } " +
    ".embedContainer .embed .cts { margin: 0; } " +
    ".embed .top { display: flex; flex-shrink: 0; justify-content: space-between; margin-bottom: 0.5em; } " +
    ".embed .date, .embed .date > a, .embed .title { color: var(--color07); } " +
    ".embed .date { font-size: small; } " +
    ".embed .desc { margin-bottom: 0.5em; max-height: 55vh; overflow-y: auto; } " +
    ".twi.embed > .cts > .placeholder { display: inline-block; } " +
    ".juickEmbed > .top > .top-right { display: flex; flex-direction: column; flex: 1; } " +
    ".juickEmbed > .top > .top-right > .top-right-1st { display: flex; flex-direction: row; justify-content: space-between; } " +
    ".gistEmbed .gist-file .gist-data .blob-wrapper, .gistEmbed .gist-file .gist-data article { max-height: 70vh; overflow-y: auto; } " +
    ".gistEmbed.embed.loaded { border-width: 0px; padding: 0; } " +
    ".embedContainer > .embed.twi .cts > .placeholder { border: 0; } " +
    ".embedLink:after { content: ' ↓' } " +
    ".tweaksSettings * { box-sizing: border-box; } " +
    ".tweaksSettings table { border-collapse: collapse; } " +
    ".tweaksSettings tr { border-bottom: 1px solid transparent; } " +
    ".tweaksSettings tr:hover { background: rgba(127,127,127,.1) } " +
    ".tweaksSettings td > * { display: block; width: 100%; height: 100%; } " +
    ".tweaksSettings > button { margin-top: 25px; } " +
    ".embedContainer > .cts { margin-bottom: 0.3em; }" +
    ".embedContainer .cts > .placeholder { border: 1px dotted var(--color03); color: var(--color07); text-align: center; cursor: pointer; word-wrap: break-word; } " +
    ".cts > .placeholder { position: relative; } " +
    ".cts > .placeholder > .icon { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; color: var(--bg10); -webkit-filter: drop-shadow( 0 0 10px var(--color10) ); filter: drop-shadow( 0 0 10px var(--color10) ); } " +
    ".embed .cts .icon { display: flex; align-items: center; justify-content: center; } " +
    ".embed .cts .icon > svg { max-width: 100px; max-height: 100px; } " +
    ""
  );
}

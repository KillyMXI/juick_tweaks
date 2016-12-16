// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     2.0.0
// @date        2016.09.02 - 2016.09.29
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_info
// ==/UserScript==


// pages and elements =====================================================================================

var content = document.getElementById("content");
var isPost = (content !== null) && content.hasAttribute("data-mid");
var isFeed = (document.querySelectorAll("#content article").length > 0);
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
  [].forEach.call(document.getElementById("content").getElementsByTagName('article'), function(article, i, arr) {
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
      var postUserId = linode.querySelector("div.msg-avatar > a > img").alt;
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

function contrastColor(baseColor) {
  return (baseColor[0] + baseColor[1] + baseColor[2] > 127*3) ? [0,0,0] : [255,255,255];
}

function sortAndColorizeTagsInContainer(tagsContainer, numberLimit, isSorting) {
  tagsContainer.className += " tagsContainer";
  var linkColor = parseRgbColor(getComputedStyle(tagsContainer.getElementsByTagName('A')[0]).color);
  var backColor = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor);
  //linkColor = contrastColor(backColor);
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
    sortedTags.sort(function (a, b) {
      return a.text.localeCompare(b.text);
    });
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
    sortedUsers.sort(function (b, a) {
      return ((a.date > b.date) - (a.date < b.date));
    });
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

function getEmbedableLinkTypes() {
  return [
    {
      name: 'Jpeg and png images',
      id: 'embed_jpeg_and_png_images',
      re: /\.(jpeg|jpg|png)(:[a-zA-Z]+)?(?:\?[\w&;\?=]*)?$/i,
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
      re: /^(?:http(?:s?):)?\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?=]*)?/i,
      makeNode: function(aNode, reResult) {
        var iframe = document.createElement("iframe");
        iframe.width = 640;
        iframe.height = 360;
        iframe.frameBorder = 0;
        iframe.setAttribute('allowFullScreen', '');
        iframe.src = '//www.youtube-nocookie.com/embed/' + reResult[1] + '?rel=0';
        return iframe;
      }
    },
    {
      name: 'YouTube playlists',
      id: 'embed_youtube_playlists',
      re: /^(?:http(?:s?):)?\/\/(?:www\.)?youtube\.com\/playlist\?list=([\w\-\_]*)(&(amp;)?[\w\?=]*)?/i,
      makeNode: function(aNode, reResult) {
        var iframe = document.createElement("iframe");
        iframe.width = 640;
        iframe.height = 360;
        iframe.frameBorder = 0;
        iframe.setAttribute('allowFullScreen', '');
        iframe.src = '//www.youtube-nocookie.com/embed/videoseries?list=' + reResult[1];
        return iframe;
      }
    },
    {
      name: 'Coub clips',
      id: 'embed_coub_clips',
      re: /^(?:http(?:s?):)?\/\/(?:www\.)?coub\.com\/view\/([a-zA-Z\d]+)/i,
      makeNode: function(aNode, reResult) {
        var iframe = document.createElement("iframe");
        iframe.width = 640;
        iframe.height = 360;
        iframe.frameBorder = 0;
        iframe.setAttribute('allowFullScreen', '');
        iframe.src = '//coub.com/embed/' + reResult[1] + '?muted=false&autostart=false&originalSize=false&startWithHD=false';
        return iframe;
      }
    },
    {
      name: 'SoundCloud music',
      id: 'embed_soundcloud_music',
      re: /(?:http(?:s?):)?\/\/(?:www\.)?soundcloud\.com\/(([\w\-\_]*)\/(?:sets\/)?([\w\-\_]*))(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        var iframe = document.createElement("iframe");
        iframe.width = '100%';
        iframe.height = 450;
        iframe.frameBorder = 0;
        iframe.scrolling = 'no';
        iframe.setAttribute('allowFullScreen', '');
        iframe.src = '//w.soundcloud.com/player/?url=//soundcloud.com/' + reResult[1] + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true';
        return iframe;
      }
    },
    {
      name: 'Instagram',
      id: 'embed_instagram',
      re: /(?:http(?:s?):)?\/\/(?:www\.)?instagram\.com\/p\/([\w\-\_]*)(?:\/)?(?:\/)?/i,
      makeNode: function(aNode, reResult) {
        var iframe = document.createElement("iframe");
        iframe.width = 640;
        iframe.height = 722;
        iframe.frameBorder = 0;
        iframe.src = '//www.instagram.com/p/' + reResult[1] + '/embed';
        return iframe;
      }
    }
  ];
}

function embedLinks(aNodes, container) {
  var anyEmbed = false;
  var embedableLinkTypes = getEmbedableLinkTypes();
  [].forEach.call(aNodes, function(aNode, i, arr) {
    [].forEach.call(embedableLinkTypes, function(linkType, j, arrj) {
      var reResult = linkType.re.exec(aNode.href);
      var matched = (reResult !== null) && GM_getValue(linkType.id, true);
      if(matched) {
        anyEmbed = true;
        aNode.className += ' embedLink';
        container.appendChild(linkType.makeNode(aNode, reResult));
      }
    });
  });
  return anyEmbed;
}

function embedLinksToArticles() {
  [].forEach.call(document.querySelectorAll("#content > article"), function(article, i, arr) {
    var nav = article.querySelector("nav.l");
    var allLinks = article.querySelectorAll("p:not(.ir) > a");
    var embedContainer = document.createElement("div");
    embedContainer.className = 'embedContainer';
    var anyEmbed = embedLinks(allLinks, embedContainer);
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
    var anyEmbed = embedLinks(allLinks, embedContainer);
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
      name: 'Min-width для тегов',
      id: 'enable_tags_min_width'
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

  var list2 = document.createElement("ul");
  var embedableLinkTypes = getEmbedableLinkTypes();
  [].forEach.call(embedableLinkTypes, function(linkType, i, arr) {
    var liNode = document.createElement("li");
    var p = document.createElement("p");
    p.appendChild(makeSettingsCheckbox(linkType.name, linkType.id, true));
    liNode.appendChild(p);
    list2.appendChild(liNode);
  });
  fieldset2.appendChild(list2);

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
  contentBlock.appendChild(fieldset3);
  contentBlock.appendChild(support);
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

function addStyle() {
  if(GM_getValue('enable_tags_min_width', true)) {
    GM_addStyle(".tagsContainer a { min-width: 25px; display: inline-block; text-align: center; } ");
  }
  GM_addStyle(
    ".embedContainer img, .embedContainer video { max-width: 100%; max-height: 80vh; } " +
    ".embedContainer { margin-top: 0.7em; } " +
    ".embedLink:after { content: ' ↓' } "
  );
}

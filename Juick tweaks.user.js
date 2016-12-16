// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Some feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     1.5.0
// @date        2016.09.02 - 2016.09.07
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// ==/UserScript==


function updateTagsOnAPostPage() {
  var tagsDiv = document.querySelector("div.msg-tags");
  if(tagsDiv == null) { return; }
  var userId = document.querySelector("div.msg-avatar > a > img").alt;
  [].forEach.call(tagsDiv.childNodes, function(item, i, arr) {
    var link = item.href;
    item.href = link.replace("tag/", userId + "/?tag=");
  });
}

function updateTagsInFeed() {
  [].forEach.call(document.getElementById("content").getElementsByTagName('article'), function(article, i, arr) {
    if(!article.hasAttribute('data-mid')) { return; }
    var userId = article.querySelector("div.msg-avatar > a > img").alt;
    var tagsDiv = article.getElementsByClassName("msg-tags")[0];
    if(tagsDiv == null) { return; }
    [].forEach.call(tagsDiv.childNodes, function(item, j, arrj) {
      var link = item.href;
      item.href = link.replace("tag/", userId + "/?tag=");
    });
  });
}

function addTagEditingLinkUnderPost() {
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
  var userId = document.querySelector("nav#actions > ul > li:nth-child(2) > a").textContent.replace('@', '');
  var commentsBlock = document.querySelector("ul#replies");
  [].forEach.call(commentsBlock.children, function(linode, i, arr) {
    var postUserId = linode.querySelector("div.msg-avatar > a > img").alt;
    if(postUserId == userId) {
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

function addYearLinks() {
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

function loadTags(userId, doneCallback) {
  GM_xmlhttpRequest({
    method: "GET",
    url: "http://juick.com/" + userId + "/tags",
    onload: function(response) {
      var re = /<section id\=\"content\">[\s]*<p>([\s\S]+)<\/p>[\s]*<\/section>/i;
      var result = re.exec(response.responseText);
      if(result != null) {
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
  var userId = document.querySelector("nav#actions > ul > li:nth-child(2) > a").textContent.replace('@', '');
  loadTags(userId, function(tagsContainer){
    var messageform = document.getElementById("newmessage");
    var tagsfield = messageform.getElementsByTagName('div')[0].getElementsByClassName("tags")[0];
    messageform.getElementsByTagName('div')[0].appendChild(tagsContainer);
    sortAndColorizeTagsInContainer(tagsContainer, 50);
    [].forEach.call(tagsContainer.childNodes, function(item, i, arr) {
      var text = item.textContent;
      item.onclick = function() { tagsfield.value = (tagsfield.value + " " + text).trim() };
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

function sortAndColorizeTagsInContainer(tagsContainer, numberLimit) {
  tagsContainer.className += " tagsContainer";
  var linkColor = parseRgbColor(getComputedStyle(tagsContainer.getElementsByTagName('A')[0]).color);
  var backColor = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor);
  var p0 = 0.7; // 70% of color range is used for color coding
  var maxC = 0.1;
  var sortedTags = [];
  [].forEach.call(tagsContainer.children, function(item, i, arr) {
    var anode = (item.tagName == 'A') ? item : item.getElementsByTagName('a')[0];
    var c = Math.log(parseInt(anode.title));
    maxC = (c > maxC) ? c : maxC;
    sortedTags.push({ c: c, a: anode, text: anode.textContent.toLowerCase()});
  });
  if((numberLimit != null) && (sortedTags.length > numberLimit)) {
    sortedTags = sortedTags.slice(0, numberLimit);
  }
  sortedTags.sort(function (a, b) {
    return a.text.localeCompare(b.text);
  });
  while (tagsContainer.firstChild) {
    tagsContainer.removeChild(tagsContainer.firstChild);
  }
  sortedTags.forEach(function(item, i, arr) {
    var c = item.c;
    var p = (c/maxC-1)*p0+1; // normalize to [p0..1]
    var r = Math.round(linkColor[0]*p + backColor[0]*(1-p));
    var g = Math.round(linkColor[1]*p + backColor[1]*(1-p));
    var b = Math.round(linkColor[2]*p + backColor[2]*(1-p));
    item.a.style.color = "rgb("+r+","+g+","+b+")";
    tagsContainer.appendChild(item.a);
    tagsContainer.appendChild(document.createTextNode (" "));
  });
}

function sortTagsPage() {
  var tagsContainer = document.querySelector("section#content > p");
  sortAndColorizeTagsInContainer(tagsContainer, null);
}

function loadUsers(unprocessedUsers, processedUsers, doneCallback) {
  if(unprocessedUsers.length == 0) {
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
          if(result != null) {
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
};

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
  var contentBlock = document.getElementById("content");
  var usersTable = document.querySelector("table.users");
  var button = document.createElement("button");
  button.id = 'usersSortingButton';
  button.textContent="Sort by date";
  button.onclick = sortUsers;
  contentBlock.insertBefore(button, usersTable);
}

function addStyle() {
  GM_addStyle(
    ".tagsContainer a { min-width: 25px; display: inline-block; text-align: center; }" // min-width for tags accessibility
  );
}

var isPost = document.getElementById("content").hasAttribute("data-mid");
var isFeed = (document.getElementById("content").getElementsByTagName('article').length > 1);
var isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
var isTagsPage = window.location.pathname.endsWith('/tags');
var isUserColumn = (document.querySelector("aside#column > div#ctitle") === null) ? false : true;
var isUsersTable = (document.querySelector("table.users") === null) ? false : true;

addStyle();
if(isPost) {
  updateTagsOnAPostPage();
  addTagEditingLinkUnderPost();
  addCommentRemovalLinks();
}
if(isFeed) {
  updateTagsInFeed();
}
if(isUserColumn) {
  addYearLinks();
}
if(isPostEditorSharp) {
  addEasyTagsUnderPostEditorSharp();
}
if(isTagsPage) {
  sortTagsPage();
}
if(isUsersTable) {
  addUsersSortingButton();
}

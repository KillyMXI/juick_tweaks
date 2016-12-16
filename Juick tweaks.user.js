// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Some feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     1.1.0
// @date        2.9.2016
// @run-at      document-end
// @grant none
// ==/UserScript==


function updateTagsOnAPostPage() {
  var tagsDiv = document.getElementsByClassName("msg-tags")[0];
  if(tagsDiv == null) { return; }
  var userId = document.getElementsByClassName("msg-avatar")[0].childNodes[0].childNodes[0].alt;
  tagsDiv.childNodes.forEach(function(item, i, arr) {
    var link = item.href;
    item.href = link.replace("tag/", userId + "/?tag=");
  });
}

function updateTagsInFeed() {
  document.getElementById("content").getElementsByTagName('article').forEach(function(article, i, arr) {
    if(!article.hasAttribute('data-mid')) { return; }
    var userId = article.getElementsByTagName('aside')[0].getElementsByTagName('a')[0].getElementsByTagName('img')[0].alt;
    var tagsDiv = article.children[1].getElementsByClassName("tags")[0];
    if(tagsDiv == null) { return; }
    tagsDiv.childNodes.forEach(function(item, i, arr) {
      var link = item.href;
      item.href = link.replace("tag/", userId + "/?tag=");
    });
  });
}

function addTagEditingLinkUnderPost() {
  var mtoolbar = document.getElementById("mtoolbar").childNodes[0];
  var canEdit = (mtoolbar.innerText.indexOf('Удалить') > -1) ? true : false;
  if(!canEdit) { return; }
  var linode = document.createElement("li");
  var anode = document.createElement("a");
  var mid = document.getElementById("content").getAttribute("data-mid");
  anode.href = "http://juick.com/post?body=%23" + mid + "+%2ATag";
  anode.innerHTML = "<div style='background-position: -16px 0'></div>Теги";
  linode.appendChild(anode);
  mtoolbar.appendChild(linode);
}

function addEasyTagsUnderPostEditorSharp() {
  var sidetags = document.getElementById("column").getElementsByClassName("tags")[0];
  var clone = sidetags.cloneNode(true);
  var messageform = document.getElementById("newmessage");
  var tagsfield = messageform.getElementsByTagName('div')[0].getElementsByClassName("tags")[0];
  clone.childNodes.forEach(function(item, i, arr) {
    var text = item.innerText;
    item.onclick = function() { tagsfield.value = (tagsfield.value + " " + text).trim() };
    item.href = "#";
  });
  messageform.getElementsByTagName('div')[0].appendChild(clone);
}

function sortTags() {
  var tagsContainer = document.getElementById("content").getElementsByTagName('p')[0];
  var sortedTags = [];
  tagsContainer.children.forEach(function(item, i, arr) {
    var anode = (item.tagName == 'A') ? item : item.getElementsByTagName('a')[0];
    console.log(anode.tagName);
    var c = Math.log(parseInt(anode.title));
    var clr = Math.round(192.0 - (40.0*c));
    clr = (clr < 0) ? 0 : clr;
    anode.style.color = "rgb("+clr+","+clr+","+clr+")";
    sortedTags.push({ c: c, a: anode, text: anode.innerText.toLowerCase()});
  });
  sortedTags.sort(function (a, b) {
    return a.text.localeCompare(b.text);
  });
  while (tagsContainer.firstChild) {
    tagsContainer.removeChild(tagsContainer.firstChild);
  }
  sortedTags.forEach(function(item, i, arr) {
    tagsContainer.appendChild(item.a);
    tagsContainer.appendChild(document.createTextNode (" "));
  });
}

function changeFonts() {
  var css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = 
    //"@import 'https://fonts.googleapis.com/css?family=Open+Sans&subset=cyrillic,cyrillic-ext';" + 
    "article > p, .msg-txt, input, textarea {font-family: -apple-system,BlinkMacSystemFont,Open Sans,Roboto,Oxygen,Droid Sans,Helvetica Neue,Verdana,sans-serif; font-size: 11pt;}";
  document.body.appendChild(css);
}

var isPost = document.getElementById("content").hasAttribute("data-mid");
var isFeed = (document.getElementById("content").getElementsByTagName('article').length > 1);
var isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
var isTagsPage = window.location.pathname.endsWith('/tags');

if(isPost) {
  updateTagsOnAPostPage();
  addTagEditingLinkUnderPost()
}
if(isFeed) {
  updateTagsInFeed();
}
if(isPostEditorSharp) {
  addEasyTagsUnderPostEditorSharp();
}
if(isTagsPage) {
  sortTags();
}
changeFonts();

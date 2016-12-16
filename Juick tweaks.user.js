// ==UserScript==
// @name        Juick tweaks
// @namespace   ForJuickCom
// @description Some feature testing
// @match       *://juick.com/*
// @author      Killy
// @version     1.2.0
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

function addYearLinks() {
  var asideColumn = document.querySelector("aside#column");
  var hr1 = asideColumn.querySelector("p.tags + hr");
  var hr2 = document.createElement("hr");
  var linksContainer = document.createElement("p");
  var years = [
    {y: (new Date()).getFullYear(), b: ""},
    {y: 2015, b: "?before=2816362"},
    {y: 2014, b: "?before=2761245"},
    {y: 2013, b: "?before=2629477"},
    {y: 2012, b: "?before=2183986"}
  ];
  years.forEach(function(item, i, arr) {
    var anode = document.createElement("a");
    anode.href = window.location.pathname + item.b;
    anode.innerText = item.y;
    linksContainer.appendChild(anode);
    linksContainer.appendChild(document.createTextNode (" "));
  });
  asideColumn.insertBefore(hr2, hr1);
  asideColumn.insertBefore(linksContainer, hr1);
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

function sortTags() {
  var tagsContainer = document.getElementById("content").getElementsByTagName('p')[0];
  var linkColor = parseRgbColor(getComputedStyle(tagsContainer.getElementsByTagName('A')[0]).color);
  var backColor = parseRgbColor(getComputedStyle(document.documentElement).backgroundColor);
  var p0 = 0.7; // 70% of color range is used for color coding
  var maxC = 0.1;
  var sortedTags = [];
  tagsContainer.children.forEach(function(item, i, arr) {
    var anode = (item.tagName == 'A') ? item : item.getElementsByTagName('a')[0];
    var c = Math.log(parseInt(anode.title));
    maxC = (c > maxC) ? c : maxC;
    sortedTags.push({ c: c, a: anode, text: anode.innerText.toLowerCase()});
  });
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
var isUserFeed = (document.querySelector("aside#column > div#ctitle") === null) ? false : true;
var isPostEditorSharp = (document.getElementById('newmessage') === null) ? false : true;
var isTagsPage = window.location.pathname.endsWith('/tags');

if(isPost) {
  updateTagsOnAPostPage();
  addTagEditingLinkUnderPost();
}
if(isFeed) {
  updateTagsInFeed();
}
if(isUserFeed) {
  addYearLinks();
}
if(isPostEditorSharp) {
  addEasyTagsUnderPostEditorSharp();
}
if(isTagsPage) {
  sortTags();
}
changeFonts();

//setInterval(autoLogRefresh, 2500);

var flist;
var lidirs;
var lisel;
var pre;
var selSample={}; // .dir=selected dir .file=select file name, .pair=paired file name .fstatus=running status
//list of samples running on server (to be populated by loadFList and perhaps shown at the top of the page?)
var srunning=[]; 

//-- called by window.onLoad() ---//
function runOnPageLoad() {
 pre=document.getElementById("debug");
 flist = document.getElementById("fflist");
 refreshFList();
}

function refreshFList() {
  if (!flist) return;
  flist.innerHTML='<li style="text-align:center;">..loading..</li>';
  //send the request to populate the file list
  xhrRun("cgi/mbio.pl",{ "cmd":"flist" }, loadFList, []);
}

function loadFList() {
  ftxt=this.responseText;
  //flist is set from the beginning
  lidirs=populateFlist(ftxt); //parse file list from ftxt
  //now update the element properties
  /*
  for (var i = 0; i < lidirs.length; i++) {
    var labels=lidirs[i].getElementsByTagName("label");
    //assign a handler to all labels
    for (var l=0; l < labels.length; l++) {
      var dir=labels[l].innerHTML;
      var ul=labels[l].nextElementSibling;
      while (ul.nodeName != "UL") {
         ul=ul.nextElementSibling();
      }
      if (ul) {
        labels[l].targetLst=ul;
        labels[l].addEventListener("click", folderClick);
        for (var j=0;j < ul.childNodes.length;j++) {
          var li=ul.childNodes[j];
          if (li.nodeName == "LI") {
             li.myDir=dir.trim();
             li.myDirlabel=labels[l];
             li.addEventListener("click", fileClick);
          }
        }
      }
    }
  }
  */
}

function populateFlist(txt) {
  //clear the list first 
  flist.innerHTML="";
  dirs=[];
  //parse txt having the format:
  // >dir
  // file1\tstatus_char
  // file2
  // ...
  var tlines=txt.split('\n');
  var dli;
  var dlabel;
  var dir;
  var dul;
  for (var l=0;l<tlines.length;l++) {
    if (tlines[l].charAt(0)=='>') {
       //directories
       dli=document.createElement("LI");
       dlabel=document.createElement("LABEL");
       dir=tlines[l].substr(1);
       dlabel.appendChild(document.createTextNode(dir));
       dli.appendChild(dlabel);
       flist.appendChild(dli);
       dirs.push(dli);
       dul=document.createElement("UL");
       dli.appendChild(dul);
       dlabel.addEventListener("click", folderClick);
       dlabel.targetLst=dul;
     } else {
       //files:
       var fdata=tlines[l].split('\t');
       var fstatus;
       if (fdata.length>1) { fstatus=fdata[1]; }
       var fli=document.createElement("LI");
       fli.appendChild(document.createTextNode(fdata[0]));
       dul.appendChild(fli);
       fli.myDir=dir;
       fli.myDirlabel=dlabel;
       fli.addEventListener("click", fileClick);
       fli.fstatus=fstatus;
       if (fstatus) {
          if (fstatus=='!') {
             fli.style.backgroundImage='url("/mbio/css/img/st_err.png")';
          } else if (fstatus=='r') {
             fli.style.backgroundImage='url("/mbio/css/img/st_run.png")';
          } else if (fstatus=='.') {
             fli.style.backgroundImage='url("/mbio/css/img/st_done.png")';
          }
       }
     }
  }
  return dirs;
}

function folderClick() {
 if (this.targetLst) {
   if (this.targetLst.style.display === "block") {
            this.targetLst.style.display = "none";
            this.style.backgroundImage='url("/mbio/css/img/r_arr.png")';
     } else {
            this.targetLst.style.display = "block";
            this.style.backgroundImage='url("/mbio/css/img/d_arr.png")';
   }
 }
}

function fileClick() {
  if (this.myDir) {
    lidirs.myDir=this.myDir;
    lidirs.myFile=this.innerHTML.trim();
    pre.innerText=lidirs.myDir + "\\\n  " + lidirs.myFile + "\n";
    if (lisel) {
       lisel.className=lisel.className.replace(/\bselclass\b/,'');
       lisel.myDirlabel.className=lisel.myDirlabel.className.replace(/\bselclass\b/,'');
    }
    this.className+=" selclass";
    this.myDirlabel.className+=" selclass";
    lisel=this;
    selSample.dir=this.myDir;
    selSample.file=this.innerHTML.trim();
    selSample.fstatus=this.fstatus;
    //TODO: update some tag here with the selected file path
  }
}
/*
function autoLogRefresh() {
  if (window.logID && window.logCGI) {
    var params={}
    if (window.logParams) params=window.logParams;
    xhrRun(window.logCGI, params, xhrLogShow, [ window.logID ]);
  }
}
*/

function showFlag(v) {
  var d=getObj('divDbg');
  var str=v;
  if (d) {
    str += "=" + window[v];
    d.textContent=str;
  }
}

function getFuncName(func) {
 var r=/^function\s+([\w\$]+)\s*\(/.exec( func.toString() );
 return r ? r[1] : '';
}

function newXHReq() {
 if (window.XMLHttpRequest) {
   return (new XMLHttpRequest());
   }
 if (window.ActiveXObject) {
   /*var msmess=["Microsoft.XMLHTTP", "Msxml2.XMLHTTP.7.0",
             "Msxml2.XMLHTTP.6.0","Msxml2.XMLHTTP.5.0",
             "Msxml2.XMLHTTP.4.0","MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP"];
   var xr=null;
   for (var i=0;i< msmess.length; i++) {
     try {
       xr = new ActiveXObject(msmess[i]);
       if (xr!=null) return xr;
       } catch(oError) {
         }
     }
   */
   xr = new ActiveXObject("Microsoft.XMLHTTP");
   return xr;
 }
 return null;
}


function xhrRun(cgiurl, cgiparams, listener, args) {
  var rflag='running_'+getFuncName(listener);
  if (window[rflag]) return; //prevent reentrance
  var xhr = newXHReq();
  if (!xhr) { alert("Sorry, no XHR possible!"); return; }
  xhr.args=args;
  cgiparams["nocache"]=new Date();
  var params=[];
  Object.keys(cgiparams).forEach(function (key) {
    params.push(key+"="+cgiparams[key]);
  });
  //xhr.addEventListener("load", listener);
  window[rflag]=1; //global to prevent reentrance
  xhr.open("POST", cgiurl, true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  //showFlag(rflag);
  xhr.onload = function() {
        listener.bind(xhr)(args);
        window[rflag]=0;
     }
  xhr.send(params.join("&"));
}

function onRunStart() {
  //we shouldn't get here unless the "Run" button was enabled
  if (confirm("Are you sure, Start running ?") == false) {
     return false;
  }
  var params={"cmd":"run", "d":selSample.dir, "f":selSample.file};
  if (selSample.pair) params["p"]=selSample.pair;
  xhrRun("cgi/mbio.pl", params, xhrRunSample, [ "evLog" ]);

  return false;
}

/*
function updateAlStatus(res) {
  var stdiv=getObj('alStatus');
  if (stdiv) {
    var lines=res.split("\n");
    var firstLine=lines[0];
    //dbgdiv.textContent=lines[0];
    stdiv.style.backgroundImage="none";
    if (firstLine.indexOf('Ready') > 0) {
       stdiv.textContent='Ready to Arm System';
       stdiv.style.backgroundColor="#6F6";
    }
    else {
      if (firstLine.indexOf('ARMED') > 0 ) {
        stdiv.textContent='ARMED!';
        stdiv.style.backgroundColor="#FCC";
      }
      else {
        stdiv.textContent='Cannot arm now';
        stdiv.style.backgroundColor="#FCC";
       }
    }
  }
}
*/
function urlenc(v) {
 var r=escape(v).replace(/\+/g,"%2B");
 return r;
}

function getObj(objId) {
    // cross-browser function to get an object's style object given its
 if(document.getElementById && document.getElementById(objId)) {
    // W3C DOM
    return document.getElementById(objId);
  } else if (document.all && document.all(objId)) {
    // MSIE 4 DOM
    return document.all(objId);
  } else {
    return false;
  }
}

function xhrLogShow() {
  res=this.responseText;
  //console.log(res);
  if (this.args && this.args.length>0) {
      logdiv=getObj(this.args[0]);
      if (!logdiv) { return; }
      logdiv.innerHTML=res;
  }
  var rflag='running_'+getFuncName(xhrLogShow);
  window[rflag]=0;
  //showFlag(rflag);
  if (getObj("alStatus")) updateAlStatus(res);
}

function logRefresh(cgiurl, tID) {
  window.logID=tID;
  window.logCGI=cgiurl;
  xhrRun(cgiurl, {}, xhrLogShow, [ tID ]);
}

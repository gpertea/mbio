//setInterval(autoLogRefresh, 2500);

var flist;
var lidirs;
var lisel;
var runningDiv;
var runningMsg;
var runningUL;
var selSample={}; /* currently selected sample, sampleInfo structure:
        .dir = selected dir 
        .file = select file name 
        .pair = paired file name
        .rstatus = running status ('r', '!', '.' or undefined)
        .rdate = start date for rstatus 'r', end date for status '.'
     */
//selInfo GUI elements:
var selFpath; //select file path div
var selStDiv; //status, date, action div group
var selFstatus;
var selRdate;
var selPairInfo;  //div group with pair info
var selPairCheck; //"paired" checkbox
var selPairFname; //pair file name <label>

var selAction; //action button: "run", "stop" or "Re-run"
var selResults; //"See Results" button
var selLog; //"See Log" button when status is "!" = problem
var selDnld
var pre; //debug pre
//list of samples currently running on server (to be populated by loadFList and perhaps shown at the top of the page?)
var cRunning=[]; //list of sampleInfo structure -- samples currently running

//-- called by window.onLoad() ---//
function runOnPageLoad() {
 flist = document.getElementById("fflist");
 runningDiv=document.getElementById("runningStatus");
 runningMsg=document.getElementById("rMsg");
 runningUL=document.getElementById("runningList");
 selFpath=document.getElementById("selFpath");
 selFstatus=document.getElementById("fstatus");
 selRdate=document.getElementById("rdate");
 selStDiv=document.getElementById("selStDiv");
 selAction=document.getElementById("btnAction");
 selResults=document.getElementById("btnResults");
 selLog=document.getElementById("btnLog"); //trebuie??
 selDnld=document.getElementById("btnDnld"); //

 selPairInfo=document.getElementById("selPairInfo");
 selPairCheck=document.getElementById("selPairCheck");
 selPairFname=document.getElementById("selPairFname");
 pre=document.getElementById("debug");
 refreshFList();
}

//sampleInfo - file info, also running info
function sampleInfo(vdir, vfile, vpair, vstatus, vdate) {
 this.dir=vdir;
 this.file=vfile;
 this.pair=vpair;
 this.rstatus=vstatus;
 this.rdate=vdate;
}

function refreshFList(params) {
  if (!flist) return;
  flist.innerHTML='<li style="text-align:center;">..loading..</li>';
  selSample={};
  cRunning=[];
  lisel=undefined;
  runningMsg.innerHTML="..loading info..";
  runningUL.innerHTML="";
  selFstatus.innerHTML="";
  selFstatus.style.backgroundImage="none";
  selFpath.innerHTML="";
  selRdate.innerHTML="";
  selStDiv.style.display="none";
  selPairInfo.style.display="none";
  //send the request to populate the file list
  if (!params || params.cmd!="run") {
    //for now, only the RUN command can override this
    params = { "cmd":"flist" }; 
  }
  xhrRun("cgi/mbio.pl", params, loadFList, []);
}

function loadFList() {
  ftxt=this.responseText;
  //flist is set from the beginning
  lidirs=populateFlist(ftxt); //parse file list from ftxt
  //also refresh the "Currently running" box
  refreshRunning();
}

function refreshRunning() {
  if (cRunning.length > 0) {
     var rmsg="Currently running "+cRunning.length;
     if (cRunning.length>1) rmsg+=" samples:";
        else rmsg+=" sample:";
     runningMsg.innerHTML=rmsg;
     for (var i=0;i<cRunning.length;i++) {
       var dli=document.createElement("LI");
       dli.appendChild(document.createTextNode(cRunning[i].dir));
       dli.appendChild(document.createElement("br"));
       dli.appendChild(document.createTextNode('\u00A0\u00A0'+cRunning[i].file));
       if (cRunning[i].rdate) {
        var dt=document.createElement("I");
        dt.appendChild(document.createTextNode('\u00A0 ['+cRunning[i].rdate+"]"));
        dli.appendChild(dt);
       }
       runningUL.appendChild(dli);
       dli.myData=cRunning[i];
       dli.addEventListener("click", fileClick);
     }
  }
  else {
   runningMsg.innerHTML="No samples currently running.\n";
  }
}

function canPair(a, b) {
 //check 2 file names to see if they can form a pair
 //a is the first file name encountered, when sorted alphabetically 
 if (a.length!=b.length) return false;
 var ri=a.indexOf("_R1_");
 if (a<1) return false;
 var ap=a.slice(0,ri)+"_R2_"+a.slice(ri+4);
 if (ap === b) return true;
 return false;
}

function populateFlist(txt) {
  //clear the list first 
  flist.innerHTML="";
  var dirs=[];
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
  var prevli; //previous LI item object (could be a pair?)
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
       prevli=undefined;
     } else {
       //files:
       var fdata=tlines[l].split('\t');
       var fstatus=undefined;
       var rdate=undefined
       if (fdata.length>1) { fstatus=fdata[1]; 
         if (fdata.length>2) rdate=fdata[2];
       }
       var fli=document.createElement("LI");
       fli.appendChild(document.createTextNode(fdata[0]));
       dul.appendChild(fli);
       fli.myDirlabel=dlabel;
       if (prevli && prevli.myData) {
          //determine if previous list item was a pair
          if (canPair(prevli.myData.file, fdata[0])) {
             fli.myPair=prevli;
             prevli.myPair=fli;
          }
       }
       fli.myData=new sampleInfo(dir, fdata[0], '', fstatus, rdate);
       //
       fli.addEventListener("click", fileClick);
       prevli=fli;
       if (fstatus) {
          if (fstatus=='!') {
             fli.style.backgroundImage='url("/mbio/css/img/st_err.png")';
          } else if (fstatus=='r') {
             fli.style.backgroundImage='url("/mbio/css/img/st_run.png")';
             var rs=new sampleInfo(dir, fdata[0], "", fstatus, rdate);
             cRunning.push(rs);
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

function debugText() {
  //this is rather for debug purposes
  pre.innerHTML=this.responseText;
}

function onRunClick() {
  if (!selSample || !selSample.file) return;
  //we shouldn't get here unless the "Run" button was enabled
  if (confirm("Are you sure, start processing this sample ?") == false) {
     return false;
  }
  var params={};
  params.cmd='run';
  params.dir=selSample.dir;
  params.file=selSample.file;
  if (selPairCheck.checked && selSample.pair)
     params.pair=selSample.pair;
  refreshFList(params);
}

function onCancelClick() {
  if (confirm("Are you sure, cancel the processing on this sample?") == false) {
     return false;
  }
}

function onResultsClick() {
 //for now this simply shows the stderr+stdout log file for fqtrim & run.sh (see run.sh for details)
 //CA: modified to show some actuall results (Kraken-report file). maybe we shoul do a diff button for Logfile ?
 if (!selSample) return;
 var params={};
 //params.cmd="showlog";
 params.cmd="showKreport";
 params.dir=selSample.dir;
 params.file=selSample.file;
 xhrRun("cgi/mbio.pl", params, debugText, []);
}

function onLogClick() {
 //for now this simply shows the stderr+stdout log file for Kraken & run.sh (see run.sh for details)
 //cp from onResultsClick
 if (!selSample) return;
 var params={};
 params.cmd="showlog";
 params.dir=selSample.dir;
 params.file=selSample.file;
 xhrRun("cgi/mbio.pl", params, debugText, []);
}
function showSel(sel, selp) {
   selFpath.innerHTML=sel.dir + "<br/>\u00A0\u00A0 " + sel.file;
   selFstatus.innerHTML="&mdash;";
   selFstatus.style.backgroundImage="none";
   selRdate.innerHTML="";
   selStDiv.style.display="block";
   selAction.firstChild.data="Run analysis";
   selAction.onclick=onRunClick;
   selResults.style.display="none";
   selLog.style.display="none"; //CA
   selDnld.style.display="none"; //CA
   pre.innerHTML="";
   if (sel.rstatus) {
      if (sel.rstatus=='!') {
         selFstatus.innerHTML="problem";
         selFstatus.style.backgroundImage='url("/mbio/css/img/st_err.png")';
         selAction.firstChild.data="Run - Start over";
	 selLog.style.display="inline"; //CA
         selLog.onclick=onLogClick;    //CA
      } else if (sel.rstatus=='r') {
         selFstatus.innerHTML="running";
         selFstatus.style.backgroundImage='url("/mbio/css/img/st_run.png")';
         selAction.firstChild.data="Cancel this run";
         selAction.onclick=onCancelClick;
      } else if (sel.rstatus=='.') {
         selFstatus.innerHTML="processed";
         selFstatus.style.backgroundImage='url("/mbio/css/img/st_done.png")';
         selAction.firstChild.data="Run again";
         selResults.style.display="inline";
         selResults.onclick=onResultsClick;
	 selDnld.style.display="inline";   //CA
         //selDnld.onclick=onDownloadClick; //CA

      }
  }
  if (selp && sel.rstatus!='r') { //for now, don't care about pairing for running samples
    //ideally, for samples running with their pair, the checkbox should be automatically checked
    //but disabled (so the user cannot change it)
    selPairInfo.style.display="block";
    selPairFname.innerHTML="\u00A0\u00A0 "+selp.file;
    selPairCheck.checked=true; // CA: it was set as false intially by Geo
  }
    else {
     selPairInfo.style.display="none";
     selPairFname.innerHTML="";
     selPairCheck.checked=false;
  }
  if (sel.rdate) {
    selRdate.innerHTML="[since "+sel.rdate+"]";
  }
}

function fileClick() {
  if (this.myData) {
    var pairdata=this.myPair;
    if (pairdata) pairdata=pairdata.myData;
    showSel(this.myData, pairdata);
    if (lisel) {
      lisel.className=lisel.className.replace(/\bselclass\b/,'');
      if (lisel.myDirlabel)
        lisel.myDirlabel.className=lisel.myDirlabel.className.replace(/\bselclass\b/,'');
      if (lisel.myPair) //CA - removing the highligh from the pair also
        lisel.myPair.className=lisel.myPair.className.replace(/\bselclass\b/,'');
    }
    this.className+=" selclass";
    if (this.myDirlabel)
      this.myDirlabel.className+=" selclass";
    this.myPair.className+=" selclass";  //CA - added so it would be clear that it has a 
                                        //pair and the pair is also involved in Kraken run
    lisel=this;
    selSample=this.myData;
    //TOCHECK: this is populated here but NOT necessarily used
    //unless selPairCheck.checked
    if (pairdata) selSample.pair=pairdata.file;
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


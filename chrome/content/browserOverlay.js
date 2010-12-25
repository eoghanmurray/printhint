
// Set default preferences if not already set
const PrintHint_PrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
const PrintHint_Branch = PrintHint_PrefService.getBranch("printhint.");
if (PrintHint_Branch.prefHasUserValue("Preview")){
    PreviewPage = PrintHint_Branch.getBoolPref("Preview");
} else{
    PrintHint_Branch.setBoolPref("Preview", false);
    PreviewPage = false;
}

var locationListener = {
    QueryInterface: function(aIID) {
	if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
	    aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
	    aIID.equals(Components.interfaces.nsISupports))
	    return this;
	throw Components.results.NS_NOINTERFACE;
    },

    onLocationChange: function(aProgress, aRequest, aURI) {
	//printHint.processNewURL(aURI);
    },

    onStateChange: function() {},
    onProgressChange: function() {},
    onStatusChange: function() {},
    onSecurityChange: function() {},
    onLinkIconAvailable: function() {}
};

var printHint = {

    tooltips: null,
    init: function() {
	var gBrowser = document.getElementById("content");
	// This will link up to add the printHint.processNewURL event handler
	gBrowser.addProgressListener(locationListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
	// Check all documents when they have loaded
	gBrowser.addEventListener("load", printHint.checkLoadedDocument, true);
	// Load the tooltip properties file
	this.tooltips = document.getElementById("printHintTooltips");
    },

    uninit: function() {
	var gBrowser = document.getElementById("content");
	gBrowser.removeProgressListener(locationListener);
    },

    /************************************************
	printHint.processNewURL
	***
	This function gets called when a the back or
	forward button is pressed or when tabs are switched
	************************************************/

    oldURL: null,
    processNewURL: function(aURI) {

	if (aURI.spec == this.oldURL) {
	    return;
	}

	this.oldURL = aURI.spec;

	if(printHint.loadingInterval) {
	    clearInterval(printHint.loadingInterval);
	}

	if(!content.document._printStatus){
	    // See if we can find a print stylesheet before the page is loaded
	    // i.e. periodically check for stylesheets until page is fully loaded
	    printHint.loadingInterval = window.setInterval(
		function(){
		    printHint.checkPrintStylesheet(content.document);
		}
		,300);
	}

	printHint.updatePrintButton();
    },


    /************************************************
	printHint.checkPrintStylesheet
	***
	Check for print stylesheets as the page is loading
	************************************************/

    loadingInterval : null,

    checkPrintStylesheet : function(doc) {

	for (var i = 0; i < doc.styleSheets.length; i++){
	    if(doc.styleSheets[i].href){
		if(!doc.styleSheets[i].href){
		    continue;
		}
		var parts = doc.styleSheets[i].href.split('/');
		var filepart = parts[parts.length-1];
		if (doc.styleSheets[i].media.mediaText == 'print' || filepart.match(/print/)){

		    clearInterval(printHint.loadingInterval);
		    doc._printStatus = "stylesheet";
		    printHint.updatePrintButton();
		    return true;
		}
	    }
	}
	return false;
    },

    /************************************************
	printHint.checkLinks
	***
	check all links on the page for keywords
	************************************************/
    checkLinks : function(doc) {
	var goodprint=/\bprint/ig;
	var badprint=/\b(printers|printing|printed|edition|subscriptions)\b/ig;
	for (var j = 0; j < doc.links.length; j++){
	    var t = doc.links[j].text;
	    var h = doc.links[j].href;
	    if(t == "") {	// Check the link title text
		t = doc.links[j].title;
		if(t == "") {
		    // If the link contains any images, check the alt text of them
		    var imgs = doc.links[j].getElementsByTagName('img');

		    if(imgs && imgs[0] && imgs[0].alt)
			t = imgs[0].alt;
		}
	    }

	    if (
		t &&
		    t.match(goodprint) &&
		    !t.match(badprint) && // Eliminate keywords printing, printed, printers
		    !h.match(/window.print\(\)/ig) // The link is a javascript command to print the page
	    ) {

		clearInterval(printHint.loadingInterval);
		doc._printStatus = doc.links[j];

		printHint.updatePrintButton();
		return true;
	    }


	}
	return false;

    },


    /************************************************
	printHint.checkLoadedDocument
	***
	Check the document once after it is loaded.
	************************************************/
    checkLoadedDocument: function(event) {

	var doc = event.originalTarget;

	// Get the parent document within frame
	if (doc.defaultView && doc.defaultView.frameElement){
	    while (doc.defaultView.frameElement){
		doc = doc.defaultView.frameElement.ownerDocument;
	    }
	}


	if (doc instanceof HTMLDocument){
	    // Check if this document needs to be printed immediately
	    //alert(printHint.printReferrer + " "  + doc.referrer);
	    if(printHint.printReferrer){
		printHint.printReferrer = false;
		// Preview straight away on doc load
		// Disabled:  Linux machines don't have a print button on Print-Preview page
		//PrintUtils.printPreview(onEnterPrintPreview, onExitPrintPreview);

		// pretend that the linked version is as good as a print stylesheet.
		// This also allows the page to be printed even if the print-link is still present
		doc._printStatus = "stylesheet";
		printHint.updatePrintButton();
	    }


	    // Check for print stylesheet first then check all the links
	    else if(!printHint.checkPrintStylesheet(doc)
		    && !printHint.checkLinks(doc)) {
		// both checks have failed
		clearInterval(printHint.loadingInterval);
		doc._printStatus = "notfound";
		printHint.updatePrintButton();
	    }
	}
    },


    /************************************************
	printHint.updatePrintButton
	***
	Update the display of the print button (or the status bar)
	************************************************/
    updatePrintButton: function(){
	var printbutton = document.getElementById('print-button');
	var tooltipattribute = 'tooltiptext';
	if(!printbutton) {
	    printbutton = document.getElementById('printable-status');
	    printbutton.hidden = false;
	}
	if(!printbutton) {
	    return;
	}

	// remove any previous classname from the multiple classnames
	printbutton.className = printbutton.className.replace(/ stylesheet| notfound| linked/, "");

	if(!content.document._printStatus){
	    printbutton.setAttribute('tooltiptext', this.tooltips.getString('notfoundtooltip'));
	    return;
	} else if(content.document._printStatus == "stylesheet") {
	    printbutton.setAttribute('tooltiptext', this.tooltips.getString('stylesheettooltip'));
	    printbutton.className += " stylesheet";
	} else if(content.document._printStatus == "notfound") {

	    printbutton.setAttribute('tooltiptext', this.tooltips.getString('notfoundtooltip'));
	    printbutton.className += " notfound";
	} else {  // A linked version

	    printbutton.className += " linked";
		var path = content.document._printStatus.href;
	    if(path.length + this.tooltips.getString('linkedversiontooltip').length > 72)
	    {
		path = content.document._printStatus.pathname.substring(1);

		if(content.document._printStatus.search)
		    path += content.document._printStatus.search;
	    }
	    printbutton.setAttribute('tooltiptext', this.tooltips.getString('linkedversiontooltip') + ' (' + path + ')');
	}
    },



    printReferrer : false ,

    /************************************************
	printHint.print
	***
	Command that overrides the default cmd_print action
	************************************************/
    print :  function(){

	if(!content.document._printStatus
	   || content.document._printStatus == "stylesheet"
	   || content.document._printStatus == "notfound") {
	    if(PrintHint_Branch.getBoolPref("Preview"))
		PrintUtils.printPreview(onEnterPrintPreview, onExitPrintPreview);
	    else
		PrintUtils.print();
	} else { // A linked stylesheet

	    var clk = content.document.createEvent("MouseEvents");
  	    clk.initMouseEvent("click", true, true, window,
    			       0, 0, 0, 0, 0, false, false, false, false, 0, null);

	    // Hope that clicking the link opens a new document, and that the user doesn't open another document first!
	    this.printReferrer = true;//content.document.location;
  	    content.document._printStatus.dispatchEvent(clk);

	}
    }
};

window.addEventListener("load", function() { printHint.init()}, false);
window.addEventListener("unload", function() {printHint.uninit()}, false);

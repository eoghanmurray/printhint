function PrintHintUpdatePrefs() {
	const PrintHint_PrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	const PrintHint_Branch = PrintHint_PrefService.getBranch("printhint.");
	PrintHint_Branch.setBoolPref("Preview",document.getElementById("PrintHint.prefs.preview").selectedIndex);
}


function PrintHintInitialisePrefs () {
	const PrintHint_PrefService =Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	const PrintHint_Branch = PrintHint_PrefService.getBranch("printhint.");
	PreviewPage = PrintHint_Branch.getBoolPref("Preview");
	if (PreviewPage) {
		document.getElementById("PrintHint.prefs.preview").selectedIndex = 1;
	}
	else {
		document.getElementById("PrintHint.prefs.preview").selectedIndex = 0;
	}
}


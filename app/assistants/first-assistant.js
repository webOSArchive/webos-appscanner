function FirstAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

FirstAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* update the app info using values from our app */
	//this.controller.get("app-title").update(Mojo.appInfo.title);
	
	/* add event handlers to listen to events from widgets */
};

FirstAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

	Mojo.Log.info("webOS App Scanner is starting");
	this.loadRemoteTxtFile();
};

FirstAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

FirstAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};

FirstAssistant.prototype.loadRemoteTxtFile = function() {
    var f = this;
    // Using XMLHttpRequest instead of fetch for wider compatibility
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://appcatalog.webosarchive.org/wanted.txt', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var text = xhr.responseText;
                var appList = f.parseAppList(text);
				Mojo.Log.info("Remote fetch succeeded, missing apps: " + appList.length);
                f.queryInstalledApps(appList);
            } else {
				resultsArea = document.getElementById("resultsArea");
                resultsArea.innerHTML = '<span style="color:orange">Could not load remote missing file: status ' + xhr.status + '</span>';
				resultsArea.innerHTML += '<span><br>Trying local list...</span><br>';
				f.loadBundledTxtFile();
            }
        }
    };
    xhr.send(null);
};

FirstAssistant.prototype.loadBundledTxtFile = function() {
    var f = this;
    // Using XMLHttpRequest instead of fetch for wider compatibility
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/wanted.txt', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var text = xhr.responseText;
                var appList = f.parseAppList(text);
				Mojo.Log.info("Local fetch succeeded, missing apps: " + appList.length);
                f.queryInstalledApps(appList);
            } else {
				resultsArea = document.getElementById("resultsArea");
                resultsArea.innerHTML = '<span style="color:red">Could not load bundled file: status ' + xhr.status + '</span>';
            }
        }
    };
    xhr.send(null);
};

FirstAssistant.prototype.queryInstalledApps = function(appList) {
    var f = this;
	Mojo.Log.info("querying installed apps");
    this.controller.serviceRequest('palm://com.palm.applicationManager', {
        method: 'listApps',
        parameters: {},
        onSuccess: function(response) {
			Mojo.Log.info("Got a response from the application manager");
            var installed = [];
			var installedVersions = [];
            if (response.apps) {
				Mojo.Log.info("Examining " + response.apps.length + " installed apps");
				for (var i = 0; i < response.apps.length; i++) {
                    installed.push(response.apps[i].id);
					installedVersions.push(response.apps[i].version);
					Mojo.Log.info("Found installed app: " + response.apps[i].id + " version " + response.apps[i].version);
                }
            }
            var found = [];
            for (var j = 0; j < appList.length; j++) {
				//Mojo.Log.info("Checking app: " + JSON.stringify(appList[j]));
				var iIndex = installed.indexOf(appList[j].appId);

                if (iIndex !== -1) {
					Mojo.Log.warn("Found potential match, need to check for version " + installedVersions[iIndex] + " of " + installed[iIndex]);
					var foundApp = {
						"appId": installed[iIndex],
						"version": installedVersions[iIndex]
					}
                    found.push(foundApp);
                }
            }
            
			if (found.length === 0) {
				Mojo.Log.info("No matches from missing list!");
                resultsArea.innerHTML += 'No missing apps are installed on this device.<br><br>';
                return;
            }

            // Retrieve version info for each found app
			resultsArea = document.getElementById("resultsArea");
            resultsArea.innerHTML += 'Checking version of potential matches...<br>';

			for (var k = 0; k<found.length; k++) {
				f.getAppVersion(found[k], appList);		
			}
        },
        onFailure: function(e) {
			Mojo.Log.error("could not list installed apps");
            resultsArea.innerHTML = '<span style="color:red">Failed to get installed apps: ' + JSON.stringify(e) + '</span>';
        }
    });
};

FirstAssistant.prototype.parseAppList = function(text) {
    var lines = text.split(/[\n\r]+/);
    var appList = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === '') continue;

        var match = line.match(/^([^_]+)_([^_]+)_/);
        if (match) {
            appList.push({
                appId: match[1],
                requiredVersion: match[2]
            });
        }
    }
    return appList;
};

FirstAssistant.prototype.getAppVersion=function(foundApp, appList) {
	Mojo.Log.info("Checking version of: " + JSON.stringify(foundApp) + " against " + appList.length + " apps...");
	var found = 0;
	for (var i=0;i<appList.length;i++) {
		//Mojo.Log.info(appList[i].appId + " ?= " + foundApp.appId);
		if (appList[i].appId == foundApp.appId) {
			resultsArea = document.getElementById("resultsArea");
			Mojo.Log.info("Found app in missing list: " + JSON.stringify(appList[i]));
			Mojo.Log.info("Comparing " + JSON.stringify(appList[i]) + " to " + JSON.stringify(foundApp));
			if (appList[i].requiredVersion == foundApp.version) {
				found = 2;
				resultsArea.innerHTML += '<span style="color:green">Found an exact match: ' + foundApp.appId + ' version ' + foundApp.version + '</span>';
			} else {
				found = 1;
				resultsArea.innerHTML += '<span style="color:blue">Found a potential match: ' + foundApp.appId + '. Wanted version ' + appList[i].requiredVersion + ', found version: ' + foundApp.version + '</span>';
			}
		}
	}
	if (found == 1) {
		resultsArea.innerHTML += '<br><br>Please email webosarchive@gmail.com and let us know you might have this missing app!</p>';
	}
	if (found == 2) {
		resultsArea.innerHTML += '<br><br>Please email webosarchive@gmail.com and let us know you definitely have this missing app!</p>';
	}
};
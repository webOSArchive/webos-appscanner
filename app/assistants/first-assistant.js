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
    xhr.open('GET', 'https://appcatalog.webosarchive.org/wanted.txt', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var text = xhr.responseText;
                var appList = f.parseAppList(text);
                f.queryInstalledApps(appList);
            } else {
				resultsArea = document.getElementById("resultsArea");
                resultsArea.innerHTML = '<span style="color:red">Could not load remote missing file: status ' + xhr.status + '</span>';
				resultsArea.innerHTML += '<span><br>Trying local list...</span>';
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
    xhr.open('GET', 'data/applist.txt', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var text = xhr.responseText;
                var appList = f.parseAppList(text);
                f.queryInstalledApps(appList);
            } else {
				resultsArea = document.getElementById("resultsArea");
                resultsArea.innerHTML = '<span style="color:red">Could not load bundled file: status ' + xhr.status + '</span>';
            }
        }
    };
    xhr.send(null);
};

FirstAssistant.prototype.parseAppList = function(text) {
    var entries = text.split(/[\n\r,;]+/);
    var appList = [];
	Mojo.Log.info("Got a list with " + entries.length + " apps!");
    for (var i = 0; i < entries.length; i++) {
        var item = entries[i].trim();
		item = item.split("_");
		item = item[0];
        if (item !== '') {
			Mojo.Log.info("Parsed appid: " + item);
            appList.push(item);
        }
    }
    return appList;
};

FirstAssistant.prototype.queryInstalledApps = function(appList) {
    var f = this;
	resultsArea = document.getElementById("resultsArea");
    this.controller.serviceRequest('palm://com.palm.applicationManager', {
        method: 'listApps',
        parameters: {},
        onSuccess: function(response) {
            var installed = [];
            if (response.apps) {
                for (var i = 0; i < response.apps.length; i++) {
                    installed.push(response.apps[i].id);
                }
            }
            var found = [];
            for (var j = 0; j < appList.length; j++) {
                if (installed.indexOf(appList[j]) !== -1) {
                    found.push(appList[j]);
                }
            }
            
			if (found.length === 0) {
                resultsArea.innerHTML = 'No listed apps are installed.';
                return;
            }

            // Retrieve version info for each found app
            var resultsHtml = 'Found installed apps:<br>';
            var pending = found.length;

            found.forEach(function(appId) {
                f.getAppVersion(appId, function(err, version) {
                    if (!err) {
                        resultsHtml += appId + ' (version: ' + version + ')<br>';
                    } else {
                        resultsHtml += appId + ' (version info not available)<br>';
                    }
                    pending--;
                    if (pending === 0) {
                        resultsArea.innerHTML = resultsHtml;
                    }
                });
            });

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

        // Extract appId and requiredVersion from the filename pattern
        // Example: com.mobiledreams.onceochosetenta_1.0.4all.ipk
        var match = line.match(/^(.+?)([0-9.]+)_all.ipk$/);
        if (match) {
            appList.push({
                appId: match[1],
                requiredVersion: match[2]
            });
        }
    }
    return appList;
};
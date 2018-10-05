function sendAlert(message) {
	document.getElementById("alertSection").innerHTML = `
	<div class="alert alert-warning" role="alert">
		<strong>Error:</strong> ${message}
	</div>
	`;
}

var currentMeasurementTime = -1;
window.setInterval(function () {
	if (currentMeasurementTime > -1) {
		currentMeasurementTime++;
		document.getElementById("measurementTime").innerText = currentMeasurementTime;
	}
}, 1000);

function updateLive(data) {
	Object.keys(data).forEach((sensorID) => {
		if (sensorID == "time") {
			var date = new Date(data[sensorID]);
			// Get time difference in seconds
			var difference = ((Date.now() - date) / 1000).toFixed(0);
			document.getElementById("measurementTime").innerText = difference;
			currentMeasurementTime = difference;

			var statusEl = document.getElementById("systemStatus");
			if (difference > 172800) {
				statusEl.className = "text-danger";
				statusEl.innerText = "Broken (greater than two days since last recording)";
			} else if (difference > 3600) {
				statusEl.className = "text-warning";
				statusEl.innerText = "Problematic (greater than one hour since last recording)";
			} else if (difference > 300) {
				statusEl.className = "text-info";
				statusEl.innerText = "Slow (greater than 5 minutes since last recording)";
			} else {
				statusEl.className = "text-success";
				statusEl.innerText = "Fully operational";
			}
		} else {
			var sensorEl = document.getElementById("live-" + sensorID);
			if (sensorEl) {
				var decimalPlaces = parseInt(sensorEl.dataset.decimal);
				sensorEl.innerText = parseFloat(data[sensorID]).toFixed(decimalPlaces);
			}
		}
	});
}

window.addEventListener("load", function(event) {
	var pubnub;
	try {
		pubnub = new PubNub({
			subscribeKey: pubNubKey,
			ssl: true
		});
	} catch (e) {
		sendAlert("Failed to connect to server: " + e);
	}

	if (pubnub) {
		pubnub.history({
			channel: "measurement",
			count: 50
		}, function (status, response) {
			if (status.error) {
				sendAlert(status.errorData.message);
			} else {
				var data = response.messages.map(val => val.entry);
				var latestData = data[data.length - 1];
				updateLive(latestData);
			}
		});
		pubnub.addListener({
			status: function(statusEvent) {
				if (statusEvent.category === "PNConnectedCategory") {
					// Show that data is live
					var heading = document.getElementById("liveHeading");
					heading.hidden = false;
					heading.classList.remove("d-none");
				}
			},
			message: function(msg) {
				updateLive(msg.message);
			}
		});
		pubnub.subscribe({
			channels: ["measurement"] 
		});
	}
	window.pubnub = pubnub;

	// Set font stack
	Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
	
	var createGraphs = function (ajaxdata) {
		for (var i = 0; i < ajaxdata.metadata.length; i++) {
			var meta = ajaxdata.metadata[i];
			meta.unit = meta.unit.replace(/&#176;/g, String.fromCharCode(176)); // fix degree symbol
			new Chart(document.getElementById("graph-" + meta.sensorID).getContext("2d"), {
				type: 'line',
				data: {
					labels: ["-195", "-190", "-185", "-180", "-175", "-170", "-165", "-160", "-155", "-150", "-145", "-140", "-135", "-130", "-125", "-120", "-115", "-110", "-105", "-100", "-95", "-90", "-85", "-80", "-75", "-70", "-65", "-60", "-55", "-50", "-45", "-40", "-35", "-30", "-25", "-20", "-15", "-10", "-5", "0"],
					datasets: [{
						label: meta.measurement + " (" + meta.unit + ")",
						backgroundColor: meta.color,
						borderColor: meta.color,
						data: ajaxdata.values[meta.sensorID],
						fill: false
					}]
				},
				options: {
					responsive: true,
					pointRadius: 0,
					tooltips: {
						mode: 'index',
						intersect: false,
					},
					hover: {
						mode: 'nearest',
						intersect: true
					},
					scales: {
						xAxes: [{
							display: true,
							// type: 'time',
							distribution: 'series',
							scaleLabel: {
								display: true,
								labelString: 'Time (Mins ago)'
							}
							/*
							time: {
                    						unit: 'minute'
                					}
							*/
						}],
						yAxes: [{
							display: true,
							ticks: {
								min: meta.min,
								max: meta.max
							},
							scaleLabel: {
								display: true,
								labelString: meta.measurement
							}
						}]
					}
				}
			});
		}
	};
}, false);

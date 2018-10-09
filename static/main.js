window.addEventListener("load", function(event) {
	function sendAlert(message) {
		document.getElementById("alertSection").innerHTML = `
		<div class="alert alert-warning" role="alert">
			<strong>Error:</strong> ${message}
		</div>
		`;
	}
	
	var currentMeasurementTimeSeconds = null;
	window.setInterval(function () {
		if (currentMeasurementTimeSeconds != null) {
			currentMeasurementTimeSeconds++;
			document.getElementById("measurementTime").innerText = currentMeasurementTimeSeconds;
		}
	}, 1000);

	var currentTimeOffset = 0;
	var currentMeasurementTime = Date.now();

	function updateLiveTime() {
		// Get time difference in seconds
		var difference = (((Date.now() + currentTimeOffset) - currentMeasurementTime) / 1000).toFixed(0);
		document.getElementById("measurementTime").innerText = difference;
		currentMeasurementTimeSeconds = difference;

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
	}
	
	function updateLive(data) {
		Object.keys(data).forEach((sensorID) => {
			if (sensorID == "time") {
				currentMeasurementTime = new Date(data[sensorID]);
				updateLiveTime();
			} else {
				var sensorEl = document.getElementById("live-" + sensorID);
				if (sensorEl) {
					var decimalPlaces = parseInt(sensorEl.dataset.decimal);
					sensorEl.innerText = parseFloat(data[sensorID]).toFixed(decimalPlaces);
				}
			}
		});
	}

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
		var startTime = Date.now();
		// Correct system clock offset using PubNub time api
		pubnub.time(function(status, response) {
			if (status.error) {
				sendAlert(status.errorData.message);
			} else {
				var latency = (Date.now() - startTime) / 2;
				var serverTime = (response.timetoken / 10000) + latency;
				currentTimeOffset = serverTime - Date.now();
				// Update existing indicators if they have been set yet
				if (currentMeasurementTimeSeconds != null) {
					updateLiveTime();
				}
			}
		});
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

				var graphData = {};
				data.forEach((currData) => {
					var time = new Date(currData.time);
					Object.keys(currData).forEach((sensorID) => {
						if (sensorID == "time") return;
						if (!graphData[sensorID]) {
							graphData[sensorID] = [];
						}
						graphData[sensorID].push({
							x: time,
							y: currData[sensorID]
						});
					});
				});

				Object.keys(charts).forEach((sensorID) => {
					charts[sensorID].chart.data.datasets[0].data = graphData[sensorID];
					charts[sensorID].chart.update();
				});
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

	// Set font stack
	Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
	
	var charts = {};
	Object.keys(metadata).forEach((key) => {
		metadata[key].unit = metadata[key].unit.replace(/&#176;/g, String.fromCharCode(176)); // fix degree symbol

		var ticks = {};
		if (!metadata[key].autofit) {
			console.log(metadata[key]);
			ticks = {
				min: metadata[key].graphMin,
				max: metadata[key].graphMax
			};
		}

		charts[key] = new Chart(document.getElementById("graph-" + key).getContext("2d"), {
			type: 'scatter',
			data: {
				datasets: [{
					label: metadata[key].measurement + " (" + metadata[key].unit + ")",
					backgroundColor: metadata[key].color,
					borderColor: metadata[key].color,
					data: [],
					fill: false
				}]
			},
			options: {
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
						type: 'time',
						position: 'bottom',
						time: {
							tooltipFormat: "h:mm a"
						}
					}],
					yAxes: [{
						type: 'linear',
						ticks: ticks,
						scaleLabel: {
							display: true,
							labelString: metadata[key].measurement
						}
					}]
				}
			}
		});
	});
}, false);

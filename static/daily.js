window.addEventListener("load", function(event) {
	function sendAlert(message) {
		document.getElementById("alertSection").innerHTML = `
		<div class="alert alert-warning" role="alert">
			<strong>Error:</strong> ${message}
		</div>
		`;
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

	var oReq = new XMLHttpRequest();

	oReq.onreadystatechange = function () {
		if (oReq.readyState === XMLHttpRequest.DONE) {
			if (oReq.status === 200) {
				var data = JSON.parse(this.responseText);

				var graphData = {};
				data.forEach((currData) => {
					var time = new Date(currData.t);
					Object.keys(currData).forEach((sensorID) => {
						if (sensorID == "t") return;
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
			} else {
				sendAlert("Failed to retrieve data: " + this.responseText);
			}
		}
	};

	oReq.open("GET", "/.netlify/functions/daily");
	oReq.send();

}, false);

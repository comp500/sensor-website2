build: hugo daily time

hugo:
	hugo

daily: export GO_IMPORT_PATH = github.com/comp500/sensor-website2/functions/daily
daily:
	echo ${GO_IMPORT_PATH}
	mkdir -p functions-dist
	go get ./functions/daily
	@go build -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}'" -o functions-dist/daily ./functions/daily

time: export GO_IMPORT_PATH = github.com/comp500/sensor-website2/functions/time
time:
	echo ${GO_IMPORT_PATH}
	go get ./functions/time
	go build -o functions-dist/time ./functions/time
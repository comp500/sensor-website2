build:
	mkdir -p functions-dist
	go get ./functions/*
	export GO_IMPORT_PATH=github.com/comp500/sensor-website2/functions/daily
	@go build -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}'" -o functions-dist/daily ./functions/daily
	export GO_IMPORT_PATH=github.com/comp500/sensor-website2/functions/time
	go build -o functions-dist/time ./functions/time
	hugo
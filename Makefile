build:
	mkdir -p functions-dist
	go get ./functions/daily
	@go build -o functions-dist/daily ./functions/daily -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}'"
	hugo
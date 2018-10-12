build: hugo daily weekly

hugo:
	hugo

godeps:
	mkdir -p functions-dist
	go get ./functions/daily

daily: godeps
	@go build -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}' -X 'main.DataTimezone=${DATA_TIMEZONE}'" -o functions-dist/daily ./functions/daily

weekly: godeps
	@go build -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}' -X 'main.DataTimezone=${DATA_TIMEZONE}'" -o functions-dist/weeklytest ./functions/weeklytest
build: hugo daily

hugo:
	hugo

daily:
	mkdir -p functions-dist
	go get ./functions/daily
	@go build -ldflags "-X 'main.GCPprojectID=${GCP_PROJECT_ID}' -X 'main.GCPcredJSON=${GCP_CREDENTIALS_JSON}' -X 'main.DataTimezone=${DATA_TIMEZONE}'" -o functions-dist/daily ./functions/daily
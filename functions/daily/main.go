package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"google.golang.org/api/option"
)

// GCPprojectID is the Google Cloud Platform project ID for Cloud Datastore
var GCPprojectID string

// GCPcredJSON is the Google Cloud Platform JSON credentials data for Cloud Datastore
var GCPcredJSON string

var client *datastore.Client
var startupError error
var ctx context.Context

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if startupError != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to create client: %v", startupError),
		}, nil
	}

	var data []map[string]string

	now := time.Now().UTC()
	yesterday := time.Date(now.Year(), now.Month(), now.Day()-1, 0, 0, 0, 0, time.UTC)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	measurementQuery := datastore.NewQuery("Measurement").Filter("recorded >=", yesterday).Filter("recorded <", today).Order("-recorded").Limit(48)
	_, err := client.GetAll(ctx, measurementQuery, &data)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to request data: %v", err),
		}, nil
	}

	output, err := json.Marshal(data)

	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to serialize data: %v", err),
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(output),
	}, nil
}

func main() {
	ctx = context.Background()

	// Creates a client.
	client, startupError = datastore.NewClient(ctx, GCPprojectID, option.WithCredentialsJSON([]byte(GCPcredJSON)))

	// Make the handler available for Remote Procedure Call by AWS Lambda
	lambda.Start(handler)
}

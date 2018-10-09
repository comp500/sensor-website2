package main

import (
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	time := time.Now().UTC().Format(time.RFC3339)

	timeJS := "const correctTime = \"" + time + "\";"

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       timeJS,
		Headers: map[string]string{
			"Content-Type": "application/javascript",
		},
	}, nil
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	lambda.Start(handler)
}

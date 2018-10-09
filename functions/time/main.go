package main

import (
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	time := time.Now().UTC().Unix() * 1000

	timeJS := "const correctTime = new Date(" + strconv.FormatInt(time, 10) + ");"

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

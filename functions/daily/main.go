package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"google.golang.org/api/option"
)

// GCPprojectID is the Google Cloud Platform project ID for Cloud Datastore
var GCPprojectID string

// GCPcredJSON is the Google Cloud Platform JSON credentials data for Cloud Datastore, encoded with base64
var GCPcredJSON string

// DataTimezone is the IANA Time Zone name for the timezone of the data to be queried
var DataTimezone string

var client *datastore.Client
var startupError error
var ctx context.Context
var timezoneLocation *time.Location

var dataCacheStore dataCache

// Cached data for the current day
type dataCache struct {
	today  time.Time
	m      *sync.RWMutex
	output []byte
}

// StoredData is a single cloud datastore entity
type StoredData struct {
	SensorValues map[int]string
	Recorded     time.Time
}

// Load loads the datastore property into StoredData
func (d *StoredData) Load(props []datastore.Property) error {
	d.SensorValues = make(map[int]string)
	for _, p := range props {
		if p.Name == "recorded" {
			val, ok := p.Value.(time.Time)
			if !ok {
				return errors.New("Recorded is not a time.Time")
			}
			d.Recorded = val
		} else {
			sensorID, err := strconv.Atoi(p.Name)
			if err != nil {
				return err
			}
			// This is lazy.
			// Don't do this ever again.
			d.SensorValues[sensorID] = fmt.Sprintf("%v", p.Value)
		}
	}
	return nil
}

// Save saves the StoredData into a datastore property
func (d *StoredData) Save() ([]datastore.Property, error) {
	props := make([]datastore.Property, 1)
	props[0] = datastore.Property{
		Name:  "recorded",
		Value: d.Recorded,
	}
	for k, v := range d.SensorValues {
		props = append(props, datastore.Property{
			Name:  strconv.Itoa(k),
			Value: v,
		})
	}
	return props, nil
}

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if startupError != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to create client: %v", startupError),
		}, nil
	}

	var output []byte

	now := time.Now().In(timezoneLocation)
	yesterday := time.Date(now.Year(), now.Month(), now.Day()-1, 0, 0, 0, 0, timezoneLocation)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, timezoneLocation)

	dataCacheStore.m.RLock()
	usedCache := true
	defer func () {
		if (usedCache) {
			dataCacheStore.m.RUnlock()
		}
	}

	if dataCacheStore.output != nil && dataCacheStore.today.Equal(today) {
		// Read from cache
		output = dataCacheStore.output
	} else {
		// UGH why is there no idiomatic way to upgrade locks!
		dataCacheStore.m.RUnlock()
		dataCacheStore.m.Lock()
		usedCache = false

		var data []StoredData

		measurementQuery := datastore.NewQuery("Measurement").Filter("recorded >=", yesterday).Filter("recorded <", today).Order("-recorded").Limit(48)
		_, err := client.GetAll(ctx, measurementQuery, &data)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Body:       fmt.Sprintf("Failed to request data: %v", err),
			}, nil
		}

		output, err = json.Marshal(data)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Body:       fmt.Sprintf("Failed to serialize data: %v", err),
			}, nil
		}

		dataCacheStore.today = today
		dataCacheStore.output = output

		// Release the RWLock, gain the RLock
		dataCacheStore.m.Unlock()
		dataCacheStore.m.RLock()
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(output),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}, nil
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	defer lambda.Start(handler)

	ctx = context.Background()

	// Creates a client.
	var credentials []byte
	credentials, startupError = base64.StdEncoding.DecodeString(GCPcredJSON)
	if startupError != nil {
		return
	}
	client, startupError = datastore.NewClient(ctx, GCPprojectID, option.WithCredentialsJSON(credentials))
	if startupError != nil {
		return
	}
	timezoneLocation, startupError = time.LoadLocation(DataTimezone)
}

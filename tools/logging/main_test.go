package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/moby/moby/api/types/container"
	"github.com/testcontainers/testcontainers-go"
)

// sidecarConfig mirrors config/sidecar.json, which is generated from the GuCDK construct's settings.
type sidecarConfig struct {
	Image       string            `json:"image"`
	Command     []string          `json:"command"`
	Environment map[string]string `json:"environment"`
}

func loadSidecarConfig(t *testing.T) sidecarConfig {
	t.Helper()

	path := filepath.Join("config", "sidecar.json")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading %s: %v\nGenerate it by running script/generate-logging-sidecar from the repository root.", path, err)
	}

	var config sidecarConfig
	if err := json.Unmarshal(content, &config); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}

	return config
}

type logConsumer struct {
	mu   sync.Mutex
	logs []string
}

func (c *logConsumer) Accept(log testcontainers.Log) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.logs = append(c.logs, string(log.Content))
}

func (c *logConsumer) String() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	return strings.Join(c.logs, "")
}

func TestFluentBit(t *testing.T) {
	ctx := context.Background()

	consumer := &logConsumer{}

	sidecar := loadSidecarConfig(t)

	env := map[string]string{
		"STACK":               "test",
		"STAGE":               "test",
		"APP":                 "test",
		"GU_REPO":             "test/repo",
		"TASK_NAME":           "test-task",
		"ECS_CLUSTER":         "test-cluster",
		"ECS_TASK_ARN":        "test-task-arn",
		"ECS_TASK_DEFINITION": "test-task-definition",
	}
	for key, value := range sidecar.Environment {
		env[key] = value
	}
	// Test-only override:
	env["OUTPUT_PLUGIN"] = "stdout"

	req := testcontainers.ContainerRequest{
		Image: sidecar.Image,
		Cmd:   sidecar.Command,

		ExposedPorts: []string{"24224/tcp"},

		Env: env,

		// Match the ECS task definition: a read-only root filesystem with a writable volume at /tmp.
		HostConfigModifier: func(hostConfig *container.HostConfig) {
			hostConfig.ReadonlyRootfs = true
			hostConfig.Tmpfs = map[string]string{"/tmp": ""}
		},
		//WaitingFor: wait.ForListeningPort("24224/tcp"),
	}
	container, err := testcontainers.GenericContainer(
		ctx,
		testcontainers.GenericContainerRequest{
			ContainerRequest: req,
			Started:          true,
		},
	)
	if err != nil {
		t.Fatalf("starting Fluent Bit: %v", err)
	}
	defer container.Terminate(ctx)

	container.FollowOutput(consumer)

	if err := container.StartLogProducer(ctx); err != nil {
		t.Fatalf("starting log producer: %v", err)
	}
	defer container.StopLogProducer()

	t.Log("Fluent Bit container started")

	// Give Fluent Bit a moment to start and emit any startup errors.
	time.Sleep(2 * time.Second)

	output := consumer.String()
	t.Logf("Fluent Bit output:\n%s", output)

	if strings.Contains(output, "[error]") {
		t.Fatalf("Fluent Bit reported an error:\n%s", output)
	}

	host, err := container.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}

	port, err := container.MappedPort(ctx, "24224/tcp")
	if err != nil {
		t.Fatal(err)
	}

	address := net.JoinHostPort(host, port.Port())

	expectedFields := []string{
		`"ecs_cluster"=>"test-cluster"`,
		`"ecs_task_arn"=>"test-task-arn"`,
		`"ecs_task_definition"=>"test-task-definition"`,
		`"ShippedBy"=>"devx-logs"`,
		`"stack"=>"test"`,
		`"stage"=>"test"`,
		`"app"=>"test"`,
		`"gu:repo"=>"test/repo"`,
		`"task"=>"test-task"`,
	}

	// "log" exercises the rename filter (log -> message) before JSON parsing.
	t.Run("log field", func(t *testing.T) {
		messageID := uuid.NewString()
		sendForwardRecord(t, address, "log", fmt.Sprintf(`{"hello":"%s","test":true}`, messageID))
		requireOutput(t, consumer, append([]string{messageID}, expectedFields...)...)
	})

	// "message" skips the rename and goes directly to JSON parsing.
	t.Run("message field", func(t *testing.T) {
		messageID := uuid.NewString()
		sendForwardRecord(t, address, "message", fmt.Sprintf(`{"hello":"%s","test":true}`, messageID))
		requireOutput(t, consumer, append([]string{messageID}, expectedFields...)...)
	})
}

func sendForwardRecord(t *testing.T, address, fieldName, message string) {
	t.Helper()

	if err := sendForwardMessage(address, fieldName, message); err != nil {
		t.Fatalf("sending Forward record: %v", err)
	}
}

func requireOutput(t *testing.T, consumer *logConsumer, expected ...string) {
	t.Helper()

	deadline := time.Now().Add(15 * time.Second)

	for time.Now().Before(deadline) {
		output := consumer.String()

		allFound := true

		for _, value := range expected {
			if !strings.Contains(output, value) {
				allFound = false
				break
			}
		}

		if allFound {
			return
		}

		time.Sleep(100 * time.Millisecond)
	}

	t.Fatalf(
		"did not find all expected values %q in Fluent Bit output:\n%s",
		expected,
		consumer.String(),
	)
}

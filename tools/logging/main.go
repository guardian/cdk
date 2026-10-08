package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"github.com/vmihailenco/msgpack/v5"
)

func main() {
	if err := runCLI(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

func runCLI(args []string) error {
	fs := flag.NewFlagSet("send-log", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	addr := fs.String("addr", "127.0.0.1:24224", "Fluent Bit forward address")
	field := fs.String("field", "message", "Field name for the log message (e.g. message or log)")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if fs.NArg() < 1 {
		return fmt.Errorf("usage: send-log [--addr host:port] [--field name] <message>")
	}

	return sendForwardMessage(*addr, *field, fs.Arg(0))
}

func sendForwardMessage(address, fieldName, message string) error {
	record := []interface{}{
		"application-logs",
		[]interface{}{
			[]interface{}{
				time.Now().Unix(),
				map[string]interface{}{
					fieldName: message,
				},
			},
		},
	}

	payload, err := msgpack.Marshal(record)
	if err != nil {
		return fmt.Errorf("encoding Forward record: %w", err)
	}

	conn, err := net.DialTimeout("tcp", address, 5*time.Second)
	if err != nil {
		return fmt.Errorf("connecting to Fluent Bit: %w", err)
	}
	defer conn.Close()

	if _, err := conn.Write(payload); err != nil {
		return fmt.Errorf("sending Forward record: %w", err)
	}

	return nil
}

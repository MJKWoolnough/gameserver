//go:build !proxy

package main

import (
	"net"
)

func listen() (net.Listener, error) {
	return net.Listen("tcp", ":8080")
}

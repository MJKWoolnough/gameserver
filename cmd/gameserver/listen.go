//go:build !proxy

package main

import (
	"flag"
	"net"
)

var p = flag.String("l", ":8080", "HTTP Listen address")

func listen() (net.Listener, error) {
	return net.Listen("tcp", *p)
}

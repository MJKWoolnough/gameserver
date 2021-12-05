//go:build proxy

package main

import (
	"net"

	"vimagination.zapto.org/reverseproxy/unixconn"
)

func listen() (net.Listener, error) {
	return unixconn.Listen("tcp", ":80")
}

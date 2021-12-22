//go:build proxy

package main

import (
	"flag"
	"fmt"
	"net"

	"vimagination.zapto.org/reverseproxy/unixconn"
)

var p = flag.Uint("p", 80, "Proxy Listen Port")

func listen() (net.Listener, error) {
	if p > 65535 || p == 0 {
		p = 80
	}
	return unixconn.Listen("tcp", fmt.Sprintf(":%d", p))
}

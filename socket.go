package gameserver

import (
	"sync"

	"golang.org/x/net/websocket"
)

type socket struct {
	mu     sync.RWMutex
	conns  map[*conn]struct{}
	nextID uint64
}

func newSocket() *socket {
	return &socket{
		conns: make(map[*conn]struct{}),
	}
}

func (s *socket) ServeConn(wconn *websocket.Conn) {
}

type conn struct {
	ID uint64
}

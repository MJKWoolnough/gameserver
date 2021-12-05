package gameserver

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
	"vimagination.zapto.org/jsonrpc"
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
	c := new(conn)
	s.mu.Lock()
	s.nextID++
	id := s.nextID
	s.conns[c] = struct{}{}
	s.mu.Unlock()
	c.ID = id
	c.rpc = jsonrpc.New(wconn, c)
	c.rpc.Handle()
	s.mu.Lock()
	delete(s.conns, c)
	s.mu.Unlock()
}

type conn struct {
	rpc *jsonrpc.Server
	ID  uint64
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	switch method {
	default:
		pos := strings.IndexByte(method, '.')
		if pos < 0 {
			return nil, ErrUnkownEndpoint
		}
		submethod := method[pos+1:]
		method = method[:pos]
		switch method {
		}
		_ = submethod
	}
	return nil, ErrUnkownEndpoint
}

// Errors
var (
	ErrUnkownEndpoint = errors.New("unknown endpoint")
)

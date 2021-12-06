package gameserver

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"

	"golang.org/x/net/websocket"
	"vimagination.zapto.org/jsonrpc"
)

func New() *http.ServeMux {
	m := http.NewServeMux()
	m.Handle("/socket", websocket.Handler(newSocket().ServeConn))
	return m
}

type socket struct {
	mu    sync.RWMutex
	conns map[*conn]struct{}
}

func newSocket() *socket {
	return &socket{
		conns: make(map[*conn]struct{}),
	}
}

func (s *socket) ServeConn(wconn *websocket.Conn) {
	c := new(conn)
	s.mu.Lock()
	s.conns[c] = struct{}{}
	s.mu.Unlock()
	c.rpc = jsonrpc.New(wconn, c)
	c.rpc.Handle()
	s.mu.Lock()
	delete(s.conns, c)
	s.mu.Unlock()
}

type role uint8

const (
	roleNone role = iota
	roleAdmin
	roleUser
	roleSpectator
)

type conn struct {
	rpc *jsonrpc.Server

	sync.RWMutex
	room *room
	role role
}

type room struct {
	Name       string
	admin      *conn
	users      []*conn
	spectators []*conn
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	switch method {
	case "listRooms":
	case "addRoom":
	case "joinRoom":
	case "leaveRoom":
	case "adminRoom":
	case "spectateRoom":
	case "toAdmin":
	case "toUsers":
	case "toSpectators":
	}
	return nil, errUnkownEndpoint
}

var errUnkownEndpoint = errors.New("unknown endpoint")

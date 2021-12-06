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
	m.Handle("/socket", websocket.Handler(newServer().ServeConn))
	return m
}

type server struct {
	mu    sync.RWMutex
	rooms map[string]*room
}

func newServer() *server {
	return &server{
		rooms: map[string]*room{
			"default": newRoom("default"),
		},
	}
}

func (s *server) ServeConn(wconn *websocket.Conn) {
	c := &conn{
		server: s,
	}
	c.rpc = jsonrpc.New(wconn, c)
	c.rpc.Handle()
}

type role uint8

const (
	roleNone role = iota
	roleAdmin
	roleUser
	roleSpectator
)

type conn struct {
	rpc    *jsonrpc.Server
	server *server

	sync.RWMutex
	room *room
	role role
}

type room struct {
	Name string

	mu         sync.RWMutex
	admin      *conn
	users      map[*conn]struct{}
	spectators map[*conn]struct{}
}

func newRoom(name string) *room {
	return &room{
		Name:       name,
		users:      make(map[*conn]struct{}),
		spectators: make(map[*conn]struct{}),
	}
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
